import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const SummaryInsights = ({ refreshTrigger = 0 }) => {
  const [summaryData, setSummaryData] = useState(null);
  const [period, setPeriod] = useState('weekly');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSummaryInsights = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/get-summary-insights`, {
        params: { period }
      });

      if (response.data.success) {
        setSummaryData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch summary insights:', error);
      setError('Failed to load summary insights');
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchSummaryInsights();
  }, [period, refreshTrigger, fetchSummaryInsights]);

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
          <div className="flex space-x-2">
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-8 w-16 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={fetchSummaryInsights}
          className="mt-2 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!summaryData) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-gray-600">No summary data available</p>
        <p className="text-sm text-gray-500">Start logging workouts to see your progress summary</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Progress Summary</h2>
          <p className="text-sm text-gray-600">
            {summaryData.dateRange.start} to {summaryData.dateRange.end}
          </p>
        </div>
        <div className="flex space-x-2">
          {['weekly', 'monthly'].map((p) => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className={`px-4 py-2 rounded-md text-sm font-medium capitalize transition-colors ${
                period === p
                  ? 'bg-blue-100 text-blue-700 border border-blue-300'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryData.summaryCards.map((card, index) => (
          <SummaryCard key={index} card={card} />
        ))}
      </div>

      {/* Highlights */}
      {summaryData.highlights?.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
          <h3 className="text-lg font-semibold mb-4 text-gray-900">
            🌟 {period === 'weekly' ? 'Week' : 'Month'} Highlights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {summaryData.highlights.map((highlight, index) => (
              <div key={index} className="flex items-center space-x-2 text-sm text-gray-700">
                <span>{highlight}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Insights and Recommendations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Insights */}
        {summaryData.insights?.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              💡 Key Insights
            </h3>
            <div className="space-y-3">
              {summaryData.insights.map((insight, index) => (
                <InsightCard key={index} insight={insight} />
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {summaryData.recommendations?.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              🎯 Recommendations
            </h3>
            <div className="space-y-4">
              {summaryData.recommendations.map((rec, index) => (
                <RecommendationCard key={index} recommendation={rec} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Trends */}
      {summaryData.trends && Object.keys(summaryData.trends).length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">📈 Trends</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(summaryData.trends).map(([key, trend]) => (
              <TrendCard key={key} name={key} trend={trend} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const SummaryCard = ({ card }) => {
  const getChangeColor = (changeType) => {
    switch (changeType) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getChangeIcon = (changeType) => {
    switch (changeType) {
      case 'positive':
        return '↗️';
      case 'negative':
        return '↘️';
      default:
        return '➡️';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className="text-2xl">{card.icon}</div>
        {card.change !== null && card.change !== undefined && (
          <div className={`flex items-center text-xs ${getChangeColor(card.changeType)}`}>
            <span className="mr-1">{getChangeIcon(card.changeType)}</span>
            <span>{Math.abs(card.change)}</span>
          </div>
        )}
      </div>
      
      <div className="mb-2">
        <h4 className="text-sm font-medium text-gray-600 mb-1">{card.title}</h4>
        <div className="text-2xl font-bold text-gray-900">{card.value}</div>
        <div className="text-sm text-gray-500">{card.subtitle}</div>
      </div>

      {card.details?.length > 0 && (
        <div className="space-y-1 mt-3 pt-3 border-t border-gray-100">
          {card.details.map((detail, index) => (
            <div key={index} className="text-xs text-gray-600">
              {detail}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const InsightCard = ({ insight }) => {
  const getInsightColor = (type) => {
    switch (type) {
      case 'positive':
        return 'bg-green-50 border-green-200 text-green-700';
      case 'negative':
        return 'bg-red-50 border-red-200 text-red-700';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-700';
      case 'celebration':
        return 'bg-purple-50 border-purple-200 text-purple-700';
      case 'suggestion':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-700';
    }
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'positive':
        return '✅';
      case 'negative':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'celebration':
        return '🎉';
      case 'suggestion':
        return '💡';
      default:
        return '📊';
    }
  };

  return (
    <div className={`p-3 rounded-lg border ${getInsightColor(insight.type)}`}>
      <div className="flex items-start space-x-2">
        <span className="text-sm">{getInsightIcon(insight.type)}</span>
        <div className="flex-1">
          <h5 className="font-medium text-sm">{insight.title}</h5>
          <p className="text-xs mt-1">{insight.message}</p>
        </div>
      </div>
    </div>
  );
};

const RecommendationCard = ({ recommendation }) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between mb-2">
        <h5 className="font-medium text-sm text-gray-900">{recommendation.title}</h5>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(recommendation.priority)}`}>
          {recommendation.priority}
        </span>
      </div>
      <p className="text-xs text-gray-600 mb-3">{recommendation.description}</p>
      {recommendation.actionItems?.length > 0 && (
        <ul className="space-y-1">
          {recommendation.actionItems.map((item, index) => (
            <li key={index} className="text-xs text-gray-600 flex items-start">
              <span className="text-blue-500 mr-2">•</span>
              {item}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const TrendCard = ({ name, trend }) => {
  const getTrendColor = (direction) => {
    switch (direction) {
      case 'up':
        return 'text-green-600 bg-green-50';
      case 'down':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getTrendIcon = (direction) => {
    switch (direction) {
      case 'up':
        return '📈';
      case 'down':
        return '📉';
      default:
        return '➡️';
    }
  };

  return (
    <div className={`p-3 rounded-lg ${getTrendColor(trend.direction)}`}>
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium capitalize">{name}</div>
        <div className="text-lg">{getTrendIcon(trend.direction)}</div>
      </div>
      <div className="mt-1">
        <div className="text-lg font-bold">
          {trend.change > 0 ? '+' : ''}{trend.change}
        </div>
        <div className="text-xs">
          {trend.percentage}% change
        </div>
      </div>
    </div>
  );
};

export default SummaryInsights;