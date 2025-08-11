import { useState, useEffect, useCallback } from 'react';

const useSwipeNavigation = (tabs, activeTab, onTabChange) => {
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isSwipeIndicatorVisible, setIsSwipeIndicatorVisible] = useState(false);

  // Minimum swipe distance (in px)
  const minSwipeDistance = 50;
  
  // Maximum time for swipe (in ms)
  const maxSwipeTime = 500;
  
  // Time when touch started
  const [touchStartTime, setTouchStartTime] = useState(null);

  const onTouchStart = useCallback((e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setTouchStartTime(Date.now());
  }, []);

  const onTouchMove = useCallback((e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd || !touchStartTime) return;
    
    const distance = touchStart - touchEnd;
    const timeElapsed = Date.now() - touchStartTime;
    const isValidSwipe = Math.abs(distance) > minSwipeDistance && timeElapsed < maxSwipeTime;
    
    if (isValidSwipe) {
      const currentIndex = tabs.findIndex(tab => tab.id === activeTab);
      
      if (distance > 0 && currentIndex < tabs.length - 1) {
        // Swipe left - next tab
        onTabChange(tabs[currentIndex + 1].id);
        showSwipeIndicator();
      } else if (distance < 0 && currentIndex > 0) {
        // Swipe right - previous tab
        onTabChange(tabs[currentIndex - 1].id);
        showSwipeIndicator();
      }
    }
  }, [touchStart, touchEnd, touchStartTime, tabs, activeTab, onTabChange, showSwipeIndicator]);

  const showSwipeIndicator = useCallback(() => {
    setIsSwipeIndicatorVisible(true);
    setTimeout(() => setIsSwipeIndicatorVisible(false), 1000);
  }, []);

  useEffect(() => {
    // Show swipe hint on first load for mobile users
    const hasSeenSwipeHint = localStorage.getItem('hasSeenSwipeHint');
    if (!hasSeenSwipeHint && window.innerWidth <= 768) {
      setTimeout(() => {
        setIsSwipeIndicatorVisible(true);
        setTimeout(() => setIsSwipeIndicatorVisible(false), 3000);
        localStorage.setItem('hasSeenSwipeHint', 'true');
      }, 1000);
    }
  }, []);

  return {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    isSwipeIndicatorVisible
  };
};

export default useSwipeNavigation;