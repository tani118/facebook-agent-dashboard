import React, { useState, useEffect } from 'react';
import axios from 'axios';
import socketService from '../services/socketService';

const CommentsView = ({ selectedPage, pageAccessToken }) => {
  const [commentsData, setCommentsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedComment, setSelectedComment] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [privateMessage, setPrivateMessage] = useState('');
  const [showReplyModal, setShowReplyModal] = useState(false);
  const [showPrivateModal, setShowPrivateModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [newCommentNotification, setNewCommentNotification] = useState('');

  useEffect(() => {
    if (selectedPage && pageAccessToken) {
      fetchAllComments();
      
      // Set up real-time comment notifications
      const handleNewComment = (data) => {
        console.log('📩 New comment/reply received:', data);
        setNewCommentNotification(data.message);
        
        // Auto-refresh comments after a short delay
        setTimeout(() => {
          fetchAllComments();
          setNewCommentNotification('');
        }, 2000);
      };
      
      socketService.on('new-comment', handleNewComment);
      
      // Cleanup
      return () => {
        socketService.off('new-comment', handleNewComment);
      };
    }
  }, [selectedPage, pageAccessToken]);

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
        setCommentsData(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePublicReply = async () => {
    if (!replyMessage.trim() || !selectedComment || sending) return;

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/comments/${selectedPage.pageId}/${selectedComment.commentId}/reply`,
        { message: replyMessage },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setShowReplyModal(false);
        setReplyMessage('');
        setSelectedComment(null);
        // Refresh comments to show the new reply
        fetchAllComments();
        alert('Reply posted successfully!');
      }
    } catch (error) {
      console.error('Error posting reply:', error);
      alert('Failed to post reply. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handlePrivateMessage = async () => {
    if (!privateMessage.trim() || !selectedComment || sending) return;

    setSending(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/comments/${selectedPage.pageId}/${selectedComment.commentId}/private-message`,
        { 
          message: privateMessage,
          authorId: selectedComment.userId,
          authorName: selectedComment.userName
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.data.success) {
        setShowPrivateModal(false);
        setPrivateMessage('');
        setSelectedComment(null);
        alert(`Private message sent to ${selectedComment.userName}! They have been moved to your messenger conversations.`);
      }
    } catch (error) {
      console.error('Error sending private message:', error);
      alert('Failed to send private message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading comments...</span>
      </div>
    );
  }

  if (!commentsData) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No comments data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* New Comment Notification */}
      {newCommentNotification && (
        <div className="mb-4 p-3 bg-blue-100 border border-blue-400 text-blue-700 rounded-lg">
          <div className="flex items-center">
            <span className="mr-2">🔔</span>
            <span>{newCommentNotification}</span>
            <button 
              onClick={() => setNewCommentNotification('')}
              className="ml-auto text-blue-500 hover:text-blue-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Comments Overview</h2>
        <div className="flex gap-6 text-sm text-gray-600">
          <span>👥 {commentsData?.totalUsers || 0} users</span>
          <span>💬 {commentsData?.totalComments || 0} comments</span>
          <span>📄 {commentsData?.totalPosts || 0} posts</span>
        </div>
      </div>

      <div className="space-y-6">
        {commentsData.userComments.map((userGroup) => (
          <div key={userGroup.userId} className="border border-gray-200 rounded-lg p-4">
            {/* User Header */}
            <div className="flex items-center mb-4 pb-3 border-b border-gray-100">
              <div className="flex items-center">
                {userGroup.userPicture ? (
                  <img 
                    src={userGroup.userPicture} 
                    alt={userGroup.userName}
                    className="w-10 h-10 rounded-full mr-3"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center mr-3">
                    <span className="text-gray-600 font-medium">
                      {userGroup.userName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-gray-800">{userGroup.userName}</h3>
                  <p className="text-sm text-gray-500">{userGroup.totalComments} comment{userGroup.totalComments !== 1 ? 's' : ''}</p>
                </div>
              </div>
            </div>

            {/* User's Comments */}
            <div className="space-y-3">
              {userGroup.comments.map((comment) => (
                <div 
                  key={comment.commentId} 
                  className={`rounded p-3 ${comment.isReply ? 'bg-blue-50 ml-6 border-l-4 border-blue-200' : 'bg-gray-50'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      {comment.isReply && (
                        <div className="text-xs text-blue-600 mb-1 flex items-center">
                          <span className="mr-1">↳</span>
                          <span>Reply to comment</span>
                        </div>
                      )}
                      <p className="text-gray-800 mb-2">{comment.message}</p>
                      <div className="text-xs text-gray-500 mb-2">
                        <span>📅 {formatDate(comment.createdTime)}</span>
                        {comment.likeCount > 0 && <span className="ml-3">👍 {comment.likeCount}</span>}
                        {comment.replyCount > 0 && <span className="ml-3">💬 {comment.replyCount}</span>}
                        {comment.isReply && <span className="ml-3 text-blue-600">🔗 Reply</span>}
                      </div>
                      <div className="text-xs text-gray-400 bg-white rounded p-2 border">
                        <strong>On post:</strong> {truncateText(comment.postMessage, 80)}
                        <br />
                        <span>📅 {formatDate(comment.postCreatedTime)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => {
                        setSelectedComment({
                          ...comment,
                          userName: userGroup.userName,
                          userId: userGroup.userId
                        });
                        setShowReplyModal(true);
                      }}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors"
                    >
                      💬 Reply Public
                    </button>
                    
                    {comment.canReplyPrivately && (
                      <button
                        onClick={() => {
                          setSelectedComment({
                            ...comment,
                            userName: userGroup.userName,
                            userId: userGroup.userId
                          });
                          setShowPrivateModal(true);
                        }}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200 transition-colors"
                      >
                        📱 Send Private Message
                      </button>
                    )}

                    {comment.permalinkUrl && (
                      <a
                        href={comment.permalinkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200 transition-colors"
                      >
                        🔗 View on Facebook
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {commentsData.userComments.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No comments found across your posts</p>
        </div>
      )}

      {/* Public Reply Modal */}
      {showReplyModal && selectedComment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Reply to {selectedComment.userName}</h3>
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">Original comment:</p>
              <p className="text-gray-800">{selectedComment.message}</p>
            </div>
            <textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Type your public reply..."
              className="w-full p-3 border border-gray-300 rounded-lg mb-4 h-24 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handlePublicReply}
                disabled={sending || !replyMessage.trim()}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {sending ? 'Posting...' : 'Post Reply'}
              </button>
              <button
                onClick={() => {
                  setShowReplyModal(false);
                  setReplyMessage('');
                  setSelectedComment(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Private Message Modal */}
      {showPrivateModal && selectedComment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Send Private Message to {selectedComment.userName}</h3>
            <div className="mb-4 p-3 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">Original comment:</p>
              <p className="text-gray-800">{selectedComment.message}</p>
            </div>
            <div className="mb-4 p-3 bg-blue-50 rounded border border-blue-200">
              <p className="text-sm text-blue-800">
                💡 This will send a private message via Facebook Messenger and move this user to your chat conversations.
              </p>
            </div>
            <textarea
              value={privateMessage}
              onChange={(e) => setPrivateMessage(e.target.value)}
              placeholder="Type your private message..."
              className="w-full p-3 border border-gray-300 rounded-lg mb-4 h-24 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={handlePrivateMessage}
                disabled={sending || !privateMessage.trim()}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send Private Message'}
              </button>
              <button
                onClick={() => {
                  setShowPrivateModal(false);
                  setPrivateMessage('');
                  setSelectedComment(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentsView;
