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
    // Check environment variables
    if (!process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN) {
      throw new Error('AIRTABLE_PERSONAL_ACCESS_TOKEN environment variable is not set');
    }
    if (!process.env.AIRTABLE_BASE_ID) {
      throw new Error('AIRTABLE_BASE_ID environment variable is not set');
    }

    // Parse query parameters
    const params = event.queryStringParameters || {};
    const { 
      userId = 'default-user',
      exercise,
      action = 'suggestions', // 'suggestions', 'rotation-check', 'phase-info'
      maxSuggestions = '3',
      includeAccessory = 'false',
      periodizationPhase
    } = params;

    // Configure Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    // Fetch workout history for the user
    const workoutHistory = [];
    await new Promise((resolve, reject) => {
      base('Workouts')
        .select({
          filterByFormula: `{User ID} = '${userId}'`,
          sort: [{ field: 'Date', direction: 'desc' }],
          pageSize: 100
        })
        .eachPage(
          (records, fetchNextPage) => {
            records.forEach(record => {
              workoutHistory.push({
                id: record.id,
                exercise: record.get('Exercise'),
                sets: record.get('Sets'),
                reps: record.get('Reps'),
                weight: record.get('Weight'),
                date: record.get('Date'),
                notes: record.get('Notes')
              });
            });
            if (workoutHistory.length < 100) {
              fetchNextPage();
            } else {
              resolve();
            }
          },
          error => {
            if (error) reject(error);
            else resolve();
          }
        );
    });

    console.log(`Retrieved ${workoutHistory.length} workouts for rotation analysis`);

    // Import rotation functions (simulate the import since we can't use ES6 imports in Node.js)
    const { 
      generateRotationSuggestions,
      calculateRotationScore,
      shouldRotateExercise,
      determineCurrentPhase,
      generatePeriodizedWorkout,
      getExerciseCategory,
      PERIODIZATION_PHASES
    } = require('./rotation-logic');

    let response = {};

    switch (action) {
      case 'suggestions':
        if (!exercise) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Exercise parameter required for suggestions' })
          };
        }

        const suggestions = generateRotationSuggestions(exercise, workoutHistory, {
          maxSuggestions: parseInt(maxSuggestions),
          includeAccessoryMovements: includeAccessory === 'true',
          periodizationPhase
        });

        response = {
          success: true,
          exercise,
          suggestions,
          totalWorkouts: workoutHistory.length,
          exerciseCategory: getExerciseCategory(exercise)
        };
        break;

      case 'rotation-check':
        if (!exercise) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Exercise parameter required for rotation check' })
          };
        }

        const rotationCheck = shouldRotateExercise(exercise, workoutHistory);
        const rotationScore = calculateRotationScore(exercise, workoutHistory);

        response = {
          success: true,
          exercise,
          rotationRecommendation: rotationCheck,
          rotationScore,
          exerciseCategory: getExerciseCategory(exercise)
        };
        break;

      case 'phase-info':
        const currentPhase = determineCurrentPhase(workoutHistory);
        
        // If exercise is provided, generate periodized workout suggestion
        let periodizedWorkout = null;
        if (exercise) {
          const exerciseWorkouts = workoutHistory.filter(w => w.exercise === exercise);
          const lastWorkout = exerciseWorkouts.length > 0 ? exerciseWorkouts[0] : null;
          periodizedWorkout = generatePeriodizedWorkout(exercise, currentPhase.phase, lastWorkout);
        }

        response = {
          success: true,
          currentPhase,
          periodizedWorkout,
          availablePhases: Object.keys(PERIODIZATION_PHASES),
          phaseDetails: PERIODIZATION_PHASES[currentPhase.phase]
        };
        break;

      case 'full-analysis':
        if (!exercise) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Exercise parameter required for full analysis' })
          };
        }

        // Comprehensive analysis combining all features
        const fullSuggestions = generateRotationSuggestions(exercise, workoutHistory, {
          maxSuggestions: parseInt(maxSuggestions),
          includeAccessoryMovements: includeAccessory === 'true',
          periodizationPhase
        });
        
        const fullRotationCheck = shouldRotateExercise(exercise, workoutHistory);
        const fullRotationScore = calculateRotationScore(exercise, workoutHistory);
        const fullPhase = determineCurrentPhase(workoutHistory);
        
        const exerciseWorkouts = workoutHistory.filter(w => w.exercise === exercise);
        const lastExerciseWorkout = exerciseWorkouts.length > 0 ? exerciseWorkouts[0] : null;
        const fullPeriodizedWorkout = generatePeriodizedWorkout(exercise, fullPhase.phase, lastExerciseWorkout);

        response = {
          success: true,
          exercise,
          analysis: {
            rotationSuggestions: fullSuggestions,
            rotationRecommendation: fullRotationCheck,
            rotationScore: fullRotationScore,
            currentPhase: fullPhase,
            periodizedWorkout: fullPeriodizedWorkout,
            exerciseCategory: getExerciseCategory(exercise),
            exerciseHistory: {
              totalWorkouts: exerciseWorkouts.length,
              lastWorkout: lastExerciseWorkout,
              recentWorkouts: exerciseWorkouts.slice(0, 5)
            }
          }
        };
        break;

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action. Use: suggestions, rotation-check, phase-info, or full-analysis' })
        };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Error in exercise rotation analysis:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to analyze exercise rotation',
        message: error.message,
        details: error.stack?.split('\n')[0] || 'Unknown error'
      })
    };
  }
};