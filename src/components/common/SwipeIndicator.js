import React from 'react';

const SwipeIndicator = ({ isVisible, currentTab, tabs }) => {
  const currentIndex = tabs.findIndex(tab => tab.id === currentTab);
  const canSwipeLeft = currentIndex < tabs.length - 1;
  const canSwipeRight = currentIndex > 0;

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50 sm:hidden pointer-events-none">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 bg-opacity-95 text-white px-6 py-3 rounded-2xl flex items-center space-x-4 shadow-2xl backdrop-blur-sm animate-bounce">
        {/* Left indicator */}
        {canSwipeRight && (
          <div className="flex items-center space-x-2 bg-white bg-opacity-20 px-3 py-2 rounded-xl">
            <span className="text-lg animate-pulse">←</span>
            <div className="text-center">
              <div className="text-xs font-semibold opacity-90">Previous</div>
              <div className="text-xs font-bold">{tabs[currentIndex - 1]?.icon} {tabs[currentIndex - 1]?.name.split(' ')[0]}</div>
            </div>
          </div>
        )}
        
        {/* Center message */}
        <div className="text-center px-3">
          <div className="text-sm font-bold mb-1">💫 Swipe to Navigate</div>
          <div className="text-xs opacity-80 flex items-center justify-center space-x-1">
            <span>{currentIndex + 1}</span>
            <span>/</span>
            <span>{tabs.length}</span>
            <span className="ml-2">{tabs[currentIndex]?.icon}</span>
          </div>
        </div>
        
        {/* Right indicator */}
        {canSwipeLeft && (
          <div className="flex items-center space-x-2 bg-white bg-opacity-20 px-3 py-2 rounded-xl">
            <div className="text-center">
              <div className="text-xs font-semibold opacity-90">Next</div>
              <div className="text-xs font-bold">{tabs[currentIndex + 1]?.name.split(' ')[0]} {tabs[currentIndex + 1]?.icon}</div>
            </div>
            <span className="text-lg animate-pulse">→</span>
          </div>
        )}
      </div>
      
      {/* Progress dots */}
      <div className="flex justify-center mt-3 space-x-1">
        {tabs.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentIndex 
                ? 'bg-white shadow-lg scale-125' 
                : 'bg-white bg-opacity-40'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default SwipeIndicator;