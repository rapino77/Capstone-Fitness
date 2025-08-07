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
    analytics.strengthProgression = analyzeStrengthProgression(workouts);
    console.log('Analytics result:', {
      totalWorkouts: analytics.workoutAnalytics.totalWorkouts,
      totalVolume: analytics.workoutAnalytics.totalVolume,
      strengthProgressionExercises: Object.keys(analytics.strengthProgression).length
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

// Analyze strength progression for each exercise
function analyzeStrengthProgression(workouts) {
  if (workouts.length === 0) {
    return {};
  }

  const exerciseData = {};

  // Group workouts by exercise
  workouts.forEach(workout => {
    const exercise = workout.get('Exercise');
    const rawDate = workout.get('Date');
    const weight = parseFloat(workout.get('Weight')) || 0;
    const sets = parseInt(workout.get('Sets')) || 0;
    const reps = parseInt(workout.get('Reps')) || 0;

    // Skip invalid data - be more lenient
    if (!exercise || !rawDate || weight <= 0) {
      console.log('Skipping invalid workout:', { exercise, rawDate, weight, sets, reps });
      return;
    }
    
    // Use defaults for missing sets/reps
    const finalSets = sets > 0 ? sets : 1;
    const finalReps = reps > 0 ? reps : 1;

    // Validate date
    const date = new Date(rawDate);
    if (isNaN(date.getTime())) {
      console.log('Skipping workout with invalid date:', rawDate);
      return;
    }

    if (!exerciseData[exercise]) {
      exerciseData[exercise] = [];
    }

    exerciseData[exercise].push({
      date: rawDate, // Keep as string for consistency
      weight,
      sets: finalSets,
      reps: finalReps,
      volume: finalSets * finalReps * weight,
      // Calculate estimated 1RM using Brzycki formula
      estimatedOneRM: finalReps > 1 ? weight * (36 / (37 - finalReps)) : weight
    });
  });

  // Process each exercise's data
  const progressionData = {};
  console.log('=== STRENGTH PROGRESSION DEBUG ===');
  console.log('Exercises found:', Object.keys(exerciseData));
  console.log('Workout counts per exercise:', Object.entries(exerciseData).map(([ex, data]) => `${ex}: ${data.length}`));
  
  Object.entries(exerciseData).forEach(([exercise, workoutData]) => {
    // Sort by date
    const sortedWorkouts = workoutData.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Skip exercises with insufficient data
    if (sortedWorkouts.length === 0) {
      console.log(`Skipping ${exercise} - no valid workouts`);
      return;
    }

    // Calculate progression metrics
    const firstWorkout = sortedWorkouts[0];
    const lastWorkout = sortedWorkouts[sortedWorkouts.length - 1];
    
    const weightIncrease = (lastWorkout.weight || 0) - (firstWorkout.weight || 0);
    const oneRMIncrease = (lastWorkout.estimatedOneRM || 0) - (firstWorkout.estimatedOneRM || 0);
    const totalSessions = sortedWorkouts.length;
    
    // Calculate average weekly progression
    const daysBetween = Math.max((new Date(lastWorkout.date) - new Date(firstWorkout.date)) / (1000 * 60 * 60 * 24), 1);
    const weeksBetween = Math.max(daysBetween / 7, 1); // Minimum 1 week to avoid division by zero
    const averageWeeklyIncrease = weightIncrease / weeksBetween;

    // Create chart data points (aggregate by date to handle multiple workouts per day)
    const dateMap = new Map();

    sortedWorkouts.forEach(workout => {
      const dateKey = workout.date;
      // Validate workout data before processing
      if (!dateKey || workout.weight <= 0) {
        console.log(`Skipping invalid workout for ${exercise}:`, workout);
        return;
      }

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, {
          date: dateKey,
          maxWeight: workout.weight,
          maxOneRM: workout.estimatedOneRM,
          totalVolume: workout.volume,
          workoutCount: 1
        });
      } else {
        const existing = dateMap.get(dateKey);
        existing.maxWeight = Math.max(existing.maxWeight, workout.weight);
        existing.maxOneRM = Math.max(existing.maxOneRM, workout.estimatedOneRM);
        existing.totalVolume += workout.volume;
        existing.workoutCount += 1;
      }
    });

    // Convert map to array and format for charts
    const chartData = Array.from(dateMap.values())
      .map(entry => ({
        date: entry.date,
        weight: Number(entry.maxWeight) || 0, // Ensure numeric
        oneRM: Math.round((Number(entry.maxOneRM) || 0) * 10) / 10,
        volume: Number(entry.totalVolume) || 0,
        workouts: entry.workoutCount
      }))
      .filter(entry => entry.weight > 0 && entry.date) // Remove invalid entries
      .sort((a, b) => new Date(a.date) - new Date(b.date)); // Ensure chronological order
    
    // Ensure we have valid data for chart rendering
    if (chartData.length > 0) {
      // Log detailed chart data for debugging
      console.log(`Detailed chart data for ${exercise}:`, {
        dataPoints: chartData.map(point => ({
          date: point.date,
          weight: point.weight,
          isValidDate: !isNaN(new Date(point.date).getTime()),
          isValidWeight: !isNaN(point.weight) && point.weight > 0
        }))
      });
    }

    console.log(`Chart data for ${exercise}:`, {
      rawWorkouts: workoutData.length,
      chartDataPoints: chartData.length,
      dateRange: chartData.length > 0 ? `${chartData[0].date} to ${chartData[chartData.length-1].date}` : 'none',
      weightRange: chartData.length > 0 ? `${Math.min(...chartData.map(c => c.weight))} to ${Math.max(...chartData.map(c => c.weight))} lbs` : 'none',
      sampleChartData: chartData.slice(0, 2), // Show first 2 data points for debugging
      allWeights: chartData.map(c => c.weight)
    });

    progressionData[exercise] = {
      chartData: chartData,
      metrics: {
        totalSessions,
        weightIncrease: Number(weightIncrease.toFixed(1)) || 0,
        oneRMIncrease: Math.round((oneRMIncrease || 0) * 10) / 10,
        averageWeeklyIncrease: Math.round((averageWeeklyIncrease || 0) * 10) / 10,
        startWeight: Number(firstWorkout.weight) || 0,
        currentWeight: Number(lastWorkout.weight) || 0,
        startOneRM: Math.round((firstWorkout.estimatedOneRM || 0) * 10) / 10,
        currentOneRM: Math.round((lastWorkout.estimatedOneRM || 0) * 10) / 10,
        timespan: Math.round(daysBetween) || 0,
        progressPercentage: (firstWorkout.weight > 0) ? Math.round((weightIncrease / firstWorkout.weight) * 100) : 0
      }
    };
  });

  return progressionData;
}