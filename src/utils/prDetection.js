import axios from 'axios';

/**
 * Calculates estimated 1RM using Brzycki formula
 * 1RM = weight / (1.0278 - 0.0278 × reps)
 */
export const calculateOneRepMax = (weight, reps) => {
  if (reps === 1) return weight;
  if (reps > 30) return weight; // Formula becomes unreliable beyond 30 reps
  
  return Math.round(weight / (1.0278 - 0.0278 * reps));
};

/**
 * Fetches historical workout data for PR comparison
 */
export const fetchWorkoutHistory = async () => {
  try {
    const response = await axios.get(`${process.env.REACT_APP_API_URL}/get-workouts`, {
      params: { userId: 'default-user' }
    });
    
    if (response.data.success && (response.data.workouts || response.data.data)) {
      return response.data.workouts || response.data.data;
    }
    
    return [];
  } catch (error) {
    console.error('Failed to fetch workout history:', error);
    return [];
  }
};

/**
 * Analyzes workout data to find personal records for a specific exercise
 */
export const findExercisePRs = (workoutHistory, targetExercise) => {
  // Filter workouts for the specific exercise
  const exerciseWorkouts = workoutHistory.filter(workout => {
    const exercise = workout.exercise || workout.Exercise || '';
    return exercise.toLowerCase().includes(targetExercise.toLowerCase()) ||
           targetExercise.toLowerCase().includes(exercise.toLowerCase());
  });

  if (exerciseWorkouts.length === 0) {
    return {
      maxWeight: 0,
      maxOneRM: 0,
      bestWorkout: null,
      totalWorkouts: 0,
      improvements: []
    };
  }

  // Calculate 1RM for each workout and find records
  let maxWeight = 0;
  let maxOneRM = 0;
  let bestWorkout = null;
  const improvements = [];

  exerciseWorkouts.forEach(workout => {
    const weight = parseFloat(workout.weight || workout.Weight || 0);
    const reps = parseInt(workout.reps || workout.Reps || 1);
    // const sets = parseInt(workout.sets || workout.Sets || 1); // Not used in current calculation
    
    if (weight > 0) {
      const oneRM = calculateOneRepMax(weight, reps);
      
      // Track raw weight PR
      if (weight > maxWeight) {
        if (maxWeight > 0) {
          improvements.push({
            type: 'weight',
            previousValue: maxWeight,
            newValue: weight,
            improvement: weight - maxWeight,
            date: workout.date || workout.Date,
            workout: workout
          });
        }
        maxWeight = weight;
      }
      
      // Track 1RM PR
      if (oneRM > maxOneRM) {
        if (maxOneRM > 0) {
          improvements.push({
            type: '1rm',
            previousValue: maxOneRM,
            newValue: oneRM,
            improvement: oneRM - maxOneRM,
            date: workout.date || workout.Date,
            workout: workout
          });
        }
        maxOneRM = oneRM;
        bestWorkout = workout;
      }
    }
  });

  return {
    maxWeight,
    maxOneRM,
    bestWorkout,
    totalWorkouts: exerciseWorkouts.length,
    improvements
  };
};

/**
 * Detects if a new workout represents a personal record
 */
export const detectPR = async (newWorkout) => {
  try {
    const workoutHistory = await fetchWorkoutHistory();
    const exercise = newWorkout.exercise || newWorkout.Exercise || '';
    const newWeight = parseFloat(newWorkout.weight || newWorkout.Weight || 0);
    const newReps = parseInt(newWorkout.reps || newWorkout.Reps || 1);
    
    if (!exercise || newWeight <= 0) {
      return { isPR: false, reason: 'Invalid workout data' };
    }

    const exerciseHistory = findExercisePRs(workoutHistory, exercise);
    const newOneRM = calculateOneRepMax(newWeight, newReps);
    
    // Check for different types of PRs
    const prResults = {
      isPR: false,
      isNewPR: exerciseHistory.totalWorkouts === 0,
      types: [],
      data: {
        exercise: exercise,
        weight: newWeight,
        reps: newReps,
        oneRM: newOneRM,
        previousMaxWeight: exerciseHistory.maxWeight,
        previousMaxOneRM: exerciseHistory.maxOneRM,
        improvement: 0,
        oneRMImprovement: 0,
        totalWorkouts: exerciseHistory.totalWorkouts + 1
      }
    };

    // First time doing this exercise
    if (exerciseHistory.totalWorkouts === 0) {
      prResults.isPR = true;
      prResults.types.push('first-time');
      prResults.data.improvement = newWeight;
      prResults.data.oneRMImprovement = newOneRM;
      return prResults;
    }

    // Raw weight PR
    if (newWeight > exerciseHistory.maxWeight) {
      prResults.isPR = true;
      prResults.types.push('weight');
      prResults.data.improvement = newWeight - exerciseHistory.maxWeight;
    }

    // 1RM PR (strength PR accounting for reps)
    if (newOneRM > exerciseHistory.maxOneRM) {
      prResults.isPR = true;
      prResults.types.push('strength');
      prResults.data.oneRMImprovement = newOneRM - exerciseHistory.maxOneRM;
      
      // If it's not already a weight PR, set the improvement based on 1RM
      if (!prResults.types.includes('weight')) {
        prResults.data.improvement = newOneRM - exerciseHistory.maxOneRM;
      }
    }

    // Equal to previous best (tie)
    if (newWeight === exerciseHistory.maxWeight && newOneRM === exerciseHistory.maxOneRM) {
      prResults.isPR = true;
      prResults.types.push('tie');
      prResults.data.improvement = 0;
    }

    return prResults;

  } catch (error) {
    console.error('Error detecting PR:', error);
    return { isPR: false, reason: 'Error analyzing workout data', error };
  }
};

/**
 * Formats PR data for celebration display
 */
export const formatPRForCelebration = (prResult) => {
  if (!prResult.isPR) return null;

  const { data, types, isNewPR } = prResult;
  
  return {
    exercise: data.exercise,
    weight: data.weight,
    reps: data.reps,
    oneRM: data.oneRM,
    improvement: Math.max(data.improvement, data.oneRMImprovement),
    previousPR: isNewPR ? null : data.previousMaxWeight,
    isNewPR: isNewPR,
    prTypes: types,
    totalWorkouts: data.totalWorkouts,
    strengthImprovement: data.oneRMImprovement
  };
};

/**
 * Generates achievement level based on PR improvement
 */
export const getPRLevel = (improvement, exercise, weight) => {
  // Different thresholds for different exercise types
  const exerciseType = getExerciseType(exercise);
  const thresholds = getExerciseThresholds(exerciseType);
  
  if (improvement >= thresholds.legendary) return 'LEGENDARY';
  if (improvement >= thresholds.epic) return 'EPIC';
  if (improvement >= thresholds.rare) return 'RARE';
  if (improvement >= thresholds.uncommon) return 'UNCOMMON';
  return 'COMMON';
};

/**
 * Categorizes exercise type for appropriate PR thresholds
 */
export const getExerciseType = (exercise) => {
  const exerciseLower = exercise.toLowerCase();
  
  if (exerciseLower.includes('deadlift') || exerciseLower.includes('squat')) {
    return 'heavy-compound';
  }
  
  if (exerciseLower.includes('bench') || exerciseLower.includes('press') || 
      exerciseLower.includes('row') || exerciseLower.includes('pull')) {
    return 'medium-compound';
  }
  
  if (exerciseLower.includes('curl') || exerciseLower.includes('extension') ||
      exerciseLower.includes('fly') || exerciseLower.includes('raise')) {
    return 'isolation';
  }
  
  return 'general';
};

/**
 * Returns PR improvement thresholds based on exercise type
 */
export const getExerciseThresholds = (exerciseType) => {
  switch (exerciseType) {
    case 'heavy-compound':
      return { uncommon: 10, rare: 25, epic: 50, legendary: 100 };
    case 'medium-compound':
      return { uncommon: 5, rare: 15, epic: 30, legendary: 60 };
    case 'isolation':
      return { uncommon: 2.5, rare: 5, epic: 10, legendary: 20 };
    default:
      return { uncommon: 5, rare: 10, epic: 25, legendary: 50 };
  }
};

/**
 * Logs PR achievement for tracking and analytics
 */
export const logPRAchievement = async (prData) => {
  try {
    // This would typically save to your database
    // For now, we'll just log to console and localStorage
    const prLog = {
      ...prData,
      timestamp: new Date().toISOString(),
      id: `pr_${Date.now()}`
    };
    
    // Save to localStorage for demo purposes
    const existingPRs = JSON.parse(localStorage.getItem('prAchievements') || '[]');
    existingPRs.push(prLog);
    localStorage.setItem('prAchievements', JSON.stringify(existingPRs));
    
    console.log('PR Achievement Logged:', prLog);
    
    return { success: true, prLog };
  } catch (error) {
    console.error('Failed to log PR achievement:', error);
    return { success: false, error };
  }
};