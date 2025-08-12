import { useState, useEffect, useCallback, useRef } from 'react';

const useMobileEnhancements = () => {
  const [isInstallPromptAvailable, setIsInstallPromptAvailable] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [isLowPowerMode, setIsLowPowerMode] = useState(false);
  
  // PWA install prompt handling
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsInstallPromptAvailable(true);
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);
  
  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Battery API (when available)
  useEffect(() => {
    const getBatteryInfo = async () => {
      if ('getBattery' in navigator) {
        try {
          const battery = await navigator.getBattery();
          setBatteryLevel(battery.level);
          setIsLowPowerMode(battery.level < 0.2);
          
          const updateBattery = () => {
            setBatteryLevel(battery.level);
            setIsLowPowerMode(battery.level < 0.2);
          };
          
          battery.addEventListener('levelchange', updateBattery);
          battery.addEventListener('chargingchange', updateBattery);
          
          return () => {
            battery.removeEventListener('levelchange', updateBattery);
            battery.removeEventListener('chargingchange', updateBattery);
          };
        } catch (error) {
          console.log('Battery API not available');
        }
      }
    };
    
    getBatteryInfo();
  }, []);
  
  const installPWA = useCallback(async () => {
    if (installPrompt) {
      const result = await installPrompt.prompt();
      console.log('PWA install prompt result:', result);
      setInstallPrompt(null);
      setIsInstallPromptAvailable(false);
    }
  }, [installPrompt]);
  
  // Screen wake lock (to prevent screen from sleeping during workouts)
  const [wakeLock, setWakeLock] = useState(null);
  
  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        const lock = await navigator.wakeLock.request('screen');
        setWakeLock(lock);
        console.log('Screen wake lock activated');
        
        lock.addEventListener('release', () => {
          console.log('Screen wake lock released');
          setWakeLock(null);
        });
        
        return lock;
      }
    } catch (error) {
      console.log('Wake lock not supported or failed:', error);
    }
  }, []);
  
  const releaseWakeLock = useCallback(async () => {
    if (wakeLock) {
      await wakeLock.release();
      setWakeLock(null);
    }
  }, [wakeLock]);
  
  // Haptic feedback
  const vibrate = useCallback((pattern = 50) => {
    if ('vibrate' in navigator && !isLowPowerMode) {
      navigator.vibrate(pattern);
    }
  }, [isLowPowerMode]);
  
  // Enhanced haptic feedback patterns
  const hapticFeedback = useCallback({
    light: () => vibrate(10),
    medium: () => vibrate(50),
    heavy: () => vibrate(100),
    success: () => vibrate([50, 50, 50]),
    error: () => vibrate([100, 100, 100, 100]),
    notification: () => vibrate([50, 50, 50, 50, 50])
  }, [vibrate]);
  
  return {
    // PWA features
    isInstallPromptAvailable,
    installPWA,
    
    // Device capabilities
    isOnline,
    batteryLevel,
    isLowPowerMode,
    
    // Screen management
    wakeLock,
    requestWakeLock,
    releaseWakeLock,
    
    // Haptic feedback
    vibrate,
    hapticFeedback
  };
};

// Hook for pull-to-refresh functionality
export const usePullToRefresh = (onRefresh, threshold = 100) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const touchCurrentY = useRef(0);
  const isAtTop = useRef(true);
  
  const handleTouchStart = useCallback((e) => {
    // Only trigger if we're at the top of the page
    isAtTop.current = window.scrollY === 0;
    if (isAtTop.current) {
      touchStartY.current = e.touches[0].clientY;
      touchCurrentY.current = touchStartY.current;
    }
  }, []);
  
  const handleTouchMove = useCallback((e) => {
    if (!isAtTop.current || isRefreshing) return;
    
    touchCurrentY.current = e.touches[0].clientY;
    const distance = touchCurrentY.current - touchStartY.current;
    
    if (distance > 0) {
      // Prevent default scroll behavior
      e.preventDefault();
      // Apply resistance curve
      const resistedDistance = Math.min(distance * 0.5, threshold * 1.5);
      setPullDistance(resistedDistance);
    }
  }, [threshold, isRefreshing]);
  
  const handleTouchEnd = useCallback(async () => {
    if (!isAtTop.current || isRefreshing) return;
    
    if (pullDistance > threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      }
      setIsRefreshing(false);
    }
    
    setPullDistance(0);
    touchStartY.current = 0;
    touchCurrentY.current = 0;
  }, [pullDistance, threshold, onRefresh, isRefreshing]);
  
  return {
    isRefreshing,
    pullDistance,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    pullProgress: Math.min(pullDistance / threshold, 1)
  };
};

// Hook for enhanced touch gestures
export const useAdvancedGestures = () => {
  const [gesture, setGesture] = useState(null);
  const touchData = useRef({
    startTime: 0,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
    touches: []
  });
  
  const detectGesture = useCallback((touches) => {
    const data = touchData.current;
    const deltaX = data.currentX - data.startX;
    const deltaY = data.currentY - data.startY;
    const deltaTime = Date.now() - data.startTime;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const velocity = distance / deltaTime;
    
    // Detect gesture type
    if (touches.length === 2) {
      return 'pinch';
    } else if (velocity > 0.5 && distance > 50) {
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        return deltaX > 0 ? 'swipe-right' : 'swipe-left';
      } else {
        return deltaY > 0 ? 'swipe-down' : 'swipe-up';
      }
    } else if (deltaTime > 500 && distance < 10) {
      return 'long-press';
    } else if (deltaTime < 200 && distance < 10) {
      return 'tap';
    }
    
    return null;
  }, []);
  
  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    touchData.current = {
      startTime: Date.now(),
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      touches: Array.from(e.touches)
    };
  }, []);
  
  const handleTouchMove = useCallback((e) => {
    const touch = e.touches[0];
    touchData.current.currentX = touch.clientX;
    touchData.current.currentY = touch.clientY;
    touchData.current.touches = Array.from(e.touches);
    
    const detectedGesture = detectGesture(e.touches);
    if (detectedGesture !== gesture) {
      setGesture(detectedGesture);
    }
  }, [gesture, detectGesture]);
  
  const handleTouchEnd = useCallback((e) => {
    const finalGesture = detectGesture(touchData.current.touches);
    setGesture(finalGesture);
    
    // Clear gesture after a short delay
    setTimeout(() => setGesture(null), 100);
  }, [detectGesture]);
  
  return {
    gesture,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
};

export default useMobileEnhancements;