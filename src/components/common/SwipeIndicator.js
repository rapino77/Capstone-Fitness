import React from 'react';

const SwipeIndicator = ({ isVisible, currentTab, tabs }) => {
  const currentIndex = tabs.findIndex(tab => tab.id === currentTab);
  const canSwipeLeft = currentIndex < tabs.length - 1;
  const canSwipeRight = currentIndex > 0;

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 sm:hidden">
      <div className="bg-black bg-opacity-80 text-white px-4 py-2 rounded-full flex items-center space-x-2 animate-bounce">
        {canSwipeRight && (
          <div className="flex items-center space-x-1">
            <span className="text-sm">←</span>
            <span className="text-xs">{tabs[currentIndex - 1]?.name.split(' ')[0]}</span>
          </div>
        )}
        
        <span className="text-xs px-2 py-1 bg-white bg-opacity-20 rounded">
          Swipe to navigate
        </span>
        
        {canSwipeLeft && (
          <div className="flex items-center space-x-1">
            <span className="text-xs">{tabs[currentIndex + 1]?.name.split(' ')[0]}</span>
            <span className="text-sm">→</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SwipeIndicator;