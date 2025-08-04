import React, { useState } from 'react';
import WorkoutForm from './components/workouts/WorkoutForm';
import WorkoutHistory from './components/workouts/WorkoutHistory';
import WeightLogger from './components/weight/WeightLogger';
import GoalCreator from './components/goals/GoalCreator';
import GoalTracker from './components/goals/GoalTracker';
import Dashboard from './components/dashboard/Dashboard';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [refreshHistory, setRefreshHistory] = useState(0);
  const [refreshGoals, setRefreshGoals] = useState(0);
  const [showGoalCreator, setShowGoalCreator] = useState(false);

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

  const tabs = [
    { id: 'dashboard', name: 'Dashboard', icon: '📊' },
    { id: 'workout', name: 'Log Workout', icon: '💪' },
    { id: 'weight', name: 'Track Weight', icon: '⚖️' },
    { id: 'goals', name: 'Goals', icon: '🎯' },
    { id: 'history', name: 'History', icon: '📈' }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-gray-900">Fitness Command Center</h1>
            <div className="text-sm text-gray-500">
              Your complete fitness tracking solution
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-6">
          <nav className="flex divide-x divide-gray-200 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-4 px-4 text-center font-medium whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-blue-600 bg-blue-50 border-b-2 border-blue-600'
                    : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <span>{tab.icon}</span>
                  <span>{tab.name}</span>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'dashboard' && (
            <Dashboard refreshTrigger={refreshHistory + refreshGoals} />
          )}
          
          {activeTab === 'workout' && (
            <WorkoutForm onSuccess={handleWorkoutSuccess} />
          )}
          
          {activeTab === 'weight' && (
            <WeightLogger />
          )}
          
          {activeTab === 'goals' && (
            <div className="space-y-6">
              {!showGoalCreator ? (
                <>
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold text-gray-900">Goals Management</h2>
                    <button
                      onClick={() => setShowGoalCreator(true)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
  );
}

export default App;
