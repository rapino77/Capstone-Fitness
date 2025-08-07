const Airtable = require('airtable');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
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
    const params = event.queryStringParameters || {};
    const { 
      exercise, 
      userId = 'default-user',
      workoutsToAnalyze = '20' // Get more workouts for better weekly analysis
    } = params;

    if (!exercise) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Exercise name is required' })
      };
    }

    let workouts = [];
    
    // Fetch workout history from Airtable with timeout and better error handling
    if (process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN && process.env.AIRTABLE_BASE_ID) {
      try {
        const base = new Airtable({
          apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
        }).base(process.env.AIRTABLE_BASE_ID);

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Airtable query timeout')), 8000);
        });

        const airtablePromise = base('Workouts')
          .select({
            filterByFormula: `AND({User ID} = '${userId}', {Exercise} = '${exercise}')`,
            sort: [{ field: 'Date', direction: 'desc' }],
            maxRecords: parseInt(workoutsToAnalyze)
          })
          .all();

        const records = await Promise.race([airtablePromise, timeoutPromise]);

        workouts = records.map(record => ({
          date: record.get('Date'),
          sets: record.get('Sets'),
          reps: record.get('Reps'),
          weight: record.get('Weight'),
          notes: record.get('Notes')
        }));

        console.log(`Fetched ${workouts.length} workouts for ${exercise} analysis`);
      } catch (airtableError) {
        console.warn(`Airtable fetch failed: ${airtableError.message}, proceeding with empty workout history`);
        workouts = [];
      }
    } else {
      console.log('Airtable credentials not configured, using empty workout history');
      workouts = [];
    }

    // Import the enhanced progression calculation logic
    const { calculateNextWorkout, formatProgressionSuggestion } = getEnhancedProgressionLogic();
    
    // Calculate progression suggestion with hypertrophy optimization
    const progression = calculateNextWorkout(workouts, exercise);
    const formattedSuggestion = formatProgressionSuggestion(progression);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        exercise,
        workoutHistory: workouts.slice(0, 5), // Return last 5 for display
        totalWorkoutsAnalyzed: workouts.length,
        progression: {
          ...progression,
          formatted: formattedSuggestion
        },
        timestamp: new Date().toISOString(),
        hypertrophyOptimized: true
      })
    };

  } catch (error) {
    console.error('Enhanced progression suggestion error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to get enhanced progression suggestion',
        message: error.message
      })
    };
  }
};

// Enhanced progression logic with hypertrophy optimization
function getEnhancedProgressionLogic() {
  const PROGRESSION_STRATEGIES = {
    LINEAR: 'linear',
    DOUBLE_PROGRESSION: 'double_progression',
    WAVE: 'wave',
    STEP: 'step'
  };

  const PROGRESSION_PARAMS = {
    minWorkoutsForAnalysis: 3,
    weightIncrement: 2.5,
    repIncrement: 1,
    setIncrement: 1,
    plateauThreshold: 3,
    deloadPercentage: 0.85,
    maxRepRange: { low: 8, high: 12 },
    strategy: PROGRESSION_STRATEGIES.DOUBLE_PROGRESSION
  };

  // Get hypertrophy-optimized progression parameters
  function getProgressionParams(exerciseName) {
    const exerciseLower = exerciseName.toLowerCase();
    
    // Compound movements - hypertrophy optimized
    if (exerciseLower.includes('squat') || exerciseLower.includes('deadlift') || 
        exerciseLower.includes('bench') || exerciseLower.includes('press')) {
      return {
        ...PROGRESSION_PARAMS,
        weightIncrement: 2.5,
        maxRepRange: { low: 6, high: 10 },
        strategy: PROGRESSION_STRATEGIES.DOUBLE_PROGRESSION,
        hypertrophyFocus: true,
        basePercentageIncrease: 0.025,
        volumeTargetMultiplier: 1.1
      };
    }
    
    // Isolation movements
    if (exerciseLower.includes('curl') || exerciseLower.includes('extension') || 
        exerciseLower.includes('fly') || exerciseLower.includes('raise') ||
        exerciseLower.includes('lateral') || exerciseLower.includes('tricep') ||
        exerciseLower.includes('bicep')) {
      return {
        ...PROGRESSION_PARAMS,
        weightIncrement: 1.25,
        maxRepRange: { low: 10, high: 15 },
        strategy: PROGRESSION_STRATEGIES.DOUBLE_PROGRESSION,
        hypertrophyFocus: true,
        basePercentageIncrease: 0.02,
        volumeTargetMultiplier: 1.15
      };
    }
    
    // Bodyweight movements
    if (exerciseLower.includes('pull-up') || exerciseLower.includes('push-up') || 
        exerciseLower.includes('dip') || exerciseLower.includes('chin-up')) {
      return {
        ...PROGRESSION_PARAMS,
        weightIncrement: 0,
        repIncrement: 1,
        maxRepRange: { low: 8, high: 15 },
        strategy: PROGRESSION_STRATEGIES.DOUBLE_PROGRESSION,
        hypertrophyFocus: true,
        basePercentageIncrease: 0.05,
        volumeTargetMultiplier: 1.2
      };
    }
    
    // Default hypertrophy parameters
    return {
      ...PROGRESSION_PARAMS,
      maxRepRange: { low: 8, high: 12 },
      hypertrophyFocus: true,
      basePercentageIncrease: 0.025,
      volumeTargetMultiplier: 1.1
    };
  }

  function calculateNextWorkout(recentWorkouts, exerciseName, customParams = {}) {
    const params = { ...PROGRESSION_PARAMS, ...customParams };
    const exerciseParams = getProgressionParams(exerciseName);
    const mergedParams = { ...params, ...exerciseParams };
    
    if (!recentWorkouts || recentWorkouts.length === 0) {
      return getStarterSuggestion(exerciseName);
    }

    // Sort workouts by date (most recent first)
    const sortedWorkouts = [...recentWorkouts].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );

    const lastWorkout = sortedWorkouts[0];
    const lastSets = lastWorkout.sets || 3;
    const lastReps = lastWorkout.reps || 10;
    const lastWeight = lastWorkout.weight || 0;

    // Enhanced analysis with hypertrophy focus
    const performanceAnalysis = analyzeWeeklyProgression(sortedWorkouts);
    const volumeAnalysis = analyzeVolumeProgression(sortedWorkouts);
    const successRate = calculateSuccessRate(sortedWorkouts, mergedParams);
    
    // Generate intelligent progression recommendation
    return generateIntelligentProgression(
      lastSets, lastReps, lastWeight, 
      performanceAnalysis, volumeAnalysis, successRate, 
      mergedParams, exerciseName
    );
  }

  function getStarterSuggestion(exerciseName) {
    const exerciseLower = exerciseName.toLowerCase();
    
    if (exerciseLower.includes('bench press')) {
      return {
        suggestion: { sets: 3, reps: 8, weight: 45 },
        reason: 'Starting with Olympic barbell (45lbs) - focus on form first',
        confidence: 'medium',
        isFirstWorkout: true,
        exerciseType: 'compound'
      };
    }
    
    if (exerciseLower.includes('squat')) {
      return {
        suggestion: { sets: 3, reps: 8, weight: 45 },
        reason: 'Starting with Olympic barbell (45lbs) - master the movement pattern',
        confidence: 'medium',
        isFirstWorkout: true,
        exerciseType: 'compound'
      };
    }
    
    if (exerciseLower.includes('deadlift')) {
      return {
        suggestion: { sets: 3, reps: 5, weight: 95 },
        reason: 'Starting with 95lbs (bar + 25lb plates) for proper bar height',
        confidence: 'medium',
        isFirstWorkout: true,
        exerciseType: 'compound'
      };
    }
    
    // Default starter
    return {
      suggestion: { sets: 3, reps: 10, weight: 10 },
      reason: 'Conservative starting point - adjust based on your strength level',
      confidence: 'medium',
      isFirstWorkout: true,
      exerciseType: 'general'
    };
  }

  // Analyze weekly progression patterns
  function analyzeWeeklyProgression(sortedWorkouts) {
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
      
      const volumeGrowth = previousWeek.volume > 0 
        ? (currentWeek.volume - previousWeek.volume) / previousWeek.volume
        : 0;
      
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

    return { trend, weeklyGrowth: avgWeeklyGrowth, consistency, growthRates };
  }

  function groupWorkoutsByWeek(workouts) {
    const weeklyData = {};
    
    workouts.forEach(workout => {
      const date = new Date(workout.date);
      const weekKey = getWeekKey(date);
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = [];
      }
      
      weeklyData[weekKey].push({
        sets: workout.sets || 1,
        reps: workout.reps || 1,
        weight: workout.weight || 0,
        volume: (workout.sets || 1) * (workout.reps || 1) * (workout.weight || 0)
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
      
      return {
        week: weekKey,
        workoutCount: weekWorkouts.length,
        volume: totalVolume,
        avgWeight
      };
    });
  }

  function calculateConsistency(growthRates) {
    if (growthRates.length < 2) return 0;
    
    const mean = growthRates.reduce((sum, g) => sum + g.combinedGrowth, 0) / growthRates.length;
    const variance = growthRates.reduce((sum, g) => sum + Math.pow(g.combinedGrowth - mean, 2), 0) / growthRates.length;
    const standardDeviation = Math.sqrt(variance);
    
    return Math.max(0, 1 - (standardDeviation * 2));
  }

  function analyzeVolumeProgression(sortedWorkouts) {
    if (sortedWorkouts.length < 3) {
      return { trend: 'insufficient_data', volumeGrowth: 0 };
    }

    const recentVolumes = sortedWorkouts.slice(0, 6).map(w => 
      (w.sets || 1) * (w.reps || 1) * (w.weight || 0)
    );

    const trend = calculateTrendDirection(recentVolumes);
    const volumeGrowth = (recentVolumes[0] - recentVolumes[recentVolumes.length - 1]) / recentVolumes[recentVolumes.length - 1];

    return {
      trend: trend > 0.05 ? 'increasing' : trend < -0.05 ? 'decreasing' : 'stable',
      volumeGrowth
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
    return slope / (sumY / n);
  }

  function calculateSuccessRate(sortedWorkouts, params) {
    if (sortedWorkouts.length === 0) return 0.5;
    
    const targetRange = params.maxRepRange;
    const recentWorkouts = sortedWorkouts.slice(0, Math.min(6, sortedWorkouts.length));
    
    const successfulWorkouts = recentWorkouts.filter(workout => {
      const reps = workout.reps || 0;
      return reps >= targetRange.low && reps <= targetRange.high;
    }).length;
    
    return successfulWorkouts / recentWorkouts.length;
  }

  function generateIntelligentProgression(sets, reps, weight, performanceAnalysis, volumeAnalysis, successRate, params, exerciseName) {
    let suggestion = { sets, reps, weight };
    let reason = '';
    let confidence = 'medium';

    const baseIncrease = params.basePercentageIncrease || 0.025;
    
    // Adjust progression based on success rate
    let progressionMultiplier = 1.0;
    if (successRate >= 0.9) {
      progressionMultiplier = 1.2;
      confidence = 'high';
    } else if (successRate >= 0.7) {
      progressionMultiplier = 1.0;
      confidence = 'medium';
    } else {
      progressionMultiplier = 0.5;
      confidence = 'low';
    }

    // Adjust based on weekly progression trend
    if (performanceAnalysis.trend === 'increasing' && performanceAnalysis.consistency > 0.7) {
      progressionMultiplier *= 1.1;
    } else if (performanceAnalysis.trend === 'decreasing') {
      progressionMultiplier *= 0.7;
    }

    // Calculate intelligent weight progression
    if (params.hypertrophyFocus && reps < params.maxRepRange.high && successRate > 0.8) {
      suggestion.reps = Math.min(reps + 1, params.maxRepRange.high);
      reason = `Increase reps to ${suggestion.reps} for hypertrophy (${Math.round(successRate * 100)}% success rate)`;
      confidence = 'high';
    } else if (reps >= params.maxRepRange.high || successRate < 0.7) {
      const percentageIncrease = baseIncrease * progressionMultiplier;
      const weightIncrease = Math.max(params.weightIncrement || 2.5, weight * percentageIncrease);
      
      suggestion.weight = Math.round((weight + weightIncrease) * 4) / 4;
      suggestion.reps = params.maxRepRange.low;
      
      reason = `Increase weight by ${Math.round(percentageIncrease * 100 * 10) / 10}% (+${suggestion.weight - weight}lbs) based on ${Math.round(successRate * 100)}% success rate`;
      confidence = successRate > 0.8 ? 'high' : 'medium';
    } else if (volumeAnalysis.trend === 'decreasing' || successRate < 0.5) {
      if (performanceAnalysis.weeklyGrowth < -0.1) {
        suggestion.weight = Math.round(weight * 0.9 * 4) / 4;
        reason = `Deload by 10% due to declining performance (${Math.round(performanceAnalysis.weeklyGrowth * 100)}% weekly decline)`;
        confidence = 'high';
      } else {
        suggestion.sets = Math.min(sets + 1, 5);
        reason = `Add extra set to increase volume (${Math.round(successRate * 100)}% success rate)`;
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

  function formatProgressionSuggestion(progressionData) {
    if (!progressionData || !progressionData.suggestion) {
      return null;
    }

    const { suggestion, reason, confidence, lastWorkout, isFirstWorkout } = progressionData;
    const changes = [];

    if (isFirstWorkout || !lastWorkout) {
      return {
        changes: [`Starting recommendation: ${suggestion.sets} sets × ${suggestion.reps} reps @ ${suggestion.weight}lbs`],
        reason,
        confidence,
        summary: `Starting with ${suggestion.sets} sets × ${suggestion.reps} reps @ ${suggestion.weight}lbs`
      };
    }

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

  return {
    calculateNextWorkout,
    formatProgressionSuggestion
  };
}