/**
 * Exercise Rotation and Periodization Logic for Netlify Functions
 * 
 * This is the server-side version of the rotation logic that can be used
 * in Netlify Functions (Node.js environment)
 */

// Exercise categories and their rotation groups
const EXERCISE_CATEGORIES = {
  CHEST: {
    primary: ['Bench Press', 'Incline Bench Press', 'Decline Bench Press'],
    secondary: ['Dumbbell Press', 'Dumbbell Flyes', 'Push-ups', 'Dips'],
    accessory: ['Cable Flyes', 'Pec Deck', 'Chest Dips']
  },
  BACK: {
    primary: ['Deadlift', 'Bent Over Row', 'Pull-ups'],
    secondary: ['T-Bar Row', 'Lat Pulldown', 'Seated Cable Row'],
    accessory: ['Face Pulls', 'Reverse Flyes', 'Shrugs']
  },
  LEGS: {
    primary: ['Squat', 'Front Squat', 'Romanian Deadlift'],
    secondary: ['Leg Press', 'Bulgarian Split Squat', 'Lunges'],
    accessory: ['Leg Curls', 'Leg Extensions', 'Calf Raises']
  },
  SHOULDERS: {
    primary: ['Overhead Press', 'Push Press'],
    secondary: ['Dumbbell Shoulder Press', 'Arnold Press'],
    accessory: ['Shoulder Raises', 'Lateral Raises', 'Rear Delt Flyes']
  },
  ARMS: {
    primary: ['Close-Grip Bench Press', 'Weighted Dips'],
    secondary: ['Bicep Curls', 'Tricep Extensions', 'Hammer Curls'],
    accessory: ['Cable Curls', 'Overhead Tricep Extension', 'Preacher Curls']
  }
};

// Periodization phase definitions
const PERIODIZATION_PHASES = {
  HYPERTROPHY: {
    name: 'Hypertrophy',
    duration: 4, // weeks
    repRange: [8, 15],
    setRange: [3, 5],
    intensityPercent: [65, 80], // % of 1RM
    restPeriod: [60, 90], // seconds
    description: 'Muscle building phase with moderate weight and high volume'
  },
  STRENGTH: {
    name: 'Strength',
    duration: 4,
    repRange: [3, 6],
    setRange: [3, 5],
    intensityPercent: [80, 95],
    restPeriod: [180, 300],
    description: 'Maximum strength development with heavy weights'
  },
  POWER: {
    name: 'Power',
    duration: 3,
    repRange: [1, 3],
    setRange: [3, 6],
    intensityPercent: [85, 100],
    restPeriod: [180, 360],
    description: 'Peak strength and power with very heavy weights'
  },
  ENDURANCE: {
    name: 'Endurance',
    duration: 3,
    repRange: [15, 25],
    setRange: [2, 4],
    intensityPercent: [50, 70],
    restPeriod: [30, 60],
    description: 'Muscular endurance with light weight and high reps'
  },
  DELOAD: {
    name: 'Deload',
    duration: 1,
    repRange: [8, 12],
    setRange: [2, 3],
    intensityPercent: [50, 65],
    restPeriod: [60, 120],
    description: 'Recovery week with reduced intensity and volume'
  }
};

// Get exercise category for a given exercise
function getExerciseCategory(exercise) {
  for (const [category, exercises] of Object.entries(EXERCISE_CATEGORIES)) {
    const allExercises = [
      ...exercises.primary,
      ...exercises.secondary,
      ...exercises.accessory
    ];
    if (allExercises.includes(exercise)) {
      return {
        category,
        tier: exercises.primary.includes(exercise) ? 'primary' :
              exercises.secondary.includes(exercise) ? 'secondary' : 'accessory'
      };
    }
  }
  return { category: 'OTHER', tier: 'primary' };
}

// Calculate rotation score based on workout history
function calculateRotationScore(exercise, workoutHistory) {
  if (!workoutHistory || workoutHistory.length === 0) {
    return { score: 0, reason: 'No workout history' };
  }

  const exerciseWorkouts = workoutHistory.filter(w => w.exercise === exercise);
  const lastWorkout = exerciseWorkouts[0];
  
  if (!lastWorkout || !lastWorkout.date) {
    return { score: 100, reason: 'Never performed or no date' };
  }

  const daysSinceLastWorkout = Math.floor(
    (new Date() - new Date(lastWorkout.date)) / (1000 * 60 * 60 * 24)
  );

  // Recent workout frequency (last 4 weeks)
  const recentWorkouts = exerciseWorkouts.filter(w => {
    const workoutDate = new Date(w.date);
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    return workoutDate >= fourWeeksAgo;
  }).length;

  // Calculate staleness (higher = more stale)
  let staleness = Math.min(daysSinceLastWorkout * 2, 100);
  
  // Calculate overuse penalty (higher frequency = higher penalty)
  const overusePenalty = Math.max(0, (recentWorkouts - 4) * 15);
  
  // Calculate progression stagnation
  let stagnationPenalty = 0;
  if (exerciseWorkouts.length >= 3) {
    const recent3 = exerciseWorkouts.slice(0, 3);
    const weights = recent3.map(w => parseFloat(w.weight) || 0);
    const hasProgression = weights[0] > weights[2]; // Most recent vs 3rd most recent
    
    if (!hasProgression) {
      stagnationPenalty = 30;
    }
  }

  const finalScore = Math.max(0, staleness - overusePenalty + stagnationPenalty);
  
  return {
    score: Math.round(finalScore),
    reason: `${daysSinceLastWorkout}d ago, ${recentWorkouts} recent workouts`,
    details: {
      daysSince: daysSinceLastWorkout,
      recentFrequency: recentWorkouts,
      staleness,
      overusePenalty,
      stagnationPenalty
    }
  };
}

// Generate exercise rotation suggestions
function generateRotationSuggestions(currentExercise, workoutHistory, options = {}) {
  const {
    maxSuggestions = 3,
    preferSameCategory = true,
    includeAccessoryMovements = false,
    periodizationPhase = null
  } = options;

  const currentCategory = getExerciseCategory(currentExercise);
  const suggestions = [];

  // Get all possible alternatives
  let alternatives = [];
  
  if (preferSameCategory && currentCategory.category !== 'OTHER') {
    const categoryExercises = EXERCISE_CATEGORIES[currentCategory.category];
    alternatives = [
      ...categoryExercises.primary,
      ...categoryExercises.secondary,
      ...(includeAccessoryMovements ? categoryExercises.accessory : [])
    ];
  } else {
    // Include exercises from all categories
    alternatives = Object.values(EXERCISE_CATEGORIES)
      .flatMap(cat => [
        ...cat.primary,
        ...cat.secondary,
        ...(includeAccessoryMovements ? cat.accessory : [])
      ]);
  }

  // Remove current exercise
  alternatives = alternatives.filter(ex => ex !== currentExercise);

  // Calculate rotation scores for each alternative
  const scoredAlternatives = alternatives.map(exercise => {
    const rotationData = calculateRotationScore(exercise, workoutHistory);
    const categoryData = getExerciseCategory(exercise);
    
    // Boost score for same tier exercises
    let tierBonus = 0;
    if (categoryData.tier === currentCategory.tier) {
      tierBonus = 20;
    } else if (categoryData.tier === 'primary' && currentCategory.tier !== 'primary') {
      tierBonus = 10;
    }

    // Phase-specific bonuses
    let phaseBonus = 0;
    if (periodizationPhase && PERIODIZATION_PHASES[periodizationPhase]) {
      const phase = PERIODIZATION_PHASES[periodizationPhase];
      if (phase.name === 'Strength' && categoryData.tier === 'primary') {
        phaseBonus = 15;
      } else if (phase.name === 'Hypertrophy' && categoryData.tier === 'secondary') {
        phaseBonus = 10;
      }
    }

    return {
      exercise,
      score: rotationData.score + tierBonus + phaseBonus,
      category: categoryData.category,
      tier: categoryData.tier,
      reason: rotationData.reason,
      details: rotationData.details,
      bonuses: { tierBonus, phaseBonus }
    };
  });

  // Sort by score (highest first) and return top suggestions
  return scoredAlternatives
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSuggestions)
    .map((item, index) => ({
      ...item,
      rank: index + 1,
      recommendation: index === 0 ? 'Highly Recommended' :
                    index === 1 ? 'Good Alternative' : 'Consider'
    }));
}

// Determine current periodization phase based on workout history
function determineCurrentPhase(workoutHistory, startDate = null) {
  if (!workoutHistory || workoutHistory.length === 0) {
    return {
      phase: 'HYPERTROPHY',
      weekInPhase: 1,
      totalWeeksInPhase: 4,
      nextPhase: 'STRENGTH',
      recommendation: 'Start with hypertrophy phase to build muscle base'
    };
  }

  // If no start date provided, use first workout date
  const phaseStartDate = startDate ? new Date(startDate) : new Date(workoutHistory[workoutHistory.length - 1].date);
  const currentDate = new Date();
  const weeksPassed = Math.floor((currentDate - phaseStartDate) / (7 * 24 * 60 * 60 * 1000));

  // Simple linear periodization cycle: Hypertrophy -> Strength -> Power -> Deload
  const phaseCycle = ['HYPERTROPHY', 'STRENGTH', 'POWER', 'DELOAD'];
  const phaseDurations = [4, 4, 3, 1]; // weeks for each phase
  
  let totalWeeks = 0;
  let currentPhaseIndex = 0;
  
  for (let i = 0; i < phaseCycle.length; i++) {
    const phaseDuration = phaseDurations[i];
    if (weeksPassed < totalWeeks + phaseDuration) {
      currentPhaseIndex = i;
      break;
    }
    totalWeeks += phaseDuration;
  }

  const currentPhase = phaseCycle[currentPhaseIndex];
  const weekInPhase = weeksPassed - totalWeeks + 1;
  const nextPhaseIndex = (currentPhaseIndex + 1) % phaseCycle.length;

  return {
    phase: currentPhase,
    weekInPhase,
    totalWeeksInPhase: phaseDurations[currentPhaseIndex],
    nextPhase: phaseCycle[nextPhaseIndex],
    phaseDescription: PERIODIZATION_PHASES[currentPhase]?.description,
    recommendation: generatePhaseRecommendation(currentPhase, weekInPhase, phaseDurations[currentPhaseIndex])
  };
}

// Generate phase-specific recommendations
function generatePhaseRecommendation(phase, weekInPhase, totalWeeks) {
  const phaseData = PERIODIZATION_PHASES[phase];
  const progressPercent = (weekInPhase / totalWeeks) * 100;

  let recommendation = '';
  
  switch (phase) {
    case 'HYPERTROPHY':
      recommendation = weekInPhase <= 2 
        ? `Focus on muscle building with ${phaseData.repRange[0]}-${phaseData.repRange[1]} reps`
        : `Continue hypertrophy work, consider adding intensity in final weeks`;
      break;
    case 'STRENGTH':
      recommendation = weekInPhase <= 2
        ? `Build maximum strength with ${phaseData.repRange[0]}-${phaseData.repRange[1]} reps at ${phaseData.intensityPercent[0]}%+ intensity`
        : `Push for new strength PRs while maintaining good form`;
      break;
    case 'POWER':
      recommendation = `Peak phase: Focus on ${phaseData.repRange[0]}-${phaseData.repRange[1]} reps at maximum weights`;
      break;
    case 'DELOAD':
      recommendation = `Recovery week: Reduce volume and intensity by 40-50%`;
      break;
    default:
      recommendation = `Follow ${phase.toLowerCase()} training guidelines`;
  }

  return `${recommendation} (Week ${weekInPhase}/${totalWeeks})`;
}

// Generate periodized workout parameters
function generatePeriodizedWorkout(exercise, currentPhase, lastWorkout = null) {
  const phaseData = PERIODIZATION_PHASES[currentPhase];
  if (!phaseData) {
    return null;
  }

  const exerciseCategory = getExerciseCategory(exercise);
  
  // Base parameters from phase
  let sets = Math.round((phaseData.setRange[0] + phaseData.setRange[1]) / 2);
  let reps = Math.round((phaseData.repRange[0] + phaseData.repRange[1]) / 2);
  
  // Adjust for exercise tier
  if (exerciseCategory.tier === 'primary') {
    sets = Math.max(sets, 3); // Primary exercises get at least 3 sets
  } else if (exerciseCategory.tier === 'accessory') {
    sets = Math.min(sets, 3); // Accessory exercises max 3 sets
    reps = Math.min(reps + 2, phaseData.repRange[1]); // Slightly higher reps
  }

  // Calculate weight based on last workout and phase intensity
  let weight = 0;
  if (lastWorkout && lastWorkout.weight) {
    const lastWeight = parseFloat(lastWorkout.weight);
    
    if (currentPhase === 'DELOAD') {
      // Deload: reduce weight significantly
      weight = Math.round(lastWeight * 0.6);
    } else if (currentPhase === 'STRENGTH' || currentPhase === 'POWER') {
      // Strength/Power: increase weight moderately
      weight = Math.round(lastWeight * 1.05);
    } else {
      // Hypertrophy/Endurance: small weight increase or maintain
      weight = Math.round(lastWeight * 1.02);
    }
  }

  return {
    sets,
    reps,
    weight,
    phase: currentPhase,
    phaseDescription: phaseData.description,
    restPeriod: phaseData.restPeriod,
    intensityPercent: phaseData.intensityPercent,
    reasoning: `${phaseData.name} phase: ${sets} sets x ${reps} reps @ ${weight}lbs`
  };
}

// Check if exercise rotation is recommended
function shouldRotateExercise(exercise, workoutHistory, options = {}) {
  const { 
    rotationThreshold = 70,
    forceRotationAfterWeeks = 8,
    considerStagnation = true 
  } = options;

  if (!workoutHistory || workoutHistory.length === 0) {
    return { shouldRotate: false, reason: 'No workout history' };
  }

  const rotationData = calculateRotationScore(exercise, workoutHistory);
  
  // Check forced rotation based on time
  const exerciseWorkouts = workoutHistory.filter(w => w.exercise === exercise);
  if (exerciseWorkouts.length > 0) {
    const firstWorkout = exerciseWorkouts[exerciseWorkouts.length - 1];
    const weeksSinceFirst = Math.floor(
      (new Date() - new Date(firstWorkout.date)) / (7 * 24 * 60 * 60 * 1000)
    );
    
    if (weeksSinceFirst >= forceRotationAfterWeeks) {
      return {
        shouldRotate: true,
        reason: `Forced rotation after ${weeksSinceFirst} weeks`,
        score: 100,
        type: 'TIME_BASED'
      };
    }
  }

  // Check score-based rotation
  if (rotationData.score >= rotationThreshold) {
    return {
      shouldRotate: true,
      reason: rotationData.reason,
      score: rotationData.score,
      type: 'SCORE_BASED'
    };
  }

  return {
    shouldRotate: false,
    reason: `Score ${rotationData.score} below threshold ${rotationThreshold}`,
    score: rotationData.score,
    type: 'NO_ROTATION'
  };
}

module.exports = {
  generateRotationSuggestions,
  calculateRotationScore,
  shouldRotateExercise,
  determineCurrentPhase,
  generatePeriodizedWorkout,
  getExerciseCategory,
  PERIODIZATION_PHASES,
  EXERCISE_CATEGORIES
};