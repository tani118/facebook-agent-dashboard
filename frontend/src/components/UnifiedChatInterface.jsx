import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import socketService from '../services/socketService';
import userImage from '../assets/user.png';
import { SendHorizontal, RefreshCw } from 'lucide-react';

const formatMessageTime = (time) => {
  try {
    const date = new Date(time);
    const currentDate = new Date();
    const year = date.getFullYear();

    if (year === currentDate.getFullYear() || isNaN(date.getTime())) {
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

const SelfMessage = ({ message, senderName, profilePic, type = "both", isComment = false, isReply = false }) => {
  const isIconVisible = true;
  const isTimeVisible = true;
  
  const timestamp = message.timestamp || message.created_time || message.createdAt || new Date().toString();
  
  return (
    <div className={`flex flex-col items-end ${type === "last" || type === "both" ? "mb-4" : "mb-1"} ${isReply ? 'ml-12' : ''}`}>
      <div className="w-fit items-start gap-3 max-w-[80%] flex">
        <div className="flex flex-col items-end" title={formatMessageTime(timestamp)}>
          <div className="rounded-lg p-3 w-fit bg-white text-gray-800 border border-gray-200">
            {message.message || message.content}
          </div>
          {isTimeVisible && (
            <div className="px-2 mt-1">
              <span className="text-xs text-gray-600 font-medium">{senderName || 'You'}</span>
              <span className="text-xs text-gray-500"> - {formatMessageTime(timestamp)}</span>
            </div>
          )}
        </div>
        <img 
          src={profilePic || userImage} 
          alt="profile-icon" 
          className="rounded-full aspect-square w-8 h-8 object-cover my-[6px]"
          onError={(e) => {
            e.target.src = userImage;
          }}
        />
      </div>
    </div>
  );
};

const OthersMessage = ({ message, senderName, profilePic, type = "both", isComment = false, isReply = false }) => {
  const timestamp = message.timestamp || message.created_time || message.createdAt || new Date().toString();
  const isIconVisible = true;
  const isTimeVisible = true;
  
  return (
    <div className={`flex flex-col ${type === "last" || type === "both" ? "mb-4" : "mb-1"} ${isReply ? 'ml-12' : ''}`}>
      <div className="w-fit items-start gap-3 max-w-[80%] flex flex-row-reverse">
        <div className="flex flex-col" title={formatMessageTime(timestamp)}>
          <div className="rounded-lg p-3 w-fit bg-white border border-gray-200">
            {message.message || message.content}
          </div>
          {isTimeVisible && (
            <div className="px-2 mt-1">
              <span className="text-xs text-gray-600 font-medium">{senderName || 'Customer'}</span>
              <span className="text-xs text-gray-500"> - {formatMessageTime(timestamp)}</span>
            </div>
          )}
        </div>
        <img 
          src={profilePic || userImage} 
          alt="profile-icon" 
          className="rounded-full aspect-square w-8 h-8 object-cover my-[6px]"
          onError={(e) => {
            e.target.src = userImage;
          }}
        />
      </div>
    </div>
  );
};

const PostHeader = ({ post }) => {
  return (
    <div className="text-center my-4 py-2">
      <div className="inline-block px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded">
        Post: {post.postMessage ? post.postMessage.substring(0, 60) + (post.postMessage.length > 60 ? '...' : '') : `Post ${post.postId}`}
      </div>
    </div>
  );
};

const UnifiedChatInterface = ({ item, type, pageId, pageAccessToken, selectedPage, sidebarVisible }) => {
  const [messages, setMessages] = useState([]);
  const [comments, setComments] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedCommentForReply, setSelectedCommentForReply] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [notification, setNotification] = useState(null);
  const messagesEndRef = useRef(null);
  const chatBoxRef = useRef(null);
  const commentRefreshTimeoutRef = useRef(null);
  
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
        
        const handleNewMessage = (data) => {
          if (data.conversationId === item.conversationId || data.conversationId === item.id) {
            
            const isOwnMessage = data.message.senderId === pageId || data.message.type === 'outgoing';
            
            if (isOwnMessage) {
              console.log('🚫 Received own message from socket - updating existing message if needed');
   
              setMessages(prevMessages => 
                prevMessages.map(msg => 
                  msg.pending && msg.content === data.message.content
                    ? { ...msg, pending: false, messageId: data.message.messageId }
                    : msg
                )
              );
              return;
            }
            
            console.log('📩 Received new message for current conversation:', data);
            
            setMessages(prevMessages => {
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
        
        const handleNewComment = (data) => {
          console.log('📩 New comment/reply received:', data);
          
          if (data.pageId === pageId) {
            if (commentRefreshTimeoutRef.current) {
              clearTimeout(commentRefreshTimeoutRef.current);
            }
            
            commentRefreshTimeoutRef.current = setTimeout(() => {
              fetchComments();
              commentRefreshTimeoutRef.current = null;
            }, 100); // Very short delay just to batch multiple events
          }
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
      
      if (pageAccessToken && pageId) {
        try {
          console.log('🔄 Attempting to sync messages:', {
            conversationId,
            pageId,
            hasPageAccessToken: !!pageAccessToken,
            pageAccessTokenLength: pageAccessToken?.length
          });
          
          await axios.post(`/conversations/${conversationId}/sync-messages`, {
            pageAccessToken: pageAccessToken,
            pageId: pageId,
            limit: 25
          });
        } catch (syncError) {
          console.log('Sync failed, continuing with local data:', syncError.message);
          console.error('Sync error details:', syncError.response?.data);
        }
      } else {
        console.log('⚠️ Missing required data for sync:', {
          hasPageAccessToken: !!pageAccessToken,
          hasPageId: !!pageId
        });
      }

      const response = await axios.get(`/conversations/${conversationId}/messages`, {
        params: {
          pageId: pageId,
          limit: 25
        }
      });
      
      if (response.data.success) {
        const sortedMessages = (response.data.data.messages || [])
          .sort((a, b) => new Date(a.timestamp || a.created_time) - new Date(b.timestamp || b.created_time));
        setMessages(sortedMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      if (pageAccessToken) {
        try {
          const fallbackResponse = await axios.get(`/facebook/conversations/${conversationId}/messages`, {
            params: {
              pageAccessToken: pageAccessToken,
              limit: 25
            }
          });
          if (fallbackResponse.data.success) {
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
        
        const userComments = response.data.data.userComments.find(
          userGroup => userGroup.userId === item.userId
        );
        
        if (userComments) {
          const allRelevantComments = [];
          
          allRelevantComments.push(...userComments.comments);
          
          const userPostIds = userComments.comments.map(c => c.postId);
          
          response.data.data.userComments.forEach(userGroup => {
            userGroup.comments.forEach(comment => {
              if (userPostIds.includes(comment.postId) && 
                  !allRelevantComments.some(existing => existing.commentId === comment.commentId)) {
                allRelevantComments.push(comment);
              }
            });
          });
          
          const sortedComments = allRelevantComments.sort(
            (a, b) => new Date(a.createdTime) - new Date(b.createdTime)
          );
          
          console.log('📊 Filtered comments for conversation:', sortedComments);
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
        setNewMessage('');
        
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
        
        const conversationId = item.conversationId || item.id;
        
        const response = await axios.post(`/facebook/conversations/${conversationId}/send`, {
          message: messageText,
          pageAccessToken: pageAccessToken,
          pageId: pageId
        });
        
        if (response.data.success) {
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              msg.messageId === optimisticMessage.messageId 
                ? { ...msg, pending: false, messageId: response.data.messageId || msg.messageId }
                : msg
            )
          );
        } else {
          setMessages(prevMessages => 
            prevMessages.filter(msg => msg.messageId !== optimisticMessage.messageId)
          );
          setNewMessage(messageText); 
        }
      } else if (type === 'comments') {
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
            const existingReply = prevComments.find(c => c.commentId === newReply.commentId);
            if (existingReply) return prevComments;
            
            const updated = [...prevComments, newReply];
            return updated.sort((a, b) => 
              new Date(a.createdTime) - new Date(b.createdTime)
            );
          });
          
          setSelectedCommentForReply(null);
          
          setNotification({
            type: 'success',
            message: 'Reply posted successfully!'
          });
          
          setTimeout(() => setNotification(null), 3000);
          
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      setNotification({
        type: 'error',
        message: 'Failed to send reply. Please try again.'
      });
      
      setTimeout(() => setNotification(null), 5000);
      
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
    if (pageId && comment.from && comment.from.id === pageId) {
      return true;
    }
    
    if (pageId && comment.authorId === pageId) {
      return true;
    }
    
    return false;
  };

  const getCurrentName = () => {
    if (type === 'conversation') {
      return item.customerName || `${item.customerFirstName || ''} ${item.customerLastName || ''}`.trim() || 'Unknown Customer';
    } else {
      return item.userName || 'Unknown User';
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
    <div className="flex-1 h-full flex flex-col" style={{backgroundColor: '#f6f6f7'}}>
      
      {notification && (
        <div className={`mx-4 mt-2 p-3 rounded-lg border ${
          notification.type === 'success' 
            ? 'bg-gray-100 border-gray-400 text-gray-800' 
            : 'bg-gray-50 border-gray-300 text-gray-700'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium flex items-center">
              {notification.type === 'success' ? '✓' : '⚠️'} {notification.message}
            </span>
            <button 
              onClick={() => setNotification(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      {sidebarVisible ? (
        <div className="px-8 py-4 border-b bg-white flex justify-between items-center">
          <span className="text-xl font-bold font-roboto ml-7">
            {type === 'conversation' 
              ? item.customerName || 'Unknown Customer'
              : `${item.userName || 'Unknown User'}'s Comments`
            }
          </span>
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-500 hover:text-gray-700 rounded"
            disabled={refreshing || loading}
          >
            <RefreshCw size={16} className={`${refreshing || loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      ) : (
        <div className="px-8 py-4 border-b bg-white flex justify-between items-center">
          <div className="flex items-center ml-12">
            <h2 className="text-xl font-bold font-roboto">{getCurrentName()}</h2>
            <span className="text-sm text-gray-600 ml-2">
              {type === 'conversation' ? '(Facebook DM)' : '(Facebook Post)'}
            </span>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-500 hover:text-gray-700 rounded"
            disabled={refreshing || loading}
          >
            <RefreshCw size={16} className={`${refreshing || loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      )}

      <div 
        ref={chatBoxRef}
        className="flex flex-col flex-1 overflow-y-auto"
      >
        <div className={`flex flex-col pt-4 ${sidebarVisible ? 'px-8' : 'px-16'} pb-20`}>
          {loading ? (
            <div className="flex justify-center w-full py-4">
              <RefreshCw size={20} className="animate-spin text-gray-500" />
            </div>
          ) : (
            <>
              {type === 'conversation' ? (
                messages.length === 0 ? (
                  <div className="text-center text-gray-500 p-10 w-full">
                    <p>No messages in this conversation yet</p>
                  </div>
                ) : (
                  messages.map((message, index) => {
                    const isFromPage = message.from?.id === pageId || 
                                      message.senderId === pageId || 
                                      message.senderType === 'page';
                    
                    const senderName = message.from?.name || message.senderName || 
                                     (isFromPage ? 'You' : item.customerName || 'Customer');
                    
                    const profilePic = isFromPage 
                      ? (selectedPage?.profilePic || item.pageProfilePic || userImage) 
                      : (item.customerProfilePic || message.profilePic || message.from?.picture?.data?.url || message.from?.picture || userImage); // Customer profile pic

                    let messageType = "both";
                    
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
                comments.length === 0 ? (
                  <div className="text-center text-gray-500 p-10 w-full">
                    <p>No comments from this user yet</p>
                  </div>
                ) : (
                  Object.values(groupedComments).map((postGroup) => (
                    <div key={postGroup.postId} className="mb-6">
                      <PostHeader post={postGroup} />
                      {postGroup.comments.map((comment, index) => {
                        const isPageComment = isFromPage(comment);
                        const senderName = isPageComment 
                          ? (selectedPage?.pageName || 'You')
                          : (item.userName || comment.from?.name || 'Customer');
                        
                        const profilePic = isPageComment
                          ? (selectedPage?.profilePic || userImage)
                          : (item.userPicture || comment.from?.picture?.data?.url || comment.from?.picture || userImage);
                        
                        let messageType = "both";
                        const currentPostComments = postGroup.comments;
                        
                        const isWithinTimeLimit = (comment1, comment2) => {
                          if (!comment1 || !comment2) return false;
                          const time1 = new Date(comment1.createdTime || comment1.created_time).getTime();
                          const time2 = new Date(comment2.createdTime || comment2.created_time).getTime();
                          const diffInMinutes = Math.abs(time1 - time2) / (1000 * 60);
                          return diffInMinutes <= 2;
                        };
                        
                        if (index >= 0 && index < currentPostComments.length) {
                          const prevComment = index > 0 ? currentPostComments[index - 1] : null;
                          const nextComment = index < currentPostComments.length - 1 ? currentPostComments[index + 1] : null;
                          
                          const prevFromSameUser = prevComment && 
                            (isFromPage(prevComment) === isPageComment) &&
                            isWithinTimeLimit(comment, prevComment);
                          
                          const nextFromSameUser = nextComment && 
                            (isFromPage(nextComment) === isPageComment) &&
                            isWithinTimeLimit(comment, nextComment);
                          
                          if (prevFromSameUser && nextFromSameUser) {
                            messageType = "none";
                          } else if (prevFromSameUser) {
                            messageType = "last";
                          } else if (nextFromSameUser) {
                            messageType = "first";
                          }
                        }

                        return isPageComment ? (
                          <div key={comment.commentId} className="mb-2">
                            <SelfMessage 
                              message={comment}
                              senderName={senderName}
                              profilePic={profilePic}
                              type={messageType}
                              isComment={true}
                              isReply={comment.isReply}
                            />
                          </div>
                        ) : (
                          <div 
                            key={comment.commentId}
                            className={`cursor-pointer transition-all duration-200 rounded-lg p-2 mb-2 ${
                              selectedCommentForReply?.commentId === comment.commentId 
                                ? 'bg-gray-50 border border-gray-300' 
                                : 'hover:bg-gray-50'
                            }`}
                            onClick={() => setSelectedCommentForReply(comment)}
                            title="Click to select this comment for reply"
                          >
                            <OthersMessage
                              message={comment}
                              senderName={senderName}
                              profilePic={profilePic}
                              type={messageType}
                              isComment={true}
                              isReply={comment.isReply}
                            />
                            {selectedCommentForReply?.commentId === comment.commentId && (
                              <div className="text-xs text-gray-500 mt-1 px-2">
                                ✓ Selected for reply
                              </div>
                            )}
                          </div>
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

      <div className="w-full max-w-[800px] self-center my-4 mb-6 px-4">
        {type === 'comments' && selectedCommentForReply && (
          <div className="mb-3 p-3 bg-gray-100 border border-gray-300 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center">
                <span className="text-sm font-medium text-gray-800">
                  Replying to comment by {selectedCommentForReply.from?.name || 'User'}
                </span>
                <span className="ml-2 bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full">
                  Selected
                </span>
              </div>
              <button
                onClick={() => setSelectedCommentForReply(null)}
                className="text-gray-600 hover:text-gray-800 text-sm font-medium"
              >
                ✕ Cancel
              </button>
            </div>
            <div className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">
              "{selectedCommentForReply.message?.length > 100 
                ? selectedCommentForReply.message.substring(0, 100) + '...'
                : selectedCommentForReply.message}"
            </div>
          </div>
        )}
        
        <div className="w-full p-2 rounded-md border-2 border-blue-500 outline-none bg-white shadow-sm">
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
                  ? "Select a comment above to reply to..."
                  : type === 'comments' && selectedCommentForReply
                  ? `Reply to ${selectedCommentForReply.from?.name || 'User'}...`
                  : `Message ${getCurrentName()}`
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
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded border border-gray-300"
                >
                  Private Message
                </button>
              )}
            </div>
          </form>
        </div>
        
        {type === 'comments' && !selectedCommentForReply && (
          <div className="mt-2 text-xs text-gray-500 text-center">
            Click on any comment above to select it for reply
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedChatInterface;
