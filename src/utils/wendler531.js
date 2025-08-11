import { workoutTemplates } from './workoutTemplates';

// Wendler 5/3/1 main lifts and their training max progression
export const WENDLER_MAIN_LIFTS = {
  'Squat': { upperBody: false, increment: 10 },
  'Bench Press': { upperBody: true, increment: 5 },
  'Deadlift': { upperBody: false, increment: 10 },
  'Overhead Press': { upperBody: true, increment: 5 }
};

// 5/3/1 percentage schemes for each week
export const WENDLER_PERCENTAGES = {
  week1: [
    { sets: 1, reps: 5, percentage: 0.65, warmup: true },
    { sets: 1, reps: 5, percentage: 0.75, warmup: true },
    { sets: 1, reps: '5+', percentage: 0.85, amrap: true } // AMRAP set
  ],
  week2: [
    { sets: 1, reps: 3, percentage: 0.70, warmup: true },
    { sets: 1, reps: 3, percentage: 0.80, warmup: true },
    { sets: 1, reps: '3+', percentage: 0.90, amrap: true } // AMRAP set
  ],
  week3: [
    { sets: 1, reps: 5, percentage: 0.75, warmup: true },
    { sets: 1, reps: 3, percentage: 0.85, warmup: true },
    { sets: 1, reps: '1+', percentage: 0.95, amrap: true } // AMRAP set
  ],
  week4: [ // Deload week
    { sets: 1, reps: 5, percentage: 0.40, warmup: true },
    { sets: 1, reps: 5, percentage: 0.50, warmup: true },
    { sets: 1, reps: 5, percentage: 0.60, warmup: false }
  ]
};

// Calculate training max (90% of 1RM)
export const calculateTrainingMax = (oneRepMax) => {
  return Math.round(oneRepMax * 0.9);
};

// Get current cycle and week from workout history
export const getCurrentCycleInfo = (workoutHistory, exercise) => {
  if (!workoutHistory || workoutHistory.length === 0) {
    return { cycle: 1, week: 1 };
  }

  // Filter for this exercise and count 5/3/1 workouts
  const exerciseHistory = workoutHistory.filter(w => 
    (w.exercise === exercise || w.Exercise === exercise) &&
    w.notes && (w.notes.includes('5/3/1') || w.notes.includes('Wendler'))
  );

  if (exerciseHistory.length === 0) {
    return { cycle: 1, week: 1 };
  }

  // Estimate current position based on workout count
  const totalWorkouts = exerciseHistory.length;
  const cyclePosition = totalWorkouts % 4; // 4 weeks per cycle
  const week = cyclePosition === 0 ? 4 : cyclePosition;
  const cycle = Math.floor(totalWorkouts / 4) + 1;

  return { cycle, week: week + 1 }; // Next week
};

// Calculate 5/3/1 progression for a specific exercise
export const calculateWendlerProgression = (exercise, workoutHistory, userTrainingMax = null) => {
  const liftConfig = WENDLER_MAIN_LIFTS[exercise];
  
  if (!liftConfig) {
    return {
      suggestion: null,
      reason: `${exercise} is not a main lift in the Wendler 5/3/1 program`,
      confidence: 'low'
    };
  }

  const { cycle, week } = getCurrentCycleInfo(workoutHistory, exercise);
  
  // Determine training max
  let trainingMax;
  if (userTrainingMax) {
    trainingMax = userTrainingMax;
  } else {
    // Try to estimate from recent workouts
    const recentWorkouts = workoutHistory
      .filter(w => (w.exercise === exercise || w.Exercise === exercise))
      .slice(0, 5);
    
    if (recentWorkouts.length > 0) {
      const maxWeight = Math.max(...recentWorkouts.map(w => parseFloat(w.weight || w.Weight || 0)));
      // Conservative estimate: assume recent max was around 85% effort
      trainingMax = calculateTrainingMax(Math.round(maxWeight / 0.85));
    } else {
      // Default starting training max estimates
      const defaultMaxes = {
        'Squat': calculateTrainingMax(225),
        'Bench Press': calculateTrainingMax(185),
        'Deadlift': calculateTrainingMax(275),
        'Overhead Press': calculateTrainingMax(115)
      };
      trainingMax = defaultMaxes[exercise] || calculateTrainingMax(135);
    }
  }

  // Get the percentage scheme for current week
  const weekScheme = WENDLER_PERCENTAGES[`week${Math.min(week, 4)}`];
  
  if (!weekScheme) {
    return {
      suggestion: null,
      reason: 'Invalid week in 5/3/1 cycle',
      confidence: 'low'
    };
  }

  // Calculate working sets
  const workingSets = weekScheme.map(set => ({
    sets: set.sets,
    reps: set.reps,
    weight: Math.round((trainingMax * set.percentage) / 2.5) * 2.5, // Round to nearest 2.5lbs
    percentage: Math.round(set.percentage * 100),
    isAMRAP: set.amrap || false,
    isWarmup: set.warmup || false
  }));

  const mainSet = workingSets[workingSets.length - 1]; // Last set is the main working set

  return {
    suggestion: {
      sets: 3, // Total sets in the workout
      reps: mainSet.reps,
      weight: mainSet.weight
    },
    reason: `Wendler 5/3/1 - Cycle ${cycle}, Week ${week}/${4} - ${mainSet.percentage}% of Training Max`,
    confidence: 'high',
    programSpecific: true,
    cycleInfo: {
      cycle,
      week,
      totalWeeks: 4,
      isDeloadWeek: week === 4
    },
    trainingMax,
    workingSets,
    nextCycleTrainingMax: week === 4 ? trainingMax + liftConfig.increment : trainingMax,
    amrapTarget: getAMRAPTarget(week, mainSet.percentage),
    assistanceWork: getAssistanceWork(exercise)
  };
};

// Get AMRAP (As Many Reps As Possible) targets
const getAMRAPTarget = (week, percentage) => {
  const targets = {
    1: { min: 5, good: 8, excellent: 12 }, // Week 1: 85% x 5+
    2: { min: 3, good: 5, excellent: 8 },  // Week 2: 90% x 3+
    3: { min: 1, good: 3, excellent: 5 }   // Week 3: 95% x 1+
  };
  
  return targets[week] || { min: 1, good: 1, excellent: 1 };
};

// Get assistance work recommendations
const getAssistanceWork = (mainLift) => {
  const assistanceMap = {
    'Squat': {
      push: ['Leg Press', 'Bulgarian Split Squats', 'Walking Lunges'],
      pull: ['Romanian Deadlift', 'Good Mornings'],
      core: ['Plank', 'Dead Bug', 'Pallof Press']
    },
    'Bench Press': {
      push: ['Incline Dumbbell Press', 'Dips', 'Close-Grip Bench Press'],
      pull: ['Bent Over Row', 'Cable Rows', 'Face Pulls'],
      core: ['Plank', 'Russian Twists']
    },
    'Deadlift': {
      push: ['Romanian Deadlift', 'Stiff Leg Deadlift'],
      pull: ['Pull-ups', 'Lat Pulldowns', 'Cable Rows'],
      core: ['Hanging Leg Raises', 'Ab Wheel']
    },
    'Overhead Press': {
      push: ['Incline Press', 'Lateral Raises', 'Front Raises'],
      pull: ['Chin-ups', 'Barbell Rows', 'Rear Delt Flyes'],
      core: ['Plank', 'Side Plank', 'Turkish Get-ups']
    }
  };

  return assistanceMap[mainLift] || {
    push: ['Push-ups', 'Dips'],
    pull: ['Pull-ups', 'Rows'],
    core: ['Plank', 'Crunches']
  };
};

// Get full 5/3/1 workout suggestion
export const getWendlerWorkoutSuggestion = (workoutType, workoutHistory, userTrainingMaxes = {}) => {
  const template = workoutTemplates.wendler531.templates[workoutType];
  
  if (!template) {
    return null;
  }

  const workoutSuggestion = {
    name: template.name,
    description: template.description,
    exercises: []
  };

  template.exercises.forEach(exercise => {
    if (exercise.isMainLift) {
      const progression = calculateWendlerProgression(
        exercise.name, 
        workoutHistory, 
        userTrainingMaxes[exercise.name]
      );
      
      workoutSuggestion.exercises.push({
        ...exercise,
        progression,
        suggestedWeight: progression.suggestion?.weight || 0,
        isMainLift: true
      });
    } else {
      // Assistance exercises - use standard progression
      workoutSuggestion.exercises.push({
        ...exercise,
        suggestedWeight: 0, // User sets their own weight for assistance
        isMainLift: false
      });
    }
  });

  return workoutSuggestion;
};

// Detect if user is following 5/3/1
export const detectWendlerPattern = (workoutHistory) => {
  if (!workoutHistory || workoutHistory.length < 6) {
    return { isFollowing: false, confidence: 0 };
  }

  const recentWorkouts = workoutHistory.slice(0, 12);
  const wendlerLifts = ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press'];
  
  let wendlerWorkouts = 0;
  let totalWorkouts = 0;
  let hasPercentageNotes = 0;

  recentWorkouts.forEach(workout => {
    const exercise = workout.exercise || workout.Exercise || '';
    const notes = workout.notes || workout.Notes || '';
    
    totalWorkouts++;
    
    if (wendlerLifts.includes(exercise)) {
      wendlerWorkouts++;
      
      // Check for 5/3/1 specific notes or percentage work
      if (notes.includes('5/3/1') || notes.includes('Wendler') || 
          notes.includes('%') || notes.includes('AMRAP')) {
        hasPercentageNotes++;
      }
    }
  });

  const liftConfidence = totalWorkouts > 0 ? (wendlerWorkouts / totalWorkouts) : 0;
  const noteConfidence = wendlerWorkouts > 0 ? (hasPercentageNotes / wendlerWorkouts) : 0;
  const overallConfidence = (liftConfidence * 0.7) + (noteConfidence * 0.3);

  return {
    isFollowing: overallConfidence > 0.5,
    confidence: Math.round(overallConfidence * 100),
    recentWendlerWorkouts: wendlerWorkouts,
    totalRecentWorkouts: totalWorkouts
  };
};

// Get next workout in 5/3/1 rotation
export const getNextWendlerWorkout = (workoutHistory) => {
  if (!workoutHistory || workoutHistory.length === 0) {
    return 'squat'; // Start with squat
  }

  const recentWorkout = workoutHistory[0];
  const lastExercise = recentWorkout.exercise || recentWorkout.Exercise || '';
  
  // Rotation: Squat → Bench → Deadlift → Overhead → Squat...
  const rotationMap = {
    'Squat': 'bench',
    'Bench Press': 'deadlift',
    'Deadlift': 'overhead',
    'Overhead Press': 'squat'
  };

  return rotationMap[lastExercise] || 'squat';
};

// Get 5/3/1 program status
export const getWendlerStatus = (workoutHistory) => {
  const pattern = detectWendlerPattern(workoutHistory);
  const nextWorkout = getNextWendlerWorkout(workoutHistory);
  
  if (!pattern.isFollowing) {
    return {
      status: 'not_following',
      recommendation: 'Consider starting Wendler 5/3/1 for structured intermediate/advanced strength training',
      nextWorkout: 'squat',
      confidence: pattern.confidence
    };
  }

  // Analyze recent performance for stalling
  const mainLifts = ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press'];
  let stallingLifts = [];

  mainLifts.forEach(lift => {
    const liftHistory = workoutHistory.filter(w => 
      (w.exercise === lift || w.Exercise === lift)
    ).slice(0, 4); // Last 4 workouts (one cycle)

    if (liftHistory.length >= 3) {
      const weights = liftHistory.map(w => parseFloat(w.weight || w.Weight || 0));
      // Check if training max hasn't increased (weights stagnant)
      const isStalling = Math.max(...weights) === Math.min(...weights) && weights[0] === weights[weights.length - 1];
      
      if (isStalling) {
        stallingLifts.push(lift);
      }
    }
  });

  return {
    status: stallingLifts.length > 0 ? 'stalling' : 'progressing',
    nextWorkout,
    confidence: pattern.confidence,
    stallingLifts,
    recommendation: stallingLifts.length > 0
      ? `Consider deload or training max adjustment for: ${stallingLifts.join(', ')}`
      : 'Great progress on 5/3/1! Focus on beating your AMRAP rep targets'
  };
};

// Format 5/3/1 workout for display
export const formatWendlerWorkout = (workoutType, progression) => {
  const template = workoutTemplates.wendler531.templates[workoutType];
  
  if (!template) return null;

  const mainExercise = template.exercises.find(ex => ex.isMainLift);
  
  if (!mainExercise || !progression) return null;

  return {
    name: template.name,
    description: template.description,
    mainLift: {
      name: mainExercise.name,
      workingSets: progression.workingSets || [],
      trainingMax: progression.trainingMax,
      cycleInfo: progression.cycleInfo,
      amrapTarget: progression.amrapTarget
    },
    assistanceWork: progression.assistanceWork || {}
  };
};