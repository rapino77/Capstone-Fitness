import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const LoadingAnimation = ({ 
  type = 'spinner', 
  size = 'medium', 
  message = 'Loading...', 
  fullScreen = false,
  overlay = false 
}) => {
  const { theme } = useTheme();

  const getSizeClasses = () => {
    switch (size) {
      case 'small': return { container: 'w-6 h-6', dot: 'w-1 h-1', text: 'text-sm' };
      case 'large': return { container: 'w-16 h-16', dot: 'w-3 h-3', text: 'text-lg' };
      case 'xlarge': return { container: 'w-24 h-24', dot: 'w-4 h-4', text: 'text-xl' };
      default: return { container: 'w-10 h-10', dot: 'w-2 h-2', text: 'text-base' };
    }
  };

  const sizeClasses = getSizeClasses();

  const renderSpinner = () => (
    <div className={`${sizeClasses.container} border-4 border-gray-200 border-t-4 rounded-full animate-spin`}
         style={{ borderTopColor: theme.colors.primary }}>
    </div>
  );

  const renderPulse = () => (
    <div className={`${sizeClasses.container} rounded-full animate-pulse`}
         style={{ backgroundColor: theme.colors.primary }}>
    </div>
  );

  const renderDots = () => (
    <div className="flex space-x-2">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={`${sizeClasses.dot} rounded-full animate-bounce`}
          style={{ 
            backgroundColor: theme.colors.primary,
            animationDelay: `${i * 0.1}s`,
            animationDuration: '0.6s'
          }}
        />
      ))}
    </div>
  );

  const renderBars = () => (
    <div className="flex space-x-1 items-end">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-2 bg-current animate-pulse`}
          style={{ 
            height: `${12 + (i % 2) * 8}px`,
            color: theme.colors.primary,
            animationDelay: `${i * 0.15}s`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  );

  const renderFitness = () => (
    <div className="flex items-center space-x-2">
      <div className="text-2xl animate-bounce" style={{ animationDuration: '1s' }}>
        🏋️‍♂️
      </div>
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`${sizeClasses.dot} rounded-full animate-pulse`}
            style={{ 
              backgroundColor: theme.colors.primary,
              animationDelay: `${i * 0.2}s`
            }}
          />
        ))}
      </div>
    </div>
  );

  const getAnimation = () => {
    switch (type) {
      case 'pulse': return renderPulse();
      case 'dots': return renderDots();
      case 'bars': return renderBars();
      case 'fitness': return renderFitness();
      default: return renderSpinner();
    }
  };

  const content = (
    <div className="flex flex-col items-center justify-center space-y-4">
      {getAnimation()}
      {message && (
        <div 
          className={`${sizeClasses.text} font-medium animate-pulse`}
          style={{ color: theme.colors.text }}
        >
          {message}
        </div>
      )}
    </div>
  );

  if (fullScreen) {
    return (
      <div 
        className="fixed inset-0 flex items-center justify-center z-50"
        style={{ 
          backgroundColor: overlay ? `${theme.colors.background}E6` : theme.colors.background 
        }}
      >
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-8">
      {content}
    </div>
  );
};

// Section Loading Component - matches the section's design
export const SectionLoading = ({ title, type = 'fitness' }) => {
  const { theme } = useTheme();
  
  return (
    <div 
      className="rounded-lg shadow-md p-6 animate-pulse"
      style={{ backgroundColor: theme.colors.background }}
    >
      {/* Header skeleton */}
      <div className="flex justify-between items-center mb-6">
        <div 
          className="h-8 bg-gray-200 rounded w-48"
          style={{ backgroundColor: `${theme.colors.primary}20` }}
        />
        <div 
          className="h-6 bg-gray-200 rounded w-24"
          style={{ backgroundColor: `${theme.colors.primary}20` }}
        />
      </div>
      
      {/* Content skeleton */}
      <div className="space-y-4">
        <div 
          className="h-4 bg-gray-200 rounded w-3/4"
          style={{ backgroundColor: `${theme.colors.primary}20` }}
        />
        <div 
          className="h-32 bg-gray-200 rounded"
          style={{ backgroundColor: `${theme.colors.primary}20` }}
        />
        <div className="flex space-x-4">
          <div 
            className="h-4 bg-gray-200 rounded w-1/4"
            style={{ backgroundColor: `${theme.colors.primary}20` }}
          />
          <div 
            className="h-4 bg-gray-200 rounded w-1/3"
            style={{ backgroundColor: `${theme.colors.primary}20` }}
          />
        </div>
      </div>
      
      {/* Loading animation in center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <LoadingAnimation 
          type={type}
          size="large"
          message={title ? `Loading ${title}...` : undefined}
        />
      </div>
    </div>
  );
};

// Page Transition Component
export const PageTransition = ({ children, isLoading, loadingType = 'fitness' }) => {
  return (
    <div className="relative">
      <div className={`transition-opacity duration-300 ${isLoading ? 'opacity-0' : 'opacity-100'}`}>
        {children}
      </div>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90">
          <LoadingAnimation 
            type={loadingType}
            size="xlarge"
            message="Loading section..."
          />
        </div>
      )}
    </div>
  );
};

export default LoadingAnimation;