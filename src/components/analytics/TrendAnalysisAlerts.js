import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../../context/ThemeContext';
import axios from 'axios';

const TrendAnalysisAlerts = ({ userId = 'default-user', refreshTrigger = 0 }) => {
  const { theme } = useTheme();
  const [alerts, setAlerts] = useState({
    weightPlateaus: [],
    strengthStalls: [],
    goalRisks: [],
    summary: {
      totalAlerts: 0,
      highPriorityAlerts: 0,
      categories: { weight: 0, strength: 0, goals: 0 }
    }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [analysisWindow, setAnalysisWindow] = useState(30);
  const [expandedAlert, setExpandedAlert] = useState(null);

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Fetching trend analysis alerts...');
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/trend-analysis-alerts`, {
        params: {
          userId,
          analysisWindow,
          _t: Date.now() // Cache busting
        }
      });

      console.log('Trend analysis response:', response.data);

      if (response.data.success) {
        setAlerts(response.data.alerts);
      } else {
        setError('Failed to load trend analysis');
      }
    } catch (err) {
      console.error('Error fetching trend alerts:', err);
      setError(err.response?.data?.message || 'Failed to load trend analysis');
    } finally {
      setIsLoading(false);
    }
  }, [userId, analysisWindow]);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts, refreshTrigger]);

  const getAlertIcon = (type) => {
    const icons = {
      weight_plateau: '⚖️',
      weight_long_plateau: '📊',
      strength_stall: '💪',
      strength_regression: '📉',
      goal_critical: '🚨',
      goal_at_risk: '⚠️',
      goal_stagnant: '🎯'
    };
    return icons[type] || '📋';
  };

  const getAlertColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'border-red-200 bg-red-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'low':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getTextColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-800';
      case 'medium':
        return 'text-yellow-800';
      case 'low':
        return 'text-blue-800';
      default:
        return 'text-gray-800';
    }
  };

  const handleAlertClick = (alertIndex, category) => {
    const alertId = `${category}-${alertIndex}`;
    setExpandedAlert(expandedAlert === alertId ? null : alertId);
  };

  const allAlerts = [
    ...alerts.weightPlateaus.map((alert, index) => ({ ...alert, category: 'weight', index })),
    ...alerts.strengthStalls.map((alert, index) => ({ ...alert, category: 'strength', index })),
    ...alerts.goalRisks.map((alert, index) => ({ ...alert, category: 'goals', index }))
  ].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });

  if (isLoading) {
    return (
      <div 
        className="rounded-lg shadow-md p-6 transition-colors duration-200"
        style={{ 
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.border
        }}
      >
        <div className="animate-pulse">
          <div 
            className="h-6 rounded w-1/2 mb-4"
            style={{ backgroundColor: theme.colors.border }}
          ></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-4 rounded" style={{ backgroundColor: theme.colors.border }}></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="rounded-lg shadow-md p-6 transition-colors duration-200"
        style={{ 
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.border
        }}
      >
        <div className="text-center">
          <div className="text-red-500 mb-2">⚠️ {error}</div>
          <button
            onClick={fetchAlerts}
            className="px-4 py-2 rounded transition-colors"
            style={{
              backgroundColor: theme.colors.primary,
              color: theme.colors.background
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = theme.colors.primaryHover;
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = theme.colors.primary;
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="rounded-lg shadow-md transition-colors duration-200"
      style={{ 
        backgroundColor: theme.colors.background,
        borderColor: theme.colors.border
      }}
    >
      {/* Header */}
      <div 
        className="border-b p-6 transition-colors duration-200"
        style={{ borderColor: theme.colors.border }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 
            className="text-xl font-bold transition-colors duration-200"
            style={{ color: theme.colors.text }}
          >
            🔍 Trend Analysis Alerts
          </h2>
          <div className="flex items-center space-x-4">
            <button
              onClick={fetchAlerts}
              disabled={isLoading}
              className="px-3 py-1 rounded text-sm transition-colors disabled:opacity-50"
              style={{
                backgroundColor: theme.colors.primary,
                color: theme.colors.background
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.target.style.backgroundColor = theme.colors.primaryHover;
              }}
              onMouseLeave={(e) => {
                if (!isLoading) e.target.style.backgroundColor = theme.colors.primary;
              }}
            >
              🔄 Refresh
            </button>
            <select
              value={analysisWindow}
              onChange={(e) => setAnalysisWindow(parseInt(e.target.value))}
              className="border rounded px-3 py-1 text-sm transition-colors"
              style={{
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.background,
                color: theme.colors.text
              }}
            >
              <option value="14">Last 2 weeks</option>
              <option value="30">Last 30 days</option>
              <option value="60">Last 2 months</option>
              <option value="90">Last 3 months</option>
            </select>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div 
              className="text-2xl font-bold transition-colors duration-200"
              style={{ color: theme.colors.text }}
            >
              {alerts.summary.totalAlerts}
            </div>
            <div 
              className="text-sm transition-colors duration-200"
              style={{ color: theme.colors.textSecondary }}
            >
              Total Alerts
            </div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {alerts.summary.highPriorityAlerts}
            </div>
            <div 
              className="text-sm transition-colors duration-200"
              style={{ color: theme.colors.textSecondary }}
            >
              High Priority
            </div>
          </div>
          <div className="text-center">
            <div 
              className="text-2xl font-bold transition-colors duration-200"
              style={{ color: theme.colors.text }}
            >
              {alerts.summary.categories.weight}
            </div>
            <div 
              className="text-sm transition-colors duration-200"
              style={{ color: theme.colors.textSecondary }}
            >
              Weight Issues
            </div>
          </div>
          <div className="text-center">
            <div 
              className="text-2xl font-bold transition-colors duration-200"
              style={{ color: theme.colors.text }}
            >
              {alerts.summary.categories.strength}
            </div>
            <div 
              className="text-sm transition-colors duration-200"
              style={{ color: theme.colors.textSecondary }}
            >
              Strength Issues
            </div>
          </div>
        </div>
      </div>

      {/* Alert List */}
      <div className="p-6">
        {allAlerts.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🎉</div>
            <div 
              className="text-lg font-medium mb-2 transition-colors duration-200"
              style={{ color: theme.colors.text }}
            >
              No Trend Issues Detected!
            </div>
            <div 
              className="text-sm transition-colors duration-200"
              style={{ color: theme.colors.textSecondary }}
            >
              Your fitness journey is on track. Keep up the great work!
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {allAlerts.map((alert) => {
              const alertId = `${alert.category}-${alert.index}`;
              const isExpanded = expandedAlert === alertId;
              
              return (
                <div
                  key={alertId}
                  className={`border rounded-lg transition-all duration-200 ${getAlertColor(alert.priority)}`}
                >
                  <div
                    className="p-4 cursor-pointer hover:bg-opacity-80"
                    onClick={() => handleAlertClick(alert.index, alert.category)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3 flex-1">
                        <span className="text-2xl">{getAlertIcon(alert.type)}</span>
                        <div className="flex-1">
                          <div className={`font-semibold mb-1 ${getTextColor(alert.priority)}`}>
                            {alert.title}
                            <span className={`ml-2 text-xs px-2 py-1 rounded uppercase font-bold ${
                              alert.priority === 'high' ? 'bg-red-200 text-red-800' :
                              alert.priority === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                              'bg-blue-200 text-blue-800'
                            }`}>
                              {alert.priority}
                            </span>
                          </div>
                          <div className={`text-sm ${getTextColor(alert.priority)}`}>
                            {alert.message}
                          </div>
                          {alert.data && (
                            <div className="mt-2 text-xs opacity-75">
                              {alert.data.timespan && `Timespan: ${alert.data.timespan}`}
                              {alert.data.exercise && ` • Exercise: ${alert.data.exercise}`}
                              {alert.data.progress !== undefined && ` • Progress: ${alert.data.progress}%`}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className={`text-sm ${getTextColor(alert.priority)}`}>
                        {isExpanded ? '▼' : '▶'}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className={`border-t p-4 ${getTextColor(alert.priority)}`}>
                      {/* Data Details */}
                      {alert.data && (
                        <div className="mb-4">
                          <h4 className="font-semibold mb-2">📊 Details:</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            {Object.entries(alert.data).map(([key, value]) => (
                              <div key={key}>
                                <span className="font-medium">
                                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:
                                </span>
                                <span className="ml-1">{value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Recommendations */}
                      {alert.recommendations && alert.recommendations.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-2">💡 Recommendations:</h4>
                          <ul className="list-disc list-inside text-sm space-y-1">
                            {alert.recommendations.map((rec, idx) => (
                              <li key={idx}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="mt-4 text-xs opacity-60">
                        Detected: {new Date(alert.detectedAt).toLocaleString()}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TrendAnalysisAlerts;