const Airtable = require('airtable');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    if (!process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN) {
      throw new Error('AIRTABLE_PERSONAL_ACCESS_TOKEN environment variable is not set');
    }
    if (!process.env.AIRTABLE_BASE_ID) {
      throw new Error('AIRTABLE_BASE_ID environment variable is not set');
    }

    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    const params = event.queryStringParameters || {};
    const {
      userId = 'default-user',
      exercise,
      timeframe = '90', // days
      minWorkouts = '3' // minimum workouts needed for analysis
    } = params;

    const analysis = await calculateProgressiveOverload(
      base, 
      userId, 
      exercise, 
      parseInt(timeframe),
      parseInt(minWorkouts)
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: analysis,
        timeframe: parseInt(timeframe),
        generatedAt: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Progressive Overload API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message
      })
    };
  }
};

async function calculateProgressiveOverload(base, userId, exercise, timeframeDays, minWorkouts) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeframeDays);
  const dateFilter = startDate.toISOString().split('T')[0];

  // Build filter formula
  let filterFormula = `AND({User ID} = '${userId}', IS_AFTER({Date}, '${dateFilter}'))`;
  if (exercise) {
    filterFormula = `AND(${filterFormula}, {Exercise} = '${exercise}')`;
  }

  // Fetch workouts
  const workouts = [];
  await base('Workouts')
    .select({
      filterByFormula: filterFormula,
      sort: [{ field: 'Date', direction: 'asc' }]
    })
    .eachPage((records, fetchNextPage) => {
      workouts.push(...records);
      fetchNextPage();
    });

  if (workouts.length === 0) {
    return {
      message: 'No workouts found for analysis',
      exercises: {},
      overallAnalysis: null
    };
  }

  // Group workouts by exercise
  const exerciseData = {};
  workouts.forEach(workout => {
    const exerciseName = workout.get('Exercise');
    const date = workout.get('Date');
    const sets = workout.get('Sets') || 1;
    const reps = workout.get('Reps') || 1;
    const weight = workout.get('Weight') || 0;
    
    if (!exerciseData[exerciseName]) {
      exerciseData[exerciseName] = [];
    }
    
    exerciseData[exerciseName].push({
      date,
      sets,
      reps,
      weight,
      volume: sets * reps * weight,
      intensity: weight, // Raw weight as intensity metric
      estimated1RM: calculateEstimated1RM(weight, reps),
      workload: sets * reps, // Total reps across all sets
      tonnage: sets * reps * weight // Total weight moved
    });
  });

  // Analyze progressive overload for each exercise
  const analysisResults = {};
  const overallMetrics = {
    totalExercises: 0,
    exercisesWithProgression: 0,
    exercisesNeedingAdjustment: 0,
    averageProgressionRate: 0,
    recommendations: []
  };

  for (const [exerciseName, workoutData] of Object.entries(exerciseData)) {
    if (workoutData.length < minWorkouts) {
      continue; // Skip exercises with insufficient data
    }

    const analysis = analyzeExerciseProgression(exerciseName, workoutData, timeframeDays);
    analysisResults[exerciseName] = analysis;
    overallMetrics.totalExercises++;

    // Track progression statistics
    if (analysis.progressionStatus === 'progressing') {
      overallMetrics.exercisesWithProgression++;
    } else if (analysis.progressionStatus === 'stagnant' || analysis.progressionStatus === 'regressing') {
      overallMetrics.exercisesNeedingAdjustment++;
    }
  }

  // Calculate average progression rate
  const progressionRates = Object.values(analysisResults)
    .filter(a => a.progressionRate !== null)
    .map(a => a.progressionRate);
  
  overallMetrics.averageProgressionRate = progressionRates.length > 0 
    ? progressionRates.reduce((sum, rate) => sum + rate, 0) / progressionRates.length
    : 0;

  // Generate overall recommendations
  overallMetrics.recommendations = generateOverallRecommendations(analysisResults, overallMetrics);

  return {
    exercises: analysisResults,
    overallAnalysis: overallMetrics,
    summary: {
      totalWorkouts: workouts.length,
      timeframeDays,
      exercisesAnalyzed: overallMetrics.totalExercises
    }
  };
}

function analyzeExerciseProgression(exerciseName, workoutData, timeframeDays) {
  // Sort by date to ensure chronological order
  const sortedData = workoutData.sort((a, b) => new Date(a.date) - new Date(b.date));
  
  // Calculate trends using linear regression on key metrics
  const volumeTrend = calculateTrend(sortedData.map(w => w.volume));
  const intensityTrend = calculateTrend(sortedData.map(w => w.intensity));
  const estimated1RMTrend = calculateTrend(sortedData.map(w => w.estimated1RM));
  const workloadTrend = calculateTrend(sortedData.map(w => w.workload));

  // Determine progression status based on multiple metrics
  const progressionStatus = determineProgressionStatus(volumeTrend, intensityTrend, estimated1RMTrend);
  
  // Calculate progression rate (% improvement per week)
  const firstValue = sortedData[0].volume;
  const lastValue = sortedData[sortedData.length - 1].volume;
  const progressionRate = firstValue > 0 
    ? ((lastValue - firstValue) / firstValue) * 100 * (7 / timeframeDays)
    : null;

  // Identify sticking points and plateaus
  const stickingPoints = identifyStickingPoints(sortedData);
  const plateauPeriods = identifyPlateaus(sortedData);

  // Generate specific recommendations
  const recommendations = generateExerciseRecommendations(
    exerciseName, 
    progressionStatus, 
    volumeTrend, 
    intensityTrend, 
    stickingPoints, 
    plateauPeriods,
    sortedData
  );

  return {
    exerciseName,
    totalWorkouts: sortedData.length,
    progressionStatus,
    progressionRate,
    trends: {
      volume: volumeTrend,
      intensity: intensityTrend,
      estimated1RM: estimated1RMTrend,
      workload: workloadTrend
    },
    currentMetrics: {
      volume: lastValue,
      intensity: sortedData[sortedData.length - 1].intensity,
      estimated1RM: sortedData[sortedData.length - 1].estimated1RM,
      workload: sortedData[sortedData.length - 1].workload
    },
    stickingPoints,
    plateauPeriods,
    recommendations,
    nextSuggestedProgression: calculateNextProgression(sortedData, progressionStatus)
  };
}

function calculateTrend(values) {
  if (values.length < 2) return { slope: 0, direction: 'insufficient_data', confidence: 0 };
  
  const n = values.length;
  const xValues = Array.from({length: n}, (_, i) => i);
  
  // Linear regression calculations
  const sumX = xValues.reduce((sum, x) => sum + x, 0);
  const sumY = values.reduce((sum, y) => sum + y, 0);
  const sumXY = xValues.reduce((sum, x, i) => sum + x * values[i], 0);
  const sumXX = xValues.reduce((sum, x) => sum + x * x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  
  // Calculate R-squared for confidence
  const yMean = sumY / n;
  const totalSumSquares = values.reduce((sum, y) => sum + (y - yMean) ** 2, 0);
  const residualSumSquares = values.reduce((sum, y, i) => {
    const predicted = slope * i + (sumY - slope * sumX) / n;
    return sum + (y - predicted) ** 2;
  }, 0);
  
  const rSquared = totalSumSquares === 0 ? 0 : 1 - (residualSumSquares / totalSumSquares);
  
  let direction = 'stable';
  if (Math.abs(slope) > 0.1) { // Threshold for meaningful change
    direction = slope > 0 ? 'increasing' : 'decreasing';
  }
  
  return {
    slope: parseFloat(slope.toFixed(4)),
    direction,
    confidence: parseFloat(rSquared.toFixed(3)),
    changeRate: slope * 100 // Percentage change per workout
  };
}

function determineProgressionStatus(volumeTrend, intensityTrend, estimated1RMTrend) {
  const trends = [volumeTrend, intensityTrend, estimated1RMTrend];
  const increasingCount = trends.filter(t => t.direction === 'increasing').length;
  const decreasingCount = trends.filter(t => t.direction === 'decreasing').length;
  
  if (increasingCount >= 2) return 'progressing';
  if (decreasingCount >= 2) return 'regressing';
  return 'stagnant';
}

function identifyStickingPoints(workoutData) {
  const stickingPoints = [];
  const threshold = 0.05; // 5% variation threshold
  
  for (let i = 2; i < workoutData.length; i++) {
    const current = workoutData[i];
    const previous = workoutData[i - 1];
    const beforePrevious = workoutData[i - 2];
    
    // Check if intensity has been stuck at similar levels
    const currentIntensity = current.intensity;
    const avgPreviousIntensity = (previous.intensity + beforePrevious.intensity) / 2;
    
    if (Math.abs(currentIntensity - avgPreviousIntensity) / avgPreviousIntensity < threshold) {
      stickingPoints.push({
        date: current.date,
        weight: currentIntensity,
        type: 'intensity_plateau',
        description: `Intensity stuck around ${currentIntensity} lbs for multiple sessions`
      });
    }
  }
  
  return stickingPoints;
}

function identifyPlateaus(workoutData) {
  const plateaus = [];
  let plateauStart = null;
  let plateauValue = null;
  const plateauThreshold = 0.03; // 3% variation for plateau detection
  
  for (let i = 1; i < workoutData.length; i++) {
    const current = workoutData[i];
    const previous = workoutData[i - 1];
    
    const volumeChange = Math.abs(current.volume - previous.volume) / previous.volume;
    
    if (volumeChange < plateauThreshold) {
      if (!plateauStart) {
        plateauStart = previous.date;
        plateauValue = previous.volume;
      }
    } else {
      if (plateauStart) {
        plateaus.push({
          startDate: plateauStart,
          endDate: previous.date,
          value: plateauValue,
          duration: Math.ceil((new Date(previous.date) - new Date(plateauStart)) / (1000 * 60 * 60 * 24)),
          type: 'volume_plateau'
        });
        plateauStart = null;
      }
    }
  }
  
  return plateaus;
}

function generateExerciseRecommendations(exerciseName, progressionStatus, volumeTrend, intensityTrend, stickingPoints, plateauPeriods, workoutData) {
  const recommendations = [];
  
  if (progressionStatus === 'progressing') {
    recommendations.push({
      type: 'maintain',
      priority: 'low',
      message: `Great progress on ${exerciseName}! Continue with current progression strategy.`
    });
  } else if (progressionStatus === 'stagnant') {
    if (intensityTrend.direction === 'stable') {
      recommendations.push({
        type: 'intensity_increase',
        priority: 'high',
        message: `Increase weight by 2.5-5 lbs on ${exerciseName} to break through plateau.`
      });
    }
    if (volumeTrend.direction === 'stable') {
      recommendations.push({
        type: 'volume_increase',
        priority: 'medium',
        message: `Add an extra set or 2-3 reps per set for ${exerciseName}.`
      });
    }
  } else if (progressionStatus === 'regressing') {
    recommendations.push({
      type: 'deload',
      priority: 'high',
      message: `Consider a deload week for ${exerciseName} - reduce weight by 10-20% and focus on form.`
    });
  }
  
  // Specific recommendations based on sticking points
  if (stickingPoints.length > 2) {
    recommendations.push({
      type: 'technique_focus',
      priority: 'medium',
      message: `Multiple sticking points detected on ${exerciseName}. Focus on technique refinement and consider accessory exercises.`
    });
  }
  
  // Plateau-specific recommendations
  if (plateauPeriods.length > 0 && plateauPeriods[plateauPeriods.length - 1].duration > 14) {
    recommendations.push({
      type: 'program_variation',
      priority: 'high',
      message: `Long plateau detected on ${exerciseName}. Consider changing rep ranges, tempo, or exercise variation.`
    });
  }
  
  return recommendations;
}

function calculateNextProgression(workoutData, progressionStatus) {
  const lastWorkout = workoutData[workoutData.length - 1];
  const suggestions = {};
  
  if (progressionStatus === 'progressing') {
    // Continue current progression
    suggestions.weight = lastWorkout.weight + 2.5;
    suggestions.sets = lastWorkout.sets;
    suggestions.reps = lastWorkout.reps;
    suggestions.rationale = 'Continue linear progression with small weight increase';
  } else if (progressionStatus === 'stagnant') {
    // Multiple progression options
    suggestions.options = [
      {
        type: 'weight_increase',
        weight: lastWorkout.weight + 2.5,
        sets: lastWorkout.sets,
        reps: lastWorkout.reps,
        rationale: 'Increase weight while maintaining volume'
      },
      {
        type: 'volume_increase',
        weight: lastWorkout.weight,
        sets: lastWorkout.sets + 1,
        reps: lastWorkout.reps,
        rationale: 'Add extra set to increase total volume'
      },
      {
        type: 'rep_increase',
        weight: lastWorkout.weight,
        sets: lastWorkout.sets,
        reps: lastWorkout.reps + 2,
        rationale: 'Increase reps per set for volume progression'
      }
    ];
  } else {
    // Regressing - suggest deload
    suggestions.weight = lastWorkout.weight * 0.85; // 15% deload
    suggestions.sets = lastWorkout.sets;
    suggestions.reps = lastWorkout.reps;
    suggestions.rationale = 'Deload to recover and rebuild strength base';
  }
  
  return suggestions;
}

function generateOverallRecommendations(exerciseAnalyses, overallMetrics) {
  const recommendations = [];
  
  const progressingRatio = overallMetrics.exercisesWithProgression / overallMetrics.totalExercises;
  
  if (progressingRatio < 0.3) {
    recommendations.push({
      type: 'program_overhaul',
      priority: 'high',
      message: 'Most exercises are stagnating. Consider a new training program or deload week.'
    });
  } else if (progressingRatio > 0.7) {
    recommendations.push({
      type: 'maintain_program',
      priority: 'low',
      message: 'Excellent progress across most exercises! Stay consistent with current approach.'
    });
  }
  
  if (overallMetrics.averageProgressionRate < 0.5) {
    recommendations.push({
      type: 'progression_adjustment',
      priority: 'medium',
      message: 'Consider smaller, more frequent progressions to maintain steady improvement.'
    });
  }
  
  return recommendations;
}

function calculateEstimated1RM(weight, reps) {
  if (reps === 1) return weight;
  // Brzycki formula: Weight / (1.0278 - 0.0278 * reps)
  return weight / (1.0278 - 0.0278 * reps);
}