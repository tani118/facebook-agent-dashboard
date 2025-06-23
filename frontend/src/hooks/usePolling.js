import { useEffect, useRef, useState } from 'react';

export const usePolling = (callback, interval = 5000, enabled = true) => {
  const intervalRef = useRef();
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (enabled && isVisible) {
      intervalRef.current = setInterval(callback, interval);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [callback, interval, enabled, isVisible]);

  return () => clearInterval(intervalRef.current);
};