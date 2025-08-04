const Airtable = require('airtable');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-N8N-Webhook-Secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Verify webhook secret if provided
    const webhookSecret = event.headers['x-n8n-webhook-secret'];
    if (process.env.N8N_WEBHOOK_SECRET && webhookSecret !== process.env.N8N_WEBHOOK_SECRET) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    const data = JSON.parse(event.body);
    const { action, type, payload } = data;

    // Configure Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_API_KEY
    }).base(process.env.AIRTABLE_BASE_ID);

    let result;

    switch (action) {
      case 'trigger_pr_check':
        result = await handlePRCheck(base, payload);
        break;
      
      case 'goal_milestone_check':
        result = await handleGoalMilestoneCheck(base, payload);
        break;
      
      case 'weekly_report':
        result = await handleWeeklyReport(base, payload);
        break;
      
      case 'workout_recommendation':
        result = await handleWorkoutRecommendation(base, payload);
        break;
      
      case 'weight_trend_alert':
        result = await handleWeightTrendAlert(base, payload);
        break;
      
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Unknown action type' })
        };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        action,
        result,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('N8N Webhook error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Webhook processing failed',
        message: error.message
      })
    };
  }
};

// Handle PR detection trigger
async function handlePRCheck(base, payload) {
  const { userId = 'default-user', exerciseName } = payload;

  try {
    // Get recent workouts
    const recentWorkouts = [];
    await base('Workouts')
      .select({
        filterByFormula: exerciseName 
          ? `AND({User ID} = '${userId}', {Exercise} = '${exerciseName}')` 
          : `{User ID} = '${userId}'`,
        sort: [{ field: 'Date', direction: 'desc' }],
        maxRecords: 10
      })
      .eachPage((records, fetchNextPage) => {
        recentWorkouts.push(...records);
        fetchNextPage();
      });

    if (recentWorkouts.length === 0) {
      return { message: 'No recent workouts found', prsDetected: 0 };
    }

    // Find potential PRs
    const latestWorkout = recentWorkouts[0];
    const exercise = latestWorkout.get('Exercise');
    const weight = latestWorkout.get('Weight');

    // Check existing PR
    const existingPRs = [];
    await base('Progress Records')
      .select({
        filterByFormula: `AND({User ID} = '${userId}', {Exercise Name} = '${exercise}')`,
        sort: [{ field: 'Max Weight', direction: 'desc' }],
        maxRecords: 1
      })
      .eachPage((records, fetchNextPage) => {
        existingPRs.push(...records);
        fetchNextPage();
      });

    const currentPR = existingPRs[0];
    const isNewPR = !currentPR || weight > currentPR.get('Max Weight');

    if (isNewPR) {
      const previousPR = currentPR ? currentPR.get('Max Weight') : 0;
      
      // Create new PR record
      await base('Progress Records').create({
        'User ID': userId,
        'Exercise Name': exercise,
        'Max Weight': weight,
        'Reps': latestWorkout.get('Reps'),
        'Date Achieved': latestWorkout.get('Date'),
        'Workout ID': [latestWorkout.id],
        'Previous PR': previousPR
      });

      return {
        message: 'New PR detected!',
        exercise,
        newPR: weight,
        previousPR,
        improvement: weight - previousPR,
        prsDetected: 1
      };
    }

    return { message: 'No new PRs detected', prsDetected: 0 };

  } catch (error) {
    throw new Error(`PR check failed: ${error.message}`);
  }
}

// Handle goal milestone checking
async function handleGoalMilestoneCheck(base, payload) {
  const { userId = 'default-user', goalId } = payload;

  try {
    let filterFormula = `AND({User ID} = '${userId}', {Status} = 'Active')`;
    if (goalId) {
      filterFormula = `{Record ID} = '${goalId}'`;
    }

    const goals = [];
    await base('Goals')
      .select({
        filterByFormula: filterFormula
      })
      .eachPage((records, fetchNextPage) => {
        goals.push(...records);
        fetchNextPage();
      });

    const milestones = [];
    const milestoneThresholds = [25, 50, 75, 100];

    for (const goal of goals) {
      const progress = goal.get('Progress Percentage') || 0;
      
      for (const threshold of milestoneThresholds) {
        if (progress >= threshold && progress < threshold + 5) {
          // Check if milestone already recorded
          const existingMilestone = [];
          await base('Goal Progress')
            .select({
              filterByFormula: `AND({Goal ID} = '${goal.id}', {Milestone Achieved} = TRUE())`,
              sort: [{ field: 'Date Recorded', direction: 'desc' }],
              maxRecords: 1
            })
            .eachPage((records, fetchNextPage) => {
              existingMilestone.push(...records);
              fetchNextPage();
            });

          const lastMilestone = existingMilestone[0];
          const lastMilestoneProgress = lastMilestone ? 
            (lastMilestone.get('Progress Value') / goal.get('Target Value')) * 100 : 0;

          if (!lastMilestone || lastMilestoneProgress < threshold) {
            // Record milestone
            await base('Goal Progress').create({
              'Goal ID': [goal.id],
              'Progress Value': goal.get('Current Value'),
              'Date Recorded': new Date().toISOString().split('T')[0],
              'Progress Type': 'Milestone',
              'Milestone Achieved': true,
              'Notes': `${threshold}% milestone achieved!`
            });

            milestones.push({
              goalId: goal.id,
              goalTitle: goal.get('Goal Title'),
              milestone: threshold,
              progress: progress.toFixed(1)
            });
          }
        }
      }
    }

    return {
      message: `Processed ${goals.length} goals`,
      milestonesDetected: milestones.length,
      milestones
    };

  } catch (error) {
    throw new Error(`Goal milestone check failed: ${error.message}`);
  }
}

// Handle weekly report generation
async function handleWeeklyReport(base, payload) {
  const { userId = 'default-user' } = payload;

  try {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const dateFilter = weekAgo.toISOString().split('T')[0];

    // Get weekly workouts
    const workouts = [];
    await base('Workouts')
      .select({
        filterByFormula: `AND({User ID} = '${userId}', IS_AFTER({Date}, '${dateFilter}'))`,
        sort: [{ field: 'Date', direction: 'desc' }]
      })
      .eachPage((records, fetchNextPage) => {
        workouts.push(...records);
        fetchNextPage();
      });

    // Get weekly weight logs
    const weightLogs = [];
    await base('BodyWeight')
      .select({
        filterByFormula: `AND({User ID} = '${userId}', IS_AFTER({Date}, '${dateFilter}'))`,
        sort: [{ field: 'Date', direction: 'desc' }]
      })
      .eachPage((records, fetchNextPage) => {
        weightLogs.push(...records);
        fetchNextPage();
      });

    // Get active goals
    const goals = [];
    await base('Goals')
      .select({
        filterByFormula: `AND({User ID} = '${userId}', {Status} = 'Active')`
      })
      .eachPage((records, fetchNextPage) => {
        goals.push(...records);
        fetchNextPage();
      });

    // Calculate weekly stats
    const totalVolume = workouts.reduce((sum, workout) => {
      const sets = workout.get('Sets') || 0;
      const reps = workout.get('Reps') || 0;
      const weight = workout.get('Weight') || 0;
      return sum + (sets * reps * weight);
    }, 0);

    const weightChange = weightLogs.length >= 2 ? 
      weightLogs[0].get('Weight') - weightLogs[weightLogs.length - 1].get('Weight') : 0;

    const report = {
      period: '7 days',
      workouts: {
        total: workouts.length,
        totalVolume: Math.round(totalVolume),
        averagePerDay: (workouts.length / 7).toFixed(1)
      },
      weight: {
        entries: weightLogs.length,
        change: weightChange.toFixed(1),
        trend: weightChange > 0.5 ? 'gaining' : weightChange < -0.5 ? 'losing' : 'stable'
      },
      goals: {
        active: goals.length,
        averageProgress: goals.length > 0 ? 
          (goals.reduce((sum, goal) => sum + (goal.get('Progress Percentage') || 0), 0) / goals.length).toFixed(1) : 0
      }
    };

    return {
      message: 'Weekly report generated',
      report
    };

  } catch (error) {
    throw new Error(`Weekly report generation failed: ${error.message}`);
  }
}

// Handle workout recommendation
async function handleWorkoutRecommendation(base, payload) {
  const { userId = 'default-user' } = payload;

  try {
    // Get recent workouts to analyze patterns
    const recentWorkouts = [];
    await base('Workouts')
      .select({
        filterByFormula: `{User ID} = '${userId}'`,
        sort: [{ field: 'Date', direction: 'desc' }],
        maxRecords: 20
      })
      .eachPage((records, fetchNextPage) => {
        recentWorkouts.push(...records);
        fetchNextPage();
      });

    if (recentWorkouts.length === 0) {
      return {
        message: 'No workout history available',
        recommendation: 'Start with basic compound movements: squats, deadlifts, bench press'
      };
    }

    // Analyze exercise frequency
    const exerciseFreq = {};
    recentWorkouts.forEach(workout => {
      const exercise = workout.get('Exercise');
      exerciseFreq[exercise] = (exerciseFreq[exercise] || 0) + 1;
    });

    // Find least trained exercises
    const leastTrained = Object.entries(exerciseFreq)
      .sort(([,a], [,b]) => a - b)
      .slice(0, 3)
      .map(([exercise]) => exercise);

    const recommendation = leastTrained.length > 0 
      ? `Focus on these exercises: ${leastTrained.join(', ')}`
      : 'Continue with your current routine and consider progressive overload';

    return {
      message: 'Workout recommendation generated',
      recommendation,
      analysedWorkouts: recentWorkouts.length,
      exerciseFrequency: exerciseFreq
    };

  } catch (error) {
    throw new Error(`Workout recommendation failed: ${error.message}`);
  }
}

// Handle weight trend alerts
async function handleWeightTrendAlert(base, payload) {
  const { userId = 'default-user', alertThreshold = 2 } = payload;

  try {
    const weightLogs = [];
    await base('BodyWeight')
      .select({
        filterByFormula: `{User ID} = '${userId}'`,
        sort: [{ field: 'Date', direction: 'desc' }],
        maxRecords: 14 // 2 weeks of data
      })
      .eachPage((records, fetchNextPage) => {
        weightLogs.push(...records);
        fetchNextPage();
      });

    if (weightLogs.length < 3) {
      return {
        message: 'Insufficient weight data for trend analysis',
        alert: false
      };
    }

    // Calculate weekly rate of change
    const weights = weightLogs.map(log => log.get('Weight')).reverse();
    const weeklyChange = (weights[weights.length - 1] - weights[0]) / (weights.length / 7);

    let alert = false;
    let alertMessage = '';

    if (Math.abs(weeklyChange) > alertThreshold) {
      alert = true;
      alertMessage = weeklyChange > 0 
        ? `Rapid weight gain detected: ${weeklyChange.toFixed(1)} lbs/week`
        : `Rapid weight loss detected: ${Math.abs(weeklyChange).toFixed(1)} lbs/week`;
    }

    return {
      message: 'Weight trend analysis completed',
      alert,
      alertMessage,
      weeklyChange: weeklyChange.toFixed(1),
      dataPoints: weights.length
    };

  } catch (error) {
    throw new Error(`Weight trend alert failed: ${error.message}`);
  }
}