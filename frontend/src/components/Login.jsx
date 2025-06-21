import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Card from './CommonComponents/Card';
import Button from './CommonComponents/Button';

const Login = ({ onSwitchToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    if (id === 'email') setEmail(value.trim());
    if (id === 'password') setPassword(value);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(email, password);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center h-[100vh] w-[100vw] bg-primary">
      <Card>
        <div className="flex flex-col gap-4 justify-center items-center">
          <h1 className="font-semibold text-lg">Login to your account</h1>
          
          <form
            className="flex flex-col gap-5 text-md w-[350px]"
            onSubmit={handleSubmit}
          >
            <div className="flex flex-col gap-1">
              <label htmlFor="email" className="text-sm">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                className="p-2 border border-gray-300 rounded"
                placeholder="Email address"
                value={email}
                onChange={handleInputChange}
              />
            </div>
            
            <div className="flex flex-col gap-1">
              <label htmlFor="password" className="text-sm">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                className="p-2 border border-gray-300 rounded"
                placeholder="Password"
                value={password}
                onChange={handleInputChange}
              />
            </div>

            <div className="flex items-center">
              <input
                id="remember"
                type="checkbox"
                className="h-4 w-4 mr-2"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
              />
              <label htmlFor="remember" className="text-sm">
                Remember me
              </label>
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loading}
              loading={loading}
            >
              {loading ? 'Logging in...' : 'Login'}
            </Button>

            <div className="text-center">
              <p className="text-sm">
                New to Facebook Helpdesk?{' '}
                <button
                  type="button"
                  onClick={onSwitchToSignup}
                  className="text-primary font-medium hover:underline"
                >
                  Sign Up
                </button>
              </p>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default Login;
