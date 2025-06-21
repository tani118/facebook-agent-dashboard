import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import socketService from '../services/socketService';

const ChatInterface = ({ item, type, pageId, pageAccessToken }) => {
  const [messages, setMessages] = useState([]);
  const [comments, setComments] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

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
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
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
    if (!item.id || !pageId) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`/posts/${pageId}/${item.id}/comments`);
      if (response.data.success) {
        setComments(response.data.comments || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
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
        
        const response = await axios.post(`/facebook/conversations/${item.id}/send`, {
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
    <div className="flex-1 flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {type === 'conversation' 
                ? item.customerName || 'Unknown Customer'
                : `Post by ${item.from?.name || 'Unknown'}`
              }
            </h2>
            <p className="text-sm text-gray-500">
              {type === 'conversation' 
                ? `Conversation • ${item.status || 'pending'}`
                : `${formatTime(item.created_time)} • ${comments.length} comments`
              }
            </p>
          </div>
        </div>
        
        {/* Show post content if it's a post */}
        {type === 'post' && item.message && (
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-700">{item.message}</p>
          </div>
        )}
      </div>

      {/* Messages/Comments Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {type === 'conversation' ? (
              // Messages
              messages.length === 0 ? (
                <div className="text-center text-gray-500">
                  <p>No messages in this conversation yet</p>
                </div>
              ) : (
                messages.map((message, index) => {
                // Handle both local database and Facebook API message formats
                const isFromPage = message.from?.id === pageId || 
                                  message.senderId === pageId || 
                                  message.senderType === 'page';
                
                const messageText = message.message || message.content || message.text;
                const messageTime = message.created_time || message.timestamp || message.createdAt;
                const senderName = message.from?.name || message.senderName || 
                                 (isFromPage ? 'You' : 'Customer');

                return (
                  <div
                    key={message.id || message._id || index}
                    className={`flex ${isFromPage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md ${!isFromPage ? 'mr-auto' : 'ml-auto'}`}>
                      {!isFromPage && (
                        <p className="text-xs text-gray-500 mb-1 px-1">{senderName}</p>
                      )}
                      <div
                        className={`px-4 py-2 rounded-lg ${
                          isFromPage
                            ? 'bg-blue-500 text-white rounded-br-sm'
                            : 'bg-gray-200 text-gray-900 rounded-bl-sm'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap">{messageText}</p>
                        <p className={`text-xs mt-1 ${
                          isFromPage ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {formatTime(messageTime)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })
              )
            ) : (
              // Comments
              comments.length === 0 ? (
                <div className="text-center text-gray-500">
                  <p>No comments on this post yet</p>
                </div>
              ) : (
                comments.map((comment, index) => (
                  <div key={comment.id || index} className="border-l-4 border-gray-200 pl-4">
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
                            className="hover:text-blue-600"
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
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex space-x-3">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={
              type === 'conversation' 
                ? "Type a message..." 
                : "Write a comment..."
            }
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={sending}
          />
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || sending}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-2 rounded-md font-medium transition-colors"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
