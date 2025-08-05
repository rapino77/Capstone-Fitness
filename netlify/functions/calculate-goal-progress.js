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

  try {
    // Check environment variables
    if (!process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN || !process.env.AIRTABLE_BASE_ID) {
      throw new Error('Missing Airtable environment variables');
    }

    // Configure Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    console.log('=== CALCULATING AUTOMATIC GOAL PROGRESS ===');

    // Get all active goals
    const goals = await fetchAllGoals(base);
    console.log(`Found ${goals.length} active goals`);

    const progressUpdates = [];

    // Process each goal based on its type
    for (const goal of goals) {
      try {
        console.log(`Processing goal: ${goal.goalType} - Current: ${goal.currentValue}, Target: ${goal.targetValue}`);
        
        const progress = await calculateProgressForGoal(base, goal);
        if (progress !== null) {
          progressUpdates.push({
            goalId: goal.id,
            goalType: goal.goalType,
            oldProgress: goal.currentValue,
            newProgress: progress.currentValue,
            progressPercentage: progress.percentage,
            dataSource: progress.dataSource,
            lastUpdated: new Date().toISOString()
          });

          // Update the goal if progress changed
          if (progress.currentValue !== goal.currentValue) {
            await updateGoalProgress(base, goal.id, progress);
            console.log(`Updated ${goal.goalType} goal: ${goal.currentValue} → ${progress.currentValue}`);
          } else {
            console.log(`No change for ${goal.goalType} goal: ${goal.currentValue}`);
          }
        } else {
          console.log(`Could not calculate progress for ${goal.goalType} goal`);
        }
      } catch (goalError) {
        console.error(`Error processing goal ${goal.id}:`, goalError);
        progressUpdates.push({
          goalId: goal.id,
          error: goalError.message
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: `Processed ${goals.length} goals`,
        updates: progressUpdates,
        summary: {
          totalGoals: goals.length,
          updatedGoals: progressUpdates.filter(u => !u.error && u.newProgress !== u.oldProgress).length,
          errors: progressUpdates.filter(u => u.error).length
        }
      })
    };

  } catch (error) {
    console.error('Calculate goal progress error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: 'Failed to calculate goal progress',
        message: error.message
      })
    };
  }
};

// Fetch all active goals using simpler approach
async function fetchAllGoals(base) {
  try {
    const goals = [];
    
    const records = await base('Goals').select({
      filterByFormula: `{Status} = 'Active'`
    }).all();

    for (const record of records) {
      goals.push({
        id: record.id,
        goalType: record.get('Goal Type'),
        targetValue: record.get('Target Value'),
        currentValue: record.get('Current Value') || 0,
        targetDate: record.get('Target Date'),
        exerciseName: record.get('Exercise Name'),
        userId: record.get('User ID')
      });
    }

    return goals;
  } catch (error) {
    console.error('Error fetching goals:', error);
    throw error;
  }
}

// Calculate progress for a specific goal based on its type
async function calculateProgressForGoal(base, goal) {
  console.log(`Calculating progress for ${goal.goalType} goal:`, goal);

  switch (goal.goalType) {
    case 'Body Weight':
      return await calculateBodyWeightProgress(base, goal);
    
    case 'Exercise PR':
      return await calculateExercisePRProgress(base, goal);
    
    case 'Frequency':
      return await calculateFrequencyProgress(base, goal);
    
    case 'Volume':
      return await calculateVolumeProgress(base, goal);
    
    default:
      console.log(`Unknown goal type: ${goal.goalType}`);
      return null;
  }
}

// Calculate Body Weight goal progress
async function calculateBodyWeightProgress(base, goal) {
  console.log('Calculating body weight progress...');
  
  try {
    // Get latest weight entry using .all() method
    const weightRecords = await base('BodyWeight').select({
      sort: [{ field: 'Date', direction: 'desc' }],
      maxRecords: 1
    }).all();

    if (weightRecords.length === 0) {
      console.log('No weight data found');
      return null;
    }

    const latestWeight = weightRecords[0].get('Weight');
    console.log(`Latest weight: ${latestWeight} lbs, Target: ${goal.targetValue} lbs`);

    // For weight goals, current progress is the current weight
    const currentValue = latestWeight;
    const percentage = Math.min((currentValue / goal.targetValue) * 100, 100);

    return {
      currentValue,
      percentage,
      dataSource: 'BodyWeight',
      lastDataPoint: weightRecords[0].get('Date')
    };

  } catch (error) {
    console.error('Error calculating body weight progress:', error);
    return null;
  }
}

// Calculate Exercise PR goal progress
async function calculateExercisePRProgress(base, goal) {
  console.log(`Calculating PR progress for exercise: ${goal.exerciseName}`);
  
  if (!goal.exerciseName) {
    console.log('No exercise name specified for PR goal');
    return null;
  }

  try {
    // Get all workouts for this exercise, sorted by weight descending
    const workoutRecords = await base('Workouts').select({
      filterByFormula: `{Exercise} = '${goal.exerciseName}'`,
      sort: [{ field: 'Weight', direction: 'desc' }],
      maxRecords: 1
    }).all();

    if (workoutRecords.length === 0) {
      console.log(`No workout data found for exercise: ${goal.exerciseName}`);
      return null;
    }

    const bestWeight = workoutRecords[0].get('Weight');
    console.log(`Best ${goal.exerciseName}: ${bestWeight} lbs, Target: ${goal.targetValue} lbs`);

    const currentValue = bestWeight;
    const percentage = Math.min((currentValue / goal.targetValue) * 100, 100);

    return {
      currentValue,
      percentage,
      dataSource: 'Workouts',
      exercise: goal.exerciseName,
      lastDataPoint: workoutRecords[0].get('Date')
    };

  } catch (error) {
    console.error('Error calculating exercise PR progress:', error);
    return null;
  }
}

// Calculate Frequency goal progress (workout sessions per period)
async function calculateFrequencyProgress(base, goal) {
  console.log('Calculating frequency progress...');
  
  try {
    // Get workout count for the current period (assuming weekly frequency)
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const workoutRecords = await base('Workouts').select({
      filterByFormula: `IS_AFTER({Date}, '${weekStartStr}')`
    }).all();

    const currentValue = workoutRecords.length;
    console.log(`Workouts this week: ${currentValue}, Target: ${goal.targetValue}`);

    const percentage = Math.min((currentValue / goal.targetValue) * 100, 100);

    return {
      currentValue,
      percentage,
      dataSource: 'Workouts',
      period: 'weekly',
      periodStart: weekStartStr
    };

  } catch (error) {
    console.error('Error calculating frequency progress:', error);
    return null;
  }
}

// Calculate Volume goal progress (total volume per period)
async function calculateVolumeProgress(base, goal) {
  console.log('Calculating volume progress...');
  
  try {
    // Get total volume for the current week
    const now = new Date();
    const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
    const weekStartStr = weekStart.toISOString().split('T')[0];

    const workoutRecords = await base('Workouts').select({
      filterByFormula: `IS_AFTER({Date}, '${weekStartStr}')`
    }).all();

    let totalVolume = 0;
    workoutRecords.forEach(record => {
      const weight = record.get('Weight') || 0;
      const reps = record.get('Reps') || 0;
      const sets = record.get('Sets') || 1;
      totalVolume += weight * reps * sets;
    });

    console.log(`Total volume this week: ${totalVolume} lbs, Target: ${goal.targetValue} lbs`);

    const currentValue = totalVolume;
    const percentage = Math.min((currentValue / goal.targetValue) * 100, 100);

    return {
      currentValue,
      percentage,
      dataSource: 'Workouts',
      period: 'weekly',
      periodStart: weekStartStr
    };

  } catch (error) {
    console.error('Error calculating volume progress:', error);
    return null;
  }
}

// Update goal progress in Airtable
async function updateGoalProgress(base, goalId, progress) {
  try {
    // Only update Current Value since other fields might be linked/formula fields
    await base('Goals').update(goalId, {
      'Current Value': progress.currentValue
    });
    console.log(`Updated goal ${goalId} progress to ${progress.currentValue}`);
  } catch (error) {
    console.error(`Failed to update goal ${goalId}:`, error);
    throw error;
  }
}