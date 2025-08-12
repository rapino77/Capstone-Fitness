import { useState, useEffect } from 'react';

export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export const useThrottledCallback = (callback, delay) => {
  const [lastCall, setLastCall] = useState(0);
  
  return (...args) => {
    const now = Date.now();
    
    if (now - lastCall >= delay) {
      setLastCall(now);
      return callback(...args);
    }
  };
};