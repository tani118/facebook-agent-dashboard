import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import axios from 'axios'
import './index.css'
import App from './App.jsx'

// Configure axios defaults for ngrok
axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Add ngrok skip browser warning header for all requests
axios.interceptors.request.use(
  (config) => {
    // Add ngrok skip browser warning header if using ngrok
    if (config.baseURL && config.baseURL.includes('ngrok')) {
      config.headers['ngrok-skip-browser-warning'] = 'true';
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
