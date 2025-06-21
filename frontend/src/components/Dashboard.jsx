import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import ConversationList from './ConversationList';
import ChatInterface from './ChatInterface';
import CommentsChatInterface from './CommentsChatInterface';
import CustomerInformation from './CustomerInformation';
import FacebookPageSetup from './FacebookPageSetup';
import Sidebar from './Sidebar';
import socketService from '../services/socketService';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null); // conversation
  const [connectedPages, setConnectedPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('conversations'); // 'conversations' or 'comments'

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
  }, [selectedPage, activeTab]);

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
    try {
      if (activeTab === 'conversations') {
        await fetchConversations();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
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
    <div className="flex h-[100vh] w-[100vw]">
      {/* Sidebar */}
      <div className="flex flex-col w-[5%] min-w-[60px] bg-primary">
        <Sidebar activeTab="chatportal" />
      </div>

      {/* Main Content */}
      <div className="flex w-[95%]">
        {/* Conversation List Sidebar */}
        <div className="w-[20%] border-r flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 bg-white">
            <button
              onClick={() => setActiveTab('conversations')}
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                activeTab === 'conversations'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Conversations ({conversations.length})
            </button>
            <button
              onClick={() => setActiveTab('comments')}
              className={`flex-1 px-4 py-3 text-sm font-medium ${
                activeTab === 'comments'
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Comments
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto bg-white">
            <ConversationList
              conversations={conversations}
              activeTab={activeTab}
              selectedItem={selectedItem}
              onItemSelect={handleItemSelect}
              loading={loading}
            />
          </div>
        </div>

        {/* Main Chat Area */}
        {activeTab === 'comments' ? (
          <CommentsChatInterface
            selectedPage={selectedPage}
            pageAccessToken={selectedPage?.pageAccessToken}
          />
        ) : selectedItem ? (
          <div className="flex flex-1">
            <ChatInterface
              item={selectedItem}
              type="conversation"
              pageId={selectedPage?.pageId}
              pageAccessToken={selectedPage?.pageAccessToken}
            />
            
            {/* Customer Information Panel */}
            <div className="w-[20%]">
              <CustomerInformation 
                customer={{
                  name: selectedItem.customerName,
                  email: selectedItem.customerEmail,
                  firstName: selectedItem.customerFirstName,
                  lastName: selectedItem.customerLastName
                }}
              />
            </div>
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
