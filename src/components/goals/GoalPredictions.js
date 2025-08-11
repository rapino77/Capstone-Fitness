import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import axios from 'axios';

const GoalPredictions = ({ goals, refreshTrigger = 0 }) => {
  const [predictions, setPredictions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [usingClientSide, setUsingClientSide] = useState(false);

  const generateClientSidePredictions = useCallback((goals) => {
    const activeGoals = goals.filter(g => g.status === 'Active');
    const predictions = activeGoals.map(goal => {
      const currentProgress = goal.progressPercentage || 0;
      const daysRemaining = goal.daysRemaining || 0;
      const timeElapsedRatio = goal.timeElapsedRatio || 0.5; // Assume halfway if not available
      
      // Simple prediction algorithm based on current progress and time remaining
      let likelihood, confidence;
      const progressRate = currentProgress / Math.max(timeElapsedRatio, 0.1);
      const projectedProgress = Math.min(progressRate, 100);
      
      if (projectedProgress >= 95) {
        likelihood = 'very_likely';
        confidence = 'high';
      } else if (projectedProgress >= 80) {
        likelihood = 'likely';
        confidence = 'medium';
      } else if (projectedProgress >= 60) {
        likelihood = 'possible';
        confidence = 'medium';
      } else if (projectedProgress >= 30) {
        likelihood = 'unlikely';
        confidence = 'medium';
      } else {
        likelihood = 'unlikely';
        confidence = 'high';
      }
      
      // Generate insights based on progress
      const insights = [];
      if (currentProgress < 25 && daysRemaining < 30) {
        insights.push('Goal deadline is approaching with limited progress. Consider adjusting timeline or increasing effort.');
      } else if (currentProgress > 75) {
        insights.push('Great progress! Stay consistent to achieve your goal.');
      } else if (currentProgress < timeElapsedRatio * 100 - 20) {
        insights.push('Progress is behind schedule. Consider reviewing your strategy.');
      } else {
        insights.push('Progress is on track. Keep up the good work!');
      }
      
      // Add goal-specific insights
      switch (goal.goalType) {
        case 'Body Weight':
          insights.push('Track weight daily for better trend analysis.');
          break;
        case 'Exercise PR':
          insights.push('Focus on progressive overload in your training.');
          break;
        case 'Frequency':
          insights.push('Consistency is key - aim for regular workout schedule.');
          break;
        default:
          insights.push('Regular tracking will improve prediction accuracy.');
      }
      
      return {
        goalId: goal.id,
        goalTitle: goal.goalTitle,
        goalType: goal.goalType,
        targetDate: goal.targetDate,
        daysRemaining,
        currentProgress,
        timeElapsedRatio,
        likelihood,
        confidence,
        projectedProgress: Math.round(projectedProgress),
        insights,
        predictedDate: null // Could calculate based on current rate
      };
    });
    
    const summary = {
      totalActiveGoals: activeGoals.length,
      predictionsGenerated: predictions.length,
      likelyToSucceed: predictions.filter(p => p.likelihood === 'very_likely' || p.likelihood === 'likely').length,
      needsAttention: predictions.filter(p => p.likelihood === 'unlikely' || p.likelihood === 'possible').length,
      insufficientData: 0
    };
    
    return { predictions, summary };
  }, []);

  const fetchPredictions = useCallback(async () => {
    try {
      setIsLoading(true);

      // Try to fetch from API first
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/get-goal-predictions`, {
        params: {
          userId: 'default-user'
        },
        timeout: 3000 // 3 second timeout
      });

      if (response.data.success) {
        setPredictions(response.data.data.predictions || []);
        setSummary(response.data.data.summary || null);
        setUsingClientSide(false);
        return;
      }
    } catch (error) {
      console.log('API not available, using client-side predictions');
      // Fall back to client-side predictions
      const { predictions: clientPredictions, summary: clientSummary } = generateClientSidePredictions(goals);
      setPredictions(clientPredictions);
      setSummary(clientSummary);
      setUsingClientSide(true);
    } finally {
      setIsLoading(false);
    }
  }, [goals, generateClientSidePredictions]);

  useEffect(() => {
    if (goals && goals.filter(g => g.status === 'Active').length > 0) {
      fetchPredictions();
    } else {
      setIsLoading(false);
      setPredictions([]);
      setSummary(null);
    }
  }, [goals, refreshTrigger, fetchPredictions]);

  const getLikelihoodColor = (likelihood) => {
    switch (likelihood) {
      case 'very_likely': return 'bg-green-100 text-green-800 border-green-200';
      case 'likely': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'possible': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unlikely': return 'bg-red-100 text-red-800 border-red-200';
      case 'insufficient_data': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'error': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getLikelihoodIcon = (likelihood) => {
    switch (likelihood) {
      case 'very_likely': return '🎯';
      case 'likely': return '✅';
      case 'possible': return '⚠️';
      case 'unlikely': return '❌';
      case 'insufficient_data': return '📊';
      case 'error': return '⚠️';
      default: return '❓';
    }
  };

  const getConfidenceIcon = (confidence) => {
    switch (confidence) {
      case 'high': return '🔥';
      case 'medium': return '💡';
      case 'low': return '🤔';
      default: return '❓';
    }
  };

  const formatLikelihood = (likelihood) => {
    return likelihood.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }


  if (!goals || goals.filter(g => g.status === 'Active').length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Goal Achievement Predictions</h3>
        <div className="text-center py-8">
          <p className="text-gray-500">No active goals to analyze.</p>
          <p className="text-sm text-gray-400 mt-2">Create some goals to see predictions!</p>
        </div>
      </div>
    );
  }

  if (predictions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Goal Achievement Predictions</h3>
        <div className="text-center py-8">
          <p className="text-gray-500">No predictions available.</p>
          <p className="text-sm text-gray-400 mt-2">Try logging more workouts and weight data.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">Goal Achievement Predictions</h3>
        <button
          onClick={fetchPredictions}
          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200"
        >
          Refresh
        </button>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-700">{summary.likelyToSucceed}</div>
            <div className="text-sm text-green-600">Likely to Succeed</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-700">{summary.needsAttention}</div>
            <div className="text-sm text-yellow-600">Need Attention</div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-gray-700">{summary.insufficientData}</div>
            <div className="text-sm text-gray-600">Need More Data</div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-700">{summary.totalActiveGoals}</div>
            <div className="text-sm text-blue-600">Total Active</div>
          </div>
        </div>
      )}

      {/* Predictions List */}
      <div className="space-y-4">
        {predictions.map((prediction) => (
          <div key={prediction.goalId} className="border border-gray-200 rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 mb-1">{prediction.goalTitle}</h4>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <span>{prediction.goalType}</span>
                  {prediction.targetDate && (
                    <>
                      <span>•</span>
                      <span>Due: {format(new Date(prediction.targetDate), 'MMM dd, yyyy')}</span>
                    </>
                  )}
                  {prediction.daysRemaining !== undefined && (
                    <>
                      <span>•</span>
                      <span className={prediction.daysRemaining <= 7 ? 'text-red-600 font-medium' : ''}>
                        {prediction.daysRemaining} days left
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Likelihood Badge */}
              <div className={`px-3 py-1 rounded-full text-sm font-medium border ${getLikelihoodColor(prediction.likelihood)}`}>
                <span className="mr-1">{getLikelihoodIcon(prediction.likelihood)}</span>
                {formatLikelihood(prediction.likelihood)}
              </div>
            </div>

            {/* Progress Bar */}
            {prediction.currentProgress !== undefined && (
              <div className="mb-3">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                  <span>Current Progress</span>
                  <span>{prediction.currentProgress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(prediction.currentProgress, 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Prediction Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Confidence */}
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Confidence:</span>
                <span className="flex items-center space-x-1">
                  <span>{getConfidenceIcon(prediction.confidence)}</span>
                  <span className="capitalize font-medium">{prediction.confidence}</span>
                </span>
              </div>

              {/* Predicted Date */}
              {prediction.predictedDate && (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600">Predicted Completion:</span>
                  <span className="font-medium">
                    {format(new Date(prediction.predictedDate), 'MMM dd, yyyy')}
                  </span>
                </div>
              )}
            </div>

            {/* Type-specific metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 text-sm">
              {prediction.weeklyChangeNeeded && (
                <div>
                  <span className="text-gray-600">Weekly change needed: </span>
                  <span className="font-medium">{prediction.weeklyChangeNeeded} lbs</span>
                </div>
              )}
              {prediction.currentWeeklyTrend && (
                <div>
                  <span className="text-gray-600">Current trend: </span>
                  <span className="font-medium">{prediction.currentWeeklyTrend} lbs/week</span>
                </div>
              )}
              {prediction.weeklyProgressNeeded && (
                <div>
                  <span className="text-gray-600">Weekly progress needed: </span>
                  <span className="font-medium">{prediction.weeklyProgressNeeded} lbs</span>
                </div>
              )}
              {prediction.currentProgressionRate && (
                <div>
                  <span className="text-gray-600">Current progression: </span>
                  <span className="font-medium">{prediction.currentProgressionRate} lbs/week</span>
                </div>
              )}
              {prediction.workoutsPerWeekNeeded && (
                <div>
                  <span className="text-gray-600">Workouts/week needed: </span>
                  <span className="font-medium">{prediction.workoutsPerWeekNeeded}</span>
                </div>
              )}
              {prediction.currentFrequency && (
                <div>
                  <span className="text-gray-600">Current frequency: </span>
                  <span className="font-medium">{prediction.currentFrequency}/week</span>
                </div>
              )}
            </div>

            {/* Insights */}
            {prediction.insights && prediction.insights.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h5 className="font-medium text-blue-900 mb-2">💡 Insights & Recommendations</h5>
                <ul className="space-y-1">
                  {prediction.insights.map((insight, index) => (
                    <li key={index} className="text-sm text-blue-800">
                      • {insight}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Last Updated */}
      <div className="text-xs text-gray-400 mt-4 text-center">
        {usingClientSide ? (
          <span>Predictions based on current goal progress • Run 'netlify dev' for advanced AI predictions</span>
        ) : (
          <span>Predictions are updated in real-time based on your workout and weight data</span>
        )}
      </div>
    </div>
  );
};

export default GoalPredictions;