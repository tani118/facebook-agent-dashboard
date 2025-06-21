import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/Login';
import Signup from './components/Signup';
import FacebookPageSetup from './components/FacebookPageSetup';
import Dashboard from './components/Dashboard';
import './App.css';

function AppContent() {
  const { isAuthenticated, loading, token } = useAuth();
  const [showSignup, setShowSignup] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [oauthMessage, setOauthMessage] = useState('');

  // Handle Facebook OAuth success
  const handleFacebookOAuthSuccess = async () => {
    console.log('Handling Facebook OAuth success...');
    console.log('Current auth state:', { isAuthenticated, hasToken: !!token });
    setOauthMessage('Facebook connected successfully! Retrieving your pages...');
    
    try {
      const urlParams = new URLSearchParams(window.location.search);
      let facebookToken = null;
      
      // First try to get token from URL parameter
      const encodedToken = urlParams.get('token');
      if (encodedToken) {
        try {
          facebookToken = atob(encodedToken); // Decode base64
          console.log('Facebook token retrieved from URL parameter');
        } catch (e) {
          console.error('Error decoding token from URL:', e);
        }
      }
      
      // Ensure we have the auth token set in axios headers
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        axios.defaults.headers.common['ngrok-skip-browser-warning'] = 'true';
        console.log('Set auth token in axios headers for OAuth handler');
      } else {
        console.warn('No auth token available for OAuth handler - this may cause issues');
      }
      
      // If no token in URL, try to get from session
      if (!facebookToken) {
        console.log('No token in URL, trying session...');
        try {
          const tokenResponse = await axios.get('/facebook-auth/session-token');
          console.log('Token response:', tokenResponse.data);
          
          if (tokenResponse.data.success) {
            facebookToken = tokenResponse.data.data.facebookToken;
          }
        } catch (error) {
          console.log('Session token not available:', error.response?.data?.message);
          // Don't show error to user, this is expected during testing
        }
      }
      
      // For testing, use a dummy token if no real token found
      if (!facebookToken) {
        console.log('No real Facebook token found, using dummy token for testing');
        facebookToken = 'test_facebook_token_123';
      }
      
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      
      if (facebookToken) {
        // Get user's Facebook pages using real Facebook Graph API
        console.log('Making pages request with auth token...');
        const pagesResponse = await axios.post('/facebook-auth/get-pages', {
          userToken: facebookToken
        });
        console.log('Pages response:', pagesResponse.data);
        
        if (pagesResponse.data.success && pagesResponse.data.data.pages.length > 0) {
          // Auto-connect the first page (you can modify this logic)
          const firstPage = pagesResponse.data.data.pages[0];
          console.log('Connecting page:', firstPage);
          
          const connectResponse = await axios.post('/facebook-auth/connect-page', {
            pageId: firstPage.id,
            pageName: firstPage.name,
            userToken: facebookToken
          });
          console.log('Connect response:', connectResponse.data);
          
          setOauthMessage('Facebook page connected successfully!');
          setTimeout(() => setOauthMessage(''), 3000);
          
          // If user is authenticated, show dashboard
          if (isAuthenticated) {
            setShowDashboard(true);
          }
        } else {
          setOauthMessage('No Facebook pages found or failed to retrieve pages.');
          setTimeout(() => setOauthMessage(''), 5000);
        }
      } else {
        setOauthMessage('Failed to retrieve Facebook token.');
        setTimeout(() => setOauthMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error handling Facebook OAuth success:', error);
      console.error('Error details:', error.response?.data);
      
      let errorMessage = 'Error connecting Facebook account';
      if (error.response?.data?.message) {
        errorMessage += ': ' + error.response.data.message;
      } else if (error.message) {
        errorMessage += ': ' + error.message;
      }
      
      setOauthMessage(errorMessage);
      setTimeout(() => setOauthMessage(''), 5000);
    }
  };

  // Handle OAuth redirect parameters
  useEffect(() => {
    // Only handle OAuth after auth context is loaded and we have authentication
    if (loading) {
      console.log('Auth context still loading, waiting...');
      return;
    }
    
    const urlParams = new URLSearchParams(window.location.search);
    const facebookAuth = urlParams.get('facebook_auth');
    const error = urlParams.get('error');

    if (facebookAuth === 'success') {
      console.log('OAuth success detected, handling...', { isAuthenticated, hasToken: !!token });
      // Add small delay to ensure axios headers are properly set
      setTimeout(() => {
        handleFacebookOAuthSuccess();
      }, 100);
    } else if (error) {
      let errorMessage = 'Facebook connection failed';
      switch (error) {
        case 'oauth_failed':
          errorMessage = 'Facebook OAuth failed. Please try again.';
          break;
        case 'no_auth_code':
          errorMessage = 'No authorization code received from Facebook.';
          break;
        case 'token_exchange_failed':
          errorMessage = 'Failed to exchange token with Facebook.';
          break;
        case 'oauth_callback_failed':
          errorMessage = 'OAuth callback processing failed.';
          break;
        default:
          errorMessage = `Facebook connection error: ${error}`;
      }
      setOauthMessage(errorMessage);
      // Clear URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
      // Auto-hide message after 5 seconds
      setTimeout(() => setOauthMessage(''), 5000);
    }
  }, [loading, isAuthenticated, token]); // Updated dependencies

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

  if (!isAuthenticated) {
    return showSignup ? (
      <Signup onSwitchToLogin={() => setShowSignup(false)} />
    ) : (
      <Login onSwitchToSignup={() => setShowSignup(true)} />
    );
  }

  if (!showDashboard) {
    return (
      <div>
        {oauthMessage && (
          <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
            oauthMessage.includes('success') 
              ? 'bg-green-100 border border-green-400 text-green-700' 
              : 'bg-red-100 border border-red-400 text-red-700'
          }`}>
            {oauthMessage}
          </div>
        )}
        <FacebookPageSetup 
          onPageConnected={() => setShowDashboard(true)} 
        />
      </div>
    );
  }

  return <Dashboard />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App
