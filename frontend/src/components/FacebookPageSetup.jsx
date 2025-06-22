import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Card from './CommonComponents/Card';
import Button from './CommonComponents/Button';
import richpanelIcon from '../assets/richpanel_icon.png';

const FacebookPageSetup = ({ onPageConnected }) => {
  const [connectedPages, setConnectedPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    document.title = "Connect Facebook Page - Facebook Helpdesk";
    fetchConnectedPages();
  }, []);

  const fetchConnectedPages = async () => {
    try {
      const response = await axios.get('/facebook-auth/connected-pages');
      if (response.data.success) {
        setConnectedPages(response.data.data.pages || []);
      }
    } catch (error) {
      setError('Failed to fetch pages');
    } finally {
      setLoading(false);
    }
  };

  const handleConnectFacebook = () => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
    const oauthUrl = `${baseUrl.replace('/api', '')}/api/facebook-auth/`;
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
      <div className="flex items-center justify-center h-[100vh] w-[100vw] bg-primary">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto"></div>
          <p className="mt-4 text-white">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-[100vh] w-[100vw] bg-primary">
      <Card className="max-w-2xl w-full">
        <div className="flex flex-col gap-6 items-center">
          <img src={richpanelIcon} alt="Richpanel" className="h-10" />
          <h1 className="font-semibold text-xl">Facebook Page Integration</h1>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 w-full">
              <div className="text-red-700 text-sm">{error}</div>
            </div>
          )}

          <div className="w-full">
            <h3 className="text-lg font-medium mb-4">
              Connected Pages ({connectedPages.length})
            </h3>

            {connectedPages.length === 0 ? (
              <div className="text-center py-8 border border-gray-200 rounded-lg p-6">
                <div className="text-gray-400 text-4xl mb-4 flex justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
                  </svg>
                </div>
                <p className="text-gray-500 mb-6">No Facebook pages connected yet</p>
                <Button onClick={handleConnectFacebook}>
                  Connect Facebook Page
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-lg p-4">
                  {connectedPages.map((page) => (
                    <div key={page.pageId} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-b-0">
                      <div className="flex items-center gap-4">
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
                          <h4 className="font-medium">{page.pageName}</h4>
                          <p className="text-sm text-gray-500">Connected on {new Date(page.connectedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                          Active
                        </span>
                        <Button 
                          variant="DANGER"
                          onClick={() => handleDisconnectPage(page.pageId)}
                          className="text-sm py-1 px-4 h-8"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4">
                  <Button 
                    variant="SECONDARY" 
                    onClick={handleConnectFacebook}
                  >
                    + Add New Page
                  </Button>
                  
                  <Button onClick={handleContinue}>
                    Continue to Inbox
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default FacebookPageSetup;
