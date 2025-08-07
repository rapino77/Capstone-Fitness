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
      workoutsToAnalyze = '5' // Get last 5 workouts for analysis
    } = params;

    if (!exercise) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Exercise name is required' })
      };
    }

    let workouts = [];
    
    // Fetch workout history from Airtable for intelligent progression analysis
    if (process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN && process.env.AIRTABLE_BASE_ID) {
      const base = new Airtable({
        apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
      }).base(process.env.AIRTABLE_BASE_ID);

      // Get last 20 workouts for comprehensive analysis (approximately 4-6 weeks of data)
      const records = await base('Workouts')
        .select({
          filterByFormula: `AND({User ID} = '${userId}', {Exercise} = '${exercise}')`,
          sort: [{ field: 'Date', direction: 'desc' }],
          maxRecords: 20
        })
        .all();

      workouts = records.map(record => ({
        date: record.get('Date'),
        sets: record.get('Sets'),
        reps: record.get('Reps'),
        weight: record.get('Weight'),
        notes: record.get('Notes')
      }));

      console.log(`Fetched ${workouts.length} workouts for ${exercise} analysis`);
      if (workouts.length > 0) {
        console.log('Most recent workout:', workouts[0]);
        console.log('Most recent weight:', workouts[0].weight);
      } else {
        console.log('No workouts found for exercise:', exercise);
        console.log('Query used:', `AND({User ID} = '${userId}', {Exercise} = '${exercise}')`);
      }
    } else {
      console.log('Airtable credentials not configured, using empty workout history');
    }

    // Import the progression calculation logic
    const progressionLogic = getProgressionLogic();
    
    // Calculate progression suggestion
    const progression = progressionLogic.calculateNextWorkout(workouts, exercise);
    const formattedSuggestion = progressionLogic.formatProgressionSuggestion(progression);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        exercise,
        workoutHistory: workouts,
        progression: {
          ...progression,
          formatted: formattedSuggestion
        },
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Get progression suggestion error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to get progression suggestion',
        message: error.message
      })
    };
  }
};

// Inline progression logic to avoid frontend dependencies
function getProgressionLogic() {
  const PROGRESSION_STRATEGIES = {
    LINEAR: 'linear',
    DOUBLE_PROGRESSION: 'double_progression',
    WAVE: 'wave',
    STEP: 'step'
  };

  const PROGRESSION_PARAMS = {
    minWorkoutsForAnalysis: 3,
    weightIncrement: 5,  // Changed from 2.5 to 5 pounds
    repIncrement: 1,
    setIncrement: 1,
    plateauThreshold: 3,
    deloadPercentage: 0.85,
    maxRepRange: { low: 8, high: 12 },
    strategy: PROGRESSION_STRATEGIES.DOUBLE_PROGRESSION
  };

  function calculateNextWorkout(recentWorkouts, exerciseName, customParams = {}) {
    const params = { ...PROGRESSION_PARAMS, ...customParams };
    
    if (!recentWorkouts || recentWorkouts.length === 0) {
      console.log('No workout history found for exercise:', exerciseName);
      // Provide beginner-friendly starting suggestions - inline function for scoping
      const starterSuggestion = getStarterSuggestionInline(exerciseName);
      return {
        suggestion: starterSuggestion.suggestion,
        reason: starterSuggestion.reason + ' (No previous workouts found - log a workout to get personalized suggestions)',
        confidence: 'medium',
        isFirstWorkout: true,
        exerciseType: starterSuggestion.exerciseType,
        formatted: {
          summary: `Starting recommendation based on no workout history`,
          changes: [`First time tracking ${exerciseName}`],
          reason: starterSuggestion.reason
        }
      };
    }

    function getStarterSuggestionInline(exerciseName) {
      const exerciseLower = exerciseName.toLowerCase();
      
      console.log('Getting starter suggestion for:', exerciseName, '(lowercase:', exerciseLower, ')');
      
      // Compound movements
      if (exerciseLower.includes('bench press')) {
        return {
          suggestion: { sets: 3, reps: 8, weight: 45 },
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
          suggestion: { sets: 3, reps: 5, weight: 95 },
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
      
      // Isolation exercises
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
      
      // Default suggestion
      return {
        suggestion: { sets: 3, reps: 10, weight: 10 },
        reason: 'Conservative starting point - adjust based on your strength level',
        exerciseType: 'general'
      };
    }

    const sortedWorkouts = [...recentWorkouts].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );

    const lastWorkout = sortedWorkouts[0];
    const lastSets = lastWorkout.sets || 3;
    const lastReps = lastWorkout.reps || 10;
    const lastWeight = lastWorkout.weight || 0;

    if (sortedWorkouts.length < params.minWorkoutsForAnalysis) {
      return applyProgressionStrategy(lastSets, lastReps, lastWeight, params, 'insufficient_data');
    }

    const analysis = analyzeRecentPerformance(sortedWorkouts.slice(0, params.minWorkoutsForAnalysis));
    return applyProgressionStrategy(lastSets, lastReps, lastWeight, params, analysis.status, analysis);
  }

  function analyzeRecentPerformance(recentWorkouts) {
    const volumes = recentWorkouts.map(w => w.sets * w.reps * (w.weight || 0));
    const weights = recentWorkouts.map(w => w.weight || 0);
    const reps = recentWorkouts.map(w => w.reps || 0);
    
    const weightProgressing = weights.every((w, i) => i === 0 || w >= weights[i - 1]);
    const weightStagnant = weights.every(w => w === weights[0]);
    const repsProgressing = reps.every((r, i) => i === 0 || r >= reps[i - 1]);
    const repsMaxed = reps[0] >= PROGRESSION_PARAMS.maxRepRange.high;
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

  function applyProgressionStrategy(sets, reps, weight, params, status, analysis = {}) {
    const strategy = params.strategy;
    let suggestion = { sets, reps, weight };
    let reason = '';
    let confidence = 'medium';

    // Get exercise-specific parameters
    const exerciseParams = getProgressionParams(analysis.exerciseName || '');
    params = { ...params, ...exerciseParams };

    if (strategy === PROGRESSION_STRATEGIES.DOUBLE_PROGRESSION) {
      if (status === 'progressing_well' || status === 'insufficient_data') {
        if (reps < params.maxRepRange.high) {
          suggestion.reps = Math.min(reps + params.repIncrement, params.maxRepRange.high);
          reason = `Increase reps to ${suggestion.reps} (double progression method)`;
          confidence = 'high';
        } else {
          // Add weight based on exercise type (5 lbs default, 2.5 lbs for isolation)
          const increment = params.weightIncrement || 5;
          suggestion.weight = weight + increment;
          suggestion.reps = params.maxRepRange.low;
          reason = `Increase weight by ${increment} lbs to ${suggestion.weight}lbs and reset reps to ${suggestion.reps}`;
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
    } else if (strategy === PROGRESSION_STRATEGIES.LINEAR) {
      if (status !== 'regressing') {
        // Always add 5 pounds for linear progression
        suggestion.weight = weight + 5;
        reason = `Linear progression: increase weight by 5 lbs to ${suggestion.weight}lbs`;
        confidence = status === 'progressing_well' ? 'high' : 'medium';
      } else {
        suggestion.weight = Math.round(weight * params.deloadPercentage);
        reason = `Deload to ${suggestion.weight}lbs for recovery`;
        confidence = 'high';
      }
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

  function getProgressionParams(exerciseName) {
    const exerciseLower = exerciseName.toLowerCase();
    
    if (exerciseLower.includes('squat') || exerciseLower.includes('deadlift') || 
        exerciseLower.includes('bench') || exerciseLower.includes('press')) {
      return {
        weightIncrement: 5,
        maxRepRange: { low: 5, high: 8 },
        strategy: PROGRESSION_STRATEGIES.LINEAR
      };
    }
    
    if (exerciseLower.includes('curl') || exerciseLower.includes('extension') || 
        exerciseLower.includes('fly') || exerciseLower.includes('raise')) {
      return {
        weightIncrement: 2.5,  // Keep smaller increments for isolation exercises
        maxRepRange: { low: 10, high: 15 },
        strategy: PROGRESSION_STRATEGIES.DOUBLE_PROGRESSION
      };
    }
    
    if (exerciseLower.includes('pull-up') || exerciseLower.includes('push-up') || 
        exerciseLower.includes('dip') || exerciseLower.includes('chin-up')) {
      return {
        weightIncrement: 0,
        repIncrement: 2,
        maxRepRange: { low: 5, high: 20 },
        strategy: PROGRESSION_STRATEGIES.DOUBLE_PROGRESSION
      };
    }
    
    return {};
  }

  function formatProgressionSuggestion(progressionData) {
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


  return {
    calculateNextWorkout,
    formatProgressionSuggestion
  };
}