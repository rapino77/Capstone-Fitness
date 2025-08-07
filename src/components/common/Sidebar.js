import React, { useState } from 'react';
import LoadingAnimation from './LoadingAnimation';

const Sidebar = ({ sections, activeSection, onSectionChange }) => {
  const [loadingSection, setLoadingSection] = useState(null);

  const handleSectionClick = async (sectionId) => {
    if (sectionId === activeSection) return; // Don't load if already active
    
    setLoadingSection(sectionId);
    
    // Simulate loading time for smooth animation
    await new Promise(resolve => setTimeout(resolve, 400));
    
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
            className={`w-full text-left px-4 py-3 rounded-md text-sm font-medium transition-all duration-300 flex items-center space-x-3 relative ${
              activeSection === section.id
                ? 'bg-blue-600 text-white'
                : loadingSection === section.id
                ? 'bg-blue-700 text-white'
                : 'text-gray-200 hover:bg-blue-700 hover:text-white'
            } ${loadingSection !== null ? 'cursor-not-allowed opacity-75' : ''}`}
          >
            <span className="text-lg">
              {loadingSection === section.id ? (
                <div className="w-5 h-5">
                  <LoadingAnimation type="dots" size="small" message="" />
                </div>
              ) : (
                section.icon
              )}
            </span>
            <div className={`transition-opacity duration-300 ${
              loadingSection === section.id ? 'opacity-75' : ''
            }`}>
              <div className="font-medium">
                {loadingSection === section.id ? 'Loading...' : section.name}
              </div>
              {section.description && !loadingSection && (
                <div className="text-xs opacity-75">{section.description}</div>
              )}
            </div>
            
            {/* Loading overlay for non-loading sections when any section is loading */}
            {loadingSection !== null && loadingSection !== section.id && (
              <div className="absolute inset-0 bg-blue-900 bg-opacity-50 rounded-md flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
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