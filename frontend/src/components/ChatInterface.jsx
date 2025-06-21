import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

const ChatInterface = ({ item, type, pageId }) => {
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

  const fetchMessages = async () => {
    if (!item.id) return;
    
    setLoading(true);
    try {
      const response = await axios.get(`/facebook/messages/${item.id}`);
      if (response.data.success) {
        setMessages(response.data.data.data || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
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
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      if (type === 'conversation') {
        const response = await axios.post('/facebook/send-message', {
          conversationId: item.id,
          message: newMessage
        });
        
        if (response.data.success) {
          setNewMessage('');
          fetchMessages(); // Refresh messages
        }
      } else {
        // For posts, we'll reply to the post itself (or could be modified to reply to specific comments)
        const response = await axios.post(`/posts/${pageId}/comments/${comments[0]?.id || item.id}/reply`, {
          message: newMessage
        });
        
        if (response.data.success) {
          setNewMessage('');
          fetchComments(); // Refresh comments
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
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

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleString();
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
                messages.map((message, index) => (
                  <div
                    key={message.id || index}
                    className={`flex ${message.from?.id === pageId ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.from?.id === pageId
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.message}</p>
                      <p className={`text-xs mt-1 ${
                        message.from?.id === pageId ? 'text-blue-100' : 'text-gray-500'
                      }`}>
                        {formatTime(message.created_time)}
                      </p>
                    </div>
                  </div>
                ))
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
