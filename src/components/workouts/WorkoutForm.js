import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import axios from 'axios';
// import { calculateNextWorkout, getProgressionParams, createMockWorkoutHistory } from '../../utils/progressiveOverload';
import { detectPR, formatPRForCelebration, logPRAchievement } from '../../utils/prDetection';
import { useCelebration } from '../../context/CelebrationContext';

const WorkoutForm = ({ onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });
  const [progressionSuggestion, setProgressionSuggestion] = useState(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [progressiveOverloadEnabled, setProgressiveOverloadEnabled] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [lastWorkout, setLastWorkout] = useState(null);
  const { celebratePR } = useCelebration();
  // const [recentWorkouts, setRecentWorkouts] = useState([]); // Commented out for debugging
  
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

  const fetchLastWorkout = useCallback(async (exercise) => {
    console.log(`📊 fetchLastWorkout called for: ${exercise}`);
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/get-workouts`, {
        params: {
          userId: 'default-user',
          _t: Date.now() // Cache busting parameter
        }
      });
      
      console.log('📊 API Response:', {
        success: response.data.success,
        totalWorkouts: response.data.data?.length || 0,
        firstFewWorkouts: response.data.data?.slice(0, 3)
      });
      
      if (response.data.success && response.data.data) {
        const workouts = response.data.data || response.data.workouts || [];
        console.log(`📊 Looking for ${exercise} in ${workouts.length} total workouts`);
        
        // Find the most recent workout for this exercise
        const exerciseWorkouts = workouts
          .filter(w => {
            const match = (w.exercise === exercise || w.Exercise === exercise);
            if (match) console.log('📊 Found matching workout:', w);
            return match;
          })
          .sort((a, b) => {
            const dateA = new Date(a.date || a.Date || '1900-01-01');
            const dateB = new Date(b.date || b.Date || '1900-01-01');
            
            // If dates are equal, use multiple fallbacks to find newest
            if (dateA.getTime() === dateB.getTime()) {
              // Try weight as a simple heuristic - higher weight might be more recent
              const weightA = parseFloat(a.weight || a.Weight || 0);
              const weightB = parseFloat(b.weight || b.Weight || 0);
              
              if (weightA !== weightB) {
                return weightB - weightA; // Higher weight first (progressive overload)
              }
              
              // Fallback to record ID comparison 
              const idA = a.id || '';
              const idB = b.id || '';
              
              // Airtable IDs usually start with 'rec' followed by alphanumeric
              // Later records tend to have lexicographically larger IDs
              return idB.localeCompare(idA);
            }
            
            return dateB - dateA;
          });

        console.log('📊 Workouts after sorting:', exerciseWorkouts.map(w => ({
          id: w.id,
          date: w.date,
          weight: w.weight,
          createdTime: w.createdTime,
          isFirst: exerciseWorkouts.indexOf(w) === 0
        })));
        
        console.log(`📊 Found ${exerciseWorkouts.length} workouts for ${exercise}`);
        
        if (exerciseWorkouts.length > 0) {
          const lastW = exerciseWorkouts[0];
          console.log('📊 SELECTED WORKOUT (first after sorting):', {
            id: lastW.id,
            date: lastW.date,
            weight: lastW.weight,
            createdTime: lastW.createdTime
          });
          
          const workoutDate = lastW.date || lastW.Date;
          
          // Validate date before setting
          const isValidDate = workoutDate && !isNaN(new Date(workoutDate).getTime());
          
          const lastWorkoutData = {
            date: isValidDate ? workoutDate : new Date().toISOString().split('T')[0],
            sets: lastW.sets || lastW.Sets,
            reps: lastW.reps || lastW.Reps,
            weight: lastW.weight || lastW.Weight
          };
          
          console.log('📊 Setting last workout data:', lastWorkoutData);
          setLastWorkout(lastWorkoutData);
        } else {
          console.log('📊 No workouts found for exercise, clearing last workout');
          setLastWorkout(null);
        }
      } else {
        console.log('📊 API call unsuccessful or no data');
        setLastWorkout(null);
      }
    } catch (error) {
      console.error('❌ Failed to fetch last workout:', error);
      setLastWorkout(null);
    }
  }, []);

  const fetchProgressionSuggestion = useCallback(async (exercise) => {
    console.log('💡 fetchProgressionSuggestion called for:', exercise);
    setLoadingSuggestion(true);
    
    try {
      // Use the actual working endpoint
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/get-progression-suggestion`, {
        params: {
          exercise: exercise,
          userId: 'default-user',
          workoutsToAnalyze: '5',
          _t: Date.now() // Cache busting parameter
        }
      });
      
      console.log('💡 Progression API Response:', {
        success: response.data.success,
        hasProgression: !!response.data.progression,
        workoutHistoryCount: response.data.workoutHistory?.length || 0,
        suggestion: response.data.progression?.suggestion
      });
      
      if (response.data.success && response.data.progression) {
        console.log('💡 API suggestion received:', response.data.progression);
        setProgressionSuggestion(response.data.progression);
        
        // Also extract last workout from the response if available
        if (response.data.progression.lastWorkout) {
          console.log('💡 Using last workout from progression API:', response.data.progression.lastWorkout);
          setLastWorkout(response.data.progression.lastWorkout);
        }
      } else {
        console.log('💡 No progression data received from API');
        setProgressionSuggestion(null);
      }
    } catch (error) {
      console.error('❌ Failed to fetch progression suggestion:', error);
      // Provide a basic fallback suggestion
      setProgressionSuggestion({
        suggestion: { sets: 3, reps: 10, weight: 0 },
        reason: 'Start with a comfortable weight and focus on form',
        confidence: 'low',
        isFirstWorkout: true,
        exerciseType: 'general'
      });
    }
    
    setLoadingSuggestion(false);
  }, []);

  // Fetch progression suggestion when exercise changes
  useEffect(() => {
    console.log('🎯 useEffect triggered - selectedExercise:', selectedExercise, 'progressiveOverloadEnabled:', progressiveOverloadEnabled);
    
    if (selectedExercise && selectedExercise !== 'Other') {
      console.log('✅ Conditions met! Fetching data for:', selectedExercise);
      console.log('Progressive overload enabled?', progressiveOverloadEnabled);
      
      fetchLastWorkout(selectedExercise);
      
      if (progressiveOverloadEnabled) {
        console.log('📊 Calling fetchProgressionSuggestion for:', selectedExercise);
        fetchProgressionSuggestion(selectedExercise);
      } else {
        console.log('⚠️ Progressive overload is disabled');
      }
    } else {
      console.log('❌ Not fetching data - conditions not met');
      console.log('selectedExercise:', selectedExercise);
      console.log('Is it "Other"?:', selectedExercise === 'Other');
      console.log('Is it empty?:', !selectedExercise);
      setProgressionSuggestion(null);
      setLastWorkout(null);
      setLoadingSuggestion(false);
    }
  }, [selectedExercise, progressiveOverloadEnabled, fetchProgressionSuggestion, fetchLastWorkout]);

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
      // Include progression tracking info and userId
      const submissionData = {
        ...data,
        userId: 'default-user',  // Add userId to match what the API expects
        progressionApplied: progressionSuggestion?.suggestion && 
          data.sets === progressionSuggestion.suggestion.sets &&
          data.reps === progressionSuggestion.suggestion.reps &&
          data.weight === progressionSuggestion.suggestion.weight
      };

      console.log('💾 Submitting workout data:', submissionData);

      // Check for PR before submitting
      console.log('🔍 Checking for PR...', submissionData);
      const prResult = await detectPR(submissionData);
      console.log('🎯 PR Detection Result:', prResult);

      const response = await axios.post(`${process.env.REACT_APP_API_URL}/log-workout`, submissionData);
      console.log('💾 Workout logging response:', {
        success: response.data.success,
        recordId: response.data.recordId,
        message: response.data.message
      });
      
      if (response.data.success) {
        setSubmitMessage({ 
          type: 'success', 
          text: 'Workout logged successfully! 🔄 Updating progression suggestions...' 
        });
        
        // Handle PR celebration
        if (prResult.isPR) {
          const celebrationData = formatPRForCelebration(prResult);
          if (celebrationData) {
            console.log('🎉 Triggering PR celebration:', celebrationData);
            
            // Log the PR achievement
            await logPRAchievement(celebrationData);
            
            // Show celebration modal
            celebratePR(celebrationData);
            
            // Update success message to include PR
            const prMessage = celebrationData.isNewPR 
              ? `Workout logged successfully! 🎉 First time doing ${celebrationData.exercise}!`
              : `Workout logged successfully! 🔥 NEW PR: +${celebrationData.improvement} lbs improvement!`;
            setSubmitMessage({ type: 'success', text: prMessage });
          }
        }
        
        // Store the exercise before resetting
        const exerciseToKeep = data.exercise;
        
        reset();
        setProgressionSuggestion(null);
        if (onSuccess) onSuccess(response.data);
        
        // Re-select the exercise and refresh suggestion for next workout
        if (exerciseToKeep && exerciseToKeep !== 'Other') {
          console.log('🎯 Starting post-workout refresh for:', exerciseToKeep);
          
          // Give more time for database to update and prevent caching
          setTimeout(() => {
            console.log('🔄 Phase 1: Re-selecting exercise and clearing old data...');
            setValue('exercise', exerciseToKeep);
            
            if (progressiveOverloadEnabled) {
              // Clear current suggestions to show loading state
              setProgressionSuggestion(null);
              setLastWorkout(null);
              console.log('🧹 Cleared old data, fetching fresh data in 1 second...');
              
              // Fetch fresh data with a longer delay between calls
              setTimeout(() => {
                console.log('🔄 Phase 2: Fetching fresh workout history...');
                fetchLastWorkout(exerciseToKeep);
                
                setTimeout(() => {
                  console.log('🔄 Phase 3: Fetching fresh progression suggestion...');
                  fetchProgressionSuggestion(exerciseToKeep);
                }, 500);
              }, 1000);
            }
          }, 2000); // Even longer delay to ensure database propagation
        }
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
    <div className="bg-blue-primary rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl section-header">Log Workout</h2>
        <div className="flex flex-col space-y-2">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={progressiveOverloadEnabled}
              onChange={(e) => setProgressiveOverloadEnabled(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-white">Progressive Overload</span>
            <span className="ml-1 text-xs text-blue-200 font-medium">(ON by default)</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={demoMode}
              onChange={(e) => setDemoMode(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm text-white">🎭 Demo Mode</span>
            <span className="ml-1 text-xs text-blue-200">(simulate workout history)</span>
          </label>
          
          {/* Debug Button */}
          {selectedExercise && selectedExercise !== 'Other' && (
            <button
              type="button"
              onClick={() => {
                console.log('🔧 Debug button clicked - force refresh for:', selectedExercise);
                setProgressionSuggestion(null);
                setLastWorkout(null);
                fetchLastWorkout(selectedExercise);
                setTimeout(() => {
                  fetchProgressionSuggestion(selectedExercise);
                }, 1000);
              }}
              className="px-2 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700 transition-colors"
              title="Force refresh data for debugging"
            >
              🔧 Debug Refresh
            </button>
          )}
        </div>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Exercise
          </label>
          <select
            {...register('exercise', { required: 'Exercise is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
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

        {/* Last Workout Info */}
        {lastWorkout && selectedExercise && selectedExercise !== 'Other' && (
          <div className="bg-gray-100 border border-gray-300 rounded-lg p-3 mb-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-700">📊 Last Workout</h4>
              <span className="text-xs text-gray-500">
                {lastWorkout.date && !isNaN(new Date(lastWorkout.date).getTime()) 
                  ? format(new Date(lastWorkout.date), 'MMM d, yyyy') 
                  : 'Unknown date'}
              </span>
            </div>
            <div className="mt-1 text-sm text-gray-900">
              <span className="font-semibold">{lastWorkout.sets}</span> sets × 
              <span className="font-semibold"> {lastWorkout.reps}</span> reps @ 
              <span className="font-semibold text-blue-600"> {lastWorkout.weight}</span> lbs
            </div>
          </div>
        )}

        {/* No Workout History Message */}
        {!lastWorkout && selectedExercise && selectedExercise !== 'Other' && !loadingSuggestion && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-2">
            <div className="flex items-start">
              <span className="text-yellow-600 mr-2">⚠️</span>
              <div className="text-sm text-yellow-800">
                <p className="font-medium">No workout history found for {selectedExercise}</p>
                <p className="text-xs mt-1">Log your first workout to get personalized progression suggestions!</p>
              </div>
            </div>
          </div>
        )}

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
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => {
                        console.log('🔄 Manual refresh triggered for:', selectedExercise);
                        setProgressionSuggestion(null);
                        setLastWorkout(null);
                        fetchLastWorkout(selectedExercise);
                        fetchProgressionSuggestion(selectedExercise);
                      }}
                      className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300 transition-colors"
                      title="Refresh suggestion and last workout data"
                    >
                      🔄
                    </button>
                    <button
                      type="button"
                      onClick={applyProgressionSuggestion}
                      className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
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
                  {progressionSuggestion.formatted && progressionSuggestion.formatted.changes?.length > 0 && (
                    <div className="text-xs text-green-700 mt-1 font-medium">
                      Changes: {progressionSuggestion.formatted.changes.join(', ')}
                    </div>
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
                  {progressionSuggestion.hypertrophyOptimized && (
                    <div className="mt-2 p-2 bg-purple-100 border border-purple-200 rounded text-xs">
                      <div className="font-medium text-purple-800 mb-1">🎯 Hypertrophy Analysis:</div>
                      {progressionSuggestion.analysis && (
                        <div className="space-y-1 text-purple-700">
                          <div>Success Rate: {progressionSuggestion.analysis.successRate}%</div>
                          {progressionSuggestion.analysis.weeklyGrowth !== undefined && (
                            <div>Weekly Growth: {progressionSuggestion.analysis.weeklyGrowth > 0 ? '+' : ''}{progressionSuggestion.analysis.weeklyGrowth}%</div>
                          )}
                          <div>Volume Trend: {progressionSuggestion.analysis.volumeTrend}</div>
                          <div className="text-purple-600 text-xs mt-1">
                            Optimized for 6-15 rep hypertrophy ranges
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
                  {progressionSuggestion.nextWeekSuggestion && (
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                      <div className="font-medium text-blue-800 mb-1">📈 Progressive Overload Plan:</div>
                      <div className="text-blue-700">
                        <strong>This Week:</strong> {progressionSuggestion.suggestion.sets} sets × {progressionSuggestion.suggestion.reps} reps @ {progressionSuggestion.suggestion.weight}lbs
                      </div>
                      <div className="text-blue-700 mt-1">
                        <strong>Next Week:</strong> {progressionSuggestion.nextWeekSuggestion.sets} sets × {progressionSuggestion.nextWeekSuggestion.reps} reps @ {progressionSuggestion.nextWeekSuggestion.weight}lbs
                      </div>
                      <div className="text-blue-600 text-xs mt-1 italic">
                        {progressionSuggestion.nextWeekSuggestion.reason}
                      </div>
                    </div>
                  )}
                  <div className="mt-2 p-2 bg-green-100 rounded text-xs text-green-800">
                    💡 <strong>Beginner Tip:</strong> Start conservative and focus on proper form. Progressive overload comes with consistency!
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Sets
            </label>
            <input
              type="number"
              {...register('sets', { 
                required: 'Sets is required',
                min: { value: 1, message: 'Minimum 1 set' },
                max: { value: 100, message: 'Maximum 100 sets' }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            />
            {errors.sets && (
              <p className="mt-1 text-sm text-red-600">{errors.sets.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Reps
            </label>
            <input
              type="number"
              {...register('reps', { 
                required: 'Reps is required',
                min: { value: 1, message: 'Minimum 1 rep' },
                max: { value: 1000, message: 'Maximum 1000 reps' }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            />
            {errors.reps && (
              <p className="mt-1 text-sm text-red-600">{errors.reps.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-white mb-1">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
            />
            {errors.weight && (
              <p className="mt-1 text-sm text-red-600">{errors.weight.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Date
          </label>
          <input
            type="date"
            {...register('date', { 
              required: 'Date is required',
              validate: value => new Date(value) <= new Date() || 'Date cannot be in the future'
            })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
          />
          {errors.date && (
            <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-white mb-1">
            Notes (optional)
          </label>
          <textarea
            {...register('notes')}
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
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