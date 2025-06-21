import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Card from './CommonComponents/Card';
import Button from './CommonComponents/Button';

const Signup = ({ onSwitchToLogin }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  const { signup } = useAuth();
  
  useEffect(() => {
    document.title = "Signup - Facebook Helpdesk";
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    const result = await signup(name, email, password);
    
    if (!result.success) {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center h-[100vh] w-[100vw] bg-primary">
      <Card>
        <div className="flex flex-col gap-4 justify-center items-center">
          <h1 className="font-semibold text-lg">Create Account</h1>

          <form
            className="flex flex-col gap-5 text-md w-[350px]"
            onSubmit={handleSubmit}
          >
            <div className="flex flex-col gap-2 items-start">
              <label htmlFor="name">Name</label>
              <input
                id="name"
                type="text"
                className="border-2 rounded-md p-2 w-full"
                placeholder="Please enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            
            <div className="flex flex-col gap-2 items-start">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                className="border-2 rounded-md p-2 w-full"
                placeholder="Please enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="flex flex-col gap-2 items-start">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="border-2 rounded-md p-2 w-full"
                placeholder="Please enter your password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label htmlFor="remember">Remember Me</label>
            </div>

            {error && (
              <div className="text-red-600 text-sm">
                {error}
              </div>
            )}

            <Button 
              type="submit"
              loading={loading}
              className="w-full"
            >
              Sign Up
            </Button>

            <div className="text-center">
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={onSwitchToLogin}
                  className="text-primary font-semibold hover:underline"
                >
                  Login
                </button>
              </p>
            </div>
          </form>
        </div>
      </Card>
    </div>
  );
};

export default Signup;
