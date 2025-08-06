// Progressive Overload Helper Module
// Provides automatic workout progression suggestions based on recent performance

export const PROGRESSION_STRATEGIES = {
  LINEAR: 'linear',
  DOUBLE_PROGRESSION: 'double_progression',
  WAVE: 'wave',
  STEP: 'step'
};

export const PROGRESSION_PARAMS = {
  // Default parameters for progressive overload
  minWorkoutsForAnalysis: 3,
  weightIncrement: 2.5, // lbs
  repIncrement: 1,
  setIncrement: 1,
  plateauThreshold: 3, // sessions without progression
  deloadPercentage: 0.85, // 15% reduction
  maxRepRange: { low: 8, high: 12 }, // default rep range
  strategy: PROGRESSION_STRATEGIES.DOUBLE_PROGRESSION // default strategy
};

// Calculate the next workout targets based on recent performance
export function calculateNextWorkout(recentWorkouts, exerciseName, customParams = {}) {
  const params = { ...PROGRESSION_PARAMS, ...customParams };
  
  if (!recentWorkouts || recentWorkouts.length === 0) {
    return {
      suggestion: null,
      reason: 'No workout history available',
      isFirstWorkout: true
    };
  }

  // Sort workouts by date (most recent first)
  const sortedWorkouts = [...recentWorkouts].sort((a, b) => 
    new Date(b.date || b.Date) - new Date(a.date || a.Date)
  );

  const lastWorkout = sortedWorkouts[0];
  const lastSets = lastWorkout.sets || lastWorkout.Sets || 3;
  const lastReps = lastWorkout.reps || lastWorkout.Reps || 10;
  const lastWeight = lastWorkout.weight || lastWorkout.Weight || 0;

  // Not enough history for analysis
  if (sortedWorkouts.length < params.minWorkoutsForAnalysis) {
    return applyProgressionStrategy(lastSets, lastReps, lastWeight, params, 'insufficient_data');
  }

  // Analyze recent performance
  const analysis = analyzeRecentPerformance(sortedWorkouts.slice(0, params.minWorkoutsForAnalysis));
  
  // Apply progression strategy based on analysis
  return applyProgressionStrategy(lastSets, lastReps, lastWeight, params, analysis.status, analysis);
}

// Analyze recent workout performance
function analyzeRecentPerformance(recentWorkouts) {
  const volumes = recentWorkouts.map(w => 
    (w.sets || w.Sets) * (w.reps || w.Reps) * (w.weight || w.Weight || 0)
  );
  
  const weights = recentWorkouts.map(w => w.weight || w.Weight || 0);
  const reps = recentWorkouts.map(w => w.reps || w.Reps || 0);
  
  // Check if weights have been increasing
  const weightProgressing = weights.every((w, i) => i === 0 || w >= weights[i - 1]);
  const weightStagnant = weights.every(w => w === weights[0]);
  
  // Check if reps have been increasing
  const repsProgressing = reps.every((r, i) => i === 0 || r >= reps[i - 1]);
  const repsMaxed = reps[0] >= PROGRESSION_PARAMS.maxRepRange.high;
  
  // Check for plateaus
  const volumeStagnant = volumes.every(v => Math.abs(v - volumes[0]) < volumes[0] * 0.05);
  
  if (weightProgressing && !weightStagnant) {
    return { status: 'progressing_well', type: 'weight' };
  } else if (repsProgressing && !repsMaxed) {
    return { status: 'progressing_well', type: 'reps' };
  } else if (volumeStagnant) {
    return { status: 'plateau', sessionsAtPlateau: recentWorkouts.length };
  } else if (volumes[0] < volumes[volumes.length - 1] * 0.9) {
    return { status: 'regressing' };
  } else {
    return { status: 'maintaining' };
  }
}

// Apply the selected progression strategy
function applyProgressionStrategy(sets, reps, weight, params, status, analysis = {}) {
  const strategy = params.strategy;
  let suggestion = { sets, reps, weight };
  let reason = '';
  let confidence = 'medium';

  switch (strategy) {
    case PROGRESSION_STRATEGIES.DOUBLE_PROGRESSION:
      // Progress reps first, then weight
      if (status === 'progressing_well' || status === 'insufficient_data') {
        if (reps < params.maxRepRange.high) {
          suggestion.reps = Math.min(reps + params.repIncrement, params.maxRepRange.high);
          reason = `Increase reps to ${suggestion.reps} (double progression method)`;
          confidence = 'high';
        } else {
          suggestion.weight = weight + params.weightIncrement;
          suggestion.reps = params.maxRepRange.low;
          reason = `Increase weight to ${suggestion.weight}lbs and reset reps to ${suggestion.reps}`;
          confidence = 'high';
        }
      } else if (status === 'plateau') {
        if (analysis.sessionsAtPlateau >= params.plateauThreshold) {
          suggestion.sets = sets + params.setIncrement;
          reason = `Add an extra set to break through plateau`;
          confidence = 'medium';
        } else {
          reason = `Maintain current load and focus on form`;
          confidence = 'low';
        }
      } else if (status === 'regressing') {
        suggestion.weight = Math.round(weight * params.deloadPercentage);
        reason = `Deload to ${suggestion.weight}lbs for recovery`;
        confidence = 'high';
      }
      break;

    case PROGRESSION_STRATEGIES.LINEAR:
      // Simple linear progression
      if (status !== 'regressing') {
        suggestion.weight = weight + params.weightIncrement;
        reason = `Linear progression: increase weight by ${params.weightIncrement}lbs`;
        confidence = status === 'progressing_well' ? 'high' : 'medium';
      } else {
        suggestion.weight = Math.round(weight * params.deloadPercentage);
        reason = `Deload to ${suggestion.weight}lbs for recovery`;
        confidence = 'high';
      }
      break;

    default:
      reason = 'Maintain current parameters';
      confidence = 'low';
  }

  return {
    suggestion,
    reason,
    confidence,
    strategy,
    status,
    lastWorkout: { sets, reps, weight },
    analysis
  };
}

// Get personalized progression parameters based on exercise type
export function getProgressionParams(exerciseName) {
  const exerciseLower = exerciseName.toLowerCase();
  
  // Compound movements - smaller increments, lower rep ranges
  if (exerciseLower.includes('squat') || exerciseLower.includes('deadlift') || 
      exerciseLower.includes('bench') || exerciseLower.includes('press')) {
    return {
      ...PROGRESSION_PARAMS,
      weightIncrement: 5,
      maxRepRange: { low: 5, high: 8 },
      strategy: PROGRESSION_STRATEGIES.LINEAR
    };
  }
  
  // Isolation movements - higher rep ranges, double progression
  if (exerciseLower.includes('curl') || exerciseLower.includes('extension') || 
      exerciseLower.includes('fly') || exerciseLower.includes('raise')) {
    return {
      ...PROGRESSION_PARAMS,
      weightIncrement: 2.5,
      maxRepRange: { low: 10, high: 15 },
      strategy: PROGRESSION_STRATEGIES.DOUBLE_PROGRESSION
    };
  }
  
  // Bodyweight movements - rep progression
  if (exerciseLower.includes('pull-up') || exerciseLower.includes('push-up') || 
      exerciseLower.includes('dip') || exerciseLower.includes('chin-up')) {
    return {
      ...PROGRESSION_PARAMS,
      weightIncrement: 0,
      repIncrement: 2,
      maxRepRange: { low: 5, high: 20 },
      strategy: PROGRESSION_STRATEGIES.DOUBLE_PROGRESSION
    };
  }
  
  // Default parameters for other exercises
  return PROGRESSION_PARAMS;
}

// Format progression suggestion for display
export function formatProgressionSuggestion(progressionData) {
  if (!progressionData || !progressionData.suggestion) {
    return null;
  }

  const { suggestion, reason, confidence, lastWorkout } = progressionData;
  const changes = [];

  if (suggestion.weight !== lastWorkout.weight) {
    const diff = suggestion.weight - lastWorkout.weight;
    changes.push(`Weight: ${lastWorkout.weight} → ${suggestion.weight}lbs (${diff > 0 ? '+' : ''}${diff})`);
  }

  if (suggestion.reps !== lastWorkout.reps) {
    const diff = suggestion.reps - lastWorkout.reps;
    changes.push(`Reps: ${lastWorkout.reps} → ${suggestion.reps} (${diff > 0 ? '+' : ''}${diff})`);
  }

  if (suggestion.sets !== lastWorkout.sets) {
    const diff = suggestion.sets - lastWorkout.sets;
    changes.push(`Sets: ${lastWorkout.sets} → ${suggestion.sets} (${diff > 0 ? '+' : ''}${diff})`);
  }

  return {
    changes,
    reason,
    confidence,
    summary: changes.length > 0 ? changes.join(', ') : 'Maintain current parameters'
  };
}