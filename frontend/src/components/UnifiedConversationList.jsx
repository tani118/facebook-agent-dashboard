import React from 'react';
import ConversationImg from '../assets/conversation.jpg';
import userImage from '../assets/user.png';

const EmptyChat = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[80%] opacity-60">
      <img src={ConversationImg} alt="Empty conversation" className="h-32 w-32" />
      <span>No conversation has started yet.</span>
    </div>
  );
};

const UnifiedConversationList = ({ 
  conversations, 
  commentUsers,
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
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d`;
    } else {
      return date.toLocaleDateString();
    }
  };
  
  const getCustomerName = (item) => {
    return item.customerName || 
           `${item.customerFirstName || ''} ${item.customerLastName || ''}`.trim() || 
           'Unknown Customer';
  };
  
  const getLastMessage = (item) => {
    return item.lastMessageContent || 'No message content';
  };
  
  const getLastMessageTime = (item) => {
    return item.lastMessageAt || item.updatedAt || item.updated_time || new Date().toISOString();
  };
  
  const truncateText = (text, maxLength = 30) => {
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

  // If no data to display
  if (conversations.length === 0 && commentUsers.length === 0) {
    return <EmptyChat />;
  }

  // Combine conversations and comments into a unified list
  const allItems = [
    ...conversations.map(conv => ({ ...conv, type: 'conversation' })),
    ...commentUsers.map(comment => ({ ...comment, type: 'comments' }))
  ];
  
  // Sort by timestamp (newest first)
  const sortedItems = allItems.sort((a, b) => {
    const aTime = a.lastMessageAt || a.lastCommentTime || a.updatedAt || new Date(0);
    const bTime = b.lastMessageAt || b.lastCommentTime || b.updatedAt || new Date(0);
    return new Date(bTime) - new Date(aTime);
  });

  return (
    <div className="flex-1 overflow-y-auto flex flex-col items-start">
      {sortedItems.map((item) => {
        if (item.type === 'conversation') {
          // Conversation Item
          return (
            <div
              key={`conv-${item.id || item._id}`}
              onClick={() => onItemSelect(item)}
              className={`flex flex-col py-5 px-4 w-full border-b cursor-pointer hover:bg-[#F6F6F6] transition-all duration-200 ${
                selectedItem?.id === item.id || selectedItem?.conversationId === item.id ? 'bg-[#F6F6F6]' : ''
              }`}
            >
              <div className="flex w-full items-center gap-3">
                <input type="checkbox" className="h-5 w-5" />
                <div className="flex flex-col items-start w-[80%]">
                  <span className="max-w-[100%] overflow-hidden text-left font-medium text-lg">
                    {getCustomerName(item)}
                  </span>
                  <span className="text-sm text-gray-600 mt-1">Facebook DM</span>
                </div>
                <span className="text-sm text-gray-500">
                  {formatTime(getLastMessageTime(item))}
                </span>
              </div>
  
              <div className="mr-auto text-left pl-7 mt-1">
                <span className="text-base opacity-60 text-left">
                  {truncateText(getLastMessage(item), 40)}
                </span>
              </div>
            </div>
          );
        } else {
          // Comment Item (from a Facebook user)
          const customerComments = item.comments.filter(c => c.from && c.from.id !== item.pageId).length;
          const pageReplies = item.comments.filter(c => c.from && c.from.id === item.pageId).length;
          const latestComment = item.comments[0]; // Comments are already sorted newest first
          
          return (
            <div
              key={item.userId}
              onClick={() => onItemSelect({...item, type: 'comments'})}
              className={`flex flex-col py-5 px-4 w-full border-b cursor-pointer hover:bg-[#F6F6F6] transition-all duration-200 ${
                selectedItem?.userId === item.userId ? 'bg-[#F6F6F6]' : ''
              }`}
            >
              <div className="flex w-full items-center gap-3">
                <input type="checkbox" className="h-5 w-5" />
                <div className="flex flex-col items-start w-[80%]">
                  <span className="max-w-[100%] overflow-hidden text-left font-medium text-lg">
                    {item.userName}
                  </span>
                  <span className="text-sm text-gray-600 mt-1">Facebook Post</span>
                </div>
                <span className="text-sm text-gray-500">
                  {latestComment ? formatTime(latestComment.createdTime) : ''}
                </span>
              </div>

              <div className="mr-auto text-left pl-7 mt-1">
                <span className="text-base opacity-60 text-left">
                  {latestComment ? truncateText(latestComment.message, 40) : ''}
                </span>
              </div>
            </div>
          );
        }
      })}
    </div>
  );
};

export default UnifiedConversationList;
