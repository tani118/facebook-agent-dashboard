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

const SelfMessage = ({ message, senderName, profilePic, type = "both", isComment = false }) => {
  // Determine if icon and time should be visible based on message type
  const isIconVisible = type === "both" || type === "last";
  const isTimeVisible = type === "both" || type === "last";
  
  const timestamp = message.timestamp || message.created_time || message.createdAt || new Date().toString();
  
  return (
    <div className={`flex flex-col items-end ${type === "last" || type === "both" ? "mb-8" : "mb-1"}`}>
      <div className="w-fit items-start gap-3 max-w-[80%] flex">
        <div className="flex flex-col items-end" title={formatMessageTime(timestamp)}>
          <div className="rounded-lg p-2 w-fit bg-gray-100 text-gray-800 border border-gray-200">
            {message.message || message.content}
          </div>
          {isTimeVisible && (
            <div className="px-2 mt-1">
              <span className="text-xs text-gray-800 font-medium">{senderName || 'You'}</span>
              <span className="text-xs text-gray-800"> - {formatMessageTime(timestamp)}</span>
            </div>
          )}
        </div>
        <img 
          src={profilePic || userImage} 
          alt="profile-icon" 
          className={`${!isIconVisible ? "invisible" : ""} rounded-full aspect-square w-8 h-8 object-cover my-[6px]`}
        />
      </div>
    </div>
  );
};

const OthersMessage = ({ message, senderName, profilePic, type = "both", isComment = false, isReply = false }) => {
  const timestamp = message.timestamp || message.created_time || message.createdAt || new Date().toString();
  // Determine if icon and time should be visible based on message type
  const isIconVisible = type === "both" || type === "first";
  const isTimeVisible = type === "both" || type === "last";
  
  return (
    <div className={`flex flex-col ${type === "last" || type === "both" ? "mb-8" : "mb-1"} ${isReply ? 'pl-8' : ''}`}>
      <div className="w-fit items-start gap-3 max-w-[80%] flex flex-row-reverse">
        <div className="flex flex-col" title={formatMessageTime(timestamp)}>
          {isReply && (
            <div className="text-xs text-gray-600 mb-1">
              ↳ Reply to comment
            </div>
          )}
          <div className="rounded-lg p-2 w-fit bg-white border border-gray-200">
            {message.message || message.content}
          </div>
          {isTimeVisible && (
            <div className="px-2 mt-1">
              <span className="text-xs text-gray-800 font-medium">{senderName || 'Customer'}</span>
              <span className="text-xs text-gray-800"> - {formatMessageTime(timestamp)}</span>
            </div>
          )}
        </div>
        <img 
          src={profilePic || userImage} 
          alt="profile-icon" 
          className={`${!isIconVisible ? "invisible" : ""} rounded-full aspect-square w-8 h-8 object-cover my-[6px]`}
        />
      </div>
    </div>
  );
};

const PostHeader = ({ post }) => {
  return (
    <div className="text-center my-4">
      <div className="inline-block px-3 py-1 bg-gray-50 text-gray-500 text-xs rounded border border-gray-200">
        Post: {post.postMessage ? post.postMessage.substring(0, 50) + (post.postMessage.length > 50 ? '...' : '') : post.id}
      </div>
    </div>
  );
};

const UnifiedChatInterface = ({ item, type, pageId, pageAccessToken, selectedPage }) => {
  const [messages, setMessages] = useState([]);
  const [comments, setComments] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedCommentForReply, setSelectedCommentForReply] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const messagesEndRef = useRef(null);
  const chatBoxRef = useRef(null);
  
  // Group comments by postId for organization
  const groupedComments = comments.reduce((groups, comment) => {
    const postId = comment.postId;
    if (!groups[postId]) {
      groups[postId] = {
        postId: postId,
        postMessage: comment.postMessage || 'Unknown Post',
        postCreatedTime: comment.postCreatedTime,
        comments: []
      };
    }
    groups[postId].comments.push(comment);
    return groups;
  }, {});

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
      } else if (type === 'comments') {
        fetchComments();
        
        // Set up real-time comment notifications
        const handleNewComment = (data) => {
          console.log('📩 New comment/reply received:', data);
          
          // Auto-refresh comments after a short delay
          setTimeout(() => {
            fetchComments();
          }, 2000);
        };
        
        socketService.on('new-comment', handleNewComment);
        
        return () => {
          socketService.off('new-comment', handleNewComment);
        };
      }
    }
  }, [item, type]);

  useEffect(() => {
    scrollToBottom();
    // Clear selected comment when switching items
    setSelectedCommentForReply(null);
  }, [messages, comments]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
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
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL || ''}/comments/${pageId}/all`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          pageAccessToken: pageAccessToken,
          limit: 50
        }
      });
      
      if (response.data.success) {
        console.log('📊 Comments data received:', response.data.data);
        // Filter to only show the comments from the selected user
        const userComments = response.data.data.userComments.find(
          userGroup => userGroup.userId === item.userId
        );
        
        if (userComments) {
          // Sort comments by timestamp
          const sortedComments = userComments.comments.sort(
            (a, b) => new Date(a.createdTime) - new Date(b.createdTime)
          );
          setComments(sortedComments);
        } else {
          setComments([]);
        }
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
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
        
        // Use conversationId for conversations
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
      } else if (type === 'comments') {
        // For comments, we need to select which comment to reply to
        if (!selectedCommentForReply) {
          alert('Please select a comment to reply to.');
          setSending(false);
          return;
        }
        
        setNewMessage('');
        const token = localStorage.getItem('token');
        
        const response = await axios.post(
          `${import.meta.env.VITE_API_BASE_URL}/comments/${pageId}/${selectedCommentForReply.commentId}/reply`,
          { message: messageText },
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );

        if (response.data.success) {
          // Success! Add the reply to the local state for immediate feedback
          const newReply = {
            commentId: response.data.data.id || `temp-${Date.now()}`,
            message: messageText,
            createdTime: new Date().toISOString(),
            from: {
              id: pageId,
              name: selectedPage?.pageName || 'You'
            },
            isReply: true,
            parentCommentId: selectedCommentForReply.commentId,
            postId: selectedCommentForReply.postId,
            postMessage: selectedCommentForReply.postMessage
          };
          
          setComments(prevComments => {
            const updated = [...prevComments, newReply];
            return updated.sort((a, b) => 
              new Date(a.createdTime) - new Date(b.createdTime)
            );
          });
          
          // Clear the selected comment after replying
          setSelectedCommentForReply(null);
          
          // Refresh comments after a delay to get the real reply from the server
          setTimeout(() => fetchComments(), 2000);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // On error, restore the message
      setNewMessage(messageText);
    } finally {
      setSending(false);
    }
  };

  const handlePrivateMessage = async () => {
    if (!newMessage.trim() || sending || !selectedCommentForReply) return;

    setSending(true);
    const messageText = newMessage.trim();
    
    try {
      setNewMessage('');
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/comments/${pageId}/${selectedCommentForReply.commentId}/private-message`,
        { 
          message: messageText,
          authorId: item.userId,
          authorName: item.userName
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setSelectedCommentForReply(null);
        alert(`Private message sent to ${item.userName}! They have been moved to messenger conversations.`);
      }
    } catch (error) {
      console.error('Error sending private message:', error);
      setNewMessage(messageText);
      alert('Failed to send private message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    if (type === 'conversation') {
      fetchMessages();
    } else if (type === 'comments') {
      fetchComments();
    }
  };

  const isFromPage = (comment) => {
    // Check if comment is from the page (your replies)
    if (pageId && comment.from && comment.from.id === pageId) {
      return true;
    }
    
    // Alternative check using authorId for processed comments
    if (pageId && comment.authorId === pageId) {
      return true;
    }
    
    return false;
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
      <div className="px-8 py-4 border-b bg-white flex justify-between items-center">
        <span className="text-xl font-semibold">
          {type === 'conversation' 
            ? item.customerName || 'Unknown Customer'
            : `${item.userName || 'Unknown User'}'s Comments`
          }
        </span>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
          disabled={refreshing || loading}
        >
          <RefreshCw size={16} className={`${refreshing || loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Messages/Comments Area */}
      <div 
        ref={chatBoxRef}
        className="flex flex-col flex-1 overflow-y-auto"
      >
        <div className="flex flex-col pt-4 px-8 pb-20">
          {loading ? (
            <div className="flex justify-center w-full py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <>
              {type === 'conversation' ? (
                // Regular Conversation Messages
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
                      ? item.pageProfilePic || userImage // Page profile pic
                      : item.customerProfilePic || message.profilePic || message.from?.profile_pic || userImage; // Customer profile pic

                    // Determine message type for styling
                    let messageType = "both";
                    if (index > 0 && index < messages.length - 1) {
                      const prevFromSameUser = messages[index-1].from?.id === message.from?.id ||
                        messages[index-1].senderId === message.senderId;
                      const nextFromSameUser = messages[index+1].from?.id === message.from?.id ||
                        messages[index+1].senderId === message.senderId;
                      
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
                        key={message.id || message._id || message.messageId || index}
                        message={message}
                        senderName={senderName}
                        profilePic={profilePic}
                        type={messageType}
                      />
                    ) : (
                      <OthersMessage
                        key={message.id || message._id || message.messageId || index}
                        message={message}
                        senderName={senderName}
                        profilePic={profilePic}
                        type={messageType}
                      />
                    );
                  })
                )
              ) : (
                // Comments organized by post
                comments.length === 0 ? (
                  <div className="text-center text-gray-500 p-10 w-full">
                    <p>No comments from this user yet</p>
                  </div>
                ) : (
                  Object.values(groupedComments).map((postGroup) => (
                    <div key={postGroup.postId}>
                      <PostHeader post={postGroup} />
                      {postGroup.comments.map((comment, index) => {
                        // Determine if the comment is from the page or customer
                        const isPageComment = isFromPage(comment);
                        const senderName = isPageComment 
                          ? (selectedPage?.pageName || 'You')
                          : (item.userName || comment.from?.name || 'Customer');
                        
                        const profilePic = isPageComment
                          ? (selectedPage?.profilePic || userImage)
                          : (item.userPicture || comment.from?.picture?.data?.url || userImage);
                        
                        // Determine message type for styling
                        let messageType = "both";
                        const currentPostComments = postGroup.comments;
                        
                        if (index > 0 && index < currentPostComments.length - 1) {
                          const prevFromSameUser = isFromPage(currentPostComments[index-1]) === isPageComment;
                          const nextFromSameUser = isFromPage(currentPostComments[index+1]) === isPageComment;
                          
                          if (prevFromSameUser && nextFromSameUser) {
                            messageType = "none";
                          } else if (prevFromSameUser) {
                            messageType = "last";
                          } else if (nextFromSameUser) {
                            messageType = "first";
                          }
                        }

                        return isPageComment ? (
                          <SelfMessage 
                            key={comment.commentId}
                            message={comment}
                            senderName={senderName}
                            profilePic={profilePic}
                            type={messageType}
                            isComment={true}
                            isReply={comment.isReply}
                          />
                        ) : (
                          <OthersMessage
                            key={comment.commentId}
                            message={comment}
                            senderName={senderName}
                            profilePic={profilePic}
                            type={messageType}
                            isComment={true}
                            isReply={comment.isReply}
                          />
                        );
                      })}
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
      <div className="w-full max-w-[800px] self-center my-4 mx-8 mb-6">
        {/* Selected Comment for Reply indicator (only in comments mode) */}
        {type === 'comments' && selectedCommentForReply && (
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs text-blue-600">
              <span className="rounded-full bg-blue-100 px-1.5 py-0.5 mr-1">↩️</span> 
              Replying to comment
            </span>
            <button
              onClick={() => setSelectedCommentForReply(null)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        )}
        
        <div className="w-full p-2 rounded-md border border-gray-300 outline-none bg-white shadow-sm">
          <form 
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (type === 'comments' && selectedCommentForReply) {
                handleSendMessage();
              } else if (type === 'conversation') {
                handleSendMessage();
              } else if (type === 'comments') {
                alert('Please select a comment to reply to');
              }
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
              placeholder={
                type === 'comments' && !selectedCommentForReply
                  ? "Select a comment to reply to..."
                  : "Type your message..."
              }
              className="w-full outline-none px-2 py-1"
              disabled={sending}
            />
            
            <div className="flex gap-2">
              <button 
                type="submit" 
                disabled={!newMessage.trim() || sending || (type === 'comments' && !selectedCommentForReply)}
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <SendHorizontal size={20} className="text-gray-500" />
              </button>
              
              {type === 'comments' && selectedCommentForReply && (
                <button 
                  type="button"
                  onClick={handlePrivateMessage}
                  disabled={!newMessage.trim() || sending}
                  className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-500 px-2 py-1 rounded border border-gray-200"
                >
                  Private
                </button>
              )}
            </div>
          </form>
        </div>
        
        {type === 'comments' && !selectedCommentForReply && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            Click on a comment to reply
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedChatInterface;
