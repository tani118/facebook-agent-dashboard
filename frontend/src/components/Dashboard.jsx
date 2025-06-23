import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import UnifiedConversationList from './UnifiedConversationList';
import UnifiedChatInterface from './UnifiedChatInterface';
import CustomerInformation from './CustomerInformation';
import FacebookPageSetup from './FacebookPageSetup';
import Sidebar from './Sidebar';
import socketService from '../services/socketService';
import { usePolling } from '../hooks/usePolling';
import { ChevronLeft, Menu, RefreshCw } from 'lucide-react';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [commentUsers, setCommentUsers] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [connectedPages, setConnectedPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  
  const toggleSidebar = () => {
    setSidebarVisible(prev => !prev);
  };
  
  const fetchConversationsAndComments = useCallback(async () => {
    if (!selectedPage) return;
    
    try {
      const token = localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      
      const [conversationsResponse, commentsResponse] = await Promise.all([
        axios.get(`${baseUrl}/conversations/${selectedPage.pageId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        axios.get(`${baseUrl}/comments/${selectedPage.pageId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (conversationsResponse.data.success) {
        const sortedConversations = (conversationsResponse.data.data || [])
          .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
        setConversations(sortedConversations);
      }
      
      if (commentsResponse.data.success) {
        setCommentUsers(commentsResponse.data.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }, [selectedPage]);

  // Enable polling when a page is selected
  usePolling(fetchConversationsAndComments, 5000, !!selectedPage);

  useEffect(() => {
    fetchConnectedPages();
    
    if (user?.id) {
      socketService.connect(user.id);
      
      const handleNewMessage = (data) => {
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
          
          return updatedConversations.sort((a, b) => 
            new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
          );
        });
      };
      
      const handleConversationUpdated = (data) => {
        console.log('💬 Conversation updated via WebSocket:', data);
        
        setConversations(prevConversations => {
          const existingIndex = prevConversations.findIndex(
            conv => conv.conversationId === data.conversationId
          );
          
          if (existingIndex >= 0) {
            const updated = [...prevConversations];
            updated[existingIndex] = {
              ...updated[existingIndex],
              ...data,
              // Preserve existing profile pictures if not provided in the update
              customerProfilePic: data.customerProfilePic || updated[existingIndex].customerProfilePic
            };
            return updated.sort((a, b) => 
              new Date(b.lastMessageAt) - new Date(a.lastMessageAt)
            );
          } else {
            return [data, ...prevConversations];
          }
        });
      };
      
      socketService.on('new-message', handleNewMessage);
      socketService.on('conversation-updated', handleConversationUpdated);
      
      return () => {
        socketService.off('new-message', handleNewMessage);
        socketService.off('conversation-updated', handleConversationUpdated);
        socketService.disconnect();
      };
    }
  }, [user?.id]);

  useEffect(() => {
    if (selectedPage) {
      fetchConversationsAndComments();
      
      if (selectedPage.pageId) {
        socketService.joinPageRoom(selectedPage.pageId);
      }
    }
  }, [selectedPage, fetchConversationsAndComments]);
  
  useEffect(() => {
    if (selectedPage && selectedPage.pageId) {
      const handleNewComment = (data) => {
        console.log('📩 New comment/reply received:', data);
        
        // Immediately refresh comments when new comments arrive
        fetchComments();
      };
      
      socketService.on('new-comment', handleNewComment);
      
      return () => {
        socketService.off('new-comment', handleNewComment);
      };
    }
  }, [selectedPage]);

  const fetchConnectedPages = async () => {
    try {
      const token = localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      
      const response = await axios.get(`${baseUrl}/facebook-auth/connected-pages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
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

  const handleRefresh = async () => {
    if (!selectedPage) return;
    
    setRefreshing(true);
    try {
      await fetchConversationsAndComments();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const fetchConversations = async () => {
    if (!selectedPage?.pageId) {
      console.error('No page ID available');
      return;
    }

    try {
      const syncResponse = await axios.post('/conversations/sync', {
        pageAccessToken: selectedPage.pageAccessToken,
        pageId: selectedPage.pageId,
        limit: 25
      });

      if (syncResponse.data.success) {
        console.log('Conversations synced:', syncResponse.data.message);
      }

      const response = await axios.get('/conversations', {
        params: { 
          pageId: selectedPage.pageId,
          limit: 25
        }
      });
      
      if (response.data.success) {
        const sortedConversations = (response.data.data.conversations || [])
          .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
        setConversations(sortedConversations);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      try {
        const fallbackResponse = await axios.get(`/facebook/conversations/${selectedPage.pageId}`, {
          params: { 
            pageAccessToken: selectedPage.pageAccessToken,
            limit: 25
          }
        });
        if (fallbackResponse.data.success) {
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
        
        const filteredData = {
          ...response.data.data,
          userComments: response.data.data.userComments.filter(userGroup => 
            userGroup.userId !== selectedPage.pageId
          )
        };
        
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

  if (!loading && connectedPages.length === 0) {
    return <FacebookPageSetup onPageConnected={fetchConnectedPages} />;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      {/* App Sidebar */}
      <div className="flex flex-col w-16 bg-primary">
        <Sidebar activeTab="chatportal" />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Conversation & Comments List Sidebar */}
        <div className={`${sidebarVisible ? 'w-80' : 'w-0'} border-r flex flex-col overflow-hidden transition-all duration-300 ease-in-out`} style={{ marginLeft: '0px' }}>
          {/* Header */}
          <div className="flex justify-between items-center px-4 py-4 border-b border-gray-200 bg-white">
            <div className="flex items-center">
              <h2 className="text-xl font-bold ml-14">Conversations</h2>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-500 hover:text-gray-700 rounded"
            >
              <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
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

        {/* Sidebar Toggle Button - positioned to the right of blue sidebar */}
        <button
          onClick={toggleSidebar}
          className="absolute z-20 p-2 bg-white border border-gray-200 rounded-full shadow-sm hover:bg-gray-50"
          style={{ left: '76px',top: '0.7rem' }}>
            <Menu size={20} className="text-gray-700" />
        
        </button>

        {/* Main Chat Area - with fixed right position */}
        {selectedItem ? (
          <div className="flex flex-1 overflow-hidden">
            {/* Chat interface with fixed right positioning */}
            <div className="w-full flex flex-1 flex-grow overflow-hidden justify-end">
              <div className={`${!sidebarVisible ? 'w-[calc(100%-3rem)]' : 'w-full'} flex transition-all duration-300 ease-in-out justify-end`}>
                <UnifiedChatInterface
                  item={selectedItem}
                  type={selectedItem.type}
                  pageId={selectedPage?.pageId}
                  pageAccessToken={selectedPage?.pageAccessToken}
                  selectedPage={selectedPage}
                  sidebarVisible={sidebarVisible}
                />
              </div>
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
                email: selectedItem.customerEmail || (selectedItem.type === 'comments' ? `example@gmail.com` : ''),
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
              <div className="text-6xl mb-4"></div>
              <p className="text-lg">
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
