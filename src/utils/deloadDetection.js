import { differenceInDays, subDays } from 'date-fns';

/**
 * Detects deloads in workout data
 * A deload is identified when there's a significant reduction in weight, volume, or intensity
 * followed by a period of lighter training
 */

export const detectDeloads = (workoutData, exercise) => {
  // Filter and sort workouts for the specific exercise
  const exerciseWorkouts = workoutData
    .filter(w => (w.exercise || w.Exercise) === exercise)
    .map(w => ({
      date: new Date(w.date || w.Date),
      weight: w.weight || w.Weight || 0,
      sets: w.sets || w.Sets || 0,
      reps: w.reps || w.Reps || 0,
      volume: (w.sets || w.Sets || 0) * (w.reps || w.Reps || 0) * (w.weight || w.Weight || 0),
      oneRM: calculateOneRM(w.weight || w.Weight || 0, w.reps || w.Reps || 1)
    }))
    .sort((a, b) => a.date - b.date);

  if (exerciseWorkouts.length < 6) {
    return []; // Need at least 6 workouts to detect patterns
  }

  const deloads = [];
  
  // Use a sliding window to detect deloads
  for (let i = 3; i < exerciseWorkouts.length - 2; i++) {
    const current = exerciseWorkouts[i];
    const previous = exerciseWorkouts.slice(Math.max(0, i - 3), i); // Last 3 workouts
    const following = exerciseWorkouts.slice(i + 1, Math.min(exerciseWorkouts.length, i + 4)); // Next 3 workouts
    
    // Calculate averages for previous period
    const prevAvgWeight = previous.reduce((sum, w) => sum + w.weight, 0) / previous.length;
    const prevAvgVolume = previous.reduce((sum, w) => sum + w.volume, 0) / previous.length;
    const prevAvgOneRM = previous.reduce((sum, w) => sum + w.oneRM, 0) / previous.length;
    
    // Calculate averages for following period (to confirm return to higher weights)
    const followingAvgWeight = following.length > 0 
      ? following.reduce((sum, w) => sum + w.weight, 0) / following.length 
      : current.weight;
    
    // Deload detection criteria
    const weightDrop = (prevAvgWeight - current.weight) / prevAvgWeight;
    const volumeDrop = (prevAvgVolume - current.volume) / prevAvgVolume;
    const oneRMDrop = (prevAvgOneRM - current.oneRM) / prevAvgOneRM;
    
    // Recovery detection (weight returns to similar or higher levels)
    const recoveryFactor = followingAvgWeight >= (prevAvgWeight * 0.95);
    
    // Identify different types of deloads
    let deloadType = null;
    let severity = 'light';
    
    if (weightDrop >= 0.15 && oneRMDrop >= 0.15) { // 15%+ drop in weight and estimated 1RM
      deloadType = 'intensity';
      severity = weightDrop >= 0.25 ? 'heavy' : 'moderate';
    } else if (volumeDrop >= 0.20) { // 20%+ drop in volume
      deloadType = 'volume';
      severity = volumeDrop >= 0.35 ? 'heavy' : 'moderate';
    } else if (weightDrop >= 0.10 && volumeDrop >= 0.15) { // Combined drop
      deloadType = 'combined';
      severity = (weightDrop + volumeDrop) >= 0.35 ? 'moderate' : 'light';
    }
    
    if (deloadType) {
      const daysSinceLast = deloads.length > 0 
        ? differenceInDays(current.date, deloads[deloads.length - 1].date)
        : null;
      
      // Only add if it's been at least 2 weeks since the last deload
      if (!daysSinceLast || daysSinceLast >= 14) {
        deloads.push({
          date: current.date,
          type: deloadType,
          severity,
          weightDrop: (weightDrop * 100).toFixed(1),
          volumeDrop: (volumeDrop * 100).toFixed(1),
          oneRMDrop: (oneRMDrop * 100).toFixed(1),
          previousWeight: prevAvgWeight.toFixed(1),
          deloadWeight: current.weight,
          previousVolume: prevAvgVolume.toFixed(0),
          deloadVolume: current.volume,
          recovered: recoveryFactor,
          daysSinceLast,
          reasoning: getDeloadReasoning(deloadType, severity, weightDrop, volumeDrop)
        });
      }
    }
  }
  
  return deloads;
};

export const detectAllDeloads = (workoutData) => {
  const exercises = [...new Set(workoutData.map(w => w.exercise || w.Exercise))];
  const allDeloads = {};
  
  exercises.forEach(exercise => {
    const deloads = detectDeloads(workoutData, exercise);
    if (deloads.length > 0) {
      allDeloads[exercise] = deloads;
    }
  });
  
  return allDeloads;
};

export const getRecentDeloads = (workoutData, daysBack = 30) => {
  const cutoffDate = subDays(new Date(), daysBack);
  const allDeloads = detectAllDeloads(workoutData);
  const recentDeloads = {};
  
  Object.entries(allDeloads).forEach(([exercise, deloads]) => {
    const recent = deloads.filter(deload => deload.date >= cutoffDate);
    if (recent.length > 0) {
      recentDeloads[exercise] = recent;
    }
  });
  
  return recentDeloads;
};

export const analyzeDeloadPatterns = (workoutData, exercise) => {
  const deloads = detectDeloads(workoutData, exercise);
  
  if (deloads.length < 2) {
    return {
      frequency: 'insufficient_data',
      averageDaysBetween: null,
      preferredType: null,
      successRate: null,
      recommendations: []
    };
  }
  
  // Calculate frequency
  const daysBetweenDeloads = [];
  for (let i = 1; i < deloads.length; i++) {
    daysBetweenDeloads.push(differenceInDays(deloads[i].date, deloads[i - 1].date));
  }
  
  const averageDaysBetween = daysBetweenDeloads.reduce((sum, days) => sum + days, 0) / daysBetweenDeloads.length;
  const frequency = getFrequencyCategory(averageDaysBetween);
  
  // Most common deload type
  const typeCount = deloads.reduce((acc, deload) => {
    acc[deload.type] = (acc[deload.type] || 0) + 1;
    return acc;
  }, {});
  const preferredType = Object.entries(typeCount).sort(([,a], [,b]) => b - a)[0][0];
  
  // Success rate (percentage that resulted in recovery)
  const recoveredCount = deloads.filter(d => d.recovered).length;
  const successRate = ((recoveredCount / deloads.length) * 100).toFixed(1);
  
  // Generate recommendations
  const recommendations = generateDeloadRecommendations(
    frequency,
    averageDaysBetween,
    preferredType,
    successRate,
    deloads
  );
  
  return {
    frequency,
    averageDaysBetween: Math.round(averageDaysBetween),
    preferredType,
    successRate: parseFloat(successRate),
    totalDeloads: deloads.length,
    recommendations,
    recentDeload: deloads[deloads.length - 1] || null
  };
};

// Helper functions
const calculateOneRM = (weight, reps) => {
  if (reps === 1) return weight;
  // Brzycki formula: 1RM = weight × (36 / (37 - reps))
  return Math.round(weight * (36 / (37 - reps)));
};

const getDeloadReasoning = (type, severity, weightDrop, volumeDrop) => {
  const reasons = [];
  
  if (type === 'intensity') {
    reasons.push(`${severity} intensity deload with ${(weightDrop * 100).toFixed(1)}% weight reduction`);
  } else if (type === 'volume') {
    reasons.push(`${severity} volume deload with ${(volumeDrop * 100).toFixed(1)}% volume reduction`);
  } else if (type === 'combined') {
    reasons.push(`${severity} combined deload affecting both weight and volume`);
  }
  
  return reasons.join(', ');
};

const getFrequencyCategory = (averageDays) => {
  if (averageDays < 21) return 'very_frequent';
  if (averageDays < 35) return 'frequent';
  if (averageDays < 56) return 'regular';
  if (averageDays < 84) return 'infrequent';
  return 'rare';
};

const generateDeloadRecommendations = (frequency, averageDays, preferredType, successRate, deloads) => {
  const recommendations = [];
  const lastDeload = deloads[deloads.length - 1];
  const daysSinceLastDeload = differenceInDays(new Date(), lastDeload.date);
  
  // Frequency recommendations
  if (frequency === 'very_frequent') {
    recommendations.push({
      type: 'warning',
      message: `You're deloading very frequently (every ${averageDays} days). Consider longer progressive phases before deloading.`,
      priority: 'high'
    });
  } else if (frequency === 'rare') {
    recommendations.push({
      type: 'tip',
      message: 'You rarely deload. Consider planned deloads every 4-6 weeks to prevent overreaching.',
      priority: 'medium'
    });
  }
  
  // Success rate recommendations
  if (successRate < 70) {
    recommendations.push({
      type: 'improvement',
      message: `Your deload recovery rate is ${successRate}%. Try extending deload duration or reducing intensity further.`,
      priority: 'high'
    });
  } else if (successRate > 90) {
    recommendations.push({
      type: 'success',
      message: `Excellent deload recovery rate (${successRate}%). Your current deload strategy is working well.`,
      priority: 'low'
    });
  }
  
  // Timing recommendations
  if (daysSinceLastDeload > averageDays + 14) {
    recommendations.push({
      type: 'timing',
      message: `It's been ${daysSinceLastDeload} days since your last deload. Based on your pattern, consider a deload soon.`,
      priority: 'medium'
    });
  }
  
  // Type-specific recommendations
  if (preferredType === 'intensity') {
    recommendations.push({
      type: 'strategy',
      message: 'You typically deload by reducing weight. Consider maintaining rep ranges while dropping intensity.',
      priority: 'low'
    });
  } else if (preferredType === 'volume') {
    recommendations.push({
      type: 'strategy',
      message: 'You typically deload by reducing volume. This is great for maintaining strength while allowing recovery.',
      priority: 'low'
    });
  }
  
  return recommendations;
};

// New functions for real-time deload detection and prompting

/**
 * Detects if current workout represents a performance decrease that may warrant a deload
 * @param {Object} currentWorkout - The workout being logged
 * @param {Array} recentWorkouts - Recent workouts for the same exercise (sorted by date desc)
 * @returns {Object} Deload detection result with suggestions
 */
export function detectImmediateDeload(currentWorkout, recentWorkouts) {
  if (!recentWorkouts || recentWorkouts.length === 0) {
    return {
      isDeload: false,
      reason: 'No workout history available for comparison',
      showPrompt: false
    };
  }

  // Get the most recent workout for comparison
  const lastWorkout = recentWorkouts[0];
  
  // Calculate performance changes
  const weightDecrease = parseFloat(currentWorkout.weight) < parseFloat(lastWorkout.weight || lastWorkout.Weight || 0);
  const repsDecrease = parseInt(currentWorkout.reps) < parseInt(lastWorkout.reps || lastWorkout.Reps || 0);
  const setsDecrease = parseInt(currentWorkout.sets) < parseInt(lastWorkout.sets || lastWorkout.Sets || 0);
  
  // Calculate volume changes
  const currentVolume = parseInt(currentWorkout.sets) * parseInt(currentWorkout.reps) * parseFloat(currentWorkout.weight);
  const lastVolume = parseInt(lastWorkout.sets || lastWorkout.Sets || 0) * 
                    parseInt(lastWorkout.reps || lastWorkout.Reps || 0) * 
                    parseFloat(lastWorkout.weight || lastWorkout.Weight || 0);
  
  const volumeDecreasePercent = lastVolume > 0 ? ((lastVolume - currentVolume) / lastVolume) * 100 : 0;
  
  // Determine if this qualifies for a deload prompt
  const decreaseIndicators = [];
  
  if (weightDecrease) {
    const weightDiff = parseFloat(lastWorkout.weight || lastWorkout.Weight || 0) - parseFloat(currentWorkout.weight);
    decreaseIndicators.push({
      type: 'weight',
      message: `Weight decreased by ${weightDiff} lbs`,
      from: parseFloat(lastWorkout.weight || lastWorkout.Weight || 0),
      to: parseFloat(currentWorkout.weight)
    });
  }
  
  if (repsDecrease) {
    const repDiff = parseInt(lastWorkout.reps || lastWorkout.Reps || 0) - parseInt(currentWorkout.reps);
    decreaseIndicators.push({
      type: 'reps',
      message: `Reps decreased by ${repDiff}`,
      from: parseInt(lastWorkout.reps || lastWorkout.Reps || 0),
      to: parseInt(currentWorkout.reps)
    });
  }
  
  if (setsDecrease) {
    const setDiff = parseInt(lastWorkout.sets || lastWorkout.Sets || 0) - parseInt(currentWorkout.sets);
    decreaseIndicators.push({
      type: 'sets',
      message: `Sets decreased by ${setDiff}`,
      from: parseInt(lastWorkout.sets || lastWorkout.Sets || 0),
      to: parseInt(currentWorkout.sets)
    });
  }
  
  // Only show deload prompt if there's a meaningful decrease
  const showPrompt = decreaseIndicators.length > 0 || volumeDecreasePercent > 10;
  
  if (!showPrompt) {
    return {
      isDeload: false,
      reason: 'Performance maintained or improved',
      showPrompt: false
    };
  }

  // Calculate suggested deload options
  const recentPeakWeight = Math.max(...recentWorkouts.slice(0, 5).map(w => parseFloat(w.weight || w.Weight || 0)));
  const currentWeight = parseFloat(currentWorkout.weight);
  
  const deloadOptions = [
    {
      type: 'light',
      weight: Math.max(Math.round((recentPeakWeight * 0.9) * 2) / 2, currentWeight - 10),
      percentage: 10,
      description: 'Light deload - reduce weight by 10%',
      sets: parseInt(lastWorkout.sets || lastWorkout.Sets || 3),
      reps: parseInt(lastWorkout.reps || lastWorkout.Reps || 10)
    },
    {
      type: 'moderate',
      weight: Math.max(Math.round((recentPeakWeight * 0.85) * 2) / 2, currentWeight - 15),
      percentage: 15,
      description: 'Moderate deload - reduce weight by 15%',
      sets: Math.max(parseInt(lastWorkout.sets || lastWorkout.Sets || 3) - 1, 2),
      reps: parseInt(lastWorkout.reps || lastWorkout.Reps || 10)
    },
    {
      type: 'full',
      weight: Math.max(Math.round((recentPeakWeight * 0.8) * 2) / 2, currentWeight - 20),
      percentage: 20,
      description: 'Full deload - reduce weight by 20%',
      sets: Math.max(parseInt(lastWorkout.sets || lastWorkout.Sets || 3) - 1, 2),
      reps: Math.max(parseInt(lastWorkout.reps || lastWorkout.Reps || 10) - 2, 6)
    }
  ].filter(option => option.weight > 0 && option.weight < currentWeight); // Only show options that are reductions

  return {
    isDeload: true,
    showPrompt: true,
    indicators: decreaseIndicators,
    volumeChange: {
      previous: Math.round(lastVolume),
      current: Math.round(currentVolume),
      decreasePercent: Math.round(volumeDecreasePercent)
    },
    lastWorkout: {
      weight: parseFloat(lastWorkout.weight || lastWorkout.Weight || 0),
      sets: parseInt(lastWorkout.sets || lastWorkout.Sets || 0),
      reps: parseInt(lastWorkout.reps || lastWorkout.Reps || 0),
      date: lastWorkout.date || lastWorkout.Date
    },
    currentWorkout: {
      weight: parseFloat(currentWorkout.weight),
      sets: parseInt(currentWorkout.sets),
      reps: parseInt(currentWorkout.reps)
    },
    recentPeakWeight,
    deloadOptions,
    reasoning: `Performance decreased compared to last workout: ${decreaseIndicators.map(i => i.message).join(', ')}`
  };
}

/**
 * Get formatted deload prompt data for UI display
 */
export function formatDeloadPrompt(deloadData) {
  if (!deloadData.showPrompt) {
    return null;
  }

  const { lastWorkout, currentWorkout, deloadOptions, indicators, volumeChange } = deloadData;
  
  return {
    title: '🔄 Deload Detected',
    message: 'Your performance decreased compared to your last workout. Would you like to adjust your training load?',
    comparison: {
      last: `${lastWorkout.sets} sets × ${lastWorkout.reps} reps @ ${lastWorkout.weight} lbs`,
      current: `${currentWorkout.sets} sets × ${currentWorkout.reps} reps @ ${currentWorkout.weight} lbs`,
      changes: indicators
    },
    volumeImpact: volumeChange.decreasePercent > 0 ? 
      `Training volume decreased by ${volumeChange.decreasePercent}%` : null,
    options: deloadOptions.map(option => ({
      ...option,
      preview: `${option.sets} sets × ${option.reps} reps @ ${option.weight} lbs`,
      benefits: getDeloadBenefits(option.type)
    })),
    recommendations: getDeloadRecommendations(deloadOptions.length > 0 ? 'suggested' : 'maintain')
  };
}

function getDeloadBenefits(deloadType) {
  const benefits = {
    light: ['Maintain movement pattern', 'Reduce fatigue', 'Build confidence'],
    moderate: ['Promote recovery', 'Reset progression', 'Improve technique'],
    full: ['Complete recovery', 'Prevent overreaching', 'Long-term gains']
  };
  
  return benefits[deloadType] || [];
}

function getDeloadRecommendations(situation) {
  const recommendations = {
    suggested: [
      'Choose a deload option that feels sustainable',
      'Focus on perfect form during deload weeks',
      'Listen to your body and adjust as needed',
      'Return to regular progression after 1-2 weeks'
    ],
    maintain: [
      'Current workout is similar to previous - no deload needed',
      'Continue with progressive overload',
      'Monitor for signs of fatigue in coming workouts'
    ]
  };
  
  return recommendations[situation] || [];
}

export { calculateOneRM };