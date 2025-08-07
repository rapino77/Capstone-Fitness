import React, { useState } from 'react';
import CoolLoadingAnimation from './CoolLoadingAnimation';

const Sidebar = ({ sections, activeSection, onSectionChange }) => {
  const [loadingSection, setLoadingSection] = useState(null);

  const getRandomMiniLoadingType = () => {
    const types = ['bouncing-dots', 'gradient-spin', 'pulse-wave'];
    return types[Math.floor(Math.random() * types.length)];
  };

  const handleSectionClick = async (sectionId) => {
    if (sectionId === activeSection) return; // Don't change if already active
    
    setLoadingSection(sectionId);
    
    // Short cool loading animation
    await new Promise(resolve => setTimeout(resolve, 300));
    
    onSectionChange(sectionId);
    setLoadingSection(null);
  };
  return (
    <div className="w-64 bg-blue-secondary rounded-lg shadow-md p-4 h-fit">
      <h3 className="text-lg font-semibold text-white mb-4">Analytics & Tracking</h3>
      <nav className="space-y-2">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => handleSectionClick(section.id)}
            disabled={loadingSection !== null}
            className={`sidebar-button w-full text-left px-4 py-3 rounded-md text-sm font-medium flex items-center space-x-3 relative overflow-hidden ${
              activeSection === section.id
                ? 'bg-blue-600 text-white'
                : loadingSection === section.id
                ? 'bg-blue-700 text-white'
                : 'text-gray-200 hover:bg-blue-700 hover:text-white'
            } ${loadingSection !== null ? 'cursor-not-allowed opacity-75' : ''}`}
          >
            <span className="text-lg">
              {loadingSection === section.id ? (
                <div className="w-5 h-5 flex items-center justify-center">
                  <CoolLoadingAnimation 
                    type={getRandomMiniLoadingType()} 
                    size="small" 
                  />
                </div>
              ) : (
                section.icon
              )}
            </span>
            <div>
              <div className="font-medium">
                {loadingSection === section.id ? 'Loading...' : section.name}
              </div>
              {section.description && loadingSection !== section.id && (
                <div className="text-xs opacity-75">{section.description}</div>
              )}
            </div>
            
            {/* Cool loading overlay for non-active buttons */}
            {loadingSection !== null && loadingSection !== section.id && (
              <div className="absolute inset-0 bg-blue-900 bg-opacity-60 rounded-md flex items-center justify-center backdrop-blur-sm">
                <div className="text-xs animate-pulse text-white">Loading...</div>
              </div>
            )}
          </button>
        ))}
      </nav>
      
      <div className="mt-6 p-3 bg-blue-800 rounded-md">
        <h4 className="text-sm font-medium text-white mb-2">💡 Pro Tip</h4>
        <p className="text-xs text-blue-100">
          Track multiple exercises over time to identify your strongest and weakest movement patterns.
        </p>
      </div>
    </div>
  );
};

export default Sidebar;