import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';

const SearchBar = ({ onNavigate }) => {
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredResults, setFilteredResults] = useState([]);
  const searchRef = useRef(null);

  // All searchable items in the app
  const searchableItems = [
    // Main tabs
    { id: 'dashboard', name: 'Dashboard', type: 'main', icon: '📊', path: 'dashboard' },
    { id: 'workout', name: 'Log Workout', type: 'main', icon: '💪', path: 'workout' },
    { id: 'analytics', name: 'Analytics', type: 'main', icon: '📈', path: 'tracking' },
    { id: 'badges', name: 'Badges', type: 'main', icon: '🏆', path: 'badges' },
    { id: 'goals', name: 'Goals', type: 'main', icon: '🎯', path: 'goals' },
    { id: 'history', name: 'History', type: 'main', icon: '📋', path: 'history' },
    
    // Workout sidebar sections
    { id: 'log-workout', name: 'Log Workout', type: 'workout', icon: '📝', path: 'workout', section: 'log' },
    { id: 'workout-templates', name: 'Workout Templates', type: 'workout', icon: '📋', path: 'workout', section: 'templates' },
    { id: 'rest-scheduler', name: 'Rest Day Scheduler', type: 'workout', icon: '📅', path: 'workout', section: 'scheduler' },
    { id: 'challenge-system', name: 'Challenge System', type: 'workout', icon: '🏆', path: 'workout', section: 'challenges' },
    { id: 'workout-summaries', name: 'Workout Summaries', type: 'workout', icon: '📊', path: 'workout', section: 'summaries' },
    { id: 'template-quick-log', name: 'Template Quick Log', type: 'workout', icon: '⚡', path: 'workout', section: 'quick-log' },
    
    // Analytics sidebar sections
    { id: 'body-weight', name: 'Body Weight Tracking', type: 'analytics', icon: '⚖️', path: 'tracking', section: 'weight' },
    { id: 'strength-progression', name: 'Strength Progression', type: 'analytics', icon: '💪', path: 'tracking', section: 'strength' },
    { id: 'training-volume', name: 'Training Volume', type: 'analytics', icon: '📈', path: 'tracking', section: 'volume' },
    { id: 'performance-metrics', name: 'Performance Metrics', type: 'analytics', icon: '🎯', path: 'tracking', section: 'performance' },
    { id: 'body-composition', name: 'Body Composition', type: 'analytics', icon: '📊', path: 'tracking', section: 'body-composition' },
    
    // Additional searchable terms
    { id: 'weight-logger', name: 'Weight Logger', type: 'analytics', icon: '⚖️', path: 'tracking', section: 'weight' },
    { id: 'pr-tracking', name: 'PR Tracking', type: 'analytics', icon: '🏆', path: 'tracking', section: 'performance' },
    { id: 'goal-creator', name: 'Goal Creator', type: 'main', icon: '🎯', path: 'goals' },
    { id: 'goal-tracker', name: 'Goal Tracker', type: 'main', icon: '🎯', path: 'goals' },
    { id: 'challenges', name: 'Challenges', type: 'workout', icon: '🏆', path: 'workout', section: 'challenges' },
    { id: 'templates', name: 'Templates', type: 'workout', icon: '📋', path: 'workout', section: 'templates' },
    { id: 'rest-days', name: 'Rest Days', type: 'workout', icon: '📅', path: 'workout', section: 'scheduler' },
    { id: 'deload', name: 'Deload Detection', type: 'analytics', icon: '📈', path: 'tracking', section: 'strength' },
  ];

  useEffect(() => {
    if (query.length > 0) {
      const filtered = searchableItems.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.type.toLowerCase().includes(query.toLowerCase())
      ).slice(0, 8); // Limit to 8 results
      setFilteredResults(filtered);
      setIsOpen(true);
    } else {
      setFilteredResults([]);
      setIsOpen(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (item) => {
    setQuery('');
    setIsOpen(false);
    onNavigate(item);
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'main': return 'Main Section';
      case 'workout': return 'Workout Tools';
      case 'analytics': return 'Analytics Tools';
      default: return 'Feature';
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'main': return 'bg-blue-100 text-blue-800';
      case 'workout': return 'bg-green-100 text-green-800';
      case 'analytics': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sections, features..."
          className="search-input w-64 pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          style={{
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.border
          }}
          onFocus={() => {
            if (filteredResults.length > 0) setIsOpen(true);
          }}
        />
        <div className="absolute left-3 top-2.5 text-gray-400">
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {isOpen && filteredResults.length > 0 && (
        <div 
          className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto"
          style={{
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.border,
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)'
          }}
        >
          {filteredResults.map((item) => (
            <button
              key={item.id}
              onClick={() => handleSelect(item)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 flex items-center justify-between"
              style={{
                ':hover': {
                  backgroundColor: `${theme.colors.primary}10`
                }
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = `${theme.colors.primary}10`;
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = 'transparent';
              }}
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">{item.icon}</span>
                <div>
                  <div className="font-medium search-results-title">
                    {item.name}
                  </div>
                  <div className="text-sm search-results-subtitle">
                    Navigate to {item.name}
                  </div>
                </div>
              </div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(item.type)}`}>
                {getTypeLabel(item.type)}
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.length > 0 && filteredResults.length === 0 && (
        <div 
          className="absolute top-full left-0 right-0 mt-2 bg-white border rounded-lg shadow-lg z-50 p-4 text-center"
          style={{
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.border
          }}
        >
          <div className="text-sm search-results-no-results">
            No results found for "{query}"
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBar;