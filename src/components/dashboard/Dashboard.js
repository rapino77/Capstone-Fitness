import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import WeeklyReport from './WeeklyReport';
import StrengthProgressionSection from './StrengthProgressionSection';
import WorkoutStreak from '../streaks/WorkoutStreak';

const Dashboard = ({ refreshTrigger = 0 }) => {
  const [analytics, setAnalytics] = useState(null);
  const [progressionSuggestions, setProgressionSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState(30);

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch analytics data
      const analyticsResponse = await axios.get(`${process.env.REACT_APP_API_URL}/get-analytics`, {
        params: {
          timeframe,
          includeGoals: 'false',
          includeWeight: 'true',
          includeWorkouts: 'true'
        }
      });

      // Get recent workouts to generate progression suggestions
      if (analyticsResponse.data.success) {
        const workouts = analyticsResponse.data.data.workoutData || [];
        await fetchProgressionSuggestions(workouts);
      }
      
      if (analyticsResponse.data.success) {
        setAnalytics(analyticsResponse.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [timeframe]);

  const fetchProgressionSuggestions = async (workouts) => {
    try {
      // Get unique exercises from recent workouts (last 2 weeks)
      const recentWorkouts = workouts.slice(0, 10); // Get 10 most recent workouts
      const exercises = [...new Set(recentWorkouts.map(w => w.exercise))];
      
      const suggestions = [];
      
      // Get progression suggestions for top 3 exercises
      for (const exercise of exercises.slice(0, 3)) {
        try {
          const response = await axios.get(`${process.env.REACT_APP_API_URL}/get-progression-suggestion`, {
            params: { exercise, workoutsToAnalyze: '5' }
          });
          
          if (response.data.success && response.data.progression) {
            suggestions.push({
              exercise,
              ...response.data.progression
            });
          }
        } catch (error) {
          console.log(`Could not get progression for ${exercise}:`, error.message);
        }
      }
      
      setProgressionSuggestions(suggestions);
    } catch (error) {
      console.error('Error fetching progression suggestions:', error);
      setProgressionSuggestions([]);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData, refreshTrigger]);





  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-center text-gray-500">No data available. Start logging workouts and goals to see your dashboard!</p>
      </div>
    );
  }

  return (
    <div className="mobile-space-y space-y-4 sm:space-y-6">
      {/* Workout Streak Section */}
      <WorkoutStreak userId="default-user" refreshTrigger={refreshTrigger} />
      
      {/* Header with Timeframe Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <h1 className="text-xl sm:text-2xl lg:text-3xl section-header mobile-heading">Dashboard Overview</h1>
        <div className="flex space-x-2 justify-start sm:justify-end">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setTimeframe(days)}
              className={`mobile-button px-3 py-2 rounded-md text-sm font-medium touch-manipulation ${
                timeframe === days
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {days}d
            </button>
          ))}
        </div>
      </div>

      {/* Weekly Report Section */}
      <WeeklyReport />

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
        <MetricCard
          title="Workouts"
          value={analytics.workoutAnalytics.totalWorkouts}
          subtitle={`${analytics.workoutAnalytics.averagePerWeek?.toFixed(1)}/week avg`}
          icon="💪"
          color="bg-blue-500"
        />
        <MetricCard
          title="Total Volume"
          value={`${(analytics.workoutAnalytics.totalVolume / 1000).toFixed(1)}k`}
          subtitle="lbs moved"
          icon="📊"
          color="bg-green-500"
        />
      </div>


      {/* Weight Progress */}
      {analytics.weightAnalytics.dataPoints?.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h3 className="text-lg font-semibold mb-4">Weight Progress</h3>
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Current: {analytics.weightAnalytics.currentWeight} lbs</span>
              <span className={`font-medium ${
                analytics.weightAnalytics.weightChange > 0 ? 'text-red-600' : 'text-green-600'
              }`}>
                {analytics.weightAnalytics.weightChange > 0 ? '+' : ''}{analytics.weightAnalytics.weightChange?.toFixed(1)} lbs
              </span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={150} className="sm:h-[200px]">
            <LineChart data={analytics.weightAnalytics.dataPoints}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => format(new Date(date), 'MM/dd')}
              />
              <YAxis domain={['dataMin - 2', 'dataMax + 2']} />
              <Tooltip 
                labelFormatter={(date) => format(new Date(date), 'MMM dd, yyyy')}
                formatter={(value) => [`${value} lbs`, 'Weight']}
              />
              <Line 
                type="monotone" 
                dataKey="weight" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Exercise Volume Breakdown */}
      {Object.keys(analytics.workoutAnalytics.exerciseBreakdown).length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h3 className="text-lg font-semibold mb-4">Exercise Volume Breakdown</h3>
          <ResponsiveContainer width="100%" height={200} className="sm:h-[250px]">
            <BarChart
              data={Object.entries(analytics.workoutAnalytics.exerciseBreakdown)
                .map(([exercise, data]) => ({
                  exercise: exercise.length > 12 ? exercise.substring(0, 12) + '...' : exercise,
                  volume: Math.round(data.totalVolume / 1000),
                  count: data.count
                }))
                .sort((a, b) => b.volume - a.volume)
                .slice(0, 8)
              }
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="exercise" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip 
                formatter={[(value, name) => 
                  name === 'volume' 
                    ? [`${value}k lbs`, 'Volume'] 
                    : [`${value}`, 'Workouts']
                ]}
              />
              <Bar dataKey="volume" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Progressive Overload Suggestions */}
      {progressionSuggestions.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">🏋️‍♂️ Next Workout Suggestions</h3>
          <p className="text-sm text-gray-600 mb-4">Based on your recent performance data</p>
          <div className="space-y-4">
            {progressionSuggestions.map((suggestion, index) => (
              <div key={index} className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 mb-2">{suggestion.exercise}</h4>
                    
                    {suggestion.formatted && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-2xl">💪</span>
                          <div className="text-sm">
                            <div className="font-medium text-blue-700">
                              {suggestion.suggestion?.sets || 3} sets × {suggestion.suggestion?.reps || 10} reps @ {suggestion.suggestion?.weight || 0} lbs
                            </div>
                            {suggestion.formatted.changes?.length > 0 && (
                              <div className="text-green-600 mt-1">
                                {suggestion.formatted.changes.join(', ')}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="text-xs text-gray-600 bg-white/50 rounded p-2">
                          <span className="font-medium">Why: </span>{suggestion.formatted.reason || suggestion.reason}
                        </div>
                        
                        <div className="flex items-center justify-between text-xs">
                          <span className={`px-2 py-1 rounded-full ${
                            suggestion.confidence === 'high' ? 'bg-green-100 text-green-700' :
                            suggestion.confidence === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {suggestion.confidence} confidence
                          </span>
                          <span className="text-gray-500">
                            {suggestion.strategy?.replace('_', ' ') || 'Smart progression'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Strength Progression Charts */}
      {analytics?.strengthProgression && Object.keys(analytics.strengthProgression).length > 0 && (
        <StrengthProgressionSection strengthProgression={analytics.strengthProgression} />
      )}




    </div>
  );
};

// Metric Card Component
const MetricCard = ({ title, value, subtitle, icon, color }) => (
  <div className="bg-white rounded-lg shadow-md p-3 sm:p-6 mobile-card">
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm font-medium text-gray-600 mobile-text-sm truncate">{title}</p>
        <p className="text-lg sm:text-2xl font-bold text-gray-900 mobile-heading">{value}</p>
        <p className="text-xs sm:text-sm text-gray-500 mobile-text-sm truncate">{subtitle}</p>
      </div>
      <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-lg ${color} flex items-center justify-center text-white text-sm sm:text-xl flex-shrink-0 ml-2`}>
        {icon}
      </div>
    </div>
  </div>
);

export default Dashboard;