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
      weekStart, 
      weekEnd,
      userId = 'default-user'
    } = params;

    if (!weekStart || !weekEnd) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'weekStart and weekEnd parameters are required' })
      };
    }

    // For now, return mock data without Airtable integration
    // TODO: Implement actual Airtable queries when credentials are available
    console.log('Generating weekly report for:', { weekStart, weekEnd, userId });
    
    const reportData = await generateWeeklyReport(weekStart, weekEnd, userId);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: reportData,
        generatedAt: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Weekly report error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to generate weekly report',
        message: error.message
      })
    };
  }
};

async function generateWeeklyReport(weekStart, weekEnd, userId) {
  // TODO: When Airtable is connected, implement actual data fetching
  // For now, return structured mock data
  
  const startDate = new Date(weekStart);
  const endDate = new Date(weekEnd);
  
  // Mock data structure
  const report = {
    weekStart: startDate,
    weekEnd: endDate,
    summary: {
      totalWorkouts: 0,
      totalExercises: 0,
      totalSets: 0,
      totalReps: 0,
      totalWeight: 0,
      avgWorkoutDuration: 0,
      streak: 0
    },
    workouts: [],
    weight: {
      startWeight: null,
      endWeight: null,
      change: 0,
      measurements: []
    },
    goalsAchieved: [],
    personalRecords: []
  };

  // In production, this would fetch from Airtable:
  /*
  if (process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN && process.env.AIRTABLE_BASE_ID) {
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    // Fetch workouts for the week
    const workouts = [];
    await base('Workouts')
      .select({
        filterByFormula: `AND(
          {User ID} = '${userId}',
          IS_AFTER({Date}, '${weekStart}'),
          IS_BEFORE({Date}, '${weekEnd}')
        )`,
        sort: [{ field: 'Date', direction: 'asc' }]
      })
      .eachPage((records, fetchNextPage) => {
        records.forEach(record => {
          workouts.push({
            id: record.id,
            date: record.get('Date'),
            exercise: record.get('Exercise'),
            sets: record.get('Sets') || 0,
            reps: record.get('Reps') || 0,
            weight: record.get('Weight') || 0,
            notes: record.get('Notes') || '',
            isPR: record.get('Is PR') || false
          });
        });
        fetchNextPage();
      });

    // Process workouts into report format
    report.workouts = processWorkoutsByDate(workouts);
    report.summary = calculateWorkoutSummary(workouts);

    // Fetch body weight measurements
    const weights = [];
    await base('BodyWeight')
      .select({
        filterByFormula: `AND(
          {User ID} = '${userId}',
          IS_AFTER({Date}, '${weekStart}'),
          IS_BEFORE({Date}, '${weekEnd}')
        )`,
        sort: [{ field: 'Date', direction: 'asc' }]
      })
      .eachPage((records, fetchNextPage) => {
        records.forEach(record => {
          weights.push({
            date: record.get('Date'),
            weight: record.get('Weight'),
            unit: record.get('Unit') || 'lbs'
          });
        });
        fetchNextPage();
      });

    report.weight = processWeightData(weights);

    // Fetch goals achieved this week
    const goals = [];
    await base('Goals')
      .select({
        filterByFormula: `AND(
          {User ID} = '${userId}',
          {Status} = 'Completed',
          IS_AFTER({Completion Date}, '${weekStart}'),
          IS_BEFORE({Completion Date}, '${weekEnd}')
        )`
      })
      .eachPage((records, fetchNextPage) => {
        records.forEach(record => {
          goals.push({
            name: record.get('Goal Name'),
            type: record.get('Goal Type'),
            achievedDate: record.get('Completion Date'),
            targetValue: record.get('Target Value'),
            achievedValue: record.get('Achieved Value')
          });
        });
        fetchNextPage();
      });

    report.goalsAchieved = goals;

    // Fetch PRs from Progress Records
    const prs = [];
    await base('Progress Records')
      .select({
        filterByFormula: `AND(
          {User ID} = '${userId}',
          IS_AFTER({Date}, '${weekStart}'),
          IS_BEFORE({Date}, '${weekEnd}')
        )`
      })
      .eachPage((records, fetchNextPage) => {
        records.forEach(record => {
          prs.push({
            exercise: record.get('Exercise'),
            weight: record.get('Weight'),
            reps: record.get('Reps'),
            date: record.get('Date')
          });
        });
        fetchNextPage();
      });

    report.personalRecords = prs;
  }
  */

  return report;
}

// Helper function to group workouts by date
function processWorkoutsByDate(workouts) {
  const grouped = {};
  
  workouts.forEach(workout => {
    const dateKey = workout.date;
    if (!grouped[dateKey]) {
      grouped[dateKey] = {
        date: workout.date,
        exercises: []
      };
    }
    
    grouped[dateKey].exercises.push({
      name: workout.exercise,
      sets: workout.sets,
      reps: workout.reps,
      weight: workout.weight,
      isPR: workout.isPR
    });
  });
  
  return Object.values(grouped);
}

// Helper function to calculate workout summary stats
function calculateWorkoutSummary(workouts) {
  const summary = {
    totalWorkouts: 0,
    totalExercises: workouts.length,
    totalSets: 0,
    totalReps: 0,
    totalWeight: 0,
    avgWorkoutDuration: 45, // Default estimate
    streak: 1 // Default
  };
  
  const uniqueDates = [...new Set(workouts.map(w => w.date))];
  summary.totalWorkouts = uniqueDates.length;
  
  workouts.forEach(workout => {
    summary.totalSets += workout.sets;
    summary.totalReps += workout.sets * workout.reps;
    summary.totalWeight += workout.sets * workout.reps * workout.weight;
  });
  
  return summary;
}

// Helper function to process weight data
function processWeightData(weights) {
  if (weights.length === 0) {
    return {
      startWeight: null,
      endWeight: null,
      change: 0,
      measurements: []
    };
  }
  
  const startWeight = weights[0].weight;
  const endWeight = weights[weights.length - 1].weight;
  
  return {
    startWeight,
    endWeight,
    change: endWeight - startWeight,
    measurements: weights
  };
}