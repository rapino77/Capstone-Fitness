import { workoutTemplates } from './workoutTemplates';

// StrongLifts 5x5 starting weights (in lbs)
export const STRONGLIFTS_STARTING_WEIGHTS = {
  'Squat': 45,
  'Bench Press': 45,
  'Barbell Rows': 65,
  'Overhead Press': 45,
  'Deadlift': 95
};

// StrongLifts 5x5 progression increments (in lbs)
export const STRONGLIFTS_INCREMENTS = {
  'Squat': 5,
  'Bench Press': 2.5,
  'Barbell Rows': 2.5,
  'Overhead Press': 2.5,
  'Deadlift': 5
};

// Get the next workout in the StrongLifts sequence
export const getNextStrongLiftsWorkout = (workoutHistory) => {
  if (!workoutHistory || workoutHistory.length === 0) {
    return 'workoutA'; // Start with Workout A
  }

  // Get the most recent StrongLifts workout
  const recentWorkout = workoutHistory[0];
  
  // Simple alternation: if last was A, next is B, and vice versa
  // In a real implementation, you might want to track this more precisely
  const lastWorkoutExercises = recentWorkout.exercise || recentWorkout.Exercise || '';
  
  // Check if the last workout contained exercises from Workout A or B
  if (lastWorkoutExercises.includes('Bench Press') || lastWorkoutExercises.includes('Barbell Rows')) {
    return 'workoutB'; // Last was A, next is B
  } else if (lastWorkoutExercises.includes('Overhead Press') || lastWorkoutExercises.includes('Deadlift')) {
    return 'workoutA'; // Last was B, next is A
  }
  
  // Default to A if we can't determine
  return 'workoutA';
};

// Calculate StrongLifts progression for a specific exercise
export const calculateStrongLiftsProgression = (exercise, workoutHistory) => {
  const startingWeight = STRONGLIFTS_STARTING_WEIGHTS[exercise];
  const increment = STRONGLIFTS_INCREMENTS[exercise];
  
  if (!startingWeight) {
    return {
      suggestion: null,
      reason: `${exercise} is not part of the StrongLifts 5x5 program`,
      confidence: 'low'
    };
  }

  // Filter workout history for this specific exercise
  const exerciseHistory = workoutHistory.filter(w => 
    (w.exercise === exercise || w.Exercise === exercise) &&
    (w.sets === 5 || w.Sets === 5) && 
    (w.reps === 5 || w.Reps === 5)
  ).sort((a, b) => new Date(b.date || b.Date) - new Date(a.date || a.Date));

  if (exerciseHistory.length === 0) {
    // First time doing this exercise in StrongLifts format
    return {
      suggestion: {
        sets: exercise === 'Deadlift' ? 1 : 5,
        reps: 5,
        weight: startingWeight
      },
      reason: `Starting StrongLifts 5x5 with recommended beginning weight for ${exercise}`,
      confidence: 'high',
      isFirstWorkout: true,
      programSpecific: true,
      nextWeekSuggestion: {
        sets: exercise === 'Deadlift' ? 1 : 5,
        reps: 5,
        weight: startingWeight + increment,
        reason: `Linear progression: add ${increment} lbs each workout`
      }
    };
  }

  const lastWorkout = exerciseHistory[0];
  const lastWeight = parseFloat(lastWorkout.weight || lastWorkout.Weight || 0);
  
  // Check for failed attempts (didn't complete 5x5)
  const recentFailures = exerciseHistory.slice(0, 3).filter(w => {
    const actualSets = parseInt(w.sets || w.Sets || 0);
    const actualReps = parseInt(w.reps || w.Reps || 0);
    const targetSets = exercise === 'Deadlift' ? 1 : 5;
    
    // Consider it a failure if they didn't hit the target sets x reps
    return actualSets < targetSets || actualReps < 5;
  });

  let nextWeight = lastWeight;
  let reason = '';
  let confidence = 'high';

  if (recentFailures.length >= 3) {
    // Deload: reduce weight by 10%
    nextWeight = Math.max(startingWeight, Math.round(lastWeight * 0.9 / 2.5) * 2.5);
    reason = `Deload protocol: 3 failed attempts detected. Reducing weight by 10% to focus on form and build back up`;
    confidence = 'high';
  } else if (recentFailures.length > 0) {
    // Recent failure but less than 3 - try same weight
    nextWeight = lastWeight;
    reason = `Recent failure detected. Repeat current weight and focus on completing all 5x5`;
    confidence = 'medium';
  } else {
    // Successful last workout - linear progression
    nextWeight = lastWeight + increment;
    reason = `Linear progression: adding ${increment} lbs from last successful workout`;
    confidence = 'high';
  }

  return {
    suggestion: {
      sets: exercise === 'Deadlift' ? 1 : 5,
      reps: 5,
      weight: nextWeight
    },
    reason,
    confidence,
    programSpecific: true,
    lastWorkout: {
      sets: lastWorkout.sets || lastWorkout.Sets,
      reps: lastWorkout.reps || lastWorkout.Reps,
      weight: lastWeight,
      date: lastWorkout.date || lastWorkout.Date
    },
    recentFailures: recentFailures.length,
    deloadRecommended: recentFailures.length >= 3
  };
};

// Get full StrongLifts workout suggestion
export const getStrongLiftsWorkoutSuggestion = (workoutType, workoutHistory) => {
  const template = workoutTemplates.strongLifts5x5.templates[workoutType];
  
  if (!template) {
    return null;
  }

  const workoutSuggestion = {
    name: template.name,
    description: template.description,
    exercises: []
  };

  template.exercises.forEach(exercise => {
    const progression = calculateStrongLiftsProgression(exercise.name, workoutHistory);
    
    workoutSuggestion.exercises.push({
      ...exercise,
      progression,
      suggestedWeight: progression.suggestion?.weight || STRONGLIFTS_STARTING_WEIGHTS[exercise.name] || 0
    });
  });

  return workoutSuggestion;
};

// Detect if user is currently following StrongLifts 5x5
export const detectStrongLiftsPattern = (workoutHistory) => {
  if (!workoutHistory || workoutHistory.length < 3) {
    return { isFollowing: false, confidence: 0 };
  }

  const recentWorkouts = workoutHistory.slice(0, 6); // Look at last 6 workouts
  const strongLiftsExercises = ['Squat', 'Bench Press', 'Barbell Rows', 'Overhead Press', 'Deadlift'];
  
  let strongLiftsWorkouts = 0;
  let totalWorkouts = 0;

  recentWorkouts.forEach(workout => {
    const exercise = workout.exercise || workout.Exercise || '';
    const sets = parseInt(workout.sets || workout.Sets || 0);
    const reps = parseInt(workout.reps || workout.Reps || 0);
    
    totalWorkouts++;
    
    if (strongLiftsExercises.includes(exercise) && sets >= 4 && reps === 5) {
      strongLiftsWorkouts++;
    }
  });

  const confidence = totalWorkouts > 0 ? (strongLiftsWorkouts / totalWorkouts) : 0;

  return {
    isFollowing: confidence > 0.6, // 60% threshold
    confidence: Math.round(confidence * 100),
    recentStrongLiftsWorkouts: strongLiftsWorkouts,
    totalRecentWorkouts: totalWorkouts
  };
};

// Get StrongLifts program status and recommendations
export const getStrongLiftsStatus = (workoutHistory) => {
  const pattern = detectStrongLiftsPattern(workoutHistory);
  const nextWorkout = getNextStrongLiftsWorkout(workoutHistory);
  
  if (!pattern.isFollowing) {
    return {
      status: 'not_following',
      recommendation: 'Consider starting StrongLifts 5x5 for structured strength training',
      nextWorkout: 'workoutA',
      confidence: pattern.confidence
    };
  }

  // Analyze recent performance
  const strongLiftsExercises = ['Squat', 'Bench Press', 'Barbell Rows', 'Overhead Press', 'Deadlift'];
  let stalling = false;
  let stallingExercises = [];

  strongLiftsExercises.forEach(exercise => {
    const exerciseHistory = workoutHistory.filter(w => 
      (w.exercise === exercise || w.Exercise === exercise)
    ).slice(0, 3);

    if (exerciseHistory.length >= 3) {
      const weights = exerciseHistory.map(w => parseFloat(w.weight || w.Weight || 0));
      // Check if weight hasn't increased in last 3 workouts
      if (weights[0] === weights[1] && weights[1] === weights[2]) {
        stalling = true;
        stallingExercises.push(exercise);
      }
    }
  });

  return {
    status: stalling ? 'stalling' : 'progressing',
    nextWorkout,
    confidence: pattern.confidence,
    stallingExercises,
    recommendation: stalling 
      ? `Stalling detected on ${stallingExercises.join(', ')}. Consider deload or form check`
      : 'Great progress on StrongLifts 5x5! Keep following the program'
  };
};

// Helper function to format StrongLifts workout for display
export const formatStrongLiftsWorkout = (workoutType, progressions) => {
  const template = workoutTemplates.strongLifts5x5.templates[workoutType];
  
  if (!template) return null;

  return {
    name: template.name,
    description: template.description,
    exercises: template.exercises.map(exercise => {
      const progression = progressions?.[exercise.name];
      
      return {
        name: exercise.name,
        sets: exercise.sets,
        reps: exercise.reps,
        suggestedWeight: progression?.suggestion?.weight || STRONGLIFTS_STARTING_WEIGHTS[exercise.name],
        reason: progression?.reason || 'Starting weight',
        confidence: progression?.confidence || 'medium'
      };
    })
  };
};