import { useState, useCallback } from 'react';

export const useErrorHandler = () => {
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAsync = useCallback(async (asyncFunction, options = {}) => {
    const { 
      setLoadingState = true, 
      showErrorAlert = true,
      customErrorMessage = 'An error occurred. Please try again.'
    } = options;

    try {
      if (setLoadingState) setIsLoading(true);
      setError(null);
      
      const result = await asyncFunction();
      return { success: true, data: result };
    } catch (err) {
      console.error('Error in async operation:', err);
      const errorMessage = err.response?.data?.message || err.message || customErrorMessage;
      setError(errorMessage);
      
      if (showErrorAlert) {
        // Could integrate with toast notifications here
        console.error('User-facing error:', errorMessage);
      }
      
      return { success: false, error: errorMessage };
    } finally {
      if (setLoadingState) setIsLoading(false);
    }
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const retry = useCallback((asyncFunction, options = {}) => {
    return handleAsync(asyncFunction, options);
  }, [handleAsync]);

  return {
    error,
    isLoading,
    setIsLoading,
    handleAsync,
    clearError,
    retry
  };
};