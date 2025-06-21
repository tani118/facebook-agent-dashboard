import React from 'react';
import ConversationImg from '../assets/conversation.jpg';

const EmptyChat = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[80%] opacity-60">
      <img src={ConversationImg} alt="Empty conversation" className="h-32 w-32" />
      <span>No conversation has started yet.</span>
    </div>
  );
};

const ConversationList = ({ 
  conversations, 
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
      return `${Math.floor(diffInHours)}h`;
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // For comments tab, we don't show conversations in the sidebar
  if (activeTab === 'comments') {
    return null;
  }

  if (conversations.length === 0) {
    return <EmptyChat />;
  }

  return (
    <div className="flex-1 overflow-y-auto flex flex-col items-start">
      {conversations.map((conversation) => (
        <div
          key={conversation.id || conversation._id}
          onClick={() => onItemSelect(conversation)}
          className={`flex flex-col p-4 w-full border-b cursor-pointer hover:bg-[#F6F6F6] transition-all duration-200 ${
            selectedItem?.id === conversation.id || selectedItem?.conversationId === conversation.id ? 'bg-[#F6F6F6]' : ''
          }`}
        >
          <div className="flex w-full items-center gap-3">
            <input type="checkbox" className="h-4 w-4" />
            <div className="flex flex-col items-start w-[80%]">
              <span className="max-w-[100%] overflow-hidden text-left font-medium">
                {getCustomerName(conversation)}
              </span>
              <span className="text-sm font-medium">Facebook DM</span>
            </div>
            <span className="text-sm mb-4 opacity-60">
              {formatTime(getLastMessageTime(conversation))}
            </span>
          </div>

          <div className="mr-auto text-left pl-7">
            <span className="text-sm opacity-60 text-left">
              {truncateText(getLastMessage(conversation))}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ConversationList;
