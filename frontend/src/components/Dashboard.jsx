import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import UnifiedConversationList from './UnifiedConversationList';
import UnifiedChatInterface from './UnifiedChatInterface';
import CustomerInformation from './CustomerInformation';
import FacebookPageSetup from './FacebookPageSetup';
import Sidebar from './Sidebar';
import socketService from '../services/socketService';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [commentUsers, setCommentUsers] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null); // conversation or comment thread
  const [connectedPages, setConnectedPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  useEffect(() => {
    fetchConnectedPages();
    
    // Initialize WebSocket connection
    if (user?.id) {
      socketService.connect(user.id);
      
      // Set up real-time event handlers
      const handleNewMessage = (data) => {
        console.log('📩 Received new message via WebSocket:', data);
        
        // Update conversations list
        setConversations(prevConversations => {
          const updatedConversations = prevConversations.map(conv => {
            if (conv.conversationId === data.conversationId) {
              return {
                ...conv,
                lastMessageContent: data.conversation.lastMessageContent,
                lastMessageAt: data.conversation.lastMessageAt,
                unreadCount: data.conversation.unreadCount
              };
            }
            return conv;
          });
          
          // Sort by lastMessageAt (newest first)
          return updatedConversations.sort((a, b) => 
            new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
          );
        });
      };
      
      const handleConversationUpdated = (data) => {
        console.log('💬 Conversation updated via WebSocket:', data);
        
        // Update conversations list
        setConversations(prevConversations => {
          const existingIndex = prevConversations.findIndex(
            conv => conv.conversationId === data.conversationId
          );
          
          if (existingIndex >= 0) {
            const updated = [...prevConversations];
            updated[existingIndex] = {
              ...updated[existingIndex],
              ...data
            };
            return updated.sort((a, b) => 
              new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
            );
          } else {
            // New conversation, add to list
            return [data, ...prevConversations];
          }
        });
      };
      
      socketService.on('new-message', handleNewMessage);
      socketService.on('conversation-updated', handleConversationUpdated);
      
      // Cleanup on unmount
      return () => {
        socketService.off('new-message', handleNewMessage);
        socketService.off('conversation-updated', handleConversationUpdated);
        socketService.disconnect();
      };
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedPage) {
      fetchData();
      
      // Join page-specific room for real-time updates
      if (selectedPage.pageId) {
        socketService.joinPageRoom(selectedPage.pageId);
      }
    }
  }, [selectedPage]);
  
  // Set up real-time comment notification
  useEffect(() => {
    if (selectedPage && selectedPage.pageId) {
      const handleNewComment = (data) => {
        console.log('📩 New comment/reply received:', data);
        
        // Auto-refresh comments after a short delay
        setTimeout(() => {
          if (activeTab === 'comments') {
            fetchComments();
          }
        }, 2000);
      };
      
      socketService.on('new-comment', handleNewComment);
      
      return () => {
        socketService.off('new-comment', handleNewComment);
      };
    }
  }, [selectedPage]);

  const fetchConnectedPages = async () => {
    try {
      const response = await axios.get('/facebook-auth/connected-pages');
      if (response.data.success && response.data.data.pages) {
        setConnectedPages(response.data.data.pages);
        if (response.data.data.pages.length > 0) {
          setSelectedPage(response.data.data.pages[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching pages:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchData = async () => {
    if (!selectedPage) return;
    
    setLoading(true);
    setRefreshing(true);
    try {
      // Fetch both conversations and comments
      await Promise.all([
        fetchConversations(),
        fetchComments()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchConversations = async () => {
    if (!selectedPage?.pageId) {
      console.error('No page ID available');
      return;
    }

    try {
      // First sync conversations from Facebook API to local database
      const syncResponse = await axios.post('/conversations/sync', {
        pageAccessToken: selectedPage.pageAccessToken,
        pageId: selectedPage.pageId,
        limit: 25
      });

      if (syncResponse.data.success) {
        console.log('Conversations synced:', syncResponse.data.message);
      }

      // Then fetch conversations from local database
      const response = await axios.get('/conversations', {
        params: { 
          pageId: selectedPage.pageId,
          limit: 25
        }
      });
      
      if (response.data.success) {
        // Sort conversations by lastMessageAt in descending order (newest first)
        const sortedConversations = (response.data.data.conversations || [])
          .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
        setConversations(sortedConversations);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      // Fallback to direct Facebook API if local API fails
      try {
        const fallbackResponse = await axios.get(`/facebook/conversations/${selectedPage.pageId}`, {
          params: { 
            pageAccessToken: selectedPage.pageAccessToken,
            limit: 25
          }
        });
        if (fallbackResponse.data.success) {
          // Process Facebook API data to match expected format
          const processedConversations = (fallbackResponse.data.data.data || []).map(conv => ({
            id: conv.id,
            conversationId: conv.id,
            customerName: conv.participants?.data?.find(p => p.id !== selectedPage.pageId)?.name || 'Unknown Customer',
            lastMessageAt: conv.updated_time,
            lastMessage: 'Click to load messages',
            unreadCount: conv.unread_count || 0,
            status: 'active'
          }));
          setConversations(processedConversations);
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
    }
  };

  const fetchComments = async () => {
    if (!selectedPage?.pageId || !selectedPage?.pageAccessToken) {
      console.error('No page ID or access token available');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || ''}/comments/${selectedPage.pageId}/all`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          pageAccessToken: selectedPage.pageAccessToken,
          limit: 50
        }
      });

      if (response.data.success) {
        console.log('Comments data received:', response.data.data);
        
        // Filter out page admin from user list - only show actual customers
        const filteredData = {
          ...response.data.data,
          userComments: response.data.data.userComments.filter(userGroup => 
            userGroup.userId !== selectedPage.pageId
          )
        };
        
        // Add pageId to each user group for later reference
        const userCommentsWithPageId = filteredData.userComments.map(userGroup => ({
          ...userGroup,
          pageId: selectedPage.pageId
        }));
        
        setCommentUsers(userCommentsWithPageId);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleItemSelect = (item) => {
    setSelectedItem(item);
  };

  if (loading && !selectedPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // If no pages are connected, show FacebookPageSetup
  if (!loading && connectedPages.length === 0) {
    return <FacebookPageSetup onPageConnected={fetchConnectedPages} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* Sidebar */}
      <div className="flex flex-col w-16 bg-primary">
        <Sidebar activeTab="chatportal" />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Conversation & Comments List Sidebar */}
        <div className={`${sidebarVisible ? 'w-80 opacity-100' : 'w-0 opacity-0'} border-r flex flex-col overflow-hidden transition-all duration-300`}>
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-4 border-b border-gray-200 bg-white">
            <div className="flex items-center">
              <h2 className="text-xl font-medium ml-7">Conversations</h2>
            </div>
            <button
              onClick={fetchData}
              disabled={refreshing}
              className="text-gray-500 hover:text-gray-700 text-lg flex items-center"
            >
              <span className={refreshing ? "animate-spin" : ""}>↻</span>
            </button>
          </div>

          {/* Unified List */}
          <div className="flex-1 overflow-y-auto bg-white">
            <UnifiedConversationList
              conversations={conversations}
              commentUsers={commentUsers}
              selectedItem={selectedItem}
              onItemSelect={handleItemSelect}
              loading={loading}
            />
          </div>
        </div>

        {/* Sidebar Toggle Button */}
        <div className={`fixed ${sidebarVisible ? 'left-[96px]' : 'left-[24px]'} top-[1.15rem] z-20 transition-all duration-300`}>
          <button
            onClick={() => setSidebarVisible(!sidebarVisible)}
            className="text-gray-600 hover:text-gray-800 bg-white border border-gray-200 shadow-sm p-1.5 hover:bg-gray-100 rounded"
            title={sidebarVisible ? "Hide sidebar" : "Show sidebar"}
          >
            <span className="text-xl font-semibold">{sidebarVisible ? "←" : "≡"}</span>
          </button>
        </div>

        {/* Main Chat Area */}
        {selectedItem ? (
          <div className="flex flex-1 overflow-hidden">
            <div className={`${!sidebarVisible ? 'ml-10' : ''} flex-1 flex transition-all duration-300`}>
              <UnifiedChatInterface
                item={selectedItem}
                type={selectedItem.type}
                pageId={selectedPage?.pageId}
                pageAccessToken={selectedPage?.pageAccessToken}
                selectedPage={selectedPage}
                sidebarVisible={sidebarVisible}
              />
            </div>
            
            {/* Customer Information Panel */}
            <CustomerInformation 
              customer={{
                id: selectedItem.type === 'conversation'
                  ? (selectedItem.customerId || selectedItem.senderPsid || selectedItem.senderId)
                  : selectedItem.userId,
                name: selectedItem.type === 'conversation'
                  ? selectedItem.customerName
                  : selectedItem.userName,
                email: selectedItem.customerEmail || (selectedItem.type === 'comments' ? `${selectedItem.userName.replace(' ', '.').toLowerCase()}@example.com` : ''),
                firstName: selectedItem.type === 'conversation'
                  ? selectedItem.customerFirstName
                  : selectedItem.userName.split(' ')[0],
                lastName: selectedItem.type === 'conversation'
                  ? selectedItem.customerLastName 
                  : (selectedItem.userName.split(' ')[1] || ''),
                profilePic: selectedItem.type === 'conversation'
                  ? selectedItem.customerProfilePic
                  : selectedItem.userPicture,
                timezone: selectedItem.timezone || "UTC"
              }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center w-full text-gray-500 bg-[#F6F6F6]">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-lg">
                Select a conversation to start
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
