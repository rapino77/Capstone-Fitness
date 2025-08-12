import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import axios from 'axios';
// import { calculateNextWorkout, getProgressionParams, createMockWorkoutHistory } from '../../utils/progressiveOverload';
import { detectPR, formatPRForCelebration, logPRAchievement } from '../../utils/prDetection';
import { detectImmediateDeload, formatDeloadPrompt } from '../../utils/deloadDetection';
import { useCelebration } from '../../context/CelebrationContext';
import DeloadPrompt from './DeloadPrompt';
import PeriodizationPanel from '../rotation/PeriodizationPanel';
import WorkoutTimer from '../timer/WorkoutTimer';
import { workoutTemplates } from '../../utils/workoutTemplates';
import { 
  getNextStrongLiftsWorkout, 
  getStrongLiftsWorkoutSuggestion,
  detectStrongLiftsPattern,
  getStrongLiftsStatus 
} from '../../utils/strongLifts5x5';
import {
  getNextWendlerWorkout,
  getWendlerWorkoutSuggestion,
  detectWendlerPattern,
  getWendlerStatus
} from '../../utils/wendler531';

const WorkoutForm = ({ onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });
  const [progressionSuggestion, setProgressionSuggestion] = useState(null);
  const [loadingSuggestion, setLoadingSuggestion] = useState(false);
  const [progressiveOverloadEnabled, setProgressiveOverloadEnabled] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [lastWorkout, setLastWorkout] = useState(null);
  const [deloadPromptData, setDeloadPromptData] = useState(null);
  const [showDeloadPrompt, setShowDeloadPrompt] = useState(false);
  const [recentWorkouts, setRecentWorkouts] = useState([]);
  const [periodizationEnabled, setPeriodizationEnabled] = useState(true);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [workoutTimerData, setWorkoutTimerData] = useState(null);
  const timerRef = useRef(null);
  
  // Circle-based set tracking
  const [completedSets, setCompletedSets] = useState([]);
  
  // Template functionality
  const [showTemplates, setShowTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedTemplateWorkout, setSelectedTemplateWorkout] = useState('');
  const [currentTemplateIndex, setCurrentTemplateIndex] = useState(0);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const { celebratePR } = useCelebration();
  
  // Workout Plan State
  const [workoutMode, setWorkoutMode] = useState('freeform'); // 'freeform' or 'program'
  const [selectedProgram, setSelectedProgram] = useState('strongLifts5x5');
  const [selectedWorkout, setSelectedWorkout] = useState('workoutA'); // For StrongLifts: 'workoutA'/'workoutB', 5/3/1: 'squat'/'bench'/'deadlift'/'overhead'
  const [strongLiftsStatus, setStrongLiftsStatus] = useState(null);
  const [wendlerStatus, setWendlerStatus] = useState(null);
  const [programSuggestion, setProgramSuggestion] = useState(null);
  
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    defaultValues: {
      exercise: '', // Add default exercise value
      date: format(new Date(), 'yyyy-MM-dd'),
      sets: 3,
      reps: 10,
      weight: 0
    }
  });
  
  const selectedExercise = watch('exercise');
  
  // Watch form values for circle updates
  const watchedSets = watch('sets');
  const watchedReps = watch('reps');
  const watchedWeight = watch('weight');
  
  // Update completed sets when sets change
  useEffect(() => {
    console.log('useEffect triggered - watchedSets:', watchedSets);
    if (watchedSets && watchedSets > 0) {
      const newArray = new Array(parseInt(watchedSets)).fill(0);
      console.log('Creating new completedSets array:', newArray);
      setCompletedSets(newArray);
    } else {
      console.log('Setting empty completedSets array');
      setCompletedSets([]);
    }
  }, [watchedSets]);
  
  // Circle interaction handlers
  const handleSetComplete = (setIndex) => {
    setCompletedSets(prev => {
      const newSets = [...prev];
      newSets[setIndex] = newSets[setIndex] === parseInt(watchedReps) ? 0 : parseInt(watchedReps);
      return newSets;
    });
  };
  
  const SetCircle = ({ setIndex, reps, targetReps, isCompleted, isActive, onClick }) => (
    <button
      type="button"
      onClick={() => onClick(setIndex)}
      disabled={!isActive}
      className={`w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold transition-all border-2 ${
        isCompleted 
          ? 'bg-blue-600 text-white border-blue-500 shadow-lg' 
          : isActive 
            ? 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200' 
            : 'bg-gray-100 text-gray-400 border-gray-300 cursor-not-allowed'
      }`}
    >
      {reps || targetReps}
    </button>
  );
  
  const renderSetCircles = () => {
    console.log('renderSetCircles called', {
      watchedSets,
      completedSets,
      completedSetsLength: completedSets.length,
      watchedReps
    });
    
    if (!watchedSets || watchedSets <= 0) {
      console.log('Returning null: no watchedSets');
      return <div className="text-red-300 text-xs">No watchedSets: {watchedSets}</div>;
    }
    
    if (!completedSets || completedSets.length === 0) {
      console.log('Returning null: no completedSets');
      return <div className="text-red-300 text-xs">No completedSets: length={completedSets?.length}</div>;
    }
    
    console.log('Rendering circles for:', completedSets);
    
    return (
      <div className="flex flex-wrap gap-3 justify-center">
        <div className="text-xs text-green-300 w-full text-center mb-2">
          Rendering {completedSets.length} circles
        </div>
        {completedSets.map((reps, index) => {
          const isCompleted = reps > 0;
          const isActive = index === 0 || completedSets[index - 1] > 0;
          
          console.log(`Circle ${index}:`, { reps, isCompleted, isActive });
          
          return (
            <SetCircle
              key={index}
              setIndex={index}
              reps={reps}
              targetReps={parseInt(watchedReps) || 0}
              isCompleted={isCompleted}
              isActive={isActive}
              onClick={handleSetComplete}
            />
          );
        })}
      </div>
    );
  };
  
  const getCompletedSetsCount = () => {
    return completedSets.filter(reps => reps > 0).length;
  };
  
  // Reset circles when exercise changes
  useEffect(() => {
    setCompletedSets([]);
  }, [selectedExercise]);
  
  // Form handling already declared above

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

  const strongLiftsExercises = [
    'Squat',
    'Bench Press', 
    'Barbell Rows',
    'Overhead Press',
    'Deadlift'
  ];

  const wendlerExercises = [
    'Squat',
    'Bench Press',
    'Deadlift', 
    'Overhead Press'
  ];

  // Get exercises based on current mode
  const getExerciseOptions = () => {
    if (workoutMode === 'program') {
      if (selectedProgram === 'strongLifts5x5') {
        return strongLiftsExercises;
      } else if (selectedProgram === 'wendler531') {
        return wendlerExercises;
      }
    }
    return commonExercises;
  };

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
          
          // Store recent workouts for deload detection (limit to 10 most recent)
          setRecentWorkouts(exerciseWorkouts.slice(0, 10));
        } else {
          console.log('📊 No workouts found for exercise, clearing last workout');
          setLastWorkout(null);
          setRecentWorkouts([]);
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

  const analyzeStrongLiftsStatus = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/get-workouts`, {
        params: {
          userId: 'default-user',
          limit: 20, // Get more history for pattern analysis
          _t: Date.now()
        }
      });
      
      if (response.data.success && response.data.data) {
        const workouts = response.data.data || [];
        const status = getStrongLiftsStatus(workouts);
        const pattern = detectStrongLiftsPattern(workouts);
        
        setStrongLiftsStatus({
          ...status,
          patternDetected: pattern.isFollowing,
          confidence: pattern.confidence
        });

        // Also analyze for 5/3/1 pattern
        const wendlerStatus = getWendlerStatus(workouts);
        const wendlerPattern = detectWendlerPattern(workouts);
        
        setWendlerStatus({
          ...wendlerStatus,
          patternDetected: wendlerPattern.isFollowing,
          confidence: wendlerPattern.confidence
        });
        
        // Auto-suggest next workout if following either program
        if (pattern.isFollowing && workoutMode === 'freeform') {
          const nextWorkout = getNextStrongLiftsWorkout(workouts);
          setSelectedWorkout(nextWorkout);
          console.log('StrongLifts pattern detected, suggested next workout:', nextWorkout);
        } else if (wendlerPattern.isFollowing && workoutMode === 'freeform') {
          const nextWorkout = getNextWendlerWorkout(workouts);
          setSelectedWorkout(nextWorkout);
          console.log('Wendler 5/3/1 pattern detected, suggested next workout:', nextWorkout);
        }
      }
    } catch (error) {
      console.error('Failed to analyze StrongLifts status:', error);
    }
  }, [workoutMode]);

  const fetchProgramSuggestion = useCallback(async () => {
    if (workoutMode !== 'program') {
      setProgramSuggestion(null);
      return;
    }

    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/get-workouts`, {
        params: {
          userId: 'default-user',
          limit: 10,
          _t: Date.now()
        }
      });
      
      if (response.data.success && response.data.data) {
        const workouts = response.data.data || [];
        let suggestion = null;
        
        if (selectedProgram === 'strongLifts5x5') {
          suggestion = getStrongLiftsWorkoutSuggestion(selectedWorkout, workouts);
        } else if (selectedProgram === 'wendler531') {
          suggestion = getWendlerWorkoutSuggestion(selectedWorkout, workouts);
        }
        
        setProgramSuggestion(suggestion);
        
        // Auto-populate the first exercise for quick start
        if (suggestion && suggestion.exercises.length > 0) {
          const firstExercise = suggestion.exercises[0];
          setValue('exercise', firstExercise.name);
          setValue('sets', firstExercise.sets);
          setValue('reps', firstExercise.reps);
          setValue('weight', firstExercise.suggestedWeight || 0);
        }
      }
    } catch (error) {
      console.error('Failed to fetch program suggestion:', error);
      setProgramSuggestion(null);
    }
  }, [workoutMode, selectedProgram, selectedWorkout, setValue]);

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
    console.log('selectedExercise type:', typeof selectedExercise, 'length:', selectedExercise?.length);
    console.log('Is it empty?:', !selectedExercise || selectedExercise.trim() === '');
    
    // Improve condition check - ensure we have a valid, non-empty exercise that's not "Other"
    if (selectedExercise && selectedExercise.trim() !== '' && selectedExercise !== 'Other') {
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
      console.log('Is it empty or undefined?:', !selectedExercise || selectedExercise.trim() === '');
      setProgressionSuggestion(null);
      setLastWorkout(null);
      setLoadingSuggestion(false);
    }
  }, [selectedExercise, progressiveOverloadEnabled, fetchProgressionSuggestion, fetchLastWorkout]);

  // Analyze StrongLifts status on component mount
  useEffect(() => {
    analyzeStrongLiftsStatus();
  }, [analyzeStrongLiftsStatus]);

  // Fetch program suggestions when mode or program changes
  useEffect(() => {
    if (workoutMode === 'program') {
      fetchProgramSuggestion();
    } else {
      setProgramSuggestion(null);
    }
  }, [workoutMode, selectedProgram, selectedWorkout, fetchProgramSuggestion]);

  // Update progression suggestions based on workout mode
  useEffect(() => {
    if (workoutMode === 'program') {
      // In program mode, disable regular progressive overload (programs handle their own progression)
      setProgressiveOverloadEnabled(false);
    } else {
      setProgressiveOverloadEnabled(true);
    }
  }, [workoutMode, selectedProgram]);

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

  const applyProgramSuggestion = (exercise) => {
    if (programSuggestion && programSuggestion.exercises) {
      const exerciseData = programSuggestion.exercises.find(ex => ex.name === exercise.name);
      if (exerciseData) {
        setValue('exercise', exerciseData.name);
        setValue('sets', exerciseData.sets);
        setValue('reps', exerciseData.reps);
        setValue('weight', exerciseData.suggestedWeight);
        
        // Add program note
        const currentNotes = watch('notes') || '';
        const programNote = `StrongLifts 5x5 - ${exerciseData.progression?.reason || 'Following program'}`;
        setValue('notes', currentNotes ? `${currentNotes}\n${programNote}` : programNote);
      }
    }
  };

  const handleWorkoutModeChange = (mode) => {
    setWorkoutMode(mode);
    
    // Reset form when switching modes
    if (mode === 'freeform') {
      // Reset to default values
      reset({
        exercise: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        sets: 3,
        reps: 10,
        weight: 0
      });
      setProgressiveOverloadEnabled(true);
    } else if (mode === 'program') {
      // Reset with program defaults
      reset({
        exercise: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        sets: 5,
        reps: 5,
        weight: 0
      });
      setProgressiveOverloadEnabled(false);
    }
  };

  const handleProgramChange = (program) => {
    setSelectedProgram(program);
    
    // Set default workout for each program
    if (program === 'strongLifts5x5') {
      setSelectedWorkout('workoutA');
    } else if (program === 'wendler531') {
      setSelectedWorkout('squat');
    }
  };

  const handleWorkoutChange = (workout) => {
    setSelectedWorkout(workout);
  };

  // Periodization panel handlers
  const handleExerciseChange = (newExercise) => {
    setValue('exercise', newExercise);
  };

  const handlePeriodizedWorkoutApply = (periodizedWorkout) => {
    if (periodizedWorkout) {
      setValue('sets', periodizedWorkout.sets);
      setValue('reps', periodizedWorkout.reps);
      setValue('weight', periodizedWorkout.weight);
      
      // Add note about applying periodization
      const currentNotes = watch('notes') || '';
      const periodizationNote = `Applied periodization: ${periodizedWorkout.reasoning}`;
      setValue('notes', currentNotes ? `${currentNotes}\n${periodizationNote}` : periodizationNote);
    }
  };

  // Timer handlers
  const handleTimerData = (timerData) => {
    console.log('🎯 Timer data received in WorkoutForm:', timerData);
    console.log('🎯 Previous timer data was:', workoutTimerData);
    setWorkoutTimerData(timerData);
    // Note: This is just updating timer data, NOT submitting the workout
    // Deload detection should only happen during actual form submission
  };

  const handleWorkoutComplete = (workoutSummary) => {
    // Timer workout is complete, auto-populate any missing data
    if (workoutSummary) {
      setWorkoutTimerData(workoutSummary);
      
      // Add timer summary to notes
      const currentNotes = watch('notes') || '';
      const timerNote = `Timer: ${workoutSummary.setCount} sets in ${Math.round(workoutSummary.totalDuration / 60)}min (${workoutSummary.efficiency}% efficiency)`;
      setValue('notes', currentNotes ? `${currentNotes}\n${timerNote}` : timerNote);
    }
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setSubmitMessage({ type: '', text: '' });

    try {
      // Get fresh timer data at submission time
      let currentTimerData = workoutTimerData;
      if (timerRef.current && timerRef.current.getCurrentTimerData) {
        const freshTimerData = timerRef.current.getCurrentTimerData();
        console.log('🔄 Got fresh timer data from ref:', freshTimerData);
        if (freshTimerData && freshTimerData.totalDuration > 0) {
          currentTimerData = freshTimerData;
        }
      }
      
      // Include progression tracking info, timer data, circle data, and userId
      const completedSetsActual = getCompletedSetsCount();
      const submissionData = {
        ...data,
        sets: completedSetsActual > 0 ? completedSetsActual : data.sets, // Use actual completed sets if any
        userId: 'default-user',  // Add userId to match what the API expects
        progressionApplied: progressionSuggestion?.suggestion && 
          data.sets === progressionSuggestion.suggestion.sets &&
          data.reps === progressionSuggestion.suggestion.reps &&
          data.weight === progressionSuggestion.suggestion.weight,
        notes: (data.notes || '') + (completedSetsActual > 0 ? `\nCompleted ${completedSetsActual}/${watchedSets} sets using circle tracker` : ''),
        // Include timer data if available (with fallback for basic timing)
        ...(currentTimerData && currentTimerData.totalDuration > 0 && {
          totalDuration: currentTimerData.totalDuration,
          workTime: currentTimerData.workTime || 0,
          restTime: currentTimerData.restTime || 0,
          setCount: currentTimerData.setCount || 0,
          avgSetDuration: currentTimerData.avgSetDuration || 0,
          avgRestDuration: currentTimerData.avgRestDuration || 0,
          efficiency: currentTimerData.efficiency || 0,
          startTime: new Date(Date.now() - (currentTimerData.totalDuration * 1000)).toISOString(),
          endTime: new Date().toISOString()
        })
      };

      console.log('💾 Submitting workout data:', submissionData);
      console.log('🎯 State timer data:', workoutTimerData);
      console.log('🎯 Current timer data used:', currentTimerData);
      console.log('🎯 Timer data included in submission:', currentTimerData ? 'YES' : 'NO');
      console.log('🎯 Timer data condition check:', {
        hasCurrentTimerData: !!currentTimerData,
        hasTotalDuration: currentTimerData?.totalDuration > 0,
        conditionPassed: !!(currentTimerData && currentTimerData.totalDuration > 0)
      });

      // Check for PR before submitting
      console.log('🔍 Checking for PR...', submissionData);
      const prResult = await detectPR(submissionData);
      console.log('🎯 PR Detection Result:', prResult);

      // Check for deload before submitting
      console.log('🔄 Checking for deload during FORM SUBMISSION...', {
        current: submissionData,
        recent: recentWorkouts.length,
        callerContext: 'FORM_SUBMISSION'
      });
      
      const deloadResult = detectImmediateDeload(submissionData, recentWorkouts);
      console.log('🔄 Deload Detection Result:', deloadResult);
      
      if (deloadResult.showPrompt && deloadResult.isDeload) {
        // Show deload prompt and pause submission
        const promptData = formatDeloadPrompt(deloadResult);
        if (promptData) {
          console.log('🔄 Showing deload prompt...');
          setDeloadPromptData({
            ...promptData,
            originalSubmissionData: submissionData,
            prResult,
            recentWorkouts
          });
          setShowDeloadPrompt(true);
          setIsSubmitting(false);
          return; // Stop submission to show prompt
        }
      }

      // Temporarily use test endpoint to debug data flow
      console.log('🧪 Using test endpoint to verify data...');
      const testResponse = await axios.post(`${process.env.REACT_APP_API_URL}/test-form-submission`, submissionData);
      console.log('🧪 Test endpoint response:', testResponse.data);
      
      // Also call the real endpoint
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
        setWorkoutTimerData(null); // Clear timer data
        setCompletedSets([]); // Clear set circles
        
        // Check if we're in a template workout and should load next exercise
        if (activeTemplate && currentTemplateIndex < activeTemplate.exercises.length - 1) {
          const nextIndex = currentTemplateIndex + 1;
          const nextExercise = activeTemplate.exercises[nextIndex];
          
          setTimeout(() => {
            setCurrentTemplateIndex(nextIndex);
            setValue('exercise', nextExercise.name);
            setValue('sets', nextExercise.sets);
            setValue('reps', nextExercise.reps.toString().split('-')[0] || '10');
            setValue('weight', 0);
          }, 1500);
        } else if (activeTemplate) {
          // Template completed
          setActiveTemplate(null);
          setCurrentTemplateIndex(0);
          setTimeout(() => {
            setSubmitMessage({ 
              type: 'success', 
              text: `🎉 Template workout "${activeTemplate.name}" completed! All ${activeTemplate.exercises.length} exercises logged.` 
            });
          }, 1500);
        }
        
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

  // Deload prompt handlers
  const handleDeloadAccept = async (selectedOption) => {
    console.log('🔄 User accepted deload option:', selectedOption);
    
    if (!deloadPromptData?.originalSubmissionData) {
      console.error('❌ No original submission data available');
      setShowDeloadPrompt(false);
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Apply the deload option to the workout data
      const deloadedData = {
        ...deloadPromptData.originalSubmissionData,
        sets: selectedOption.sets,
        reps: selectedOption.reps,
        weight: selectedOption.weight,
        notes: (deloadPromptData.originalSubmissionData.notes || '') + 
               `\nDeload applied: ${selectedOption.description} (${selectedOption.weight} lbs)`
      };
      
      console.log('🔄 Submitting workout with deload:', deloadedData);
      
      // Update form values to reflect the deload
      setValue('sets', selectedOption.sets);
      setValue('reps', selectedOption.reps);
      setValue('weight', selectedOption.weight);
      
      // Submit the deloaded workout
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/log-workout`, deloadedData);
      
      if (response.data.success) {
        setSubmitMessage({ 
          type: 'success', 
          text: `Workout logged with ${selectedOption.type} deload! 🔄 Recovery-focused training applied.` 
        });
        
        // Handle PR celebration if it was detected
        if (deloadPromptData.prResult?.isPR) {
          const celebrationData = formatPRForCelebration(deloadPromptData.prResult);
          if (celebrationData) {
            console.log('🎉 Triggering PR celebration:', celebrationData);
            await logPRAchievement(celebrationData);
            celebratePR(celebrationData);
          }
        }
        
        const exerciseToKeep = deloadedData.exercise;
        reset();
        setProgressionSuggestion(null);
        if (onSuccess) onSuccess(response.data);
        
        // Re-fetch data after successful submission
        if (exerciseToKeep && exerciseToKeep !== 'Other') {
          setTimeout(() => {
            setValue('exercise', exerciseToKeep);
            setTimeout(() => {
              fetchLastWorkout(exerciseToKeep);
              if (progressiveOverloadEnabled) {
                setTimeout(() => {
                  fetchProgressionSuggestion(exerciseToKeep);
                }, 500);
              }
            }, 1000);
          }, 2000);
        }
      }
      
      setShowDeloadPrompt(false);
      setDeloadPromptData(null);
      
    } catch (error) {
      console.error('❌ Failed to submit deloaded workout:', error);
      setSubmitMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to log deloaded workout' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeloadDecline = async () => {
    console.log('🔄 User declined deload, proceeding with original workout');
    
    if (!deloadPromptData?.originalSubmissionData) {
      console.error('❌ No original submission data available');
      setShowDeloadPrompt(false);
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Submit the original workout data
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/log-workout`, deloadPromptData.originalSubmissionData);
      
      if (response.data.success) {
        setSubmitMessage({ 
          type: 'success', 
          text: 'Workout logged successfully! 💪 Continuing with your chosen weights.' 
        });
        
        // Handle PR celebration if it was detected
        if (deloadPromptData.prResult?.isPR) {
          const celebrationData = formatPRForCelebration(deloadPromptData.prResult);
          if (celebrationData) {
            console.log('🎉 Triggering PR celebration:', celebrationData);
            await logPRAchievement(celebrationData);
            celebratePR(celebrationData);
          }
        }
        
        const exerciseToKeep = deloadPromptData.originalSubmissionData.exercise;
        reset();
        setProgressionSuggestion(null);
        if (onSuccess) onSuccess(response.data);
        
        // Re-fetch data after successful submission
        if (exerciseToKeep && exerciseToKeep !== 'Other') {
          setTimeout(() => {
            setValue('exercise', exerciseToKeep);
            setTimeout(() => {
              fetchLastWorkout(exerciseToKeep);
              if (progressiveOverloadEnabled) {
                setTimeout(() => {
                  fetchProgressionSuggestion(exerciseToKeep);
                }, 500);
              }
            }, 1000);
          }, 2000);
        }
      }
      
      setShowDeloadPrompt(false);
      setDeloadPromptData(null);
      
    } catch (error) {
      console.error('❌ Failed to submit original workout:', error);
      setSubmitMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to log workout' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeloadClose = () => {
    console.log('🔄 User closed deload prompt');
    setShowDeloadPrompt(false);
    setDeloadPromptData(null);
    setIsSubmitting(false);
  };

  return (
    <div className="bg-blue-primary rounded-xl shadow-lg p-6 sm:p-8 mx-2 sm:mx-0">
      <div className="flex flex-col space-y-6 mb-6 sm:mb-8">
        <h2 className="text-lg sm:text-2xl section-header">Log Workout</h2>
        
        {/* Mobile: Show only essential toggles by default */}
        <div className="flex flex-col space-y-2">
          <div className="flex flex-wrap gap-3 sm:gap-4">
            <label className="flex items-center cursor-pointer bg-blue-600 bg-opacity-30 rounded-xl px-4 py-3 min-h-[52px] shadow-sm">
              <input
                type="checkbox"
                checked={progressiveOverloadEnabled}
                onChange={(e) => setProgressiveOverloadEnabled(e.target.checked)}
                className="mr-3 w-5 h-5"
              />
              <span className="text-sm text-white flex-1">Progressive Overload</span>
            </label>
            
            <label className="flex items-center cursor-pointer bg-blue-600 bg-opacity-30 rounded-xl px-4 py-3 min-h-[52px] shadow-sm">
              <input
                type="checkbox"
                checked={timerEnabled}
                onChange={(e) => setTimerEnabled(e.target.checked)}
                className="mr-3 w-5 h-5"
              />
              <span className="text-sm text-white flex-1">⏱️ Workout Timer</span>
            </label>
          </div>
          
          {/* Collapsible advanced options */}
          <details className="sm:hidden">
            <summary className="text-xs text-blue-200 cursor-pointer py-2">Advanced Options</summary>
            <div className="flex flex-col space-y-3 mt-3">
              <label className="flex items-center cursor-pointer bg-blue-600 bg-opacity-20 rounded-xl px-4 py-3 min-h-[52px] shadow-sm">
                <input
                  type="checkbox"
                  checked={demoMode}
                  onChange={(e) => setDemoMode(e.target.checked)}
                  className="mr-3 w-5 h-5"
                />
                <span className="text-sm text-white flex-1">🎭 Demo Mode</span>
              </label>
              <label className="flex items-center cursor-pointer bg-blue-600 bg-opacity-20 rounded-xl px-4 py-3 min-h-[52px] shadow-sm">
                <input
                  type="checkbox"
                  checked={periodizationEnabled}
                  onChange={(e) => setPeriodizationEnabled(e.target.checked)}
                  className="mr-3 w-5 h-5"
                />
                <span className="text-sm text-white flex-1">📊 Periodization</span>
              </label>
            </div>
          </details>
          
          {/* Desktop: Show all options */}
          <div className="hidden sm:flex sm:flex-col sm:space-y-2">
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
            <label className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={periodizationEnabled}
                onChange={(e) => setPeriodizationEnabled(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm text-white">📊 Periodization</span>
              <span className="ml-1 text-xs text-blue-200">(training phases & rotation)</span>
            </label>
          </div>
          
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

      {/* Workout Mode Selection */}
      <div className="mb-6">
        <div className="bg-blue-600 bg-opacity-20 rounded-xl p-4 mb-4">
          <h3 className="text-base font-semibold text-white mb-3">Workout Mode</h3>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleWorkoutModeChange('freeform')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                workoutMode === 'freeform' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-blue-600 bg-opacity-30 text-blue-100 hover:bg-blue-600 hover:bg-opacity-40'
              }`}
            >
              <div className="text-center">
                <div className="text-lg mb-1">🎯</div>
                <div className="text-sm">Free Form</div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleWorkoutModeChange('program')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                workoutMode === 'program' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-blue-600 bg-opacity-30 text-blue-100 hover:bg-blue-600 hover:bg-opacity-40'
              }`}
            >
              <div className="text-center">
                <div className="text-lg mb-1">📋</div>
                <div className="text-sm">Program</div>
              </div>
            </button>
          </div>
        </div>

        {/* Program Selection */}
        {workoutMode === 'program' && (
          <div className="bg-blue-600 bg-opacity-20 rounded-xl p-4 mb-4">
            <h3 className="text-base font-semibold text-white mb-3">Select Program</h3>
            <select
              value={selectedProgram}
              onChange={(e) => handleProgramChange(e.target.value)}
              className="w-full px-4 py-3 text-base border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-3 focus:ring-blue-400 focus:border-blue-500 text-black bg-white shadow-sm"
            >
              <option value="strongLifts5x5">StrongLifts 5x5</option>
              <option value="wendler531">Wendler 5/3/1</option>
            </select>

            {/* StrongLifts Workout Selection */}
            {selectedProgram === 'strongLifts5x5' && (
              <div className="mt-4">
                <label className="block text-sm font-semibold text-white mb-2">Workout Session</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleWorkoutChange('workoutA')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      selectedWorkout === 'workoutA' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-blue-600 bg-opacity-30 text-blue-100 hover:bg-blue-600 hover:bg-opacity-40'
                    }`}
                  >
                    Workout A
                    <div className="text-xs opacity-75 mt-1">Squat • Bench • Row</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleWorkoutChange('workoutB')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      selectedWorkout === 'workoutB' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-blue-600 bg-opacity-30 text-blue-100 hover:bg-blue-600 hover:bg-opacity-40'
                    }`}
                  >
                    Workout B
                    <div className="text-xs opacity-75 mt-1">Squat • Press • Deadlift</div>
                  </button>
                </div>
              </div>
            )}

            {/* Wendler 5/3/1 Workout Selection */}
            {selectedProgram === 'wendler531' && (
              <div className="mt-4">
                <label className="block text-sm font-semibold text-white mb-2">Workout Session</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleWorkoutChange('squat')}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      selectedWorkout === 'squat' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-blue-600 bg-opacity-30 text-blue-100 hover:bg-blue-600 hover:bg-opacity-40'
                    }`}
                  >
                    Squat Day
                  </button>
                  <button
                    type="button"
                    onClick={() => handleWorkoutChange('bench')}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      selectedWorkout === 'bench' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-blue-600 bg-opacity-30 text-blue-100 hover:bg-blue-600 hover:bg-opacity-40'
                    }`}
                  >
                    Bench Day
                  </button>
                  <button
                    type="button"
                    onClick={() => handleWorkoutChange('deadlift')}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      selectedWorkout === 'deadlift' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-blue-600 bg-opacity-30 text-blue-100 hover:bg-blue-600 hover:bg-opacity-40'
                    }`}
                  >
                    Deadlift Day
                  </button>
                  <button
                    type="button"
                    onClick={() => handleWorkoutChange('overhead')}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                      selectedWorkout === 'overhead' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-blue-600 bg-opacity-30 text-blue-100 hover:bg-blue-600 hover:bg-opacity-40'
                    }`}
                  >
                    Press Day
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Program Pattern Detection Status */}
        {strongLiftsStatus?.patternDetected && workoutMode === 'freeform' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <div className="flex items-start">
              <span className="text-green-600 mr-2">📊</span>
              <div className="text-sm text-green-800">
                <p className="font-medium">StrongLifts Pattern Detected! ({strongLiftsStatus.confidence}% confidence)</p>
                <p className="text-xs mt-1">
                  {strongLiftsStatus.recommendation} 
                  <button
                    type="button"
                    onClick={() => handleWorkoutModeChange('program')}
                    className="ml-2 text-green-600 underline hover:text-green-700"
                  >
                    Switch to Program Mode
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Wendler 5/3/1 Pattern Detection */}
        {wendlerStatus?.patternDetected && workoutMode === 'freeform' && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
            <div className="flex items-start">
              <span className="text-purple-600 mr-2">📊</span>
              <div className="text-sm text-purple-800">
                <p className="font-medium">Wendler 5/3/1 Pattern Detected! ({wendlerStatus.confidence}% confidence)</p>
                <p className="text-xs mt-1">
                  {wendlerStatus.recommendation} 
                  <button
                    type="button"
                    onClick={() => {
                      handleWorkoutModeChange('program');
                      handleProgramChange('wendler531');
                    }}
                    className="ml-2 text-purple-600 underline hover:text-purple-700"
                  >
                    Switch to 5/3/1 Program
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Program Suggestions */}
        {programSuggestion && workoutMode === 'program' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-semibold text-blue-900">
                {programSuggestion.name} - Exercise Suggestions
              </h3>
            </div>
            <div className="space-y-2">
              {programSuggestion.exercises.map((exercise, index) => (
                <div 
                  key={index} 
                  className="flex items-center justify-between bg-white rounded-lg p-3 border border-blue-100"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">{exercise.name}</div>
                    <div className="text-sm text-gray-600">
                      {exercise.sets} sets × {exercise.reps} reps @ {exercise.suggestedWeight} lbs
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      {exercise.progression?.reason || 'Following program progression'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => applyProgramSuggestion(exercise)}
                    className="ml-3 bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700 transition-colors"
                  >
                    Use
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block text-base font-semibold text-white mb-3">
            Exercise
          </label>
          <select
            {...register('exercise', { required: 'Exercise is required' })}
            className="w-full px-5 py-4 text-base border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-3 focus:ring-blue-400 focus:border-blue-500 text-black bg-white shadow-sm"
            style={{ minHeight: '52px' }}
          >
            <option value="">
              {workoutMode === 'program' ? 'Select from program exercises' : 'Select an exercise'}
            </option>
            {getExerciseOptions().map((exercise) => (
              <option key={exercise} value={exercise}>{exercise}</option>
            ))}
          </select>
          {errors.exercise && (
            <p className="mt-1 text-sm text-red-600">{errors.exercise.message}</p>
          )}
        </div>

        {/* Template Selection */}
        {selectedExercise === '' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-green-900">Use Workout Template</h3>
              <button
                type="button"
                onClick={() => setShowTemplates(!showTemplates)}
                className="text-xs bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
              >
                {showTemplates ? 'Hide Templates' : 'Browse Templates'}
              </button>
            </div>
            
            {showTemplates && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-green-700 mb-1">Select Template</label>
                  <select
                    value={selectedTemplate}
                    onChange={(e) => {
                      setSelectedTemplate(e.target.value);
                      setSelectedTemplateWorkout('');
                    }}
                    className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  >
                    <option value="">Choose a workout template...</option>
                    {Object.entries(workoutTemplates).map(([key, template]) => (
                      <option key={key} value={key}>{template.name}</option>
                    ))}
                  </select>
                </div>
                
                {selectedTemplate && (
                  <div>
                    <label className="block text-xs font-medium text-green-700 mb-1">Select Workout</label>
                    <select
                      value={selectedTemplateWorkout}
                      onChange={(e) => setSelectedTemplateWorkout(e.target.value)}
                      className="w-full px-3 py-2 border border-green-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    >
                      <option value="">Choose a workout...</option>
                      {Object.entries(workoutTemplates[selectedTemplate]?.templates || {}).map(([key, workout]) => (
                        <option key={key} value={key}>{workout.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                
                {selectedTemplate && selectedTemplateWorkout && (
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <h4 className="font-medium text-green-800 mb-2">
                      {workoutTemplates[selectedTemplate].templates[selectedTemplateWorkout].name}
                    </h4>
                    <p className="text-xs text-green-700 mb-3">
                      {workoutTemplates[selectedTemplate].templates[selectedTemplateWorkout].description}
                    </p>
                    <div className="space-y-2">
                      {workoutTemplates[selectedTemplate].templates[selectedTemplateWorkout].exercises.map((exercise, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => {
                            setValue('exercise', exercise.name);
                            setValue('sets', exercise.sets);
                            setValue('reps', exercise.reps.toString().split('-')[0] || '10');
                            setValue('weight', 0);
                            setShowTemplates(false);
                            setSelectedTemplate('');
                            setSelectedTemplateWorkout('');
                          }}
                          className="w-full text-left px-3 py-2 bg-green-100 hover:bg-green-200 rounded-md transition-colors text-sm"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-green-800">{exercise.name}</span>
                            <span className="text-xs text-green-600">
                              {exercise.sets} × {exercise.reps} • {exercise.priority}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-green-200">
                      <button
                        type="button"
                        onClick={() => {
                          const workout = workoutTemplates[selectedTemplate].templates[selectedTemplateWorkout];
                          const exercises = workout.exercises;
                          if (exercises.length > 0) {
                            const firstExercise = exercises[0];
                            setActiveTemplate(workout);
                            setCurrentTemplateIndex(0);
                            setValue('exercise', firstExercise.name);
                            setValue('sets', firstExercise.sets);
                            setValue('reps', firstExercise.reps.toString().split('-')[0] || '10');
                            setValue('weight', 0);
                            setShowTemplates(false);
                            setSelectedTemplate('');
                            setSelectedTemplateWorkout('');
                            setSubmitMessage({ 
                              type: 'success', 
                              text: `Started ${workout.name} template! Exercise 1 of ${exercises.length} loaded.` 
                            });
                          }
                        }}
                        className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors text-sm font-medium"
                      >
                        Start Template Workout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

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

        {/* Progressive Overload Suggestion (Free Form Mode) */}
        {progressiveOverloadEnabled && selectedExercise && selectedExercise !== 'Other' && workoutMode === 'freeform' && (
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

        {/* StrongLifts Progression (Program Mode) */}
        {workoutMode === 'program' && selectedProgram === 'strongLifts5x5' && selectedExercise && programSuggestion && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            {(() => {
              const exerciseData = programSuggestion.exercises?.find(ex => ex.name === selectedExercise);
              if (!exerciseData) return null;
              
              return (
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-sm font-semibold text-blue-900">StrongLifts 5x5 Progression:</h3>
                    <button
                      type="button"
                      onClick={() => applyProgramSuggestion(exerciseData)}
                      className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-blue-800">
                      <span className="font-medium">Target:</span> 
                      {exerciseData.sets} sets × {exerciseData.reps} reps @ {exerciseData.suggestedWeight} lbs
                    </p>
                    <p className="text-xs text-blue-700">{exerciseData.progression?.reason}</p>
                    {exerciseData.progression?.lastWorkout && (
                      <p className="text-xs text-blue-600 mt-2">
                        Last workout: {exerciseData.progression.lastWorkout.sets}×{exerciseData.progression.lastWorkout.reps} @ {exerciseData.progression.lastWorkout.weight}lbs
                      </p>
                    )}
                    {exerciseData.progression?.recentFailures > 0 && (
                      <div className="text-xs text-orange-700 mt-1 font-medium">
                        ⚠️ Recent failures: {exerciseData.progression.recentFailures}/3
                        {exerciseData.progression.deloadRecommended && 
                          <span className="text-red-700 ml-2">🔄 Deload recommended</span>
                        }
                      </div>
                    )}
                    <div className="flex items-center mt-2">
                      <span className="text-xs text-blue-700 mr-2">Confidence:</span>
                      <div className="flex space-x-1">
                        {['high', 'medium', 'low'].map((level) => (
                          <div
                            key={level}
                            className={`h-2 w-8 rounded ${
                              exerciseData.progression?.confidence === 'high' && level !== 'low' ? 'bg-blue-600' :
                              exerciseData.progression?.confidence === 'medium' && level === 'high' ? 'bg-blue-600' :
                              exerciseData.progression?.confidence === 'medium' && level === 'medium' ? 'bg-blue-400' :
                              'bg-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="mt-2 p-2 bg-blue-100 border border-blue-200 rounded text-xs">
                      <div className="font-medium text-blue-800 mb-1">📈 StrongLifts Rules:</div>
                      <div className="text-blue-700 space-y-1">
                        <div>• Add weight each workout if you completed all sets</div>
                        <div>• Upper body: +2.5 lbs | Lower body: +5 lbs</div>
                        <div>• If you fail 3 sessions in a row, deload by 10%</div>
                        <div>• Deadlifts are 1×5, all others are 5×5</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Wendler 5/3/1 Progression (Program Mode) */}
        {workoutMode === 'program' && selectedProgram === 'wendler531' && selectedExercise && programSuggestion && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            {(() => {
              const exerciseData = programSuggestion.exercises?.find(ex => ex.name === selectedExercise);
              if (!exerciseData) return null;
              
              return (
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-sm font-semibold text-purple-900">Wendler 5/3/1 Progression:</h3>
                    <button
                      type="button"
                      onClick={() => applyProgramSuggestion(exerciseData)}
                      className="text-xs bg-purple-600 text-white px-3 py-1 rounded hover:bg-purple-700 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                  <div className="space-y-1">
                    {exerciseData.progression?.cycleInfo && (
                      <p className="text-sm text-purple-800 font-medium">
                        Cycle {exerciseData.progression.cycleInfo.cycle}, Week {exerciseData.progression.cycleInfo.week}/4
                        {exerciseData.progression.cycleInfo.isDeloadWeek && 
                          <span className="ml-2 text-orange-600">🔄 Deload Week</span>
                        }
                      </p>
                    )}
                    
                    {exerciseData.progression?.workingSets && exerciseData.progression.workingSets.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm text-purple-800 font-medium">Working Sets:</p>
                        {exerciseData.progression.workingSets.map((set, index) => (
                          <div key={index} className={`text-sm p-2 rounded ${
                            set.isAMRAP ? 'bg-yellow-100 border-l-4 border-yellow-500' : 'bg-purple-100'
                          }`}>
                            <span className="font-medium">
                              Set {index + 1}: {set.reps} @ {set.weight} lbs ({set.percentage}%)
                            </span>
                            {set.isAMRAP && (
                              <div className="text-xs text-yellow-700 mt-1">
                                🎯 AMRAP Set - Go for maximum reps!
                                {exerciseData.progression?.amrapTarget && (
                                  <div className="mt-1">
                                    Target: {exerciseData.progression.amrapTarget.min}+ reps 
                                    | Good: {exerciseData.progression.amrapTarget.good}+ 
                                    | Excellent: {exerciseData.progression.amrapTarget.excellent}+
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-purple-800">
                        <span className="font-medium">Target:</span> 
                        {exerciseData.sets} sets × {exerciseData.reps} reps @ {exerciseData.suggestedWeight} lbs
                      </p>
                    )}
                    
                    <p className="text-xs text-purple-700">{exerciseData.progression?.reason}</p>
                    
                    {exerciseData.progression?.trainingMax && (
                      <p className="text-xs text-purple-600 mt-2">
                        Training Max: {exerciseData.progression.trainingMax} lbs
                        {exerciseData.progression?.nextCycleTrainingMax && 
                          exerciseData.progression.nextCycleTrainingMax !== exerciseData.progression.trainingMax && (
                          <span className="ml-2 text-green-600">
                            → {exerciseData.progression.nextCycleTrainingMax} lbs next cycle
                          </span>
                        )}
                      </p>
                    )}
                    
                    <div className="mt-2 p-2 bg-purple-100 border border-purple-200 rounded text-xs">
                      <div className="font-medium text-purple-800 mb-1">📈 Wendler 5/3/1 Protocol:</div>
                      <div className="text-purple-700 space-y-1">
                        <div>• Week 1: 65%, 75%, 85% for 5+ reps</div>
                        <div>• Week 2: 70%, 80%, 90% for 3+ reps</div>
                        <div>• Week 3: 75%, 85%, 95% for 1+ reps</div>
                        <div>• Week 4: Deload at 40%, 50%, 60%</div>
                        <div>• Beat your AMRAP rep targets each cycle!</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Periodization Panel */}
        {periodizationEnabled && (
          <PeriodizationPanel
            currentExercise={selectedExercise}
            onExerciseChange={handleExerciseChange}
            onPeriodizedWorkoutApply={handlePeriodizedWorkoutApply}
          />
        )}

        {/* Workout Timer */}
        {timerEnabled && (
          <>
            <WorkoutTimer
              ref={timerRef}
              currentExercise={selectedExercise}
              onWorkoutComplete={handleWorkoutComplete}
              onTimerData={handleTimerData}
            />
            {/* Debug: Show timer data status */}
            {workoutTimerData ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
                <div className="text-sm text-green-800">
                  ✅ Timer data available: {workoutTimerData.totalDuration}s total, {workoutTimerData.setCount} sets, {workoutTimerData.efficiency}% efficiency
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-2">
                <div className="text-sm text-yellow-800">
                  ⏳ No timer data yet - start timer and track sets to capture duration data
                </div>
              </div>
            )}
          </>
        )}

        {/* Template Progress Indicator */}
        {activeTemplate && (
          <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">{activeTemplate.name}</h3>
                <p className="text-sm text-green-100">
                  Exercise {currentTemplateIndex + 1} of {activeTemplate.exercises.length}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">
                  {Math.round(((currentTemplateIndex + 1) / activeTemplate.exercises.length) * 100)}%
                </div>
                <div className="text-xs text-green-100">Complete</div>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-3 h-2 bg-white bg-opacity-20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-500"
                style={{ width: `${((currentTemplateIndex + 1) / activeTemplate.exercises.length) * 100}%` }}
              />
            </div>
            
            {/* Upcoming Exercises */}
            {currentTemplateIndex < activeTemplate.exercises.length - 1 && (
              <div className="mt-3 text-xs text-green-100">
                Next: {activeTemplate.exercises[currentTemplateIndex + 1]?.name}
              </div>
            )}
          </div>
        )}

        {/* Set Tracking Circles */}
        {watchedSets > 0 && (
          <div className="bg-blue-600 bg-opacity-20 rounded-xl p-6 mb-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-white mb-2">Track Your Sets</h3>
              {selectedExercise ? (
                <p className="text-sm text-blue-100">
                  Tap circles to mark sets complete • {getCompletedSetsCount()}/{watchedSets} sets completed
                </p>
              ) : (
                <p className="text-sm text-yellow-200">
                  Select an exercise above to start tracking sets
                </p>
              )}
            </div>
            
            {selectedExercise && (
              <div>
                <div className="text-xs text-yellow-300 mb-2">
                  Debug: About to render circles - completedSets: [{completedSets.join(', ')}], length: {completedSets.length}, watchedSets: {watchedSets}
                </div>
                {(() => {
                  // Force initialize completedSets if it's empty but we have watchedSets
                  if (watchedSets > 0 && completedSets.length === 0) {
                    console.log('Force initializing completedSets array');
                    const forceArray = new Array(parseInt(watchedSets)).fill(0);
                    setCompletedSets(forceArray);
                    return <div className="text-blue-300 text-xs">Initializing circles...</div>;
                  }
                  return renderSetCircles();
                })()}
              </div>
            )}
            
            {selectedExercise && getCompletedSetsCount() > 0 && (
              <div className="mt-4 text-center">
                <div className="inline-flex items-center px-4 py-2 bg-blue-600 bg-opacity-40 rounded-lg">
                  <span className="text-sm text-blue-100">
                    {selectedExercise}: {getCompletedSetsCount()} × {watchedReps} @ {watchedWeight}lbs
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div>
            <label className="block text-base font-semibold text-white mb-3">
              Sets
            </label>
            <input
              type="number"
              {...register('sets', { 
                required: 'Sets is required',
                min: { value: 1, message: 'Minimum 1 set' },
                max: { value: 100, message: 'Maximum 100 sets' }
              })}
              className="w-full px-5 py-4 text-base border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-3 focus:ring-blue-400 focus:border-blue-500 text-black bg-white shadow-sm"
              style={{ minHeight: '52px' }}
            />
            {errors.sets && (
              <p className="mt-1 text-sm text-red-600">{errors.sets.message}</p>
            )}
          </div>

          <div>
            <label className="block text-base font-semibold text-white mb-3">
              Reps
            </label>
            <input
              type="number"
              {...register('reps', { 
                required: 'Reps is required',
                min: { value: 1, message: 'Minimum 1 rep' },
                max: { value: 1000, message: 'Maximum 1000 reps' }
              })}
              className="w-full px-5 py-4 text-base border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-3 focus:ring-blue-400 focus:border-blue-500 text-black bg-white shadow-sm"
              style={{ minHeight: '52px' }}
            />
            {errors.reps && (
              <p className="mt-1 text-sm text-red-600">{errors.reps.message}</p>
            )}
          </div>

          <div>
            <label className="block text-base font-semibold text-white mb-3">
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
              className="w-full px-5 py-4 text-base border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-3 focus:ring-blue-400 focus:border-blue-500 text-black bg-white shadow-sm"
              style={{ minHeight: '52px' }}
            />
            {errors.weight && (
              <p className="mt-1 text-sm text-red-600">{errors.weight.message}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-base font-semibold text-white mb-3">
            Date
          </label>
          <input
            type="date"
            {...register('date', { 
              required: 'Date is required',
              validate: value => new Date(value) <= new Date() || 'Date cannot be in the future'
            })}
            className="w-full px-5 py-4 text-base border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-3 focus:ring-blue-400 focus:border-blue-500 text-black bg-white shadow-sm"
            style={{ minHeight: '52px' }}
          />
          {errors.date && (
            <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
          )}
        </div>

        <div>
          <label className="block text-base font-semibold text-white mb-3">
            Notes (optional)
          </label>
          <textarea
            {...register('notes')}
            rows="3"
            className="w-full px-5 py-4 text-base border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-3 focus:ring-blue-400 focus:border-blue-500 text-black bg-white resize-none shadow-sm"
            placeholder="Any additional notes about your workout..."
            style={{ minHeight: '96px' }}
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
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-5 px-8 rounded-xl text-lg transition-all duration-200 focus:outline-none focus:ring-3 focus:ring-blue-400 focus:ring-offset-2 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          style={{ minHeight: '60px' }}
        >
          {isSubmitting ? 'Logging...' : 'Log Workout'}
        </button>
      </form>

      {/* Deload Prompt Modal */}
      <DeloadPrompt
        deloadData={deloadPromptData}
        onAccept={handleDeloadAccept}
        onDecline={handleDeloadDecline}
        onClose={handleDeloadClose}
        isVisible={showDeloadPrompt}
      />
    </div>
  );
};

export default WorkoutForm;