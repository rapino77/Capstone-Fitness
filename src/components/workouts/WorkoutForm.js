import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import axios from 'axios';
import { calculateNextWorkout, getProgressionParams } from '../../utils/progressiveOverload';

const WorkoutForm = ({ onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });
  const [progressionSuggestion, setProgressionSuggestion] = useState(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [progressiveOverloadEnabled, setProgressiveOverloadEnabled] = useState(true);
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      sets: 3,
      reps: 10,
      weight: 0
    }
  });

  const selectedExercise = watch('exercise');

  const commonExercises = [
    'Bench Press',
    'Squat',
    'Deadlift',
    'Overhead Press',
    'Bent Over Row',
    'Pull-ups',
    'Dips',
    'Bicep Curls',
    'Tricep Extensions',
    'Leg Press',
    'Lunges',
    'Shoulder Raises',
    'Other'
  ];

  const fetchProgressionSuggestion = useCallback(async (exercise) => {
    setLoadingSuggestion(true);
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/get-progression-suggestion`, {
        params: { exercise }
      });
      
      if (response.data.success && response.data.progression) {
        setProgressionSuggestion(response.data.progression);
        setRecentWorkouts(response.data.workoutHistory || []);
      }
    } catch (error) {
      console.error('Failed to fetch progression suggestion:', error);
      // If API fails, try to calculate locally if we have recent workouts
      // Otherwise, use local starter suggestions for first-time exercises
      const params = getProgressionParams(exercise);
      const suggestion = calculateNextWorkout(recentWorkouts, exercise, params);
      setProgressionSuggestion(suggestion);
    } finally {
      setLoadingSuggestion(false);
    }
  }, [recentWorkouts]);

  // Fetch progression suggestion when exercise changes
  useEffect(() => {
    if (selectedExercise && selectedExercise !== 'Other' && progressiveOverloadEnabled) {
      fetchProgressionSuggestion(selectedExercise);
    } else {
      setProgressionSuggestion(null);
    }
  }, [selectedExercise, progressiveOverloadEnabled, fetchProgressionSuggestion]);

  const applyProgressionSuggestion = () => {
    if (progressionSuggestion?.suggestion) {
      setValue('sets', progressionSuggestion.suggestion.sets);
      setValue('reps', progressionSuggestion.suggestion.reps);
      setValue('weight', progressionSuggestion.suggestion.weight);
      
      // Add note about applying progression
      const currentNotes = watch('notes') || '';
      const progressionNote = `Applied progressive overload: ${progressionSuggestion.reason}`;
      setValue('notes', currentNotes ? `${currentNotes}\n${progressionNote}` : progressionNote);
    }
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setSubmitMessage({ type: '', text: '' });

    try {
      // Include progression tracking info
      const submissionData = {
        ...data,
        progressionApplied: progressionSuggestion?.suggestion && 
          data.sets === progressionSuggestion.suggestion.sets &&
          data.reps === progressionSuggestion.suggestion.reps &&
          data.weight === progressionSuggestion.suggestion.weight
      };

      const response = await axios.post(`${process.env.REACT_APP_API_URL}/log-workout`, submissionData);
      
      if (response.data.success) {
        setSubmitMessage({ type: 'success', text: 'Workout logged successfully!' });
        reset();
        setProgressionSuggestion(null);
        if (onSuccess) onSuccess(response.data);
      }
    } catch (error) {
      setSubmitMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to log workout' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Log Workout</h2>
        <label className="flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={progressiveOverloadEnabled}
            onChange={(e) => setProgressiveOverloadEnabled(e.target.checked)}
            className="mr-2"
          />
          <span className="text-sm text-gray-600">Progressive Overload</span>
          <span className="ml-1 text-xs text-blue-600 font-medium">(ON by default)</span>
        </label>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Exercise
          </label>
          <select
            {...register('exercise', { required: 'Exercise is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select an exercise</option>
            {commonExercises.map((exercise) => (
              <option key={exercise} value={exercise}>{exercise}</option>
            ))}
          </select>
          {errors.exercise && (
            <p className="mt-1 text-sm text-red-600">{errors.exercise.message}</p>
          )}
        </div>

        {/* Progressive Overload Suggestion */}
        {progressiveOverloadEnabled && selectedExercise && selectedExercise !== 'Other' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            {loadingSuggestion ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <span className="text-sm text-blue-700">Loading progression suggestion...</span>
              </div>
            ) : progressionSuggestion?.suggestion ? (
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-semibold text-blue-900">Progressive Overload Suggestion:</h3>
                  <button
                    type="button"
                    onClick={applyProgressionSuggestion}
                    className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                  >
                    Apply
                  </button>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Target:</span> 
                    {progressionSuggestion.suggestion.sets} sets × 
                    {progressionSuggestion.suggestion.reps} reps @ 
                    {progressionSuggestion.suggestion.weight} lbs
                  </p>
                  <p className="text-xs text-blue-700">{progressionSuggestion.reason}</p>
                  {progressionSuggestion.lastWorkout && (
                    <p className="text-xs text-blue-600 mt-2">
                      Last workout: {progressionSuggestion.lastWorkout.sets}×{progressionSuggestion.lastWorkout.reps} @ {progressionSuggestion.lastWorkout.weight}lbs
                    </p>
                  )}
                  <div className="flex items-center mt-2">
                    <span className="text-xs text-blue-700 mr-2">Confidence:</span>
                    <div className="flex space-x-1">
                      {['high', 'medium', 'low'].map((level) => (
                        <div
                          key={level}
                          className={`h-2 w-8 rounded ${
                            progressionSuggestion.confidence === 'high' && level !== 'low' ? 'bg-blue-600' :
                            progressionSuggestion.confidence === 'medium' && level === 'high' ? 'bg-blue-600' :
                            progressionSuggestion.confidence === 'medium' && level === 'medium' ? 'bg-blue-400' :
                            'bg-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : progressionSuggestion?.isFirstWorkout ? (
              <div>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-sm font-semibold text-green-900">🌟 First Time Exercise - Starter Suggestion:</h3>
                  <button
                    type="button"
                    onClick={applyProgressionSuggestion}
                    className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
                  >
                    Use Suggestion
                  </button>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-green-800">
                    <span className="font-medium">Recommended Start:</span> 
                    {progressionSuggestion.suggestion?.sets} sets × 
                    {progressionSuggestion.suggestion?.reps} reps @ 
                    {progressionSuggestion.suggestion?.weight} lbs
                  </p>
                  <p className="text-xs text-green-700">{progressionSuggestion.reason}</p>
                  <div className="mt-2 p-2 bg-green-100 rounded text-xs text-green-800">
                    💡 <strong>Beginner Tip:</strong> Start conservative and focus on proper form. You can always increase the weight next session!
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sets
            </label>
            <input
              type="number"
              {...register('sets', { 
                required: 'Sets is required',
                min: { value: 1, message: 'Minimum 1 set' },
                max: { value: 100, message: 'Maximum 100 sets' }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.sets && (
              <p className="mt-1 text-sm text-red-600">{errors.sets.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reps
            </label>
            <input
              type="number"
              {...register('reps', { 
                required: 'Reps is required',
                min: { value: 1, message: 'Minimum 1 rep' },
                max: { value: 1000, message: 'Maximum 1000 reps' }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.reps && (
              <p className="mt-1 text-sm text-red-600">{errors.reps.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Weight (lbs)
            </label>
            <input
              type="number"
              step="0.5"
              {...register('weight', { 
                required: 'Weight is required',
                min: { value: 0, message: 'Weight cannot be negative' },
                max: { value: 2000, message: 'Maximum 2000 lbs' }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.weight && (
              <p className="mt-1 text-sm text-red-600">{errors.weight.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date
          </label>
          <input
            type="date"
            {...register('date', { 
              required: 'Date is required',
              validate: value => new Date(value) <= new Date() || 'Date cannot be in the future'
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.date && (
            <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (optional)
          </label>
          <textarea
            {...register('notes')}
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Any additional notes about your workout..."
          />
        </div>

        {submitMessage.text && (
          <div className={`p-4 rounded-md ${
            submitMessage.type === 'success' 
              ? 'bg-green-50 text-green-800' 
              : 'bg-red-50 text-red-800'
          }`}>
            {submitMessage.text}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Logging...' : 'Log Workout'}
        </button>
      </form>
    </div>
  );
};

export default WorkoutForm;