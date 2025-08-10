import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const DurationAnalytics = ({ userId = 'default-user' }) => {
  const [metrics, setMetrics] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [trends, setTrends] = useState([]);
  const [exerciseBreakdown, setExerciseBreakdown] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('30');

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [metricsRes, recommendationsRes, trendsRes, exerciseRes] = await Promise.all([
        axios.get(`${process.env.REACT_APP_API_URL}/workout-duration-analytics`, {
          params: { userId, days: timeRange, action: 'metrics' }
        }),
        axios.get(`${process.env.REACT_APP_API_URL}/workout-duration-analytics`, {
          params: { userId, days: timeRange, action: 'recommendations' }
        }),
        axios.get(`${process.env.REACT_APP_API_URL}/workout-duration-analytics`, {
          params: { userId, days: timeRange, action: 'trends' }
        }),
        axios.get(`${process.env.REACT_APP_API_URL}/workout-duration-analytics`, {
          params: { userId, days: timeRange, action: 'exercise-breakdown' }
        })
      ]);

      setMetrics(metricsRes.data.metrics);
      setRecommendations(recommendationsRes.data.recommendations || []);
      setTrends(trendsRes.data.trends || []);
      setExerciseBreakdown(exerciseRes.data.exerciseBreakdown || {});
    } catch (err) {
      console.error('Error fetching duration analytics:', err);
      setError('Failed to load workout analytics');
    } finally {
      setIsLoading(false);
    }
  }, [userId, timeRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="text-center">
          <div className="text-red-500 mb-2">⚠️ {error}</div>
          <button
            onClick={fetchAnalytics}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="border-b border-gray-200 p-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Workout Duration Analytics</h2>
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1 text-sm"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 3 months</option>
              <option value="365">Last year</option>
            </select>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-6 mt-4">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'trends', label: 'Trends' },
            { id: 'exercises', label: 'By Exercise' },
            { id: 'recommendations', label: 'Recommendations' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && metrics && (
          <div className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Total Workouts"
                value={metrics.totalWorkouts}
                subtitle={`Last ${timeRange} days`}
                icon="🏋️"
              />
              <MetricCard
                title="Total Time"
                value={metrics.formatted.totalDuration}
                subtitle="All workouts combined"
                icon="⏱️"
              />
              <MetricCard
                title="Average Duration"
                value={metrics.formatted.averageDuration}
                subtitle="Per workout"
                icon="📊"
              />
              <MetricCard
                title="Average Efficiency"
                value={`${metrics.averageEfficiency}%`}
                subtitle="Work time / Total time"
                icon="⚡"
              />
            </div>

            {/* Duration Range */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Duration Range</h3>
              <div className="flex justify-between text-sm">
                <div>
                  <div className="text-gray-500">Shortest</div>
                  <div className="font-medium">{metrics.formatted.shortestWorkout}</div>
                </div>
                <div>
                  <div className="text-gray-500">Average</div>
                  <div className="font-medium">{metrics.formatted.averageDuration}</div>
                </div>
                <div>
                  <div className="text-gray-500">Longest</div>
                  <div className="font-medium">{metrics.formatted.longestWorkout}</div>
                </div>
              </div>
            </div>

            {/* Time Breakdown */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Time Breakdown</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-gray-500">Work Time</div>
                  <div className="font-medium">{metrics.formatted.totalWorkTime}</div>
                </div>
                <div>
                  <div className="text-gray-500">Rest Time</div>
                  <div className="font-medium">{metrics.formatted.totalRestTime}</div>
                </div>
                <div>
                  <div className="text-gray-500">Workout Frequency</div>
                  <div className="font-medium">{metrics.workoutFrequency} per week</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Trends Tab */}
        {activeTab === 'trends' && (
          <div className="space-y-6">
            <h3 className="font-semibold text-gray-900">Weekly Trends</h3>
            {trends.length > 0 ? (
              <div className="space-y-4">
                {trends.map((week, index) => (
                  <div key={week.weekStart} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-sm text-gray-500">
                        Week of {new Date(week.weekStart).toLocaleDateString()}
                      </div>
                      <div className="text-sm font-medium">
                        {week.workoutCount} workout{week.workoutCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Total Time</div>
                        <div className="font-medium">{week.formatted.totalDuration}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Avg Duration</div>
                        <div className="font-medium">{week.formatted.avgDuration}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Avg Efficiency</div>
                        <div className="font-medium">{week.avgEfficiency}%</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                No trend data available for the selected time period.
              </div>
            )}
          </div>
        )}

        {/* Exercise Breakdown Tab */}
        {activeTab === 'exercises' && (
          <div className="space-y-6">
            <h3 className="font-semibold text-gray-900">Time by Exercise</h3>
            {Object.keys(exerciseBreakdown).length > 0 ? (
              <div className="space-y-4">
                {Object.values(exerciseBreakdown)
                  .sort((a, b) => b.totalDuration - a.totalDuration)
                  .map((exercise, index) => (
                    <div key={exercise.name} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-medium text-gray-900">{exercise.name}</h4>
                        <div className="text-sm text-gray-500">
                          {exercise.count} session{exercise.count !== 1 ? 's' : ''}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500">Total Time</div>
                          <div className="font-medium">{exercise.formatted.totalDuration}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Avg Duration</div>
                          <div className="font-medium">{exercise.formatted.avgDuration}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Avg Efficiency</div>
                          <div className="font-medium">{exercise.avgEfficiency}%</div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                No exercise data available for the selected time period.
              </div>
            )}
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Recommendations</h3>
            {recommendations.length > 0 ? (
              <div className="space-y-4">
                {recommendations.map((rec, index) => (
                  <RecommendationCard key={index} recommendation={rec} />
                ))}
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                No recommendations available. Keep tracking your workouts for personalized insights!
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Metric Card Component
const MetricCard = ({ title, value, subtitle, icon }) => (
  <div className="bg-gray-50 rounded-lg p-4">
    <div className="flex items-center justify-between mb-2">
      <h4 className="text-sm font-medium text-gray-500">{title}</h4>
      <span className="text-lg">{icon}</span>
    </div>
    <div className="text-2xl font-bold text-gray-900 mb-1">{value}</div>
    <div className="text-xs text-gray-500">{subtitle}</div>
  </div>
);

// Recommendation Card Component
const RecommendationCard = ({ recommendation }) => {
  const getTypeColor = (type) => {
    switch (type) {
      case 'warning': return 'border-yellow-200 bg-yellow-50';
      case 'success': return 'border-green-200 bg-green-50';
      case 'tip': return 'border-blue-200 bg-blue-50';
      default: return 'border-gray-200 bg-gray-50';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'warning': return '⚠️';
      case 'success': return '✅';
      case 'tip': return '💡';
      default: return 'ℹ️';
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getTypeColor(recommendation.type)}`}>
      <div className="flex items-start space-x-3">
        <span className="text-lg">{getTypeIcon(recommendation.type)}</span>
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 mb-1">{recommendation.title}</h4>
          <p className="text-sm text-gray-700">{recommendation.message}</p>
        </div>
      </div>
    </div>
  );
};

export default DurationAnalytics;