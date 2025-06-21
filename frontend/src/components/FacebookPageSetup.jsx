import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FacebookPageSetup = ({ onPageConnected }) => {
  const [connectedPages, setConnectedPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchConnectedPages();
  }, []);

  const fetchConnectedPages = async () => {
    try {
      const response = await axios.get('/facebook-auth/connected-pages');
      if (response.data.success) {
        setConnectedPages(response.data.data.pages || []);
      }
    } catch (error) {
      console.error('Error fetching pages:', error);
      setError('Failed to load connected pages');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectFacebook = () => {
    // Redirect to Facebook OAuth
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const oauthUrl = `${baseUrl.replace('/api', '')}/api/facebook-auth/`;
    console.log('Redirecting to OAuth URL:', oauthUrl);
    console.log('Base URL from env:', import.meta.env.VITE_API_BASE_URL);
    
    window.location.href = oauthUrl;
    window.location.href = oauthUrl;
  };

  const handleDisconnectPage = async (pageId) => {
    try {
      const response = await axios.delete(`/facebook-auth/disconnect-page/${pageId}`);
      if (response.data.success) {
        setConnectedPages(connectedPages.filter(page => page.pageId !== pageId));
      }
    } catch (error) {
      console.error('Error disconnecting page:', error);
      setError('Failed to disconnect page');
    }
  };

  const handleContinue = () => {
    if (connectedPages.length > 0) {
      onPageConnected();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-2xl w-full space-y-8 p-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Connect Your Facebook Page
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Connect your Facebook page to start managing conversations and comments
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-700 text-sm">{error}</div>
          </div>
        )}

        <div className="bg-white shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Connected Pages ({connectedPages.length})
          </h3>

          {connectedPages.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-6xl mb-4">📱</div>
              <p className="text-gray-500 mb-6">No Facebook pages connected yet</p>
              <button
                onClick={handleConnectFacebook}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium transition-colors"
              >
                Connect Facebook Page
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {connectedPages.map((page) => (
                <div key={page.pageId} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    {page.picture ? (
                      <img
                        src={page.picture}
                        alt={page.pageName}
                        className="w-12 h-12 rounded-full"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                        <span className="text-xl">📄</span>
                      </div>
                    )}
                    <div>
                      <h4 className="font-medium text-gray-900">{page.pageName}</h4>
                      <p className="text-sm text-gray-500">ID: {page.pageId}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDisconnectPage(page.pageId)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Disconnect
                  </button>
                </div>
              ))}

              <div className="pt-4 border-t border-gray-200">
                <button
                  onClick={handleConnectFacebook}
                  className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md font-medium transition-colors"
                >
                  + Connect Another Page
                </button>
              </div>
            </div>
          )}

          {connectedPages.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={handleContinue}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-md font-medium transition-colors"
              >
                Continue to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FacebookPageSetup;
