import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import socketService from '../services/socketService';
import Card from './CommonComponents/Card';
import Button from './CommonComponents/Button';
import userImage from '../assets/user.png';
import { SendHorizontal } from 'lucide-react';

const SelfMessage = ({ message, senderName, profilePic }) => {
  const formatDateTime = () => {
    // Try all possible timestamp fields
    const timestamp = message.timestamp || message.created_time || message.createdAt;
    console.log('Using timestamp:', timestamp);
    
    // If no timestamp is available, create one for demo purposes
    if (!timestamp) {
      console.log('No valid timestamp found, using current date');
      const demoDate = new Date(); // Current date and time
      const month = demoDate.toLocaleString('en-US', { month: 'short' });
      const day = demoDate.getDate().toString().padStart(2, '0');
      const time = demoDate.toLocaleString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      return `${month} ${day}, ${time}`;
    }
    
    try {
      const date = new Date(timestamp);
      
      if (isNaN(date.getTime())) {
        console.log('Invalid date from timestamp, using current date');
        const demoDate = new Date(); // Use current date as fallback
        const month = demoDate.toLocaleString('en-US', { month: 'short' });
        const day = demoDate.getDate().toString().padStart(2, '0');
        const time = demoDate.toLocaleString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        });
        return `${month} ${day}, ${time}`;
      }
      
      // Format: Mar 05, 2:22 AM
      const month = date.toLocaleString('en-US', { month: 'short' });
      const day = date.getDate().toString().padStart(2, '0');
      const time = date.toLocaleString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      
      return `${month} ${day}, ${time}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      // Fallback to current date
      const demoDate = new Date();
      const month = demoDate.toLocaleString('en-US', { month: 'short' });
      const day = demoDate.getDate().toString().padStart(2, '0');
      const time = demoDate.toLocaleString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      return `${month} ${day}, ${time}`;
    }
  };
  
  return (
    <div className="text-black text-left ml-auto p-2 flex flex-col items-end w-full">
      <div className="flex gap-4 justify-end">
        <div className="flex flex-col gap-4 items-end max-w-[100%]">
          <Card className="py-2 px-4 shadow-sm">
            {message.message || message.content}
          </Card>
        </div>
        <div className="mt-auto">
          <img alt="user" src={profilePic || userImage} className="h-10 w-10 rounded-full object-cover" />
        </div>
      </div>
      <div className="flex gap-2 justify-end mr-14 mt-2">
        <span className="font-medium">{senderName || 'You'}</span>
        <span>- {formatDateTime()}</span>
      </div>
    </div>
  );
};

const OthersMessage = ({ message, senderName, profilePic }) => {
  const formatDateTime = () => {
    // Try all possible timestamp fields
    const timestamp = message.timestamp || message.created_time || message.createdAt;
    console.log('Using timestamp:', timestamp);
    
    // If no timestamp is available, create one for demo purposes
    if (!timestamp) {
      console.log('No valid timestamp found, using current date');
      const demoDate = new Date(); // Current date and time
      const month = demoDate.toLocaleString('en-US', { month: 'short' });
      const day = demoDate.getDate().toString().padStart(2, '0');
      const time = demoDate.toLocaleString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      return `${month} ${day}, ${time}`;
    }
    
    try {
      const date = new Date(timestamp);
      
      if (isNaN(date.getTime())) {
        console.log('Invalid date from timestamp, using current date');
        const demoDate = new Date(); // Use current date as fallback
        const month = demoDate.toLocaleString('en-US', { month: 'short' });
        const day = demoDate.getDate().toString().padStart(2, '0');
        const time = demoDate.toLocaleString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        });
        return `${month} ${day}, ${time}`;
      }
      
      // Format: Mar 05, 2:22 AM
      const month = date.toLocaleString('en-US', { month: 'short' });
      const day = date.getDate().toString().padStart(2, '0');
      const time = date.toLocaleString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      
      return `${month} ${day}, ${time}`;
    } catch (error) {
      console.error('Error formatting date:', error);
      // Fallback to current date
      const demoDate = new Date();
      const month = demoDate.toLocaleString('en-US', { month: 'short' });
      const day = demoDate.getDate().toString().padStart(2, '0');
      const time = demoDate.toLocaleString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit', 
        hour12: true 
      });
      return `${month} ${day}, ${time}`;
    }
  };
  
  return (
    <div className="text-black text-left p-2 flex flex-col items-start w-full">
      <div className="flex gap-4 w-full justify-start">
        <div className="mt-auto">
          <img alt="user" src={profilePic || userImage} className="h-10 w-10 rounded-full object-cover" />
        </div>
        <div className="flex flex-col gap-4 items-start max-w-[60%]">
          <Card className="py-2 px-4 shadow-sm">
            {message.message || message.content}
          </Card>
        </div>
      </div>
      <div className="flex gap-2 justify-start ml-14 mt-2">
        <span className="font-medium">{senderName || 'Customer'}</span>
        <span className="opacity-60">- {formatDateTime()}</span>
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
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
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
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`;
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
      // Log detailed error information
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
    <div className="flex flex-col w-full relative bg-[#F6F6F6] h-full">
      {/* Header */}
      <div className="flex w-full p-3 border-b border-black">
        <h1 className="text-xl font-semibold opacity-65">
          {type === 'conversation' 
            ? item.customerName || 'Unknown Customer'
            : `Post by ${item.from?.name || 'Unknown'}`
          }
        </h1>
      </div>

      {/* Messages/Comments Area */}
      <div 
        ref={chatBoxRef}
        className="flex flex-col items-start gap-2 pb-20 relative p-3 overflow-scroll h-[80%]"
      >
        {loading ? (
          <div className="flex justify-center w-full py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
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
                  // Log full message object to inspect available fields
                  console.log('Message object:', message);
                  
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
                    
                  // Check available timestamp fields
                  console.log('Timestamp fields:', {
                    timestamp: message.timestamp,
                    created_time: message.created_time,
                    createdAt: message.createdAt
                  });

                  return isFromPage ? (
                    <SelfMessage 
                      key={message.id || message._id || index}
                      message={message}
                      senderName={senderName}
                      profilePic={profilePic}
                    />
                  ) : (
                    <OthersMessage
                      key={message.id || message._id || index}
                      message={message}
                      senderName={senderName}
                      profilePic={profilePic}
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
                  <div key={comment.id || index} className="border-l-4 border-gray-200 pl-4 w-full">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium">
                            {comment.from?.name?.charAt(0) || '?'}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="bg-gray-100 rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-sm font-medium">{comment.from?.name || 'Unknown'}</span>
                            <span className="text-xs text-gray-500">{formatTime(comment.created_time)}</span>
                          </div>
                          <p className="text-sm">{comment.message}</p>
                        </div>
                        
                        {/* Comment actions */}
                        <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                          <button 
                            onClick={() => handleReplyToComment(comment.id)}
                            className="hover:text-primary"
                          >
                            Reply
                          </button>
                          <span>👍 {comment.like_count || 0}</span>
                          {comment.comment_count > 0 && (
                            <span>{comment.comment_count} replies</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form
        className="w-[97%] absolute left-[50%] bottom-5 translate-x-[-50%]"
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
      >
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={`Message ${item?.customerName || 'Customer'}...`}
          className="w-full border border-primary rounded-md p-2 focus:outline-none focus:ring-1 focus:ring-primary"
          disabled={sending}
        />
        <Button
          className="absolute right-0 top-0"
          onClick={handleSendMessage}
          disabled={!newMessage.trim() || sending}
          loading={sending}
        >
          <SendHorizontal size={18} />
        </Button>
      </form>
    </div>
  );
};

export default ChatInterface;
