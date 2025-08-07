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
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import WeeklyReport from './WeeklyReport';

const Dashboard = ({ refreshTrigger = 0 }) => {
  const [analytics, setAnalytics] = useState(null);
  const [recentPRs, setRecentPRs] = useState([]);
  const [progressionSuggestions, setProgressionSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState(30);

  const fetchDashboardData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Fetch analytics data and progression suggestions
      const [analyticsResponse, prsResponse] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/get-analytics`, {
          params: {
            timeframe,
            includeGoals: 'true',
            includeWeight: 'true',
            includeWorkouts: 'true'
          }
        }),
        axios.get(`${process.env.REACT_APP_API_URL}/detect-prs`, {
          params: {
            checkLatest: 'false',
            limit: '5'
          }
        })
      ]);

      // Get recent workouts to generate progression suggestions
      if (analyticsResponse.data.success) {
        const workouts = analyticsResponse.data.data.workoutData || [];
        await fetchProgressionSuggestions(workouts);
      }
      
      if (analyticsResponse.data.success) {
        setAnalytics(analyticsResponse.data.data);
      }
      
      if (prsResponse.data.success) {
        setRecentPRs(prsResponse.data.data.currentPRs || []);
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



  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

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
    <div className="space-y-6">
      {/* Header with Timeframe Selector */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl section-header">Dashboard Overview</h1>
        <div className="flex space-x-2">
          {[7, 30, 90].map((days) => (
            <button
              key={days}
              onClick={() => setTimeframe(days)}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
        <MetricCard
          title="Active Goals"
          value={analytics.goalAnalytics.activeGoals}
          subtitle={`${analytics.goalAnalytics.averageProgress?.toFixed(0)}% avg progress`}
          icon="🎯"
          color="bg-yellow-500"
        />
        <MetricCard
          title="Recent PRs"
          value={analytics.progressAnalytics.totalPRs}
          subtitle={`${analytics.progressAnalytics.exercisesImproved} exercises`}
          icon="🏆"
          color="bg-purple-500"
        />
      </div>

      {/* Weight Progress & Goal Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weight Progress Chart */}
        {analytics.weightAnalytics.dataPoints?.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
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
            <ResponsiveContainer width="100%" height={200}>
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

        {/* Goals Progress */}
        {analytics.goalAnalytics.totalGoals > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Goals Overview</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-blue-600">{analytics.goalAnalytics.activeGoals}</div>
                  <div className="text-sm text-gray-600">Active</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-green-600">{analytics.goalAnalytics.completedGoals}</div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-700">{analytics.goalAnalytics.totalGoals}</div>
                  <div className="text-sm text-gray-600">Total</div>
                </div>
              </div>
              
              {/* Goal Types Breakdown */}
              {Object.keys(analytics.goalAnalytics.goalsByType).length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Goals by Type</h4>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie
                        data={Object.entries(analytics.goalAnalytics.goalsByType).map(([type, data], index) => ({
                          name: type,
                          value: data.count,
                          fill: COLORS[index % COLORS.length]
                        }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {Object.entries(analytics.goalAnalytics.goalsByType).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Exercise Progress & Recent PRs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Exercise Breakdown */}
        {Object.keys(analytics.workoutAnalytics.exerciseBreakdown).length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Exercise Volume Breakdown</h3>
            <ResponsiveContainer width="100%" height={250}>
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

        {/* Recent Personal Records */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Personal Records</h3>
          {recentPRs.length > 0 ? (
            <div className="space-y-3">
              {recentPRs.slice(0, 5).map((pr) => (
                <div key={pr.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{pr.exercise}</div>
                    <div className="text-sm text-gray-600">
                      {format(new Date(pr.dateAchieved), 'MMM dd, yyyy')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-yellow-600">{pr.maxWeight} lbs</div>
                    {pr.improvement > 0 && (
                      <div className="text-sm text-green-600">+{pr.improvement} lbs</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              No personal records yet. Keep training to set your first PR!
            </p>
          )}
        </div>
      </div>

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Object.entries(analytics.strengthProgression)
            .sort(([, a], [, b]) => b.metrics.totalSessions - a.metrics.totalSessions) // Sort by most trained exercises first
            .slice(0, 6) // Show top 6 exercises to avoid clutter
            .map(([exercise, data]) => {
              console.log(`Frontend chart data for ${exercise}:`, {
                chartDataLength: data.chartData?.length || 0,
                chartData: data.chartData,
                metrics: data.metrics
              });
              return (
              <div key={exercise} className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold mb-4">{exercise} Progress</h3>
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Current: {data.metrics.currentWeight} lbs</span>
                    <span className={`font-medium ${
                      data.metrics.weightIncrease > 0 ? 'text-green-600' : 
                      data.metrics.weightIncrease < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {data.metrics.weightIncrease > 0 ? '+' : ''}{data.metrics.weightIncrease} lbs
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {data.metrics.totalSessions} sessions over {data.metrics.timespan} days
                  </div>
                </div>
                
                {/* Chart */}
                {data.chartData && data.chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart 
                      data={data.chartData.filter(point => point.weight > 0 && point.date)} // Filter valid data points
                      margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(date) => {
                          try {
                            return format(new Date(date), 'MM/dd');
                          } catch (e) {
                            return date; // Fallback to raw date if formatting fails
                          }
                        }}
                      />
                      <YAxis 
                        domain={['dataMin - 2', 'dataMax + 2']}
                        tickFormatter={(value) => `${value}`}
                      />
                      <Tooltip 
                        labelFormatter={(date) => {
                          try {
                            return format(new Date(date), 'MMM dd, yyyy');
                          } catch (e) {
                            return date;
                          }
                        }}
                        formatter={(value) => [`${value} lbs`, 'Weight']}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="weight" 
                        stroke="#3B82F6" 
                        strokeWidth={2}
                        dot={{ fill: '#3B82F6', r: 4 }}
                        connectNulls={false} // Don't connect null values
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <div className="text-gray-400 text-4xl mb-2">📈</div>
                    <div className="text-sm text-gray-600">
                      {data.chartData && data.chartData.length === 1 
                        ? 'Need one more workout to show progression'
                        : 'Need workouts to show progression'
                      }
                    </div>
                    {data.chartData && data.chartData.length === 1 && (
                      <div className="text-xs text-gray-500 mt-2">
                        Current: {data.chartData[0].weight} lbs
                      </div>
                    )}
                  </div>
                )}
              </div>
              );
            })}
        </div>
      )}

      {/* Insights & Recommendations */}
      {analytics.insights.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Insights & Recommendations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analytics.insights.map((insight, index) => (
              <div key={index} className={`p-4 rounded-lg border-l-4 ${
                insight.type === 'celebration' ? 'bg-green-50 border-green-500' :
                insight.type === 'warning' ? 'bg-red-50 border-red-500' :
                insight.type === 'suggestion' ? 'bg-blue-50 border-blue-500' :
                'bg-yellow-50 border-yellow-500'
              }`}>
                <div className="flex items-start space-x-2">
                  <span className="text-lg">
                    {insight.type === 'celebration' ? '🎉' :
                     insight.type === 'warning' ? '⚠️' :
                     insight.type === 'suggestion' ? '💡' : '💪'}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 capitalize">
                      {insight.category} {insight.type}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">{insight.message}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Goals Deadlines */}
      {analytics.goalAnalytics.upcomingDeadlines?.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Upcoming Goal Deadlines</h3>
          <div className="space-y-3">
            {analytics.goalAnalytics.upcomingDeadlines.map((goal) => (
              <div key={goal.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{goal.title}</div>
                  <div className="text-sm text-gray-600">
                    Due: {format(new Date(goal.targetDate), 'MMM dd, yyyy')}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-red-600">
                    {goal.daysRemaining} days left
                  </div>
                  <div className="text-sm text-gray-600">
                    {goal.progress.toFixed(0)}% complete
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ title, value, subtitle, icon, color }) => (
  <div className="bg-white rounded-lg shadow-md p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
      <div className={`w-12 h-12 rounded-lg ${color} flex items-center justify-center text-white text-xl`}>
        {icon}
      </div>
    </div>
  </div>
);

export default Dashboard;