import React, { useState } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { CelebrationProvider } from './context/CelebrationContext';
import WorkoutDashboard from './components/workouts/WorkoutDashboard';
import WorkoutHistory from './components/workouts/WorkoutHistory';
import TrackingDashboard from './components/tracking/TrackingDashboard';
import BadgeDisplay from './components/badges/BadgeDisplay';
import GoalCreator from './components/goals/GoalCreator';
import GoalTracker from './components/goals/GoalTracker';
import GoalProgressChart from './components/goals/GoalProgressChart';
import Dashboard from './components/dashboard/Dashboard';
import ChallengeSystem from './components/challenges/ChallengeSystem';
import ThemeSettings from './components/common/ThemeSettings';
import SearchBar from './components/common/SearchBar';
import EntranceAnimation from './components/common/EntranceAnimation';
import SwipeIndicator from './components/common/SwipeIndicator';
import useSwipeNavigation from './hooks/useSwipeNavigation';
import './styles/theme.css';
import './styles/animations.css';

const AppContent = () => {
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [activeWorkoutSection, setActiveWorkoutSection] = useState('log');
  const [activeTrackingSection, setActiveTrackingSection] = useState('weight');
  const [refreshHistory, setRefreshHistory] = useState(0);
  const [refreshGoals, setRefreshGoals] = useState(0);
  const [refreshChallenges, setRefreshChallenges] = useState(0);
  const [showGoalCreator, setShowGoalCreator] = useState(false);
  const [showEntrance, setShowEntrance] = useState(true);
  const [isAppReady, setIsAppReady] = useState(false);
  const [goalsData, setGoalsData] = useState([]);

  const handleWorkoutSuccess = () => {
    // Trigger history refresh when a new workout is logged
    setRefreshHistory(prev => prev + 1);
    // Also refresh challenges to update progress
    setRefreshChallenges(prev => prev + 1);
  };

  const handleWeightSuccess = () => {
    // Refresh challenges when weight is logged
    setRefreshChallenges(prev => prev + 1);
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
    { id: 'challenges', name: 'Challenges', icon: '🎮' },
    { id: 'goals', name: 'Goals', icon: '🎯' },
    { id: 'history', name: 'History', icon: '📋' }
  ];

  // Swipe navigation hook
  const { onTouchStart, onTouchMove, onTouchEnd, isSwipeIndicatorVisible } = useSwipeNavigation(
    tabs, 
    activeTab, 
    handleTabChange
  );

  return (
    <>
      {/* Entrance Animation */}
      {showEntrance && (
        <EntranceAnimation onComplete={handleEntranceComplete} />
      )}

      {/* Main Application */}
      <div 
        className={`min-h-screen transition-all duration-500 ${
          isAppReady ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform translate-y-4'
        }`}
        style={{ backgroundColor: theme.colors.backgroundSecondary }}
      >
      {/* Theme Settings */}
      <ThemeSettings />
      
      <header 
        className="shadow-sm border-b transition-colors duration-200 sticky top-0 z-40"
        style={{ 
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.border
        }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8 py-3 sm:py-6">
          <div className="flex items-center justify-between">
            {/* Mobile-first logo - smaller on mobile */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="text-2xl sm:text-4xl icon-hover">⚡</div>
              <h1 className="text-lg sm:text-2xl lg:text-4xl fitness-title hover-glow cursor-pointer font-bold">
                <span className="sm:hidden">Fitness</span>
                <span className="hidden sm:inline">Fitness Command Center</span>
              </h1>
            </div>
            
            {/* Mobile-optimized search and tagline */}
            <div className="flex items-center space-x-2 sm:space-x-6">
              <div className="w-full max-w-xs sm:max-w-md">
                <SearchBar onNavigate={handleSearchNavigation} />
              </div>
              <div 
                className="text-xs sm:text-sm transition-colors duration-200 hidden md:block"
                style={{ color: theme.colors.textSecondary }}
              >
                Your complete fitness solution
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-2 sm:py-8">
        {/* Tab Navigation - Mobile Optimized */}
        <div 
          className="rounded-lg sm:rounded-xl shadow-sm mb-3 sm:mb-8 border transition-colors duration-200 sticky top-12 sm:top-20 z-30 backdrop-blur-sm mx-1 sm:mx-0"
          style={{ 
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.border
          }}
        >
          <nav 
            className="flex overflow-x-auto"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              WebkitOverflowScrolling: 'touch'
            }}
          >
            {tabs.map((tab, index) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`hover-lift flex-shrink-0 py-4 sm:py-4 px-1 sm:px-4 text-center font-medium whitespace-nowrap transition-all duration-200 main-section-header touch-manipulation ${
                  index !== tabs.length - 1 ? 'border-r' : ''
                } min-w-0 flex-1 sm:flex-initial rounded-t-lg sm:rounded-t-xl`}
                style={{
                  color: activeTab === tab.id ? theme.colors.primary : theme.colors.textSecondary,
                  backgroundColor: activeTab === tab.id ? `${theme.colors.primary}15` : 'transparent',
                  borderColor: theme.colors.border,
                  borderBottomWidth: activeTab === tab.id ? '3px' : '0px',
                  borderBottomColor: activeTab === tab.id ? theme.colors.primary : 'transparent',
                  minHeight: '68px', // Larger for mobile
                  minWidth: '60px' // Adequate width
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
                <div className="flex flex-col items-center justify-center space-y-1.5">
                  <span className="text-xl sm:text-xl">{tab.icon}</span>
                  <span className="transition-colors duration-200 text-xs sm:text-sm font-bold leading-tight text-center">
                    {/* Show appropriate names for mobile */}
                    <span className="sm:hidden">
                      {tab.id === 'workout' ? 'LOG' :
                       tab.id === 'tracking' ? 'ANALYTICS' :
                       tab.id === 'challenges' ? 'GAMES' :
                       tab.id === 'dashboard' ? 'DASH' :
                       tab.name.split(' ')[0].toUpperCase()}
                    </span>
                    <span className="hidden sm:inline">
                      {tab.name}
                    </span>
                  </span>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content - With Swipe Support */}
        <div 
          className="tab-content smooth-transition relative"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          style={{ touchAction: 'pan-y' }} // Allow vertical scrolling but capture horizontal swipes
        >
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
                onWeightSuccess={handleWeightSuccess}
              />
            )}
            
            {activeTab === 'badges' && (
              <BadgeDisplay />
            )}
            
            {activeTab === 'challenges' && (
              <ChallengeSystem key={refreshChallenges} />
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
                      onGoalsLoaded={setGoalsData}
                    />
                    <GoalProgressChart goals={goalsData} />
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
        
        {/* Swipe Navigation Indicator */}
        <SwipeIndicator 
          isVisible={isSwipeIndicatorVisible} 
          currentTab={activeTab} 
          tabs={tabs} 
        />
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
