import React, { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const Dashboard = ({ refreshTrigger = 0 }) => {
  const [analytics, setAnalytics] = useState(null);
  const [recentPRs, setRecentPRs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState(30);

  useEffect(() => {
    fetchDashboardData();
  }, [timeframe, refreshTrigger]);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch analytics data
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
  };

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
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Overview</h1>
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