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
    // Check environment variables
    if (!process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN) {
      throw new Error('AIRTABLE_PERSONAL_ACCESS_TOKEN environment variable is not set');
    }
    if (!process.env.AIRTABLE_BASE_ID) {
      throw new Error('AIRTABLE_BASE_ID environment variable is not set');
    }

    // Configure Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    const params = event.queryStringParameters || {};
    const {
      userId = 'default-user',
      timeframe = '30', // days
      includeGoals = 'true',
      includeWeight = 'true',
      includeWorkouts = 'true'
    } = params;

    const analytics = await generateComprehensiveAnalytics(
      base, 
      userId, 
      parseInt(timeframe),
      includeGoals === 'true',
      includeWeight === 'true',
      includeWorkouts === 'true'
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: analytics,
        timeframe: parseInt(timeframe),
        generatedAt: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Analytics API error:', error);
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

async function generateComprehensiveAnalytics(base, userId, timeframeDays, includeGoals, includeWeight, includeWorkouts) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeframeDays);
  const dateFilter = startDate.toISOString().split('T')[0];
  
  console.log('=== ANALYTICS DATE CALCULATION ===');
  console.log('Today:', new Date().toISOString().split('T')[0]);
  console.log('Timeframe days:', timeframeDays);
  console.log('Start date (inclusive):', dateFilter);
  console.log('Will include workouts ON OR AFTER:', dateFilter);

  const analytics = {
    summary: {},
    workoutAnalytics: {},
    weightAnalytics: {},
    goalAnalytics: {},
    progressAnalytics: {},
    insights: []
  };

  // Workout Analytics
  if (includeWorkouts) {
    console.log('=== ANALYTICS WORKOUT FETCH ===');
    console.log('User ID:', userId);
    console.log('Date filter (on or after):', dateFilter);
    
    const workouts = await fetchRecords(base, 'Workouts', {
      filterByFormula: `AND({User ID} = '${userId}', IS_SAME_OR_AFTER({Date}, '${dateFilter}'))`,
      sort: [{ field: 'Date', direction: 'asc' }]
    });

    console.log('Found workouts for analytics:', workouts.length);
    if (workouts.length > 0) {
      console.log('First workout:', {
        exercise: workouts[0].get('Exercise'),
        date: workouts[0].get('Date'),
        userId: workouts[0].get('User ID')
      });
    }

    analytics.workoutAnalytics = analyzeWorkouts(workouts, timeframeDays);
    console.log('Analytics result:', {
      totalWorkouts: analytics.workoutAnalytics.totalWorkouts,
      totalVolume: analytics.workoutAnalytics.totalVolume
    });
  }

  // Weight Analytics
  if (includeWeight) {
    const weightLogs = await fetchRecords(base, 'BodyWeight', {
      filterByFormula: `AND({User ID} = '${userId}', IS_SAME_OR_AFTER({Date}, '${dateFilter}'))`,
      sort: [{ field: 'Date', direction: 'asc' }]
    });

    analytics.weightAnalytics = analyzeWeight(weightLogs, timeframeDays);
  }

  // Goal Analytics
  if (includeGoals) {
    const goals = await fetchRecords(base, 'Goals', {
      filterByFormula: `{User ID} = '${userId}'`,
      sort: [{ field: 'Created Date', direction: 'desc' }]
    });

    analytics.goalAnalytics = analyzeGoals(goals);
  }

  // Progress Analytics (PRs)
  const progressRecords = await fetchRecords(base, 'Progress Records', {
    filterByFormula: `AND({User ID} = '${userId}', IS_SAME_OR_AFTER({Date Achieved}, '${dateFilter}'))`,
    sort: [{ field: 'Date Achieved', direction: 'desc' }]
  });

  analytics.progressAnalytics = analyzeProgress(progressRecords, timeframeDays);

  // Generate Summary
  analytics.summary = generateSummary(analytics);

  // Generate Insights
  analytics.insights = generateInsights(analytics, timeframeDays);

  return analytics;
}

// Helper function to fetch records
async function fetchRecords(base, tableName, options) {
  const records = [];
  try {
    console.log(`Fetching ${tableName} with options:`, JSON.stringify(options, null, 2));
    
    await base(tableName)
      .select(options)
      .eachPage((pageRecords, fetchNextPage) => {
        records.push(...pageRecords);
        fetchNextPage();
      });
      
    console.log(`Successfully fetched ${records.length} records from ${tableName}`);
  } catch (error) {
    console.error(`Error fetching ${tableName}:`, error);
    console.error('Query options that failed:', JSON.stringify(options, null, 2));
  }
  return records;
}

// Analyze workouts
function analyzeWorkouts(workouts, timeframeDays) {
  if (workouts.length === 0) {
    return {
      totalWorkouts: 0,
      averagePerWeek: 0,
      totalVolume: 0,
      averageVolume: 0,
      exerciseBreakdown: {},
      frequencyTrend: []
    };
  }

  let totalVolume = 0;
  const exerciseBreakdown = {};
  const dailyWorkouts = {};

  workouts.forEach(workout => {
    const exercise = workout.get('Exercise');
    const sets = workout.get('Sets') || 0;
    const reps = workout.get('Reps') || 0;
    const weight = workout.get('Weight') || 0;
    const volume = sets * reps * weight;
    const date = workout.get('Date');

    totalVolume += volume;

    // Exercise breakdown
    if (!exerciseBreakdown[exercise]) {
      exerciseBreakdown[exercise] = {
        count: 0,
        totalVolume: 0,
        maxWeight: 0
      };
    }
    exerciseBreakdown[exercise].count++;
    exerciseBreakdown[exercise].totalVolume += volume;
    exerciseBreakdown[exercise].maxWeight = Math.max(exerciseBreakdown[exercise].maxWeight, weight);

    // Daily frequency
    if (!dailyWorkouts[date]) {
      dailyWorkouts[date] = 0;
    }
    dailyWorkouts[date]++;
  });

  return {
    totalWorkouts: workouts.length,
    averagePerWeek: (workouts.length / timeframeDays) * 7,
    totalVolume,
    averageVolume: totalVolume / workouts.length,
    exerciseBreakdown,
    frequencyTrend: Object.entries(dailyWorkouts).map(([date, count]) => ({
      date,
      workouts: count
    }))
  };
}

// Analyze weight data
function analyzeWeight(weightLogs, timeframeDays) {
  if (weightLogs.length === 0) {
    return {
      currentWeight: null,
      weightChange: 0,
      trend: 'stable',
      averageWeeklyChange: 0,
      dataPoints: []
    };
  }

  const weights = weightLogs.map(log => ({
    date: log.get('Date'),
    weight: log.get('Weight')
  })).sort((a, b) => new Date(a.date) - new Date(b.date));

  const currentWeight = weights[weights.length - 1].weight;
  const startWeight = weights[0].weight;
  const weightChange = currentWeight - startWeight;
  const averageWeeklyChange = (weightChange / timeframeDays) * 7;

  let trend = 'stable';
  if (Math.abs(averageWeeklyChange) > 0.5) {
    trend = averageWeeklyChange > 0 ? 'gaining' : 'losing';
  }

  return {
    currentWeight,
    weightChange,
    trend,
    averageWeeklyChange,
    dataPoints: weights,
    totalEntries: weights.length
  };
}

// Analyze goals
function analyzeGoals(goals) {
  if (goals.length === 0) {
    return {
      totalGoals: 0,
      activeGoals: 0,
      completedGoals: 0,
      averageProgress: 0,
      goalsByType: {},
      upcomingDeadlines: []
    };
  }

  const goalsByType = {};
  const upcomingDeadlines = [];
  let totalProgress = 0;
  let activeGoals = 0;
  let completedGoals = 0;

  goals.forEach(goal => {
    const status = goal.get('Status');
    const goalType = goal.get('Goal Type');
    const progress = goal.get('Progress Percentage') || 0;
    const targetDate = goal.get('Target Date');
    const daysRemaining = goal.get('Days Remaining');

    if (status === 'Active') {
      activeGoals++;
      totalProgress += progress;

      if (daysRemaining !== null && daysRemaining <= 14) {
        upcomingDeadlines.push({
          id: goal.id,
          title: goal.get('Goal Title'),
          targetDate,
          daysRemaining,
          progress
        });
      }
    } else if (status === 'Completed') {
      completedGoals++;
    }

    if (!goalsByType[goalType]) {
      goalsByType[goalType] = { count: 0, avgProgress: 0 };
    }
    goalsByType[goalType].count++;
  });

  return {
    totalGoals: goals.length,
    activeGoals,
    completedGoals,
    averageProgress: activeGoals > 0 ? totalProgress / activeGoals : 0,
    goalsByType,
    upcomingDeadlines: upcomingDeadlines.sort((a, b) => a.daysRemaining - b.daysRemaining)
  };
}

// Analyze progress records
function analyzeProgress(progressRecords, timeframeDays) {
  if (progressRecords.length === 0) {
    return {
      totalPRs: 0,
      averagePRsPerWeek: 0,
      exercisesImproved: 0,
      totalImprovement: 0
    };
  }

  const exercisesImproved = new Set();
  let totalImprovement = 0;

  progressRecords.forEach(pr => {
    const exercise = pr.get('Exercise Name');
    const improvement = pr.get('Improvement') || 0;
    
    exercisesImproved.add(exercise);
    totalImprovement += improvement;
  });

  return {
    totalPRs: progressRecords.length,
    averagePRsPerWeek: (progressRecords.length / timeframeDays) * 7,
    exercisesImproved: exercisesImproved.size,
    totalImprovement,
    averageImprovement: totalImprovement / progressRecords.length
  };
}

// Generate summary
function generateSummary(analytics) {
  return {
    workoutFrequency: analytics.workoutAnalytics.averagePerWeek || 0,
    totalVolume: analytics.workoutAnalytics.totalVolume || 0,
    weightTrend: analytics.weightAnalytics.trend || 'no data',
    activeGoals: analytics.goalAnalytics.activeGoals || 0,
    recentPRs: analytics.progressAnalytics.totalPRs || 0,
    overallProgress: analytics.goalAnalytics.averageProgress || 0
  };
}

// Generate insights
function generateInsights(analytics, timeframeDays) {
  const insights = [];

  // Workout frequency insights
  const workoutFreq = analytics.workoutAnalytics.averagePerWeek;
  if (workoutFreq < 2) {
    insights.push({
      type: 'suggestion',
      category: 'frequency',
      message: 'Consider increasing workout frequency to 3-4 times per week for optimal results.',
      priority: 'high'
    });
  } else if (workoutFreq > 6) {
    insights.push({
      type: 'warning',
      category: 'frequency',
      message: 'High training frequency detected. Ensure adequate rest and recovery.',
      priority: 'medium'
    });
  }

  // Weight trend insights
  const weightTrend = analytics.weightAnalytics.trend;
  const weeklyChange = Math.abs(analytics.weightAnalytics.averageWeeklyChange);
  
  if (weightTrend === 'losing' && weeklyChange > 2) {
    insights.push({
      type: 'warning',
      category: 'weight',
      message: 'Rapid weight loss detected. Consider consulting a healthcare professional.',
      priority: 'high'
    });
  } else if (weightTrend === 'gaining' && weeklyChange > 2) {
    insights.push({
      type: 'warning',
      category: 'weight',
      message: 'Rapid weight gain detected. Monitor nutrition and exercise balance.',
      priority: 'medium'
    });
  }

  // Goal progress insights
  const avgProgress = analytics.goalAnalytics.averageProgress;
  if (avgProgress < 25 && analytics.goalAnalytics.activeGoals > 0) {
    insights.push({
      type: 'motivation',
      category: 'goals',
      message: 'Your goals are just getting started! Stay consistent to see progress.',
      priority: 'low'
    });
  } else if (avgProgress > 75) {
    insights.push({
      type: 'celebration',
      category: 'goals',
      message: 'Excellent progress on your goals! You\'re almost there!',
      priority: 'low'
    });
  }

  // PR insights
  if (analytics.progressAnalytics.totalPRs === 0) {
    insights.push({
      type: 'suggestion',
      category: 'progress',
      message: 'Focus on progressive overload to achieve new personal records.',
      priority: 'medium'
    });
  } else if (analytics.progressAnalytics.totalPRs > 3) {
    insights.push({
      type: 'celebration',
      category: 'progress',
      message: `Amazing! You've set ${analytics.progressAnalytics.totalPRs} personal records recently!`,
      priority: 'low'
    });
  }

  return insights;
}