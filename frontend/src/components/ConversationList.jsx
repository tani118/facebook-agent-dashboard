import React from 'react';

const ConversationList = ({ 
  conversations, 
  posts, 
  activeTab, 
  selectedItem, 
  onItemSelect, 
  loading 
}) => {
  const formatTime = (timestamp) => {
    if (!timestamp) return 'Invalid date';
    
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return 'Invalid date';
    
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const getCustomerName = (conversation) => {
    // For local database conversations
    if (conversation.customerName) {
      return conversation.customerName;
    }
    
    // For Facebook API conversations
    if (conversation.participants?.data) {
      const customer = conversation.participants.data.find(p => p.id !== conversation.pageId);
      return customer?.name || 'Unknown Customer';
    }
    
    return 'Unknown Customer';
  };

  const getLastMessage = (conversation) => {
    return conversation.lastMessage || 
           conversation.lastMessageContent || 
           'No messages yet';
  };

  const getLastMessageTime = (conversation) => {
    return conversation.lastMessageAt || 
           conversation.updated_time || 
           conversation.createdAt;
  };

  const getUnreadCount = (conversation) => {
    return conversation.unreadCount || 
           conversation.unread_count || 
           0;
  };

  const truncateText = (text, maxLength = 50) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  const items = activeTab === 'conversations' ? conversations : posts;

  if (items.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-3">
            {activeTab === 'conversations' ? '💬' : '📝'}
          </div>
          <p>
            No {activeTab === 'conversations' ? 'conversations' : 'posts'} found
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {activeTab === 'conversations' ? (
        // Conversations List
        conversations.map((conversation) => (
          <div
            key={conversation.id || conversation._id}
            onClick={() => onItemSelect(conversation)}
            className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
              selectedItem?.id === conversation.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-medium">
                  {getCustomerName(conversation).charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {getCustomerName(conversation)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatTime(getLastMessageTime(conversation))}
                  </p>
                </div>
                <p className="text-sm text-gray-600 truncate">
                  {truncateText(getLastMessage(conversation))}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    conversation.status === 'active' 
                      ? 'bg-green-100 text-green-800'
                      : conversation.status === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {conversation.status || 'pending'}
                  </span>
                  {getUnreadCount(conversation) > 0 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getUnreadCount(conversation)} unread
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))
      ) : (
        // Posts List
        posts.map((post) => (
          <div
            key={post.id}
            onClick={() => onItemSelect(post)}
            className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 ${
              selectedItem?.id === post.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-900">
                    {post.from?.name || 'Unknown'}
                  </span>
                  <span className="text-xs text-gray-500">
                    posted {formatTime(post.created_time)}
                  </span>
                </div>
                <div className="flex space-x-3 text-xs text-gray-500">
                  <span>💬 {post.comments_count || 0}</span>
                  <span>👍 {post.likes_count || 0}</span>
                </div>
              </div>
              
              {post.message && (
                <p className="text-sm text-gray-700">
                  {truncateText(post.message, 100)}
                </p>
              )}
              
              {post.story && !post.message && (
                <p className="text-sm text-gray-600 italic">
                  {truncateText(post.story, 100)}
                </p>
              )}
              
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {post.type || 'status'}
                </span>
                {post.comments_count > 0 && (
                  <span className="text-xs text-blue-600">
                    View {post.comments_count} comment{post.comments_count !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ConversationList;
