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
        userId: record.get('User ID'),
        date: record.get('Date'),
        sets: parseInt(record.get('Sets')) || 0,
        reps: parseInt(record.get('Reps')) || 0,
        weight: parseFloat(record.get('Weight')) || 0,
        notes: record.get('Notes') || ''
      }));

      console.log(`=== PROGRESSION SUGGESTION DEBUG ===`);
      console.log(`Query filter: AND({User ID} = '${userId}', {Exercise} = '${exercise}')`);
      console.log(`Fetched ${workouts.length} workouts for ${exercise} analysis`);
      console.log('Total records found:', records.length);
      
      if (records.length > 0 && workouts.length === 0) {
        console.log('WARNING: Found records but no workouts mapped. Raw record data:');
        records.forEach((record, idx) => {
          console.log(`Record ${idx}:`, {
            userId: record.get('User ID'),
            exercise: record.get('Exercise'),
            date: record.get('Date'),
            sets: record.get('Sets'),
            reps: record.get('Reps'),
            weight: record.get('Weight'),
            fields: Object.keys(record.fields)
          });
        });
      }
      
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
    console.log('calculateNextWorkout called with:', {
      workoutCount: recentWorkouts ? recentWorkouts.length : 0,
      exercise: exerciseName,
      firstWorkout: recentWorkouts && recentWorkouts.length > 0 ? recentWorkouts[0] : null
    });
    
    if (!recentWorkouts || recentWorkouts.length === 0) {
      console.log('No workout history found for exercise:', exerciseName);
      // Provide beginner-friendly starting suggestions
      const starterSuggestion = getStarterSuggestionInline(exerciseName);
      return {
        suggestion: starterSuggestion.suggestion,
        reason: starterSuggestion.reason + ' (No previous workouts found)',
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

    // Sort workouts by date (most recent first)
    const sortedWorkouts = [...recentWorkouts].sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );

    console.log('=== SIMPLE WEEKLY PROGRESSION ===');
    console.log('Exercise:', exerciseName);
    console.log('Total workouts found:', sortedWorkouts.length);
    
    // Apply simple weekly progression logic
    return calculateWeeklyProgression(sortedWorkouts, exerciseName);
  }

  function calculateWeeklyProgression(sortedWorkouts, exerciseName) {
    const lastWorkout = sortedWorkouts[0];
    const lastSets = lastWorkout.sets || lastWorkout.Sets || 3;
    const lastReps = lastWorkout.reps || lastWorkout.Reps || 10;
    const lastWeight = lastWorkout.weight || lastWorkout.Weight || 0;
    
    console.log('Last workout:', {
      sets: lastSets,
      reps: lastReps, 
      weight: lastWeight,
      date: lastWorkout.date
    });

    // Simple weekly progression logic:
    // 1. If only 1 workout, add 5 lbs
    if (sortedWorkouts.length === 1) {
      const nextWeight = lastWeight + 5;
      return {
        suggestion: {
          sets: lastSets,
          reps: lastReps,
          weight: nextWeight
        },
        reason: `Weekly progression: Add 5 lbs (${lastWeight} → ${nextWeight} lbs)`,
        confidence: 'high',
        status: 'progressing',
        lastWorkout: { sets: lastSets, reps: lastReps, weight: lastWeight },
        formatted: {
          summary: `Add 5 lbs for weekly progression`,
          changes: [`Weight: ${lastWeight} → ${nextWeight} lbs (+5)`],
          reason: 'Weekly progressive overload'
        }
      };
    }

    // 2. Check if we made the previous weight target
    const secondLastWorkout = sortedWorkouts[1];
    const previousWeight = secondLastWorkout.weight || secondLastWorkout.Weight || 0;
    
    console.log('Comparing weights:', {
      lastWeight,
      previousWeight,
      madeTarget: lastWeight >= previousWeight
    });

    // 3. If we made the weight, add 5 lbs
    if (lastWeight >= previousWeight) {
      const nextWeight = lastWeight + 5;
      return {
        suggestion: {
          sets: lastSets,
          reps: lastReps,
          weight: nextWeight
        },
        reason: `You hit ${lastWeight} lbs! Time to progress to ${nextWeight} lbs`,
        confidence: 'high',
        status: 'progressing',
        lastWorkout: { sets: lastSets, reps: lastReps, weight: lastWeight },
        formatted: {
          summary: `Successful progression: add 5 lbs`,
          changes: [`Weight: ${lastWeight} → ${nextWeight} lbs (+5)`],
          reason: 'You successfully completed the target weight'
        }
      };
    }

    // 4. If we missed the weight, check for consecutive misses
    if (lastWeight < previousWeight) {
      // Count consecutive misses
      let consecutiveMisses = 1; // Current miss
      
      for (let i = 2; i < sortedWorkouts.length; i++) {
        const currentWorkout = sortedWorkouts[i-1];
        const prevWorkout = sortedWorkouts[i];
        
        const currentWeight = currentWorkout.weight || currentWorkout.Weight || 0;
        const prevWeight = prevWorkout.weight || prevWorkout.Weight || 0;
        
        if (currentWeight < prevWeight) {
          consecutiveMisses++;
        } else {
          break;
        }
      }

      console.log('Consecutive misses:', consecutiveMisses);

      // 5. If 2+ consecutive misses, deload by 25%
      if (consecutiveMisses >= 2) {
        const deloadWeight = Math.round(lastWeight * 0.75);
        return {
          suggestion: {
            sets: lastSets,
            reps: lastReps,
            weight: deloadWeight
          },
          reason: `Deload time! You've missed the target weight ${consecutiveMisses} times in a row. Reset to ${deloadWeight} lbs (-25%)`,
          confidence: 'high',
          status: 'deloading',
          lastWorkout: { sets: lastSets, reps: lastReps, weight: lastWeight },
          formatted: {
            summary: `Deload after ${consecutiveMisses} consecutive misses`,
            changes: [`Weight: ${lastWeight} → ${deloadWeight} lbs (-25%)`],
            reason: 'Deload to build back up with better form'
          }
        };
      }

      // 6. If 1 miss, keep the same weight
      return {
        suggestion: {
          sets: lastSets,
          reps: lastReps,
          weight: previousWeight // Go back to the target we missed
        },
        reason: `You missed ${previousWeight} lbs last time. Let's try it again!`,
        confidence: 'medium',
        status: 'retry',
        lastWorkout: { sets: lastSets, reps: lastReps, weight: lastWeight },
        formatted: {
          summary: `Retry the missed weight`,
          changes: [`Weight: ${lastWeight} → ${previousWeight} lbs (retry)`],
          reason: 'Give the missed weight another attempt'
        }
      };
    }

    // Fallback (shouldn't reach here)
    return {
      suggestion: {
        sets: lastSets,
        reps: lastReps,
        weight: lastWeight + 5
      },
      reason: 'Continue progressive overload',
      confidence: 'medium',
      status: 'progressing',
      lastWorkout: { sets: lastSets, reps: lastReps, weight: lastWeight }
    };
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