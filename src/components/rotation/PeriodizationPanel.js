import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const PeriodizationPanel = ({ currentExercise, onExerciseChange, onPeriodizedWorkoutApply }) => {
  const [periodizationData, setPeriodizationData] = useState(null);
  const [rotationSuggestions, setRotationSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showRotationSuggestions, setShowRotationSuggestions] = useState(false);
  const [showPhaseDetails, setShowPhaseDetails] = useState(false);

  const fetchPeriodizationData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch full analysis including periodization and rotation
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/exercise-rotation`, {
        params: {
          exercise: currentExercise,
          action: 'full-analysis',
          userId: 'default-user',
          maxSuggestions: 3,
          includeAccessory: 'false'
        }
      });

      if (response.data.success) {
        setPeriodizationData(response.data.analysis);
        setRotationSuggestions(response.data.analysis.rotationSuggestions || []);
      } else {
        setError('Failed to fetch periodization data');
      }
    } catch (err) {
      console.error('Error fetching periodization data:', err);
      setError('Error loading periodization data');
    } finally {
      setIsLoading(false);
    }
  }, [currentExercise]);

  // Fetch periodization and rotation data
  useEffect(() => {
    if (currentExercise && currentExercise !== 'Other') {
      fetchPeriodizationData();
    }
  }, [currentExercise, fetchPeriodizationData]);

  const handleApplyPeriodizedWorkout = () => {
    if (periodizationData?.periodizedWorkout) {
      onPeriodizedWorkoutApply(periodizationData.periodizedWorkout);
    }
  };

  const handleExerciseRotation = (newExercise) => {
    onExerciseChange(newExercise);
    setShowRotationSuggestions(false);
  };

  const handleAdvancePhase = async () => {
    try {
      setIsLoading(true);
      await axios.post(`${process.env.REACT_APP_API_URL}/setup-periodization-table`, {
        action: 'advance-phase',
        userId: 'default-user'
      });
      
      // Refresh data after phase change
      await fetchPeriodizationData();
    } catch (err) {
      console.error('Error advancing phase:', err);
      setError('Failed to advance phase');
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentExercise || currentExercise === 'Other') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600 mr-2"></div>
          <span className="text-sm text-purple-700">Loading periodization data...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-red-700">{error}</span>
          <button
            onClick={fetchPeriodizationData}
            className="text-xs bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!periodizationData) {
    return null;
  }

  const { currentPhase, periodizedWorkout, rotationRecommendation, exerciseCategory } = periodizationData;

  return (
    <div className="space-y-4">
      {/* Current Phase Info */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-sm font-semibold text-purple-900 flex items-center">
            📊 Training Phase: {currentPhase?.phase || 'Unknown'}
            <button
              onClick={() => setShowPhaseDetails(!showPhaseDetails)}
              className="ml-2 text-xs text-purple-600 hover:text-purple-800"
            >
              {showPhaseDetails ? '▲' : '▼'}
            </button>
          </h3>
          <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded">
            Week {currentPhase?.weekInPhase}/{currentPhase?.totalWeeksInPhase}
          </span>
        </div>

        {showPhaseDetails && (
          <div className="space-y-2 text-sm text-purple-800">
            <p>{currentPhase?.recommendation}</p>
            <p className="text-xs text-purple-600">{currentPhase?.phaseDescription}</p>
            <div className="flex justify-between items-center pt-2 border-t border-purple-200">
              <span className="text-xs">Next Phase: {currentPhase?.nextPhase}</span>
              <button
                onClick={handleAdvancePhase}
                className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 transition-colors"
                disabled={isLoading}
              >
                Advance Phase
              </button>
            </div>
          </div>
        )}

        {/* Periodized Workout Suggestion */}
        {periodizedWorkout && (
          <div className="mt-3 pt-3 border-t border-purple-200">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-purple-800 font-medium">
                  Phase-Optimized: {periodizedWorkout.sets} sets × {periodizedWorkout.reps} reps @ {periodizedWorkout.weight} lbs
                </p>
                <p className="text-xs text-purple-600 mt-1">{periodizedWorkout.reasoning}</p>
                <div className="text-xs text-purple-600 mt-1">
                  Rest: {periodizedWorkout.restPeriod[0]}-{periodizedWorkout.restPeriod[1]}s | 
                  Intensity: {periodizedWorkout.intensityPercent[0]}-{periodizedWorkout.intensityPercent[1]}%
                </div>
              </div>
              <button
                onClick={handleApplyPeriodizedWorkout}
                className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Exercise Rotation Panel */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-sm font-semibold text-orange-900 flex items-center">
            🔄 Exercise Rotation
            <span className="ml-2 text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
              {exerciseCategory?.category} - {exerciseCategory?.tier}
            </span>
          </h3>
          <button
            onClick={() => setShowRotationSuggestions(!showRotationSuggestions)}
            className="text-xs bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700 transition-colors"
          >
            {showRotationSuggestions ? 'Hide' : 'Show'} Options
          </button>
        </div>

        {/* Rotation Recommendation */}
        {rotationRecommendation && (
          <div className={`text-sm mb-2 ${
            rotationRecommendation.shouldRotate 
              ? 'text-orange-800 font-medium' 
              : 'text-orange-600'
          }`}>
            {rotationRecommendation.shouldRotate ? (
              <span>💡 Rotation recommended: {rotationRecommendation.reason}</span>
            ) : (
              <span>✅ Continue with current exercise: {rotationRecommendation.reason}</span>
            )}
          </div>
        )}

        {/* Rotation Suggestions */}
        {showRotationSuggestions && rotationSuggestions.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-orange-900 mb-2">Alternative Exercises:</h4>
            {rotationSuggestions.map((suggestion, index) => (
              <div key={index} className="bg-white border border-orange-200 rounded p-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-900">{suggestion.exercise}</span>
                      <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                        #{suggestion.rank}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        suggestion.recommendation === 'Highly Recommended' ? 'bg-green-100 text-green-800' :
                        suggestion.recommendation === 'Good Alternative' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {suggestion.recommendation}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">{suggestion.reason}</p>
                    <div className="flex items-center mt-1 space-x-3">
                      <span className="text-xs text-gray-500">Score: {suggestion.score}</span>
                      <span className="text-xs text-gray-500">{suggestion.category} - {suggestion.tier}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleExerciseRotation(suggestion.exercise)}
                    className="text-xs bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700 transition-colors ml-2"
                  >
                    Switch
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PeriodizationPanel;