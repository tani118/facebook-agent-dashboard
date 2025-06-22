// filepath: /home/lakshya/Desktop/rich-panel/v3/facebook-agent-dashboard/frontend/src/components/ChatInterface.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import socketService from '../services/socketService';
import userImage from '../assets/user.png';
import { SendHorizontal, RefreshCw } from 'lucide-react';

// Format the message timestamps
const formatMessageTime = (time) => {
  try {
    const date = new Date(time);
    const currentDate = new Date();
    const year = date.getFullYear();

    // If the year is the current year
    if (year === currentDate.getFullYear() || isNaN(date.getTime())) {
      // If date is invalid, use current date as fallback
      const dateToUse = isNaN(date.getTime()) ? currentDate : date;
      
      return `${dateToUse.toLocaleString("en-US", {
        month: "short",
        day: "2-digit",
      })}, ${dateToUse.toLocaleString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })}`;
    } else {
      return `${date.toLocaleString("en-US", {
        year: "2-digit",
        month: "2-digit",
        day: "2-digit",
      })}, ${date.toLocaleString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })}`;
    }
  } catch (error) {
    console.error('Error formatting date:', error);
    // Fallback to current date
    const currentDate = new Date();
    return `${currentDate.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
    })}, ${currentDate.toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })}`;
  }
};

const SelfMessage = ({ message, senderName, profilePic, type = "both" }) => {
  // Determine if icon and time should be visible based on message type
  const isIconVisible = type === "both" || type === "last";
  const isTimeVisible = type === "both" || type === "last";
  
  const timestamp = message.timestamp || message.created_time || message.createdAt || new Date().toString();
  
  return (
    <div className={`flex flex-col items-end ${type === "last" || type === "both" ? "mb-8" : "mb-1"}`}>
      <div className="w-fit items-start gap-3 max-w-[80%] flex">
        <div className="flex flex-col items-end" title={formatMessageTime(timestamp)}>
          <div className="border bg-white rounded-lg p-2 w-fit">
            {message.message || message.content}
          </div>
          {isTimeVisible && (
            <div className="px-2">
              <span className="text-xs text-gray-800 font-medium">{senderName || 'You'}</span>
              <span className="text-xs text-gray-800"> - {formatMessageTime(timestamp)}</span>
            </div>
          )}
        </div>
        <img 
          src={profilePic || userImage} 
          alt="profile-icon" 
          className={`${!isIconVisible && "invisible"} rounded-full aspect-square w-8 object-cover my-[6px]`}
        />
      </div>
    </div>
  );
};

const OthersMessage = ({ message, senderName, profilePic, type = "both" }) => {
  const timestamp = message.timestamp || message.created_time || message.createdAt || new Date().toString();
  // Determine if icon and time should be visible based on message type
  const isIconVisible = type === "both" || type === "first";
  const isTimeVisible = type === "both" || type === "last";
  
  return (
    <div className={`flex flex-col ${type === "last" || type === "both" ? "mb-8" : "mb-1"}`}>
      <div className="w-fit items-start gap-3 max-w-[80%] flex flex-row-reverse">
        <div className="flex flex-col" title={formatMessageTime(timestamp)}>
          <div className="border bg-white rounded-lg p-2 w-fit">
            {message.message || message.content}
          </div>
          {isTimeVisible && (
            <div className="px-2">
              <span className="text-xs text-gray-800 font-medium">{senderName || 'Customer'}</span>
              <span className="text-xs text-gray-800"> - {formatMessageTime(timestamp)}</span>
            </div>
          )}
        </div>
        <img 
          src={profilePic || userImage} 
          alt="profile-icon" 
          className={`${!isIconVisible && "invisible"} rounded-full aspect-square w-8 object-cover my-[6px]`}
        />
      </div>
    </div>
  );
};

const ChatInterface = ({ item, type, pageId, pageAccessToken }) => {
  const [messages, setMessages] = useState([]);
  const [comments, setComments] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const chatBoxRef = useRef(null);

  useEffect(() => {
    if (item) {
      if (type === 'conversation') {
        fetchMessages();
        
        // Set up real-time message handler for this conversation
        const handleNewMessage = (data) => {
          if (data.conversationId === item.conversationId || data.conversationId === item.id) {
            console.log('📩 Received new message for current conversation:', data);
            
            // Filter out messages from the current page (your own messages)
            if (data.message.senderId === pageId || data.message.type === 'outgoing') {
              console.log('🚫 Ignoring own message from socket event');
              return;
            }
            
            // Add the new message to the current messages
            setMessages(prevMessages => {
              // Check if message already exists to avoid duplicates
              const messageExists = prevMessages.some(msg => 
                msg.messageId === data.message.messageId || 
                msg.id === data.message.messageId
              );
              
              if (!messageExists) {
                const newMsg = {
                  messageId: data.message.messageId,
                  senderId: data.message.senderId,
                  senderName: data.message.senderName,
                  message: data.message.content,
                  content: data.message.content,
                  timestamp: data.message.timestamp,
                  created_time: data.message.timestamp,
                  type: data.message.type
                };
                
                // Insert in chronological order
                const updated = [...prevMessages, newMsg];
                return updated.sort((a, b) => 
                  new Date(a.timestamp || a.created_time) - new Date(b.timestamp || b.created_time)
                );
              }
              
              return prevMessages;
            });
          }
        };
        
        socketService.on('new-message', handleNewMessage);
        
        return () => {
          socketService.off('new-message', handleNewMessage);
        };
      } else {
        fetchComments();
      }
    }
  }, [item, type]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, comments]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'instant' });
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';
    
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

  const fetchMessages = async () => {
    if (!item.id && !item.conversationId) {
      console.error('Missing conversation ID');
      return;
    }
    
    setLoading(true);
    try {
      const conversationId = item.conversationId || item.id;
      
      // First try to sync messages from Facebook API
      if (pageAccessToken && pageId) {
        try {
          await axios.post(`/conversations/${conversationId}/sync-messages`, {
            pageAccessToken: pageAccessToken,
            pageId: pageId,
            limit: 25
          });
        } catch (syncError) {
          console.log('Sync failed, continuing with local data:', syncError.message);
        }
      }

      // Then fetch messages from local database
      const response = await axios.get(`/conversations/${conversationId}/messages`, {
        params: {
          pageId: pageId,
          limit: 25
        }
      });
      
      if (response.data.success) {
        // Sort messages by timestamp in ascending order (oldest first for chat display)
        const sortedMessages = (response.data.data.messages || [])
          .sort((a, b) => new Date(a.timestamp || a.created_time) - new Date(b.timestamp || b.created_time));
        setMessages(sortedMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Fallback to direct Facebook API
      if (pageAccessToken) {
        try {
          const fallbackResponse = await axios.get(`/facebook/conversations/${conversationId}/messages`, {
            params: {
              pageAccessToken: pageAccessToken,
              limit: 25
            }
          });
          if (fallbackResponse.data.success) {
            // Sort Facebook API messages by timestamp (oldest first)
            const sortedMessages = (fallbackResponse.data.data.data || [])
              .sort((a, b) => new Date(a.created_time) - new Date(b.created_time));
            setMessages(sortedMessages);
          }
        } catch (fallbackError) {
          console.error('Fallback also failed:', fallbackError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    if (!item.id || !pageId || !pageAccessToken) {
      console.error('Missing required data for fetching comments:', { 
        itemId: !!item.id, 
        pageId: !!pageId, 
        pageAccessToken: !!pageAccessToken 
      });
      return;
    }
    
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No authentication token found');
        return;
      }

      const response = await axios.get(`/posts/${pageId}/${item.id}/comments`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          limit: 25,
          pageAccessToken: pageAccessToken
        }
      });
      
      if (response.data.success) {
        setComments(response.data.comments || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        console.error('Error status:', error.response.status);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || !pageAccessToken) return;

    setSending(true);
    const messageText = newMessage.trim();
    
    try {
      if (type === 'conversation') {
        // Clear input immediately for better UX
        setNewMessage('');
        
        // Add optimistic message update (will be confirmed via WebSocket)
        const optimisticMessage = {
          messageId: `temp-${Date.now()}`,
          senderId: pageId,
          senderName: 'You',
          message: messageText,
          content: messageText,
          timestamp: new Date().toISOString(),
          type: 'outgoing',
          pending: true
        };
        
        setMessages(prevMessages => {
          const updated = [...prevMessages, optimisticMessage];
          return updated.sort((a, b) => 
            new Date(a.timestamp || a.created_time) - new Date(b.timestamp || b.created_time)
          );
        });
        
        // Use conversationId for conversations, id for posts
        const conversationId = item.conversationId || item.id;
        
        const response = await axios.post(`/facebook/conversations/${conversationId}/send`, {
          message: messageText,
          pageAccessToken: pageAccessToken,
          pageId: pageId
        });
        
        if (response.data.success) {
          // Remove the optimistic message as the real one will come via WebSocket
          setMessages(prevMessages => 
            prevMessages.filter(msg => msg.messageId !== optimisticMessage.messageId)
          );
        } else {
          // Remove optimistic message on failure
          setMessages(prevMessages => 
            prevMessages.filter(msg => msg.messageId !== optimisticMessage.messageId)
          );
          setNewMessage(messageText); // Restore the message
        }
      } else {
        // For posts, we'll reply to the post itself (or could be modified to reply to specific comments)
        const response = await axios.post(`/posts/${pageId}/comments/${comments[0]?.id || item.id}/reply`, {
          message: messageText
        });
        
        if (response.data.success) {
          setNewMessage('');
          fetchComments(); // Refresh comments
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // On error, restore the message and remove optimistic update
      if (type === 'conversation') {
        setMessages(prevMessages => 
          prevMessages.filter(msg => !msg.pending)
        );
        setNewMessage(messageText);
      }
    } finally {
      setSending(false);
    }
  };

  const handleReplyToComment = async (commentId) => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const response = await axios.post(`/posts/${pageId}/comments/${commentId}/reply`, {
        message: newMessage
      });
      
      if (response.data.success) {
        setNewMessage('');
        fetchComments(); // Refresh comments
      }
    } catch (error) {
      console.error('Error replying to comment:', error);
    } finally {
      setSending(false);
    }
  };

  if (!item) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-gray-500">Select an item to view details</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 flex-1 h-full flex flex-col">
      {/* Header */}
      <div className="px-8 py-4 border-b bg-white">
        <span className="text-xl font-semibold">
          {type === 'conversation' 
            ? item.customerName || 'Unknown Customer'
            : `Post by ${item.from?.name || 'Unknown'}`
          }
        </span>
      </div>

      {/* Messages/Comments Area */}
      <div 
        ref={chatBoxRef}
        className="flex flex-col flex-grow overflow-y-auto justify-between"
      >
        <div className="flex flex-col pt-4 px-8">
          {loading ? (
            <div className="flex justify-center w-full py-4">
              <RefreshCw size={20} className="animate-spin text-gray-500" />
            </div>
          ) : (
            <>
              {type === 'conversation' ? (
                // Messages
                messages.length === 0 ? (
                  <div className="text-center text-gray-500 p-10 w-full">
                    <p>No messages in this conversation yet</p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    // Handle both local database and Facebook API message formats
                    const isFromPage = message.from?.id === pageId || 
                                      message.senderId === pageId || 
                                      message.senderType === 'page';
                    
                    const senderName = message.from?.name || message.senderName || 
                                     (isFromPage ? 'You' : item.customerName || 'Customer');
                    
                    // Get profile pictures
                    const profilePic = isFromPage 
                      ? item.pageProfilePic // Page profile pic
                      : item.customerProfilePic || message.profilePic || message.from?.profile_pic; // Customer profile pic

                    // Determine message type for styling
                    let messageType = "both";
                    
                    // Helper function to check if two messages are within 2 minutes
                    const isWithinTimeLimit = (msg1, msg2) => {
                      if (!msg1 || !msg2) return false;
                      const time1 = new Date(msg1.timestamp || msg1.created_time || msg1.createdAt).getTime();
                      const time2 = new Date(msg2.timestamp || msg2.created_time || msg2.createdAt).getTime();
                      const diffInMinutes = Math.abs(time1 - time2) / (1000 * 60);
                      return diffInMinutes <= 2;
                    };
                    
                    if (index >= 0 && index < messages.length) {
                      const prevMessage = index > 0 ? messages[index - 1] : null;
                      const nextMessage = index < messages.length - 1 ? messages[index + 1] : null;
                      
                      const prevFromSameUser = prevMessage && (
                        (prevMessage.from?.id === message.from?.id) ||
                        (prevMessage.senderId === message.senderId)
                      ) && isWithinTimeLimit(message, prevMessage);
                      
                      const nextFromSameUser = nextMessage && (
                        (nextMessage.from?.id === message.from?.id) ||
                        (nextMessage.senderId === message.senderId)
                      ) && isWithinTimeLimit(message, nextMessage);
                      
                      if (prevFromSameUser && nextFromSameUser) {
                        messageType = "none";
                      } else if (prevFromSameUser) {
                        messageType = "last";
                      } else if (nextFromSameUser) {
                        messageType = "first";
                      }
                    }

                    return isFromPage ? (
                      <SelfMessage 
                        key={message.id || message._id || index}
                        message={message}
                        senderName={senderName}
                        profilePic={profilePic}
                        type={messageType}
                      />
                    ) : (
                      <OthersMessage
                        key={message.id || message._id || index}
                        message={message}
                        senderName={senderName}
                        profilePic={profilePic}
                        type={messageType}
                      />
                    );
                  })
                )
              ) : (
                // Comments
                comments.length === 0 ? (
                  <div className="text-center text-gray-500 p-10 w-full">
                    <p>No comments on this post yet</p>
                  </div>
                ) : (
                  comments.map((comment, index) => (
                    <div key={comment.id || index} className="border-l-4 border-gray-200 pl-4 w-full mb-4">
                      <div className="flex items-start gap-3">
                        <img 
                          src={comment.from?.profile_pic || userImage} 
                          alt="profile-icon" 
                          className="rounded-full aspect-square w-8 object-cover"
                        />
                        <div className="flex-1">
                          <div className="border bg-white rounded-lg p-2">
                            <p>{comment.message}</p>
                          </div>
                          <div className="px-2">
                            <span className="text-xs text-gray-800 font-medium">{comment.from?.name || 'Unknown'}</span>
                            <span className="text-xs text-gray-800"> - {formatTime(comment.created_time)}</span>
                          </div>
                          
                          {/* Comment actions */}
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <button 
                              onClick={() => handleReplyToComment(comment.id)}
                              className="hover:text-primary"
                            >
                              Reply
                            </button>
                            <span>👍 {comment.like_count || 0}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )
              )}
            </>
          )}
          <span ref={messagesEndRef} />
        </div>
      </div>

      {/* Message Input */}
      <div className="w-full max-w-[800px] self-center my-4 mx-8">
        <div className="w-full p-2 rounded-md border border-gray-300 outline-blue-600/60 bg-white">
          <form 
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
          >
            <input
              type="text"
              value={newMessage}
              onChange={(e) => {
                // Limit message length if needed
                if (e.target.value.length < 2000) {
                  setNewMessage(e.target.value);
                }
              }}
              placeholder="Message Here"
              className="w-full outline-none"
              disabled={sending}
            />
            <button 
              type="submit" 
              disabled={!newMessage.trim() || sending}
            >
              <SendHorizontal size={20} className="text-[#044080f5]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
