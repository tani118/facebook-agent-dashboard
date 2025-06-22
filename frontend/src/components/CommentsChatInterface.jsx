import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import socketService from '../services/socketService';

const CommentsChatInterface = ({ selectedPage, pageAccessToken }) => {
  const [commentsData, setCommentsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedThread, setSelectedThread] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [newCommentNotification, setNewCommentNotification] = useState('');
  const [selectedCommentForReply, setSelectedCommentForReply] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (selectedPage && pageAccessToken) {
      fetchAllComments();
      
      // Set up real-time comment notifications with debouncing
      const commentRefreshTimeoutRef = { current: null };
      
      const handleNewComment = (data) => {
        console.log('📩 New comment/reply received:', data);
        setNewCommentNotification('New comment received!');
        
        // Debounced refresh to avoid multiple rapid API calls
        if (commentRefreshTimeoutRef.current) {
          clearTimeout(commentRefreshTimeoutRef.current);
        }
        
        commentRefreshTimeoutRef.current = setTimeout(() => {
          fetchAllComments();
          setNewCommentNotification('');
          commentRefreshTimeoutRef.current = null;
        }, 200);
      };
      
      socketService.on('new-comment', handleNewComment);
      
      // Cleanup
      return () => {
        socketService.off('new-comment', handleNewComment);
      };
    }
  }, [selectedPage, pageAccessToken]);

  useEffect(() => {
    scrollToBottom();
    // Clear selected comment when switching threads
    setSelectedCommentForReply(null);
  }, [selectedThread]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchAllComments = async () => {
    if (!selectedPage || !pageAccessToken) return;

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_BASE_URL}/comments/${selectedPage.pageId}/all`, {
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
        
        // Filter out page admin from user list - only show actual customers
        const filteredData = {
          ...response.data.data,
          userComments: response.data.data.userComments.filter(userGroup => 
            userGroup.userId !== selectedPage.pageId
          )
        };
        
        console.log('📊 Filtered comments data:', filteredData);
        
        setCommentsData(filteredData);
        
        // Maintain selected thread if it still exists
        if (selectedThread && filteredData.userComments) {
          const updatedSelectedThread = filteredData.userComments.find(
            userGroup => userGroup.userId === selectedThread.userId
          );
          if (updatedSelectedThread) {
            setSelectedThread(updatedSelectedThread);
          } else if (!selectedThread && filteredData.userComments?.length > 0) {
            // Auto-select first user if none selected
            setSelectedThread(filteredData.userComments[0]);
          }
        } else if (!selectedThread && filteredData.userComments?.length > 0) {
          setSelectedThread(filteredData.userComments[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePublicReply = async (comment) => {
    if (!replyMessage.trim() || sending) return;

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/comments/${selectedPage.pageId}/${comment.commentId}/reply`,
        { message: replyMessage },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setReplyMessage('');
        setSelectedCommentForReply(null);
        
        // Show success message
        alert('Reply posted successfully!');
        
        // Optimistically add the reply to local state for immediate feedback
        const newReply = {
          commentId: response.data.data?.id || `temp-${Date.now()}`,
          message: replyMessage,
          createdTime: new Date().toISOString(),
          from: {
            id: selectedPage.pageId,
            name: selectedPage.pageName || 'You'
          },
          authorId: selectedPage.pageId,
          authorName: selectedPage.pageName || 'You',
          isReply: true,
          postId: comment.postId,
          postMessage: comment.postMessage
        };

        // Update the selected thread's comments
        if (selectedThread) {
          setCommentsData(prevData => {
            if (!prevData) return prevData;
            
            const updatedUserComments = prevData.userComments.map(userGroup => {
              if (userGroup.userId === selectedThread.userId) {
                return {
                  ...userGroup,
                  comments: [...userGroup.comments, newReply].sort((a, b) => 
                    new Date(a.createdTime) - new Date(b.createdTime)
                  )
                };
              }
              return userGroup;
            });
            
            return {
              ...prevData,
              userComments: updatedUserComments
            };
          });
        }
      }
    } catch (error) {
      console.error('Error posting reply:', error);
      alert('Failed to post reply. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handlePrivateMessage = async (comment) => {
    if (!replyMessage.trim() || sending) return;

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/comments/${selectedPage.pageId}/${comment.commentId}/private-message`,
        { 
          message: replyMessage,
          authorId: selectedThread.userId,
          authorName: selectedThread.userName
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setReplyMessage('');
        setSelectedCommentForReply(null);
        alert(`Private message sent to ${selectedThread.userName}! They have been moved to your messenger conversations.`);
      }
    } catch (error) {
      console.error('Error sending private message:', error);
      alert('Failed to send private message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const isFromPage = (comment) => {
    // Check if comment is from the page (your replies)
    if (selectedPage && comment.from && comment.from.id === selectedPage.pageId) {
      return true;
    }
    
    // Alternative check using authorId for processed comments
    if (selectedPage && comment.authorId === selectedPage.pageId) {
      return true;
    }
    
    return false;
  };

  const getCommentAuthor = (comment) => {
    // For processed comments from backend API
    if (comment.authorId && comment.authorName) {
      return {
        id: comment.authorId,
        name: comment.authorName,
        picture: comment.authorPicture
      };
    }
    
    // For Facebook API format
    if (comment.from) {
      return comment.from;
    }
    
    // Fallback to the user thread info for customer comments
    if (selectedThread && !isFromPage(comment)) {
      return {
        id: selectedThread.userId,
        name: selectedThread.userName,
        picture: selectedThread.userPicture
      };
    }
    
    return {
      id: 'unknown',
      name: 'Unknown User',
      picture: null
    };
  };

  if (loading && !commentsData) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading comments...</p>
        </div>
      </div>
    );
  }

  if (!commentsData || commentsData.userComments?.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">💬</div>
          <p className="text-lg text-gray-500">No comments found</p>
          <p className="text-sm text-gray-400 mt-2">Comments will appear here when users interact with your posts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex h-screen">
      {/* Left Sidebar - User List */}
      <div className="w-1/3 bg-white border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800">Comments</h2>
            <button
              onClick={fetchAllComments}
              className="text-gray-600 hover:text-black text-sm"
              disabled={loading}
            >
              {loading ? '🔄' : '↻'} Refresh
            </button>
          </div>
          <div className="mt-2 text-sm text-gray-600">
            <span>{commentsData.totalUsers} users - {commentsData.totalComments} comments</span>
          </div>
          
          {/* New Comment Notification */}
          {newCommentNotification && (
            <div className="mt-3 p-2 bg-gray-100 border border-gray-300 text-gray-700 rounded text-sm">
              🔔 {newCommentNotification}
            </div>
          )}
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto">
          {commentsData.userComments.map((userGroup) => {
            // Count customer comments vs page replies
            const customerComments = userGroup.comments.filter(c => !isFromPage(c)).length;
            const pageReplies = userGroup.comments.filter(c => isFromPage(c)).length;
            const latestComment = userGroup.comments[userGroup.comments.length - 1];
            
            return (
              <div
                key={userGroup.userId}
                onClick={() => setSelectedThread(userGroup)}
                className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedThread?.userId === userGroup.userId ? 'bg-gray-100 border-l-4 border-l-gray-500' : ''
                }`}
              >
                <div className="flex items-center">
                  {userGroup.userPicture ? (
                    <img 
                      src={userGroup.userPicture} 
                      alt={userGroup.userName}
                      className="w-12 h-12 rounded-full mr-3"
                      onError={(e) => {
                        // Try Facebook's default profile picture
                        if (userGroup.userId && !e.target.src.includes('facebook-user-default')) {
                          e.target.src = `https://graph.facebook.com/${userGroup.userId}/picture?type=large`;
                        } else {
                          // Final fallback - hide img and show div with initial
                          e.target.style.display = 'none';
                          const nextSibling = e.target.nextElementSibling;
                          if (nextSibling) nextSibling.style.display = 'flex';
                        }
                      }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center mr-3">
                      <span className="text-white font-bold text-lg">
                        {userGroup.userName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900 truncate">{userGroup.userName}</h3>
                      <div className="text-xs text-gray-400">
                        {formatDate(latestComment?.createdTime)}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-800">
                        {customerComments} comment{customerComments !== 1 ? 's' : ''}
                      </span>
                      {pageReplies > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-300 text-gray-700">
                          {pageReplies} repl{pageReplies !== 1 ? 'ies' : 'y'}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500 truncate mt-1">
                      <span className="font-medium">
                        {isFromPage(latestComment) ? 'You: ' : `${userGroup.userName}: `}
                      </span>
                      {latestComment?.message.substring(0, 35)}...
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Side - Chat Interface */}
      <div className="flex-1 flex flex-col">
        {selectedThread ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-center">
                {selectedThread.userPicture ? (
                  <img 
                    src={selectedThread.userPicture} 
                    alt={selectedThread.userName}
                    className="w-8 h-8 rounded-full mr-3"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                    <span className="text-gray-600 font-medium text-xs">
                      {selectedThread.userName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedThread.userName}</h3>
                  <p className="text-sm text-gray-500">{selectedThread.totalComments} comments across posts</p>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {selectedThread.comments
                .sort((a, b) => new Date(a.createdTime) - new Date(b.createdTime))
                .map((comment, index) => (
                <div key={comment.commentId} className="space-y-2">
                  {/* Post Context (show only for first comment of each post) */}
                  {(index === 0 || comment.postId !== selectedThread.comments[index - 1]?.postId) && (
                    <div className="text-center my-4">
                      <div className="inline-block px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded-full">
                        💬 On post: {comment.postMessage.substring(0, 50)}...
                      </div>
                    </div>
                  )}

                  {/* Comment Message */}
                  <div 
                    className={`flex group cursor-pointer hover:bg-gray-100 p-2 rounded-lg transition-colors ${
                      selectedCommentForReply?.commentId === comment.commentId ? 'bg-gray-200 border-2 border-gray-400' : ''
                    } ${comment.isReply ? 'ml-8' : ''}`}
                    onClick={() => setSelectedCommentForReply(comment)}
                  >
                    {/* User Avatar */}
                    <div className="flex-shrink-0 mr-3">
                      {getCommentAuthor(comment).picture ? (
                        <img 
                          src={getCommentAuthor(comment).picture} 
                          alt={getCommentAuthor(comment).name}
                          className="w-8 h-8 rounded-full"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                          <span className="text-gray-600 font-medium text-xs">
                            {getCommentAuthor(comment).name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Message Content */}
                    <div className="flex-1 min-w-0">
                      {/* Message Header */}
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="text-sm font-medium text-gray-900">
                          {isFromPage(comment) ? (selectedPage.pageName || 'Page Admin') : getCommentAuthor(comment).name}
                        </span>
                        {isFromPage(comment) && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                            Admin
                          </span>
                        )}
                        {comment.isReply && (
                          <span className="text-xs text-gray-500">
                            ↳ Reply
                          </span>
                        )}
                        <span className="text-xs text-gray-500">
                          {formatDate(comment.createdTime)}
                        </span>
                      </div>

                      {/* Message Text */}
                      <div className={`p-3 rounded-lg ${
                        isFromPage(comment)
                          ? 'bg-gray-600 text-white'
                          : 'bg-white border border-gray-200'
                      }`}>
                        <p className="text-sm">{comment.message}</p>
                        
                        {/* Message Actions */}
                        <div className="flex items-center justify-between mt-2">
                          <div className={`text-xs ${isFromPage(comment) ? 'text-gray-100' : 'text-gray-500'}`}>
                            {comment.likeCount > 0 && (
                              <span>👍 {comment.likeCount}</span>
                            )}
                          </div>
                          
                          {/* Reply Button - only show on hover and for non-page messages */}
                          {!isFromPage(comment) && (
                            <button
                              className={`text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                                selectedCommentForReply?.commentId === comment.commentId
                                  ? 'bg-gray-200 text-gray-800'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCommentForReply(comment);
                              }}
                            >
                              {selectedCommentForReply?.commentId === comment.commentId ? 'Selected' : 'Reply'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              {/* Selected Comment for Reply */}
              {selectedCommentForReply && (
                <div className="mb-3 p-3 bg-gray-100 border border-gray-300 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-800">
                      Replying to {isFromPage(selectedCommentForReply) ? 'Admin' : getCommentAuthor(selectedCommentForReply).name}
                    </span>
                    <button
                      onClick={() => setSelectedCommentForReply(null)}
                      className="text-gray-600 hover:text-gray-800 text-sm"
                    >
                      ✕ Cancel
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">
                    {selectedCommentForReply.message.length > 100 
                      ? selectedCommentForReply.message.substring(0, 100) + '...'
                      : selectedCommentForReply.message
                    }
                  </p>
                </div>
              )}

              <div className="flex items-end space-x-2">
                <div className="flex-1">
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    placeholder={
                      selectedCommentForReply 
                        ? `Reply to ${isFromPage(selectedCommentForReply) ? 'Admin' : getCommentAuthor(selectedCommentForReply).name}...`
                        : `Message ${selectedThread.userName}`
                    }
                    className="w-full p-3 border-2 border-blue-500 rounded-lg resize-none focus:ring-2 focus:ring-blue-400 focus:border-blue-500"
                    rows="2"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey && selectedCommentForReply) {
                        e.preventDefault();
                        handlePublicReply(selectedCommentForReply);
                      }
                    }}
                  />
                </div>
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={() => selectedCommentForReply && handlePublicReply(selectedCommentForReply)}
                    disabled={sending || !replyMessage.trim() || !selectedCommentForReply}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 text-sm"
                  >
                    {sending ? '...' : '💬 Public Reply'}
                  </button>
                  <button
                    onClick={() => selectedCommentForReply && handlePrivateMessage(selectedCommentForReply)}
                    disabled={sending || !replyMessage.trim() || !selectedCommentForReply}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 text-sm"
                  >
                    {sending ? '...' : '📱 Private Message'}
                  </button>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                {selectedCommentForReply 
                  ? 'Press Enter to send public reply - Shift+Enter for new line'
                  : 'Click on a comment above to select it for reply'
                }
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <p className="text-lg">Select a user to view their comments</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentsChatInterface;
