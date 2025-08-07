import React, { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';

const EntranceAnimation = ({ onComplete }) => {
  const { theme } = useTheme();
  const [currentStage, setCurrentStage] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const stages = [
      { delay: 0, duration: 800 },      // Stage 0: Logo appear
      { delay: 300, duration: 600 },    // Stage 1: Lightning effects
      { delay: 600, duration: 800 },    // Stage 2: Text reveal
      { delay: 1000, duration: 600 },   // Stage 3: Particle effects
      { delay: 1400, duration: 400 }    // Stage 4: Fade out
    ];

    const timers = stages.map((stage, index) => {
      return setTimeout(() => {
        setCurrentStage(index);
      }, stage.delay);
    });

    // Complete animation and hide
    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => {
        onComplete();
      }, 300);
    }, 2000);

    return () => {
      timers.forEach(timer => clearTimeout(timer));
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
         style={{ 
           background: `linear-gradient(135deg, ${theme.colors.background}, ${theme.colors.backgroundSecondary})` 
         }}>
      
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Floating particles */}
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className={`absolute rounded-full opacity-20 animate-pulse ${
              currentStage >= 3 ? 'animate-bounce' : ''
            }`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              width: `${8 + Math.random() * 16}px`,
              height: `${8 + Math.random() * 16}px`,
              backgroundColor: theme.colors.primary,
              animationDelay: `${Math.random() * 2}s`,
              animationDuration: `${2 + Math.random() * 2}s`
            }}
          />
        ))}

        {/* Radial gradient overlay */}
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(circle at center, ${theme.colors.primary}20 0%, transparent 70%)`
          }}
        />
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center">
        
        {/* Main Logo/Icon with Lightning Effect */}
        <div className="relative mb-8">
          <div className={`text-8xl transition-all duration-800 ${
            currentStage >= 0 
              ? 'opacity-100 scale-100 rotate-0' 
              : 'opacity-0 scale-50 rotate-180'
          }`}>
            <div className="relative inline-block">
              <span className="relative z-10">⚡</span>
              
              {/* Lightning glow effect */}
              {currentStage >= 1 && (
                <div className="absolute inset-0 animate-ping">
                  <span className="text-8xl opacity-40" 
                        style={{ color: theme.colors.primary }}>⚡</span>
                </div>
              )}
              
              {/* Secondary glow */}
              {currentStage >= 1 && (
                <div className="absolute inset-0 animate-pulse">
                  <span className="text-8xl opacity-20" 
                        style={{ color: theme.colors.primary }}>⚡</span>
                </div>
              )}
            </div>
          </div>
          
          {/* Lightning strike effects */}
          {currentStage >= 1 && (
            <>
              <div className="absolute -top-4 -right-4 text-yellow-400 text-2xl animate-bounce">✨</div>
              <div className="absolute -bottom-4 -left-4 text-yellow-400 text-xl animate-bounce" 
                   style={{ animationDelay: '0.2s' }}>⚡</div>
              <div className="absolute -top-2 -left-6 text-blue-400 text-lg animate-bounce" 
                   style={{ animationDelay: '0.4s' }}>💫</div>
            </>
          )}
        </div>

        {/* Title Text with Typewriter Effect */}
        <div className="mb-6 overflow-hidden">
          <h1 className={`text-4xl md:text-6xl font-bold transition-all duration-1000 ${
            currentStage >= 2 
              ? 'opacity-100 transform translate-y-0' 
              : 'opacity-0 transform translate-y-8'
          }`}
          style={{ 
            color: theme.colors.text,
            textShadow: `0 0 20px ${theme.colors.primary}40`
          }}>
            <span className={`inline-block ${
              currentStage >= 2 ? 'animate-pulse' : ''
            }`}>
              Fitness Command Center
            </span>
          </h1>
        </div>

        {/* Subtitle */}
        <div className={`text-lg md:text-xl transition-all duration-800 delay-300 ${
          currentStage >= 2 
            ? 'opacity-100 transform translate-y-0' 
            : 'opacity-0 transform translate-y-4'
        }`}
        style={{ color: theme.colors.textSecondary }}>
          <span className="relative">
            Powering Your Fitness Journey
            {currentStage >= 2 && (
              <div className="absolute -right-8 top-0 text-yellow-400 animate-bounce">⚡</div>
            )}
          </span>
        </div>

        {/* Loading Bar */}
        <div className={`mt-8 w-64 mx-auto transition-all duration-600 ${
          currentStage >= 2 ? 'opacity-100' : 'opacity-0'
        }`}>
          <div className="h-1 bg-gray-300 rounded-full overflow-hidden"
               style={{ backgroundColor: `${theme.colors.border}60` }}>
            <div 
              className="h-full transition-all duration-1200 ease-out"
              style={{
                width: currentStage >= 2 ? '100%' : '0%',
                background: `linear-gradient(90deg, ${theme.colors.primary}, #fbbf24, ${theme.colors.primary})`
              }}
            />
          </div>
          <div className="text-sm mt-2 opacity-60" style={{ color: theme.colors.textSecondary }}>
            Loading your fitness experience...
          </div>
        </div>

        {/* Energy Waves */}
        {currentStage >= 3 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="absolute border-2 rounded-full animate-ping"
                style={{
                  width: `${200 + i * 100}px`,
                  height: `${200 + i * 100}px`,
                  borderColor: `${theme.colors.primary}${20 - i * 5}`,
                  animationDelay: `${i * 0.3}s`,
                  animationDuration: '2s'
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Corner Decorations */}
      {currentStage >= 1 && (
        <>
          <div className="absolute top-10 left-10 text-3xl opacity-40 animate-bounce"
               style={{ color: theme.colors.primary, animationDelay: '0.5s' }}>💪</div>
          <div className="absolute top-10 right-10 text-2xl opacity-40 animate-bounce"
               style={{ color: theme.colors.primary, animationDelay: '0.7s' }}>🏋️‍♂️</div>
          <div className="absolute bottom-10 left-10 text-2xl opacity-40 animate-bounce"
               style={{ color: theme.colors.primary, animationDelay: '0.9s' }}>🎯</div>
          <div className="absolute bottom-10 right-10 text-3xl opacity-40 animate-bounce"
               style={{ color: theme.colors.primary, animationDelay: '1.1s' }}>📊</div>
        </>
      )}

      {/* Exit Animation */}
      <div className={`absolute inset-0 transition-opacity duration-300 ${
        currentStage >= 4 ? 'opacity-0' : 'opacity-100'
      }`} />
    </div>
  );
};

export default EntranceAnimation;