import React from 'react';
import ConversationImg from '../assets/conversation.jpg';
import userImage from '../assets/user.png';
import { RefreshCw } from 'lucide-react';

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
      return 'Now';
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
          <RefreshCw size={20} className="animate-spin text-gray-500 mx-auto" />
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
          const isSelected = selectedItem && selectedItem.type !== 'comments' && (
            selectedItem.id === item.id || 
            selectedItem.conversationId === item.id || 
            selectedItem.id === item.conversationId || 
            selectedItem.conversationId === item.conversationId ||
            selectedItem._id === item._id ||
            selectedItem._id === item.id ||
            selectedItem.id === item._id
          );
          
          return (
            <div
              key={`conv-${item.id || item._id}`}
              onClick={() => onItemSelect(item)}
              className={`flex flex-col py-4 px-4 w-full cursor-pointer hover:bg-[#F6F6F6] transition-all duration-200 ${
                isSelected ? 'bg-[#F6F6F6]' : ''
              }`}
            >
              {/* First Row: Checkbox, Name + Type, Time */}
              <div className="flex w-full items-start justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <input type="checkbox" className="h-4 w-4" />
                  <div className="flex flex-col items-start flex-1">
                    <span className="font-medium text-gray-900 text-base leading-tight">
                      {getCustomerName(item)}
                    </span>
                    <span className="text-sm text-gray-500 mt-0.5">Facebook DM</span>
                  </div>
                </div>
                <span className="text-sm text-gray-900 ml-2 mt-1">
                  {formatTime(getLastMessageTime(item))}
                </span>
              </div>
  
              {/* Second Row: Latest Message */}
              <div className="mt-2 pl-7">
                <span className="text-sm text-gray-600 leading-relaxed">
                  {truncateText(getLastMessage(item), 45)}
                </span>
              </div>
            </div>
          );
        } else {
          // Comment Item (from a Facebook user)
          const customerComments = item.comments.filter(c => c.from && c.from.id !== item.pageId).length;
          const pageReplies = item.comments.filter(c => c.from && c.from.id === item.pageId).length;
          const latestComment = item.comments[0]; // Comments are already sorted newest first
          
          const isSelected = selectedItem && selectedItem.type === 'comments' && 
            selectedItem.userId === item.userId;
          
          return (
            <div
              key={item.userId}
              onClick={() => onItemSelect({...item, type: 'comments'})}
              className={`flex flex-col py-4 px-4 w-full cursor-pointer hover:bg-[#F6F6F6] transition-all duration-200 ${
                isSelected ? 'bg-[#F6F6F6]' : ''
              }`}
            >
              {/* First Row: Checkbox, Name + Type, Time */}
              <div className="flex w-full items-start justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <input type="checkbox" className="h-4 w-4" />
                  <div className="flex flex-col items-start flex-1">
                    <span className="font-medium text-gray-900 text-base leading-tight">
                      {item.userName}
                    </span>
                    <span className="text-sm text-gray-500 mt-0.5">Facebook Post</span>
                  </div>
                </div>
                <span className="text-sm text-gray-900 ml-2 mt-1">
                  {latestComment ? formatTime(latestComment.createdTime) : ''}
                </span>
              </div>

              {/* Second Row: Latest Message */}
              <div className="mt-2 pl-7">
                <span className="text-sm text-gray-600 leading-relaxed">
                  {latestComment ? truncateText(latestComment.message, 45) : ''}
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
