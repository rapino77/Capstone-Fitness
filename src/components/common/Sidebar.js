import React from 'react';

const Sidebar = ({ sections, activeSection, onSectionChange }) => {
  const handleSectionClick = (sectionId) => {
    if (sectionId === activeSection) return; // Don't change if already active
    onSectionChange(sectionId);
  };
  return (
    <div className="w-full lg:w-64 bg-blue-secondary rounded-lg shadow-md p-3 sm:p-4 h-fit">
      <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Analytics & Tracking</h3>
      <nav className="space-y-1.5 sm:space-y-2">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => handleSectionClick(section.id)}
            className={`sidebar-button-enhanced w-full text-left px-3 sm:px-4 py-2.5 sm:py-3 rounded-md text-sm font-medium flex items-center space-x-2.5 sm:space-x-3 transition-all duration-200 touch-manipulation min-h-12 ${
              activeSection === section.id
                ? 'bg-blue-600 text-white shadow-lg transform scale-[1.02]'
                : 'text-gray-200 hover:bg-blue-700 hover:text-white hover:shadow-md active:bg-blue-800'
            }`}
          >
            <span className="text-base sm:text-lg transition-transform duration-200 flex-shrink-0">
              {section.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-medium transition-colors duration-200 text-sm sm:text-base leading-tight">
                {section.name}
              </div>
              {section.description && (
                <div className="text-xs opacity-75 transition-opacity duration-200 group-hover:opacity-100 mt-0.5 hidden sm:block">
                  {section.description}
                </div>
              )}
            </div>
          </button>
        ))}
      </nav>
      
      <div className="mt-4 sm:mt-6 p-2.5 sm:p-3 bg-blue-800 rounded-md">
        <h4 className="text-xs sm:text-sm font-medium text-white mb-1.5 sm:mb-2">💡 Pro Tip</h4>
        <p className="text-xs text-blue-100 leading-relaxed">
          Track multiple exercises over time to identify your strongest and weakest movement patterns.
        </p>
      </div>
    </div>
  );
};

export default Sidebar;