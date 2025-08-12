import { useState, useEffect, useCallback, useRef } from 'react';

const useSwipeNavigation = (tabs, activeTab, onTabChange) => {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [touchCurrent, setTouchCurrent] = useState(null);
  const [isSwipeIndicatorVisible, setIsSwipeIndicatorVisible] = useState(false);
  const [isSwipeActive, setIsSwipeActive] = useState(false);

  // Minimum swipe distance (in px) - made more sensitive for better UX
  const minSwipeDistance = 40;
  
  // Maximum time for swipe (in ms) - increased for better accessibility
  const maxSwipeTime = 600;
  
  // Time when touch started
  const [touchStartTime, setTouchStartTime] = useState(null);
  const swipeIndicatorTimeoutRef = useRef(null);

  const onTouchStart = useCallback((e) => {
    setTouchEnd(null);
    setTouchCurrent(null);
    const touch = e.targetTouches[0];
    setTouchStart(touch.clientX);
    setTouchStartTime(Date.now());
    setIsSwipeActive(false);
    
    // Clear any existing timeout
    if (swipeIndicatorTimeoutRef.current) {
      clearTimeout(swipeIndicatorTimeoutRef.current);
    }
  }, []);

  const onTouchMove = useCallback((e) => {
    const touch = e.targetTouches[0];
    setTouchCurrent(touch.clientX);
    setTouchEnd(touch.clientX);
    
    // Show visual feedback during swipe
    if (touchStart) {
      const currentDistance = Math.abs(touchStart - touch.clientX);
      if (currentDistance > minSwipeDistance / 2 && !isSwipeActive) {
        setIsSwipeActive(true);
        // Show indicator briefly during active swipe
        setIsSwipeIndicatorVisible(true);
        swipeIndicatorTimeoutRef.current = setTimeout(() => {
          setIsSwipeIndicatorVisible(false);
        }, 800);
      }
    }
  }, [touchStart, minSwipeDistance, isSwipeActive]);

  const showSwipeIndicator = useCallback((duration = 1200) => {
    setIsSwipeIndicatorVisible(true);
    swipeIndicatorTimeoutRef.current = setTimeout(() => {
      setIsSwipeIndicatorVisible(false);
    }, duration);
  }, []);

  const onTouchEnd = useCallback(() => {
    setIsSwipeActive(false);
    
    if (!touchStart || !touchEnd || !touchStartTime) return;
    
    const distance = touchStart - touchEnd;
    const timeElapsed = Date.now() - touchStartTime;
    const isValidSwipe = Math.abs(distance) > minSwipeDistance && timeElapsed < maxSwipeTime;
    
    if (isValidSwipe) {
      const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
      
      if (distance > 0 && currentIndex < tabs.length - 1) {
        // Swipe left - next tab
        onTabChange(tabs[currentIndex + 1].id);
        showSwipeIndicator(1000);
        
        // Haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      } else if (distance < 0 && currentIndex > 0) {
        // Swipe right - previous tab
        onTabChange(tabs[currentIndex - 1].id);
        showSwipeIndicator(1000);
        
        // Haptic feedback if available
        if (navigator.vibrate) {
          navigator.vibrate(50);
        }
      } else {
        // Invalid swipe direction - show hint
        showSwipeIndicator(800);
      }
    }
    
    // Reset touch states
    setTouchStart(null);
    setTouchEnd(null);
    setTouchCurrent(null);
  }, [touchStart, touchEnd, touchStartTime, tabs, activeTab, onTabChange, showSwipeIndicator, minSwipeDistance, maxSwipeTime]);

  useEffect(() => {
    // Show swipe hint on first load for mobile users
    const hasSeenSwipeHint = localStorage.getItem('hasSeenSwipeHint');
    const isMobile = window.innerWidth <= 768;
    
    if (!hasSeenSwipeHint && isMobile) {
      const timer = setTimeout(() => {
        setIsSwipeIndicatorVisible(true);
        swipeIndicatorTimeoutRef.current = setTimeout(() => {
          setIsSwipeIndicatorVisible(false);
          localStorage.setItem('hasSeenSwipeHint', 'true');
        }, 3500);
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (swipeIndicatorTimeoutRef.current) {
        clearTimeout(swipeIndicatorTimeoutRef.current);
      }
    };
  }, []);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    isSwipeIndicatorVisible,
    isSwipeActive,
    swipeProgress: touchStart && touchCurrent ? Math.abs(touchStart - touchCurrent) / minSwipeDistance : 0
  };
};

export default useSwipeNavigation;