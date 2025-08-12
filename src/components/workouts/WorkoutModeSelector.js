import React, { useState, useEffect } from 'react';
import WorkoutForm from './WorkoutForm';
import MobileWorkoutInterface from './MobileWorkoutInterface';

const WorkoutModeSelector = ({ onSuccess }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [workoutMode, setWorkoutMode] = useState('desktop'); // 'desktop', 'mobile', 'auto'

  useEffect(() => {
    const checkDevice = () => {
      const isMobileDevice = window.innerWidth <= 768 || 
                           /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
      
      // Auto-select mobile mode for mobile devices
      if (isMobileDevice && workoutMode === 'auto') {
        setWorkoutMode('mobile');
      }
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, [workoutMode]);

  // Load saved preference
  useEffect(() => {
    const savedMode = localStorage.getItem('workout-interface-mode');
    if (savedMode && ['desktop', 'mobile', 'auto'].includes(savedMode)) {
      setWorkoutMode(savedMode);
    } else {
      setWorkoutMode('auto');
    }
  }, []);

  // Save preference
  const handleModeChange = (mode) => {
    setWorkoutMode(mode);
    localStorage.setItem('workout-interface-mode', mode);
  };

  const shouldShowMobile = () => {
    if (workoutMode === 'mobile') return true;
    if (workoutMode === 'desktop') return false;
    if (workoutMode === 'auto') return isMobile;
    return false;
  };

  return (
    <div>
      {/* Mode Selector - Only show on desktop or when explicitly requested */}
      {(!isMobile || workoutMode !== 'auto') && (
        <div className="mb-6 bg-blue-primary rounded-xl shadow-lg p-4 mx-2 sm:mx-0">
          <h3 className="text-lg font-semibold text-white mb-3">Workout Interface</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleModeChange('auto')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                workoutMode === 'auto'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-600 bg-opacity-30 text-blue-100 hover:bg-blue-600 hover:bg-opacity-40'
              }`}
            >
              🤖 Auto
            </button>
            <button
              onClick={() => handleModeChange('mobile')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                workoutMode === 'mobile'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-600 bg-opacity-30 text-blue-100 hover:bg-blue-600 hover:bg-opacity-40'
              }`}
            >
              📱 Mobile Style
            </button>
            <button
              onClick={() => handleModeChange('desktop')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                workoutMode === 'desktop'
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-600 bg-opacity-30 text-blue-100 hover:bg-blue-600 hover:bg-opacity-40'
              }`}
            >
              💻 Desktop Style
            </button>
          </div>
          {workoutMode === 'auto' && (
            <p className="text-sm text-blue-200 mt-2">
              Currently showing: {isMobile ? 'Mobile' : 'Desktop'} interface
            </p>
          )}
        </div>
      )}

      {/* Render appropriate interface */}
      {shouldShowMobile() ? (
        <MobileWorkoutInterface onSuccess={onSuccess} />
      ) : (
        <WorkoutForm onSuccess={onSuccess} />
      )}
    </div>
  );
};

export default WorkoutModeSelector;