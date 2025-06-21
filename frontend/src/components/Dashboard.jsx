import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import ConversationList from './ConversationList';
import ChatInterface from './ChatInterface';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [posts, setPosts] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null); // conversation or post
  const [connectedPages, setConnectedPages] = useState([]);
  const [selectedPage, setSelectedPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('conversations'); // 'conversations' or 'posts'

  useEffect(() => {
    fetchConnectedPages();
  }, []);

  useEffect(() => {
    if (selectedPage) {
      fetchData();
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
      } else {
        await fetchPosts();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversations = async () => {
    try {
      const response = await axios.get('/conversations', {
        params: { pageId: selectedPage.pageId }
      });
      if (response.data.success) {
        setConversations(response.data.data.conversations || []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchPosts = async () => {
    try {
      const response = await axios.get(`/posts/${selectedPage.pageId}`);
      if (response.data.success) {
        setPosts(response.data.posts || []);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const handleItemSelect = (item) => {
    setSelectedItem(item);
  };

  if (loading && !selectedPage) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Facebook Helpdesk Dashboard
              </h1>
              {selectedPage && (
                <div className="ml-6 flex items-center space-x-2">
                  <span className="text-sm text-gray-500">Connected to:</span>
                  <span className="text-sm font-medium text-blue-600">
                    {selectedPage.pageName}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              {connectedPages.length > 1 && (
                <select
                  value={selectedPage?.pageId || ''}
                  onChange={(e) => {
                    const page = connectedPages.find(p => p.pageId === e.target.value);
                    setSelectedPage(page);
                  }}
                  className="text-sm border border-gray-300 rounded-md px-3 py-1"
                >
                  {connectedPages.map(page => (
                    <option key={page.pageId} value={page.pageId}>
                      {page.pageName}
                    </option>
                  ))}
                </select>
              )}
              
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700">Hi, {user.name}</span>
                <button
                  onClick={logout}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('conversations')}
              className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'conversations'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Conversations ({conversations.length})
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'posts'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Posts ({posts.length})
            </button>
          </div>

          {/* List */}
          <ConversationList
            conversations={conversations}
            posts={posts}
            activeTab={activeTab}
            selectedItem={selectedItem}
            onItemSelect={handleItemSelect}
            loading={loading}
          />
        </div>

        {/* Main Chat/Comments Area */}
        <div className="flex-1 flex flex-col">
          {selectedItem ? (
            <ChatInterface
              item={selectedItem}
              type={activeTab === 'conversations' ? 'conversation' : 'post'}
              pageId={selectedPage?.pageId}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="text-6xl mb-4">💬</div>
                <p className="text-lg">
                  Select a {activeTab === 'conversations' ? 'conversation' : 'post'} to start
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
