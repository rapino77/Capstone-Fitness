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
    // Configure Airtable
    const base = new Airtable({
      token: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    const params = event.queryStringParameters || {};
    const {
      userId = 'default-user',
      exercise,
      checkLatest = 'false',
      limit = '10'
    } = params;

    if (checkLatest === 'true') {
      // Check for new PRs in recent workouts
      return await checkForNewPRs(base, userId, headers);
    } else {
      // Get existing PR records
      return await getPRRecords(base, userId, exercise, limit, headers);
    }

  } catch (error) {
    console.error('PR Detection API error:', error);
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

// Check for new PRs in recent workouts
async function checkForNewPRs(base, userId, headers) {
  try {
    // Get recent workouts (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateFilter = sevenDaysAgo.toISOString().split('T')[0];

    const recentWorkouts = [];
    await base('Workouts')
      .select({
        filterByFormula: `AND(
          {User ID} = '${userId}', 
          IS_AFTER({Date}, '${dateFilter}')
        )`,
        sort: [{ field: 'Date', direction: 'desc' }]
      })
      .eachPage((records, fetchNextPage) => {
        recentWorkouts.push(...records);
        fetchNextPage();
      });

    if (recentWorkouts.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: [],
          message: 'No recent workouts found'
        })
      };
    }

    // Group workouts by exercise to find max weights
    const exerciseMaxes = {};
    
    recentWorkouts.forEach(workout => {
      const exercise = workout.get('Exercise');
      const weight = workout.get('Weight');
      const reps = workout.get('Reps');
      const date = workout.get('Date');
      
      // Calculate 1RM estimate using Brzycki formula: weight / (1.0278 - 0.0278 * reps)
      const estimated1RM = weight / (1.0278 - 0.0278 * reps);
      
      if (!exerciseMaxes[exercise] || estimated1RM > exerciseMaxes[exercise].estimated1RM) {
        exerciseMaxes[exercise] = {
          weight,
          reps,
          estimated1RM,
          date,
          workoutId: workout.id
        };
      }
    });

    // Check against existing PRs
    const newPRs = [];
    
    for (const [exerciseName, maxData] of Object.entries(exerciseMaxes)) {
      // Get current PR for this exercise
      const existingPRs = [];
      await base('Progress Records')
        .select({
          filterByFormula: `AND(
            {User ID} = '${userId}', 
            {Exercise Name} = '${exerciseName}'
          )`,
          sort: [{ field: 'Max Weight', direction: 'desc' }],
          maxRecords: 1
        })
        .eachPage((records, fetchNextPage) => {
          existingPRs.push(...records);
          fetchNextPage();
        });

      const currentPR = existingPRs[0];
      const isNewPR = !currentPR || maxData.weight > currentPR.get('Max Weight');
      
      if (isNewPR) {
        // Create new PR record
        const previousPR = currentPR ? currentPR.get('Max Weight') : 0;
        
        const prRecord = await base('Progress Records').create({
          'User ID': userId,
          'Exercise Name': exerciseName,
          'Max Weight': maxData.weight,
          'Reps': maxData.reps,
          'Date Achieved': maxData.date,
          'Workout ID': [maxData.workoutId],
          'Previous PR': previousPR
        });

        newPRs.push({
          id: prRecord.id,
          exercise: exerciseName,
          newPR: maxData.weight,
          previousPR,
          improvement: maxData.weight - previousPR,
          reps: maxData.reps,
          dateAchieved: maxData.date,
          estimated1RM: maxData.estimated1RM
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: newPRs,
        message: `Found ${newPRs.length} new personal records!`,
        totalWorkoutsChecked: recentWorkouts.length
      })
    };

  } catch (error) {
    throw new Error(`Failed to check for new PRs: ${error.message}`);
  }
}

// Get existing PR records
async function getPRRecords(base, userId, exercise, limit, headers) {
  try {
    let filterFormula = `{User ID} = '${userId}'`;
    
    if (exercise) {
      filterFormula = `AND(${filterFormula}, {Exercise Name} = '${exercise}')`;
    }

    const records = [];
    await base('Progress Records')
      .select({
        filterByFormula: filterFormula,
        sort: [{ field: 'Date Achieved', direction: 'desc' }],
        maxRecords: parseInt(limit)
      })
      .eachPage((pageRecords, fetchNextPage) => {
        records.push(...pageRecords);
        fetchNextPage();
      });

    const formattedRecords = records.map(record => ({
      id: record.id,
      userId: record.get('User ID'),
      exercise: record.get('Exercise Name'),
      maxWeight: record.get('Max Weight'),
      reps: record.get('Reps'),
      dateAchieved: record.get('Date Achieved'),
      workoutId: record.get('Workout ID')?.[0],
      previousPR: record.get('Previous PR'),
      improvement: record.get('Improvement'),
      createdAt: record.get('Created At')
    }));

    // Group by exercise and get latest PR for each
    const exercisePRs = {};
    formattedRecords.forEach(pr => {
      if (!exercisePRs[pr.exercise] || 
          new Date(pr.dateAchieved) > new Date(exercisePRs[pr.exercise].dateAchieved)) {
        exercisePRs[pr.exercise] = pr;
      }
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          allPRs: formattedRecords,
          currentPRs: Object.values(exercisePRs),
          summary: {
            totalExercises: Object.keys(exercisePRs).length,
            totalPRs: formattedRecords.length
          }
        }
      })
    };

  } catch (error) {
    throw new Error(`Failed to fetch PR records: ${error.message}`);
  }
}