import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import useMobileEnhancements from '../../hooks/useMobileEnhancements';

const MobileStatusBar = ({ className = '' }) => {
  const { theme } = useTheme();
  const { 
    isOnline, 
    batteryLevel, 
    isLowPowerMode, 
    isInstallPromptAvailable, 
    installPWA 
  } = useMobileEnhancements();
  
  // Only show on mobile devices
  if (window.innerWidth > 768) return null;
  
  return (
    <div 
      className={`fixed top-0 left-0 right-0 z-50 h-1 flex items-center justify-between px-3 py-1 text-xs font-medium backdrop-blur-sm ${className}`}
      style={{ 
        backgroundColor: `${theme.colors.background}f0`,
        borderBottom: `1px solid ${theme.colors.border}`,
        color: theme.colors.textSecondary 
      }}
    >
      {/* Left side - Connection and battery status */}
      <div className="flex items-center space-x-2">
        {/* Network status */}
        <div className={`flex items-center space-x-1 ${isOnline ? 'text-green-500' : 'text-red-500'}`}>
          <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
          <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
        </div>
        
        {/* Battery indicator */}
        {batteryLevel !== null && (
          <div className={`flex items-center space-x-1 ${isLowPowerMode ? 'text-orange-500' : 'text-gray-500'}`}>
            <div className="relative">
              <div className="w-4 h-2 border border-current rounded-sm">
                <div 
                  className={`h-full rounded-sm transition-all duration-300 ${
                    isLowPowerMode ? 'bg-orange-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${batteryLevel * 100}%` }}
                />
              </div>
              <div className="absolute -right-0.5 top-0.5 w-0.5 h-1 bg-current rounded-r" />
            </div>
            <span className="hidden sm:inline">{Math.round(batteryLevel * 100)}%</span>
          </div>
        )}
      </div>
      
      {/* Center - App title for mobile */}
      <div className="flex items-center space-x-1">
        <span className="text-xs font-bold">⚡ Fitness</span>
      </div>
      
      {/* Right side - Actions */}
      <div className="flex items-center space-x-2">
        {/* Install PWA button */}
        {isInstallPromptAvailable && (
          <button
            onClick={installPWA}
            className="px-2 py-1 text-xs font-semibold rounded-md transition-colors duration-200 hover:bg-opacity-20"
            style={{ 
              backgroundColor: `${theme.colors.primary}20`,
              color: theme.colors.primary 
            }}
          >
            Install
          </button>
        )}
        
        {/* Time */}
        <div className="text-xs font-medium">
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};

// Pull-to-refresh indicator component
export const PullToRefreshIndicator = ({ isRefreshing, pullProgress, pullDistance }) => {
  const { theme } = useTheme();
  
  if (!isRefreshing && pullDistance === 0) return null;
  
  return (
    <div 
      className="fixed top-16 left-1/2 transform -translate-x-1/2 z-40 flex items-center justify-center transition-all duration-200 sm:hidden"
      style={{
        transform: `translateX(-50%) translateY(${pullDistance * 0.5}px)`,
        opacity: Math.min(pullProgress * 2, 1)
      }}
    >
      <div 
        className="bg-white rounded-full p-3 shadow-lg border"
        style={{ 
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.border 
        }}
      >
        {isRefreshing ? (
          <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        ) : (
          <div 
            className="w-6 h-6 flex items-center justify-center text-blue-500 transition-transform duration-200"
            style={{ transform: `rotate(${pullProgress * 180}deg)` }}
          >
            ↓
          </div>
        )}
      </div>
      
      <div 
        className="absolute -bottom-8 text-xs font-medium px-3 py-1 rounded-full"
        style={{ 
          backgroundColor: `${theme.colors.background}f0`,
          color: theme.colors.textSecondary 
        }}
      >
        {isRefreshing ? 'Refreshing...' : pullProgress >= 1 ? 'Release to refresh' : 'Pull to refresh'}
      </div>
    </div>
  );
};

// Mobile-specific loading overlay
export const MobileLoadingOverlay = ({ isVisible, message = 'Loading...' }) => {
  const { theme } = useTheme();
  
  if (!isVisible) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm sm:hidden">
      <div 
        className="bg-white rounded-2xl p-6 shadow-2xl border flex flex-col items-center space-y-4 mx-4"
        style={{ 
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.border 
        }}
      >
        <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p 
          className="text-center font-medium"
          style={{ color: theme.colors.text }}
        >
          {message}
        </p>
      </div>
    </div>
  );
};

// Mobile-specific toast notification
export const MobileToast = ({ 
  message, 
  type = 'info', 
  isVisible, 
  onClose, 
  duration = 3000 
}) => {
  const { theme } = useTheme();
  
  React.useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);
  
  if (!isVisible) return null;
  
  const typeStyles = {
    success: { backgroundColor: '#10b981', color: '#ffffff' },
    error: { backgroundColor: '#ef4444', color: '#ffffff' },
    warning: { backgroundColor: '#f59e0b', color: '#ffffff' },
    info: { backgroundColor: theme.colors.primary, color: theme.colors.background }
  };
  
  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 sm:hidden">
      <div 
        className="rounded-2xl p-4 shadow-lg backdrop-blur-sm flex items-center space-x-3 animate-slide-up"
        style={typeStyles[type]}
      >
        <div className="text-xl">
          {type === 'success' && '✅'}
          {type === 'error' && '❌'}
          {type === 'warning' && '⚠️'}
          {type === 'info' && 'ℹ️'}
        </div>
        <p className="flex-1 font-medium">{message}</p>
        <button 
          onClick={onClose}
          className="text-xl opacity-80 hover:opacity-100 transition-opacity"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default MobileStatusBar;