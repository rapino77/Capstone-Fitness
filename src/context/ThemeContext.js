import React, { createContext, useContext, useState, useEffect } from 'react';

// Define color themes
const colorThemes = {
  blue: {
    name: 'Ocean Blue',
    primary: {
      light: '#3B82F6', // blue-500
      dark: '#60A5FA'    // blue-400
    },
    secondary: {
      light: '#1E40AF', // blue-700
      dark: '#1D4ED8'    // blue-600
    },
    accent: {
      light: '#DBEAFE', // blue-100
      dark: '#1E3A8A'    // blue-800
    }
  },
  green: {
    name: 'Forest Green',
    primary: {
      light: '#10B981', // emerald-500
      dark: '#34D399'    // emerald-400
    },
    secondary: {
      light: '#047857', // emerald-700
      dark: '#059669'    // emerald-600
    },
    accent: {
      light: '#D1FAE5', // emerald-100
      dark: '#064E3B'    // emerald-800
    }
  },
  purple: {
    name: 'Royal Purple',
    primary: {
      light: '#8B5CF6', // violet-500
      dark: '#A78BFA'    // violet-400
    },
    secondary: {
      light: '#6D28D9', // violet-700
      dark: '#7C3AED'    // violet-600
    },
    accent: {
      light: '#EDE9FE', // violet-100
      dark: '#4C1D95'    // violet-800
    }
  },
  orange: {
    name: 'Sunset Orange',
    primary: {
      light: '#F59E0B', // amber-500
      dark: '#FBBF24'    // amber-400
    },
    secondary: {
      light: '#D97706', // amber-600
      dark: '#F59E0B'    // amber-500
    },
    accent: {
      light: '#FEF3C7', // amber-100
      dark: '#92400E'    // amber-700
    }
  },
  red: {
    name: 'Cherry Red',
    primary: {
      light: '#EF4444', // red-500
      dark: '#F87171'    // red-400
    },
    secondary: {
      light: '#DC2626', // red-600
      dark: '#EF4444'    // red-500
    },
    accent: {
      light: '#FEE2E2', // red-100
      dark: '#991B1B'    // red-800
    }
  },
  teal: {
    name: 'Ocean Teal',
    primary: {
      light: '#14B8A6', // teal-500
      dark: '#2DD4BF'    // teal-400
    },
    secondary: {
      light: '#0F766E', // teal-600
      dark: '#14B8A6'    // teal-500
    },
    accent: {
      light: '#CCFBF1', // teal-100
      dark: '#134E4A'    // teal-800
    }
  }
};

// Define complete theme structure
const createTheme = (colorTheme, isDark) => ({
  mode: isDark ? 'dark' : 'light',
  colors: {
    // Primary colors
    primary: colorTheme.primary[isDark ? 'dark' : 'light'],
    primaryHover: isDark ? colorTheme.secondary.dark : colorTheme.secondary.light,
    secondary: colorTheme.secondary[isDark ? 'dark' : 'light'],
    accent: colorTheme.accent[isDark ? 'dark' : 'light'],
    
    // Background colors
    background: isDark ? '#111827' : '#FFFFFF', // gray-900 : white
    backgroundSecondary: isDark ? '#1F2937' : '#F9FAFB', // gray-800 : gray-50
    backgroundTertiary: isDark ? '#374151' : '#F3F4F6', // gray-700 : gray-100
    
    // Text colors
    text: isDark ? '#F9FAFB' : '#111827', // gray-50 : gray-900
    textSecondary: isDark ? '#D1D5DB' : '#6B7280', // gray-300 : gray-500
    textTertiary: isDark ? '#9CA3AF' : '#9CA3AF', // gray-400 : gray-400
    
    // Border colors
    border: isDark ? '#4B5563' : '#E5E7EB', // gray-600 : gray-200
    borderLight: isDark ? '#374151' : '#F3F4F6', // gray-700 : gray-100
    
    // Status colors
    success: isDark ? '#34D399' : '#10B981', // emerald-400 : emerald-500
    warning: isDark ? '#FBBF24' : '#F59E0B', // amber-400 : amber-500
    error: isDark ? '#F87171' : '#EF4444', // red-400 : red-500
    info: isDark ? '#60A5FA' : '#3B82F6', // blue-400 : blue-500
    
    // Chart colors (for data visualization)
    chart: {
      primary: colorTheme.primary[isDark ? 'dark' : 'light'],
      secondary: colorTheme.secondary[isDark ? 'dark' : 'light'],
      tertiary: isDark ? '#FBBF24' : '#F59E0B', // amber
      quaternary: isDark ? '#34D399' : '#10B981', // emerald
      grid: isDark ? '#374151' : '#E5E7EB'
    }
  }
});

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);
  const [colorTheme, setColorTheme] = useState('blue');

  // Load theme from localStorage on initialization
  useEffect(() => {
    const savedTheme = localStorage.getItem('fitness-app-theme');
    if (savedTheme) {
      try {
        const { isDark: savedIsDark, colorTheme: savedColorTheme } = JSON.parse(savedTheme);
        setIsDark(savedIsDark);
        setColorTheme(savedColorTheme);
      } catch (error) {
        console.error('Error loading theme from localStorage:', error);
      }
    } else {
      // Check system preference for dark mode
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDark(prefersDark);
    }
  }, []);

  // Save theme to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('fitness-app-theme', JSON.stringify({ isDark, colorTheme }));
  }, [isDark, colorTheme]);

  // Apply theme to document root
  useEffect(() => {
    const theme = createTheme(colorThemes[colorTheme], isDark);
    const root = document.documentElement;
    
    // Set CSS custom properties
    Object.entries(theme.colors).forEach(([key, value]) => {
      if (typeof value === 'object') {
        // Handle nested objects like chart colors
        Object.entries(value).forEach(([nestedKey, nestedValue]) => {
          root.style.setProperty(`--color-${key}-${nestedKey}`, nestedValue);
        });
      } else {
        root.style.setProperty(`--color-${key}`, value);
      }
    });

    // Set theme mode class on body
    document.body.className = isDark ? 'dark' : 'light';
  }, [isDark, colorTheme]);

  const toggleDarkMode = () => {
    setIsDark(prev => !prev);
  };

  const changeColorTheme = (themeName) => {
    if (colorThemes[themeName]) {
      setColorTheme(themeName);
    }
  };

  const theme = createTheme(colorThemes[colorTheme], isDark);

  const value = {
    theme,
    isDark,
    colorTheme,
    colorThemes,
    toggleDarkMode,
    changeColorTheme,
    setIsDark,
    setColorTheme
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;