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

// Calculate the next workout targets based on recent performance with hypertrophy optimization
export function calculateNextWorkout(recentWorkouts, exerciseName, customParams = {}) {
  const params = { ...PROGRESSION_PARAMS, ...customParams };
  const exerciseParams = getProgressionParams(exerciseName);
  const mergedParams = { ...params, ...exerciseParams };
  
  // If no workout history, provide intelligent progressive starting suggestions
  if (!recentWorkouts || recentWorkouts.length === 0) {
    const starterSuggestion = getStarterSuggestion(exerciseName);
    return {
      suggestion: starterSuggestion.suggestion,
      reason: starterSuggestion.reason,
      confidence: 'medium',
      isFirstWorkout: true,
      exerciseType: starterSuggestion.exerciseType,
      nextWeekSuggestion: getProgressiveStarterSuggestion(exerciseName, starterSuggestion.suggestion)
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

  // Enhanced analysis with hypertrophy focus
  const performanceAnalysis = analyzeWeeklyProgression(sortedWorkouts, exerciseName);
  const volumeAnalysis = analyzeVolumeProgression(sortedWorkouts);
  const successRate = calculateSuccessRate(sortedWorkouts, mergedParams);
  
  // Generate intelligent progression recommendation
  return generateIntelligentProgression(
    lastSets, lastReps, lastWeight, 
    performanceAnalysis, volumeAnalysis, successRate, 
    mergedParams, exerciseName
  );
}

// Legacy analyze function - kept for backward compatibility but unused in enhanced algorithm
// eslint-disable-next-line no-unused-vars
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

// Legacy progression strategy - kept for backward compatibility but unused in enhanced algorithm
// eslint-disable-next-line no-unused-vars
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

// Get personalized progression parameters optimized for hypertrophy
export function getProgressionParams(exerciseName) {
  const exerciseLower = exerciseName.toLowerCase();
  
  // Compound movements - hypertrophy optimized rep ranges
  if (exerciseLower.includes('squat') || exerciseLower.includes('deadlift') || 
      exerciseLower.includes('bench') || exerciseLower.includes('press')) {
    return {
      ...PROGRESSION_PARAMS,
      weightIncrement: 2.5, // Smaller increments for better progression
      maxRepRange: { low: 6, high: 10 }, // Hypertrophy range for compounds
      strategy: PROGRESSION_STRATEGIES.DOUBLE_PROGRESSION,
      hypertrophyFocus: true,
      basePercentageIncrease: 0.025, // 2.5% weekly increase
      volumeTargetMultiplier: 1.1 // 10% volume increase when needed
    };
  }
  
  // Isolation movements - higher rep ranges for hypertrophy
  if (exerciseLower.includes('curl') || exerciseLower.includes('extension') || 
      exerciseLower.includes('fly') || exerciseLower.includes('raise') ||
      exerciseLower.includes('lateral') || exerciseLower.includes('tricep') ||
      exerciseLower.includes('bicep')) {
    return {
      ...PROGRESSION_PARAMS,
      weightIncrement: 1.25, // Even smaller increments for isolation
      maxRepRange: { low: 10, high: 15 }, // Higher rep hypertrophy range
      strategy: PROGRESSION_STRATEGIES.DOUBLE_PROGRESSION,
      hypertrophyFocus: true,
      basePercentageIncrease: 0.02, // 2% weekly increase
      volumeTargetMultiplier: 1.15 // 15% volume increase when needed
    };
  }
  
  // Bodyweight movements - rep progression with hypertrophy focus
  if (exerciseLower.includes('pull-up') || exerciseLower.includes('push-up') || 
      exerciseLower.includes('dip') || exerciseLower.includes('chin-up')) {
    return {
      ...PROGRESSION_PARAMS,
      weightIncrement: 0,
      repIncrement: 1, // Smaller rep jumps
      maxRepRange: { low: 8, high: 15 }, // Hypertrophy rep range
      strategy: PROGRESSION_STRATEGIES.DOUBLE_PROGRESSION,
      hypertrophyFocus: true,
      basePercentageIncrease: 0.05, // 5% rep increase
      volumeTargetMultiplier: 1.2 // 20% volume increase when needed
    };
  }
  
  // Default hypertrophy-optimized parameters
  return {
    ...PROGRESSION_PARAMS,
    maxRepRange: { low: 8, high: 12 }, // Classic hypertrophy range
    hypertrophyFocus: true,
    basePercentageIncrease: 0.025, // 2.5% weekly increase
    volumeTargetMultiplier: 1.1
  };
}

// Get progressive starter suggestion for next week
function getProgressiveStarterSuggestion(exerciseName, currentSuggestion) {
  const exerciseParams = getProgressionParams(exerciseName);
  
  if (exerciseParams.hypertrophyFocus && currentSuggestion.reps < exerciseParams.maxRepRange.high) {
    // For hypertrophy, progress reps first
    return {
      sets: currentSuggestion.sets,
      reps: Math.min(currentSuggestion.reps + 1, exerciseParams.maxRepRange.high),
      weight: currentSuggestion.weight,
      reason: "Next week: Add 1 rep (hypertrophy progression)"
    };
  } else {
    // Progress weight
    const weightIncrease = exerciseParams.weightIncrement || 2.5;
    return {
      sets: currentSuggestion.sets,
      reps: exerciseParams.maxRepRange.low,
      weight: currentSuggestion.weight + weightIncrease,
      reason: `Next week: Add ${weightIncrease}lbs, reset to ${exerciseParams.maxRepRange.low} reps`
    };
  }
}

// Create mock workout data for testing progressive overload
export function createMockWorkoutHistory(exerciseName, weeks = 4) {
  const mockData = [];
  const startDate = new Date();
  const exerciseParams = getProgressionParams(exerciseName);
  const baseStart = getStarterSuggestion(exerciseName).suggestion;
  
  let currentWeight = baseStart.weight;
  let currentReps = baseStart.reps;
  let currentSets = baseStart.sets;
  
  for (let week = weeks - 1; week >= 0; week--) {
    const workoutDate = new Date(startDate);
    workoutDate.setDate(startDate.getDate() - (week * 7));
    
    // Add some realistic progression patterns
    const weeklyData = [];
    
    // 2-3 workouts per week for this exercise
    const workoutsPerWeek = Math.random() > 0.5 ? 2 : 3;
    
    for (let workout = 0; workout < workoutsPerWeek; workout++) {
      const workoutDate2 = new Date(workoutDate);
      workoutDate2.setDate(workoutDate.getDate() + (workout * 2));
      
      // Simulate progressive overload with some variation
      let workoutReps = currentReps;
      let workoutWeight = currentWeight;
      let workoutSets = currentSets;
      
      // Add some realistic variation (not every workout is perfect)
      if (Math.random() > 0.8) {
        workoutReps = Math.max(exerciseParams.maxRepRange.low, workoutReps - 1);
      }
      
      weeklyData.push({
        date: workoutDate2.toISOString().split('T')[0],
        sets: workoutSets,
        reps: workoutReps,
        weight: workoutWeight,
        volume: workoutSets * workoutReps * workoutWeight
      });
    }
    
    mockData.push(...weeklyData);
    
    // Progress for next week
    if (week > 0) {
      if (exerciseParams.hypertrophyFocus && currentReps < exerciseParams.maxRepRange.high) {
        currentReps += 1;
      } else {
        currentWeight += exerciseParams.weightIncrement || 2.5;
        currentReps = exerciseParams.maxRepRange.low;
      }
    }
  }
  
  return mockData.sort((a, b) => new Date(b.date) - new Date(a.date));
}

// Analyze week-over-week progression patterns
function analyzeWeeklyProgression(sortedWorkouts, exerciseName) {
  if (sortedWorkouts.length < 2) {
    return { trend: 'insufficient_data', weeklyGrowth: 0, consistency: 0 };
  }

  const weeklyData = groupWorkoutsByWeek(sortedWorkouts);
  const weeklyAverages = calculateWeeklyAverages(weeklyData);
  
  if (weeklyAverages.length < 2) {
    return { trend: 'insufficient_data', weeklyGrowth: 0, consistency: 0 };
  }

  const growthRates = [];
  for (let i = 1; i < weeklyAverages.length; i++) {
    const currentWeek = weeklyAverages[i];
    const previousWeek = weeklyAverages[i - 1];
    
    // Calculate percentage growth in total volume
    const volumeGrowth = previousWeek.volume > 0 
      ? (currentWeek.volume - previousWeek.volume) / previousWeek.volume
      : 0;
    
    // Calculate intensity (weight) growth
    const intensityGrowth = previousWeek.avgWeight > 0
      ? (currentWeek.avgWeight - previousWeek.avgWeight) / previousWeek.avgWeight
      : 0;

    growthRates.push({
      week: i,
      volumeGrowth,
      intensityGrowth,
      combinedGrowth: (volumeGrowth + intensityGrowth) / 2
    });
  }

  const avgWeeklyGrowth = growthRates.reduce((sum, g) => sum + g.combinedGrowth, 0) / growthRates.length;
  const consistency = calculateConsistency(growthRates);
  
  let trend = 'stable';
  if (avgWeeklyGrowth > 0.02) trend = 'increasing';
  else if (avgWeeklyGrowth < -0.02) trend = 'decreasing';

  return {
    trend,
    weeklyGrowth: avgWeeklyGrowth,
    consistency,
    growthRates,
    weeklyAverages
  };
}

// Group workouts by week for weekly progression analysis
function groupWorkoutsByWeek(workouts) {
  const weeklyData = {};
  
  workouts.forEach(workout => {
    const date = new Date(workout.date || workout.Date);
    const weekKey = getWeekKey(date);
    
    if (!weeklyData[weekKey]) {
      weeklyData[weekKey] = [];
    }
    
    weeklyData[weekKey].push({
      sets: workout.sets || workout.Sets || 1,
      reps: workout.reps || workout.Reps || 1,
      weight: workout.weight || workout.Weight || 0,
      volume: (workout.sets || workout.Sets || 1) * (workout.reps || workout.Reps || 1) * (workout.weight || workout.Weight || 0)
    });
  });
  
  return weeklyData;
}

function getWeekKey(date) {
  const year = date.getFullYear();
  const week = getWeekNumber(date);
  return `${year}-W${week}`;
}

function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const week1 = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
}

function calculateWeeklyAverages(weeklyData) {
  const weeks = Object.keys(weeklyData).sort();
  
  return weeks.map(weekKey => {
    const weekWorkouts = weeklyData[weekKey];
    const totalVolume = weekWorkouts.reduce((sum, w) => sum + w.volume, 0);
    const avgWeight = weekWorkouts.reduce((sum, w) => sum + w.weight, 0) / weekWorkouts.length;
    const avgSets = weekWorkouts.reduce((sum, w) => sum + w.sets, 0) / weekWorkouts.length;
    const avgReps = weekWorkouts.reduce((sum, w) => sum + w.reps, 0) / weekWorkouts.length;
    
    return {
      week: weekKey,
      workoutCount: weekWorkouts.length,
      volume: totalVolume,
      avgWeight,
      avgSets,
      avgReps
    };
  });
}

function calculateConsistency(growthRates) {
  if (growthRates.length < 2) return 0;
  
  const mean = growthRates.reduce((sum, g) => sum + g.combinedGrowth, 0) / growthRates.length;
  const variance = growthRates.reduce((sum, g) => sum + Math.pow(g.combinedGrowth - mean, 2), 0) / growthRates.length;
  const standardDeviation = Math.sqrt(variance);
  
  // Higher consistency = lower standard deviation (inverted and normalized)
  return Math.max(0, 1 - (standardDeviation * 2));
}

// Analyze volume progression for hypertrophy optimization
function analyzeVolumeProgression(sortedWorkouts) {
  if (sortedWorkouts.length < 3) {
    return { trend: 'insufficient_data', volumeGrowth: 0 };
  }

  const recentVolumes = sortedWorkouts.slice(0, 6).map(w => 
    (w.sets || w.Sets || 1) * (w.reps || w.Reps || 1) * (w.weight || w.Weight || 0)
  );

  const trend = calculateTrendDirection(recentVolumes);
  const volumeGrowth = (recentVolumes[0] - recentVolumes[recentVolumes.length - 1]) / recentVolumes[recentVolumes.length - 1];

  return {
    trend: trend > 0.05 ? 'increasing' : trend < -0.05 ? 'decreasing' : 'stable',
    volumeGrowth,
    recentVolumes
  };
}

function calculateTrendDirection(values) {
  if (values.length < 2) return 0;
  
  const n = values.length;
  const x = Array.from({length: n}, (_, i) => i);
  const y = values;
  
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  return slope / (sumY / n); // Normalize by average value
}

// Calculate success rate based on rep completion in target ranges
function calculateSuccessRate(sortedWorkouts, params) {
  if (sortedWorkouts.length === 0) return 0.5; // Neutral starting point
  
  const targetRange = params.maxRepRange;
  const recentWorkouts = sortedWorkouts.slice(0, Math.min(6, sortedWorkouts.length));
  
  const successfulWorkouts = recentWorkouts.filter(workout => {
    const reps = workout.reps || workout.Reps || 0;
    return reps >= targetRange.low && reps <= targetRange.high;
  }).length;
  
  return successfulWorkouts / recentWorkouts.length;
}

// Generate intelligent progression recommendation based on comprehensive analysis
function generateIntelligentProgression(sets, reps, weight, performanceAnalysis, volumeAnalysis, successRate, params, exerciseName) {
  let suggestion = { sets, reps, weight };
  let reason = '';
  let confidence = 'medium';

  // Base percentage increase from exercise-specific parameters
  const baseIncrease = params.basePercentageIncrease || 0.025;
  
  // Adjust progression based on success rate
  let progressionMultiplier = 1.0;
  if (successRate >= 0.9) {
    progressionMultiplier = 1.2; // Aggressive progression for high success
    confidence = 'high';
  } else if (successRate >= 0.7) {
    progressionMultiplier = 1.0; // Standard progression
    confidence = 'medium';
  } else {
    progressionMultiplier = 0.5; // Conservative progression or focus on volume
    confidence = 'low';
  }

  // Adjust based on weekly progression trend
  if (performanceAnalysis.trend === 'increasing' && performanceAnalysis.consistency > 0.7) {
    progressionMultiplier *= 1.1; // Reward consistent progress
  } else if (performanceAnalysis.trend === 'decreasing') {
    progressionMultiplier *= 0.7; // Slow down progression if declining
  }

  // Calculate intelligent weight progression
  if (params.hypertrophyFocus && reps < params.maxRepRange.high && successRate > 0.8) {
    // Double progression approach - increase reps first in hypertrophy range
    suggestion.reps = Math.min(reps + 1, params.maxRepRange.high);
    reason = `Increase reps to ${suggestion.reps} for hypertrophy (success rate: ${Math.round(successRate * 100)}%)`;
    confidence = 'high';
  } else if (reps >= params.maxRepRange.high || successRate < 0.7) {
    // Increase weight using intelligent percentage-based approach
    const percentageIncrease = baseIncrease * progressionMultiplier;
    const weightIncrease = Math.max(params.weightIncrement || 2.5, weight * percentageIncrease);
    
    suggestion.weight = Math.round((weight + weightIncrease) * 4) / 4; // Round to nearest 0.25
    suggestion.reps = params.maxRepRange.low; // Reset to lower end of range
    
    reason = `Increase weight by ${Math.round(percentageIncrease * 100 * 10) / 10}% (${suggestion.weight - weight}lbs) based on ${Math.round(successRate * 100)}% success rate`;
    confidence = successRate > 0.8 ? 'high' : 'medium';
  } else if (volumeAnalysis.trend === 'decreasing' || successRate < 0.5) {
    // Focus on volume increase or deload
    if (performanceAnalysis.weeklyGrowth < -0.1) {
      // Deload scenario
      suggestion.weight = Math.round(weight * 0.9 * 4) / 4; // 10% deload
      reason = `Deload by 10% due to declining performance (${Math.round(performanceAnalysis.weeklyGrowth * 100)}% weekly decline)`;
      confidence = 'high';
    } else {
      // Volume increase
      suggestion.sets = Math.min(sets + 1, 5); // Cap at 5 sets
      reason = `Add extra set to increase volume (low success rate: ${Math.round(successRate * 100)}%)`;
      confidence = 'medium';
    }
  }

  return {
    suggestion,
    reason,
    confidence,
    strategy: params.strategy,
    status: performanceAnalysis.trend,
    lastWorkout: { sets, reps, weight },
    analysis: {
      successRate: Math.round(successRate * 100),
      weeklyGrowth: Math.round(performanceAnalysis.weeklyGrowth * 100 * 10) / 10,
      volumeTrend: volumeAnalysis.trend,
      progressionMultiplier: Math.round(progressionMultiplier * 100) / 100
    },
    hypertrophyOptimized: true
  };
}

// Format progression suggestion for display
export function formatProgressionSuggestion(progressionData) {
  if (!progressionData || !progressionData.suggestion) {
    return null;
  }

  const { suggestion, reason, confidence, lastWorkout, isFirstWorkout } = progressionData;
  const changes = [];

  // For first workouts, don't show changes since there's no previous workout to compare
  if (isFirstWorkout || !lastWorkout) {
    return {
      changes: [`Starting recommendation: ${suggestion.sets} sets × ${suggestion.reps} reps @ ${suggestion.weight}lbs`],
      reason,
      confidence,
      summary: `Starting with ${suggestion.sets} sets × ${suggestion.reps} reps @ ${suggestion.weight}lbs`
    };
  }

  // For existing workouts, show changes
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

// Get beginner-friendly starting suggestions for first-time exercises
export function getStarterSuggestion(exerciseName) {
  const exerciseLower = exerciseName.toLowerCase();
  
  // Compound movements - conservative starting weights
  if (exerciseLower.includes('bench press')) {
    return {
      suggestion: { sets: 3, reps: 8, weight: 45 }, // Olympic bar weight
      reason: 'Starting with Olympic barbell (45lbs) - focus on form first',
      exerciseType: 'compound'
    };
  }
  
  if (exerciseLower.includes('squat')) {
    return {
      suggestion: { sets: 3, reps: 8, weight: 45 },
      reason: 'Starting with Olympic barbell (45lbs) - master the movement pattern',
      exerciseType: 'compound'
    };
  }
  
  if (exerciseLower.includes('deadlift')) {
    return {
      suggestion: { sets: 3, reps: 5, weight: 95 }, // Bar + 25lb plates (standard gym setup)
      reason: 'Starting with 95lbs (bar + 25lb plates) for proper bar height',
      exerciseType: 'compound'
    };
  }
  
  if (exerciseLower.includes('overhead press') || exerciseLower.includes('shoulder press')) {
    return {
      suggestion: { sets: 3, reps: 8, weight: 25 },
      reason: 'Starting with light weight to develop shoulder stability',
      exerciseType: 'compound'
    };
  }
  
  if (exerciseLower.includes('bent over row') || exerciseLower.includes('barbell row')) {
    return {
      suggestion: { sets: 3, reps: 8, weight: 65 },
      reason: 'Starting with moderate weight to learn proper rowing form',
      exerciseType: 'compound'
    };
  }
  
  // Bodyweight exercises
  if (exerciseLower.includes('pull-up') || exerciseLower.includes('chin-up')) {
    return {
      suggestion: { sets: 3, reps: 5, weight: 0 },
      reason: 'Start with bodyweight - use assistance if needed',
      exerciseType: 'bodyweight'
    };
  }
  
  if (exerciseLower.includes('push-up')) {
    return {
      suggestion: { sets: 3, reps: 10, weight: 0 },
      reason: 'Bodyweight push-ups - modify on knees if needed',
      exerciseType: 'bodyweight'
    };
  }
  
  if (exerciseLower.includes('dip')) {
    return {
      suggestion: { sets: 3, reps: 6, weight: 0 },
      reason: 'Bodyweight dips - use assistance machine if needed',
      exerciseType: 'bodyweight'
    };
  }
  
  // Isolation exercises - lighter starting weights
  if (exerciseLower.includes('curl')) {
    return {
      suggestion: { sets: 3, reps: 12, weight: 15 },
      reason: 'Light weight to focus on bicep muscle connection',
      exerciseType: 'isolation'
    };
  }
  
  if (exerciseLower.includes('extension')) {
    return {
      suggestion: { sets: 3, reps: 12, weight: 15 },
      reason: 'Conservative weight for controlled tricep movement',
      exerciseType: 'isolation'
    };
  }
  
  if (exerciseLower.includes('fly')) {
    return {
      suggestion: { sets: 3, reps: 12, weight: 10 },
      reason: 'Very light weight for chest flies - focus on the stretch',
      exerciseType: 'isolation'
    };
  }
  
  if (exerciseLower.includes('raise')) {
    return {
      suggestion: { sets: 3, reps: 12, weight: 8 },
      reason: 'Light weight for shoulder raises - quality over quantity',
      exerciseType: 'isolation'
    };
  }
  
  if (exerciseLower.includes('leg press')) {
    return {
      suggestion: { sets: 3, reps: 12, weight: 90 },
      reason: 'Starting weight for leg press - machine weight varies by gym',
      exerciseType: 'machine'
    };
  }
  
  if (exerciseLower.includes('lunge')) {
    return {
      suggestion: { sets: 3, reps: 10, weight: 0 },
      reason: 'Start with bodyweight lunges to master balance and form',
      exerciseType: 'bodyweight'
    };
  }
  
  // Default suggestion for unknown exercises
  return {
    suggestion: { sets: 3, reps: 10, weight: 10 },
    reason: 'Conservative starting point - adjust based on your strength level',
    exerciseType: 'general'
  };
}