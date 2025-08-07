import React from 'react';

const Sidebar = ({ sections, activeSection, onSectionChange }) => {
  return (
    <div className="w-64 bg-blue-secondary rounded-lg shadow-md p-4 h-fit">
      <h3 className="text-lg font-semibold text-white mb-4">Analytics & Tracking</h3>
      <nav className="space-y-2">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={`w-full text-left px-4 py-3 rounded-md text-sm font-medium transition-colors flex items-center space-x-3 ${
              activeSection === section.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-200 hover:bg-blue-700 hover:text-white'
            }`}
          >
            <span className="text-lg">{section.icon}</span>
            <div>
              <div className="font-medium">{section.name}</div>
              {section.description && (
                <div className="text-xs opacity-75">{section.description}</div>
              )}
            </div>
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