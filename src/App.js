import React, { useState } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { CelebrationProvider } from './context/CelebrationContext';
import WorkoutDashboard from './components/workouts/WorkoutDashboard';
import WorkoutHistory from './components/workouts/WorkoutHistory';
import TrackingDashboard from './components/tracking/TrackingDashboard';
import BadgeDisplay from './components/badges/BadgeDisplay';
import GoalCreator from './components/goals/GoalCreator';
import GoalTracker from './components/goals/GoalTracker';
import Dashboard from './components/dashboard/Dashboard';
import ThemeSettings from './components/common/ThemeSettings';
import SearchBar from './components/common/SearchBar';
import EntranceAnimation from './components/common/EntranceAnimation';
import './styles/theme.css';
import './styles/animations.css';

const AppContent = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeWorkoutSection, setActiveWorkoutSection] = useState('log');
  const [activeTrackingSection, setActiveTrackingSection] = useState('weight');
  const [refreshHistory, setRefreshHistory] = useState(0);
  const [refreshGoals, setRefreshGoals] = useState(0);
  const [showGoalCreator, setShowGoalCreator] = useState(false);
  const [showEntrance, setShowEntrance] = useState(true);
  const [isAppReady, setIsAppReady] = useState(false);

  const handleWorkoutSuccess = () => {
    // Trigger history refresh when a new workout is logged
    setRefreshHistory(prev => prev + 1);
  };

  const handleGoalCreated = () => {
    setRefreshGoals(prev => prev + 1);
    setShowGoalCreator(false);
  };

  const handleGoalUpdated = () => {
    setRefreshGoals(prev => prev + 1);
  };

  const handleTabChange = (tabId) => {
    if (tabId === activeTab) return; // Don't change if already active
    setActiveTab(tabId);
  };

  const handleSearchNavigation = (item) => {
    // Navigate to the main tab
    setActiveTab(item.path);
    
    // If there's a section, set the appropriate section state
    if (item.section) {
      if (item.path === 'workout') {
        setActiveWorkoutSection(item.section);
      } else if (item.path === 'tracking') {
        setActiveTrackingSection(item.section);
      }
    }
    
    // Handle special cases
    if (item.path === 'goals') {
      setShowGoalCreator(false); // Ensure we show the goal tracker, not creator
    }
  };

  const handleEntranceComplete = () => {
    setShowEntrance(false);
    setIsAppReady(true);
  };

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'workout', name: 'Log Workout', icon: '💪' },
    { id: 'tracking', name: 'Analytics', icon: '📈' },
    { id: 'badges', name: 'Badges', icon: '🏆' },
    { id: 'goals', name: 'Goals', icon: '🎯' },
    { id: 'history', name: 'History', icon: '📋' }
  ];

  return (
    <>
      {/* Entrance Animation */}
      {showEntrance && (
        <EntranceAnimation onComplete={handleEntranceComplete} />
      )}

      {/* Main Application */}
      <div 
        className={`min-h-screen transition-all duration-500 fitness-bg-pattern ${
          isAppReady ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4'
        }`}
        style={{ backgroundColor: theme.colors.backgroundSecondary }}
      >
      {/* Theme Settings */}
      <ThemeSettings />
      
      <header 
        className="shadow-sm border-b transition-colors duration-200"
        style={{ 
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.border
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-start">
            <div className="flex items-center space-x-3 mr-8">
              <div className="text-4xl icon-hover">⚡</div>
              <h1 className="text-4xl fitness-title hover-glow cursor-pointer">
                Fitness Command Center
              </h1>
            </div>
            
            <div className="flex-1 flex items-center justify-end space-x-6">
              <SearchBar onNavigate={handleSearchNavigation} />
              <div 
                className="text-sm transition-colors duration-200 hidden sm:block"
                style={{ color: theme.colors.textSecondary }}
              >
                Your complete fitness tracking solution
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 fitness-equipment-pattern">
        {/* Tab Navigation */}
        <div 
          className="rounded-lg shadow-sm mb-6 border transition-colors duration-200"
          style={{ 
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.border
          }}
        >
          <nav 
            className="flex overflow-x-auto"
          >
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`hover-lift flex-1 py-4 px-4 text-center font-medium whitespace-nowrap transition-all duration-200 main-section-header ${
                  index !== tabs.length - 1 ? 'border-r' : ''
                }`}
                style={{
                  color: activeTab === tab.id ? theme.colors.primary : theme.colors.textSecondary,
                  backgroundColor: activeTab === tab.id ? `${theme.colors.primary}10` : 'transparent',
                  borderColor: theme.colors.border,
                  borderBottomWidth: activeTab === tab.id ? '2px' : '0px',
                  borderBottomColor: activeTab === tab.id ? theme.colors.primary : 'transparent'
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.target.style.backgroundColor = `${theme.colors.primary}05`;
                    e.target.style.color = theme.colors.text;
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.target.style.backgroundColor = 'transparent';
                    e.target.style.color = theme.colors.textSecondary;
                  }
                }}
              >
                <div className="flex items-center justify-center space-x-2">
                  <span className="icon-hover">{tab.icon}</span>
                  <span className="transition-colors duration-200">{tab.name}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="tab-content smooth-transition relative">
            {activeTab === 'dashboard' && (
              <Dashboard refreshTrigger={refreshHistory + refreshGoals} />
            )}
            
            {activeTab === 'workout' && (
              <WorkoutDashboard 
                onSuccess={handleWorkoutSuccess} 
                initialSection={activeWorkoutSection}
                onSectionChange={setActiveWorkoutSection}
              />
            )}
            
            {activeTab === 'tracking' && (
              <TrackingDashboard 
                initialSection={activeTrackingSection}
                onSectionChange={setActiveTrackingSection}
              />
            )}
            
            {activeTab === 'badges' && (
              <BadgeDisplay />
            )}
            
            {activeTab === 'goals' && (
              <div className="space-y-6">
                {!showGoalCreator ? (
                  <>
                    <div className="flex justify-between items-center">
                      <h2 
                        className="text-2xl font-bold transition-colors duration-200"
                        style={{ color: theme.colors.text }}
                      >
                        Goals Management
                      </h2>
                      <button
                        onClick={() => setShowGoalCreator(true)}
                        className="px-4 py-2 rounded-md font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2"
                        style={{
                          backgroundColor: theme.colors.primary,
                          color: theme.colors.background,
                          ':hover': {
                            backgroundColor: theme.colors.primaryHover
                          }
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = theme.colors.primaryHover;
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = theme.colors.primary;
                        }}
                      >
                        + Create New Goal
                      </button>
                    </div>
                    <GoalTracker 
                      onUpdateGoal={handleGoalUpdated}
                      refreshTrigger={refreshGoals}
                    />
                  </>
                ) : (
                  <GoalCreator 
                    onGoalCreated={handleGoalCreated}
                    onCancel={() => setShowGoalCreator(false)}
                  />
                )}
              </div>
            )}
            
            {activeTab === 'history' && (
              <WorkoutHistory key={refreshHistory} />
            )}
        </div>
      </main>
      </div>
    </>
  );
};

function App() {
  return (
    <ThemeProvider>
      <CelebrationProvider>
        <AppContent />
      </CelebrationProvider>
    </ThemeProvider>
  );
}

export default App;
