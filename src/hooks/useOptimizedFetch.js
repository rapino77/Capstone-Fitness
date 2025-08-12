import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

// Cache for storing API responses
const responseCache = new Map();
const requestCache = new Map();

export const useOptimizedFetch = (url, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const {
    cacheTime = 5 * 60 * 1000, // 5 minutes default cache
    refetchOnMount = true,
    refetchInterval = null,
    enabled = true,
    params = {},
    dependencies = []
  } = options;
  
  const cancelTokenRef = useRef();
  const intervalRef = useRef();
  
  const getCacheKey = useCallback(() => {
    return `${url}?${JSON.stringify(params)}`;
  }, [url, params]);
  
  const fetchData = useCallback(async (forceRefetch = false) => {
    if (!enabled) return;
    
    const cacheKey = getCacheKey();
    const cached = responseCache.get(cacheKey);
    
    // Return cached data if valid and not forcing refetch
    if (!forceRefetch && cached && (Date.now() - cached.timestamp < cacheTime)) {
      setData(cached.data);
      setLoading(false);
      setError(null);
      return cached.data;
    }
    
    // Prevent duplicate requests
    if (requestCache.has(cacheKey)) {
      return requestCache.get(cacheKey);
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Cancel previous request
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel('Operation cancelled due to new request');
      }
      
      // Create new cancel token
      cancelTokenRef.current = axios.CancelToken.source();
      
      const promise = axios.get(url, {
        params,
        cancelToken: cancelTokenRef.current.token,
        timeout: 10000 // 10 second timeout
      });
      
      // Cache the promise to prevent duplicates
      requestCache.set(cacheKey, promise);
      
      const response = await promise;
      
      if (response.data.success) {
        const responseData = response.data.data;
        
        // Cache the response
        responseCache.set(cacheKey, {
          data: responseData,
          timestamp: Date.now()
        });
        
        setData(responseData);
        setError(null);
        return responseData;
      } else {
        throw new Error(response.data.error || 'Request failed');
      }
    } catch (err) {
      if (!axios.isCancel(err)) {
        const errorMessage = err.response?.data?.error || err.message || 'Network error';
        setError(errorMessage);
        console.error(`Fetch error for ${url}:`, err);
      }
    } finally {
      setLoading(false);
      requestCache.delete(cacheKey);
    }
  }, [url, params, enabled, cacheTime, getCacheKey]);
  
  // Initial fetch
  useEffect(() => {
    if (enabled && refetchOnMount) {
      fetchData();
    }
  }, [fetchData, enabled, refetchOnMount, ...dependencies]);
  
  // Polling interval
  useEffect(() => {
    if (refetchInterval && enabled) {
      intervalRef.current = setInterval(() => {
        fetchData(true);
      }, refetchInterval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [fetchData, refetchInterval, enabled]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cancelTokenRef.current) {
        cancelTokenRef.current.cancel('Component unmounted');
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);
  
  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);
  
  const clearCache = useCallback(() => {
    const cacheKey = getCacheKey();
    responseCache.delete(cacheKey);
  }, [getCacheKey]);
  
  return {
    data,
    loading,
    error,
    refetch,
    clearCache
  };
};

// Preload data for better perceived performance
export const preloadData = (url, params = {}) => {
  const cacheKey = `${url}?${JSON.stringify(params)}`;
  
  if (!responseCache.has(cacheKey)) {
    axios.get(url, { params })
      .then(response => {
        if (response.data.success) {
          responseCache.set(cacheKey, {
            data: response.data.data,
            timestamp: Date.now()
          });
        }
      })
      .catch(err => {
        console.warn('Preload failed:', err.message);
      });
  }
};

// Clear all cached data
export const clearAllCache = () => {
  responseCache.clear();
  requestCache.clear();
};