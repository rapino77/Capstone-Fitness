import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const CoolLoadingAnimation = ({ 
  type = 'pulse-wave', 
  size = 'medium', 
  message = '',
  overlay = false 
}) => {
  const { theme } = useTheme();

  const getSizeClasses = () => {
    switch (size) {
      case 'small': return { container: 'w-8 h-8', text: 'text-sm' };
      case 'large': return { container: 'w-16 h-16', text: 'text-lg' };
      case 'xlarge': return { container: 'w-20 h-20', text: 'text-xl' };
      default: return { container: 'w-12 h-12', text: 'text-base' };
    }
  };

  const sizeClasses = getSizeClasses();

  const renderPulseWave = () => (
    <div className="relative flex items-center justify-center">
      <div className="absolute animate-ping rounded-full opacity-75 bg-blue-400" 
           style={{ 
             width: '100%', 
             height: '100%',
             backgroundColor: theme.colors.primary + '60',
             animationDuration: '1.5s'
           }}>
      </div>
      <div className="absolute animate-ping rounded-full opacity-50 bg-blue-400 animation-delay-75" 
           style={{ 
             width: '80%', 
             height: '80%',
             backgroundColor: theme.colors.primary + '40',
             animationDuration: '1.5s',
             animationDelay: '0.2s'
           }}>
      </div>
      <div className="relative rounded-full bg-blue-500 flex items-center justify-center" 
           style={{ 
             width: '60%', 
             height: '60%',
             backgroundColor: theme.colors.primary
           }}>
        <span className="text-white text-xl">⚡</span>
      </div>
    </div>
  );

  const renderSpinningOrbs = () => (
    <div className="relative flex items-center justify-center">
      <div className="animate-spin" style={{ animationDuration: '2s' }}>
        <div className="w-12 h-12 relative">
          <div className="absolute top-0 left-1/2 w-3 h-3 rounded-full -translate-x-1/2 animate-pulse"
               style={{ backgroundColor: theme.colors.primary }}>
          </div>
          <div className="absolute top-1/2 right-0 w-3 h-3 rounded-full -translate-y-1/2 animate-pulse"
               style={{ 
                 backgroundColor: theme.colors.primary,
                 animationDelay: '0.5s'
               }}>
          </div>
          <div className="absolute bottom-0 left-1/2 w-3 h-3 rounded-full -translate-x-1/2 animate-pulse"
               style={{ 
                 backgroundColor: theme.colors.primary,
                 animationDelay: '1s'
               }}>
          </div>
          <div className="absolute top-1/2 left-0 w-3 h-3 rounded-full -translate-y-1/2 animate-pulse"
               style={{ 
                 backgroundColor: theme.colors.primary,
                 animationDelay: '1.5s'
               }}>
          </div>
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-2xl animate-pulse">⚡</span>
      </div>
    </div>
  );

  const renderBouncingDots = () => (
    <div className="flex space-x-2">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="w-3 h-3 rounded-full animate-bounce"
          style={{ 
            backgroundColor: theme.colors.primary,
            animationDelay: `${i * 0.1}s`,
            animationDuration: '0.8s'
          }}
        />
      ))}
    </div>
  );

  const renderMorphingSquare = () => (
    <div className="relative">
      <div 
        className="w-12 h-12 animate-spin rounded-lg"
        style={{ 
          backgroundColor: theme.colors.primary,
          animationDuration: '1.2s'
        }}
      >
      </div>
      <div 
        className="absolute inset-2 animate-ping rounded-full"
        style={{ 
          backgroundColor: 'white',
          animationDuration: '1.2s'
        }}
      >
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white text-lg font-bold">⚡</span>
      </div>
    </div>
  );

  const renderGradientSpin = () => (
    <div className="relative">
      <div className="w-12 h-12 rounded-full animate-spin"
           style={{ 
             background: `conic-gradient(${theme.colors.primary}, transparent, ${theme.colors.primary})`,
             animationDuration: '1s'
           }}>
      </div>
      <div className="absolute inset-1 rounded-full flex items-center justify-center"
           style={{ backgroundColor: theme.colors.background }}>
        <span className="text-xl animate-pulse">⚡</span>
      </div>
    </div>
  );

  const renderPulsingHeart = () => (
    <div className="relative flex items-center justify-center">
      <div className="text-4xl animate-pulse text-red-500"
           style={{ 
             animationDuration: '0.8s',
             filter: `hue-rotate(${theme.colors.primary === '#3b82f6' ? '200deg' : '0deg'})`
           }}>
        💪
      </div>
      <div className="absolute inset-0 animate-ping rounded-full opacity-20"
           style={{ 
             backgroundColor: theme.colors.primary,
             animationDuration: '1.2s'
           }}>
      </div>
    </div>
  );

  const getAnimation = () => {
    switch (type) {
      case 'spinning-orbs': return renderSpinningOrbs();
      case 'bouncing-dots': return renderBouncingDots();
      case 'morphing-square': return renderMorphingSquare();
      case 'gradient-spin': return renderGradientSpin();
      case 'pulsing-heart': return renderPulsingHeart();
      default: return renderPulseWave();
    }
  };

  const content = (
    <div className="flex flex-col items-center justify-center space-y-3">
      <div className={sizeClasses.container}>
        {getAnimation()}
      </div>
      {message && (
        <div 
          className={`${sizeClasses.text} font-medium animate-pulse`}
          style={{ color: '#ffffff' }}
        >
          {message}
        </div>
      )}
    </div>
  );

  if (overlay) {
    return (
      <div className="absolute inset-0 flex items-center justify-center z-10 rounded-lg"
           style={{ 
             backgroundColor: theme.colors.background + 'E6',
             backdropFilter: 'blur(2px)'
           }}>
        {content}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center p-4">
      {content}
    </div>
  );
};

export default CoolLoadingAnimation;