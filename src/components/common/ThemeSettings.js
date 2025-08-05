import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';

const ThemeSettings = () => {
  const { theme, isDark, colorTheme, colorThemes, toggleDarkMode, changeColorTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const handleColorThemeChange = (themeName) => {
    changeColorTheme(themeName);
  };

  return (
    <div className="relative">
      {/* Settings Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-4 right-4 z-50 p-3 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
        style={{
          backgroundColor: theme.colors.primary,
          color: theme.colors.background
        }}
        title="Theme Settings"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {/* Settings Panel */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40 bg-black bg-opacity-50"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Settings Panel */}
          <div 
            className="fixed top-4 right-20 z-50 w-80 rounded-lg shadow-xl p-6 border"
            style={{
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
              color: theme.colors.text
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Theme Settings</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded hover:bg-opacity-10"
                style={{
                  color: theme.colors.textSecondary,
                  backgroundColor: `${theme.colors.primary}10`
                }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Dark/Light Mode Toggle */}
            <div className="mb-6">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <span className="font-medium">Dark Mode</span>
                  <p className="text-sm" style={{ color: theme.colors.textSecondary }}>
                    Toggle between light and dark themes
                  </p>
                </div>
                
                {/* Custom Toggle Switch */}
                <div 
                  className="relative inline-block w-12 h-6 transition-colors duration-200 rounded-full cursor-pointer"
                  style={{
                    backgroundColor: isDark ? theme.colors.primary : theme.colors.border
                  }}
                  onClick={toggleDarkMode}
                >
                  <div
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-transform duration-200 ${
                      isDark ? 'transform translate-x-6' : ''
                    }`}
                    style={{
                      backgroundColor: theme.colors.background,
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  >
                    {/* Icons inside toggle */}
                    <div className="flex items-center justify-center w-full h-full">
                      {isDark ? (
                        <svg className="w-3 h-3" style={{ color: theme.colors.primary }} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" style={{ color: theme.colors.textSecondary }} fill="currentColor" viewBox="0 0 20 20">
                          <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                        </svg>
                      )}
                    </div>
                  </div>
                </div>
              </label>
            </div>

            {/* Color Theme Selection */}
            <div>
              <h4 className="font-medium mb-3">Color Theme</h4>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(colorThemes).map(([key, theme]) => (
                  <button
                    key={key}
                    onClick={() => handleColorThemeChange(key)}
                    className={`relative p-3 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                      colorTheme === key ? 'ring-2 ring-offset-2' : ''
                    }`}
                    style={{
                      borderColor: colorTheme === key ? theme.primary[isDark ? 'dark' : 'light'] : 'transparent',
                      backgroundColor: `${theme.primary[isDark ? 'dark' : 'light']}15`,
                      ringColor: theme.primary[isDark ? 'dark' : 'light']
                    }}
                    title={theme.name}
                  >
                    {/* Color Preview */}
                    <div className="flex space-x-1 mb-2">
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: theme.primary[isDark ? 'dark' : 'light'] }}
                      />
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: theme.secondary[isDark ? 'dark' : 'light'] }}
                      />
                      <div 
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: theme.accent[isDark ? 'dark' : 'light'] }}
                      />
                    </div>
                    
                    {/* Theme Name */}
                    <div 
                      className="text-xs font-medium text-center"
                      style={{ color: theme.colors?.text || (isDark ? '#F9FAFB' : '#111827') }}
                    >
                      {theme.name.split(' ')[0]}
                    </div>

                    {/* Selected Indicator */}
                    {colorTheme === key && (
                      <div 
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: theme.primary[isDark ? 'dark' : 'light'] }}
                      >
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Theme Info */}
            <div 
              className="mt-6 p-3 rounded-lg text-sm"
              style={{
                backgroundColor: theme.colors.backgroundTertiary,
                color: theme.colors.textSecondary
              }}
            >
              <div className="flex items-center space-x-2 mb-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Current Theme</span>
              </div>
              <p>
                {colorThemes[colorTheme].name} • {isDark ? 'Dark' : 'Light'} Mode
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ThemeSettings;