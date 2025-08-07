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

export { calculateOneRM };