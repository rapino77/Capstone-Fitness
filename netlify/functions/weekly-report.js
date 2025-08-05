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
    if (!process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN) {
      throw new Error('AIRTABLE_PERSONAL_ACCESS_TOKEN environment variable is not set');
    }
    if (!process.env.AIRTABLE_BASE_ID) {
      throw new Error('AIRTABLE_BASE_ID environment variable is not set');
    }

    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    const params = event.queryStringParameters || {};
    const {
      userId = 'default-user',
      weekOffset = '0', // 0 = current week, 1 = last week, etc
      format = 'detailed', // detailed, summary, email
      includeProjections = 'true'
    } = params;

    const report = await generateWeeklyReport(
      base, 
      userId, 
      parseInt(weekOffset),
      format,
      includeProjections === 'true'
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: report,
        generatedAt: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Weekly Report API error:', error);
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

async function generateWeeklyReport(base, userId, weekOffset, format, includeProjections) {
  // Calculate date ranges
  const now = new Date();
  const currentWeekStart = new Date(now);
  currentWeekStart.setDate(now.getDate() - now.getDay() - (weekOffset * 7)); // Start of week (Sunday)
  currentWeekStart.setHours(0, 0, 0, 0);
  
  const currentWeekEnd = new Date(currentWeekStart);
  currentWeekEnd.setDate(currentWeekStart.getDate() + 6); // End of week (Saturday)
  currentWeekEnd.setHours(23, 59, 59, 999);

  const previousWeekStart = new Date(currentWeekStart);
  previousWeekStart.setDate(currentWeekStart.getDate() - 7);
  
  const previousWeekEnd = new Date(currentWeekEnd);
  previousWeekEnd.setDate(currentWeekEnd.getDate() - 7);

  // Initialize report structure
  const report = {
    period: {
      weekOffset,
      startDate: currentWeekStart.toISOString().split('T')[0],
      endDate: currentWeekEnd.toISOString().split('T')[0],
      isCurrentWeek: weekOffset === 0
    },
    summary: {},
    workoutAnalysis: {},
    strengthProgress: {},
    goalProgress: {},
    bodyComposition: {},
    comparisons: {},
    insights: [],
    recommendations: []
  };

  // Fetch all data for the week
  const [
    currentWeekWorkouts,
    previousWeekWorkouts,
    currentWeekWeight,
    previousWeekWeight,
    goals,
    progressRecords
  ] = await Promise.all([
    fetchWorkouts(base, userId, currentWeekStart, currentWeekEnd),
    fetchWorkouts(base, userId, previousWeekStart, previousWeekEnd),
    fetchWeightEntries(base, userId, currentWeekStart, currentWeekEnd),
    fetchWeightEntries(base, userId, previousWeekStart, previousWeekEnd),
    fetchGoals(base, userId),
    fetchProgressRecords(base, userId, currentWeekStart, currentWeekEnd)
  ]);

  // Generate analysis sections
  report.summary = generateSummary(currentWeekWorkouts, currentWeekWeight, goals, progressRecords);
  report.workoutAnalysis = analyzeWorkouts(currentWeekWorkouts, previousWeekWorkouts);
  report.strengthProgress = analyzeStrengthProgress(currentWeekWorkouts, progressRecords);
  report.goalProgress = analyzeGoalProgress(goals);
  report.bodyComposition = analyzeBodyComposition(currentWeekWeight, previousWeekWeight);
  report.comparisons = generateComparisons(currentWeekWorkouts, previousWeekWorkouts, currentWeekWeight, previousWeekWeight);
  report.insights = generateInsights(report);
  report.recommendations = generateRecommendations(report);

  // Add projections if requested
  if (includeProjections) {
    report.projections = generateProjections(report);
  }

  // Format output based on requested format
  if (format === 'summary') {
    return createSummaryReport(report);
  } else if (format === 'email') {
    return createEmailReport(report);
  }

  return report; // Default detailed format
}

// Helper functions for data fetching
async function fetchWorkouts(base, userId, startDate, endDate) {
  const workouts = [];
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  await base('Workouts')
    .select({
      filterByFormula: `AND(
        {User ID} = '${userId}',
        IS_AFTER({Date}, '${startDateStr}'),
        IS_BEFORE({Date}, '${endDateStr}')
      )`,
      sort: [{ field: 'Date', direction: 'asc' }]
    })
    .eachPage((records, fetchNextPage) => {
      workouts.push(...records.map(record => ({
        id: record.id,
        date: record.get('Date'),
        exercise: record.get('Exercise'),
        sets: record.get('Sets') || 1,
        reps: record.get('Reps') || 1,
        weight: record.get('Weight') || 0,
        volume: (record.get('Sets') || 1) * (record.get('Reps') || 1) * (record.get('Weight') || 0),
        notes: record.get('Notes') || ''
      })));
      fetchNextPage();
    });

  return workouts;
}

async function fetchWeightEntries(base, userId, startDate, endDate) {
  const weights = [];
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  await base('BodyWeight')
    .select({
      filterByFormula: `AND(
        {User ID} = '${userId}',
        IS_AFTER({Date}, '${startDateStr}'),
        IS_BEFORE({Date}, '${endDateStr}')
      )`,
      sort: [{ field: 'Date', direction: 'asc' }]
    })
    .eachPage((records, fetchNextPage) => {
      weights.push(...records.map(record => ({
        id: record.id,
        date: record.get('Date'),
        weight: record.get('Weight'),
        notes: record.get('Notes') || ''
      })));
      fetchNextPage();
    });

  return weights;
}

async function fetchGoals(base, userId) {
  const goals = [];
  
  await base('Goals')
    .select({
      filterByFormula: `{User ID} = '${userId}'`,
      sort: [{ field: 'Created Date', direction: 'desc' }]
    })
    .eachPage((records, fetchNextPage) => {
      goals.push(...records.map(record => ({
        id: record.id,
        goalType: record.get('Goal Type'),
        goalTitle: record.get('Goal Title') || record.get('Goal Type'),
        targetValue: record.get('Target Value'),
        currentValue: record.get('Current Value') || 0,
        targetDate: record.get('Target Date'),
        status: record.get('Status'),
        priority: record.get('Priority'),
        progressPercentage: Math.min(((record.get('Current Value') || 0) / (record.get('Target Value') || 1)) * 100, 100)
      })));
      fetchNextPage();
    });

  return goals;
}

async function fetchProgressRecords(base, userId, startDate, endDate) {
  const records = [];
  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];
  
  await base('Progress Records')
    .select({
      filterByFormula: `AND(
        {User ID} = '${userId}',
        IS_AFTER({Date Achieved}, '${startDateStr}'),
        IS_BEFORE({Date Achieved}, '${endDateStr}')
      )`,
      sort: [{ field: 'Date Achieved', direction: 'desc' }]
    })
    .eachPage((pageRecords, fetchNextPage) => {
      records.push(...pageRecords.map(record => ({
        id: record.id,
        exercise: record.get('Exercise Name'),
        maxWeight: record.get('Max Weight'),
        previousPR: record.get('Previous PR') || 0,
        improvement: record.get('Max Weight') - (record.get('Previous PR') || 0),
        dateAchieved: record.get('Date Achieved')
      })));
      fetchNextPage();
    });

  return records;
}

// Analysis functions
function generateSummary(workouts, weightEntries, goals, progressRecords) {
  const totalWorkouts = workouts.length;
  const totalVolume = workouts.reduce((sum, w) => sum + w.volume, 0);
  const uniqueExercises = new Set(workouts.map(w => w.exercise)).size;
  const newPRs = progressRecords.length;
  const activeGoals = goals.filter(g => g.status === 'Active').length;
  const avgGoalProgress = goals.length > 0 
    ? goals.reduce((sum, g) => sum + g.progressPercentage, 0) / goals.length 
    : 0;

  return {
    totalWorkouts,
    totalVolume: Math.round(totalVolume),
    averageVolumePerWorkout: totalWorkouts > 0 ? Math.round(totalVolume / totalWorkouts) : 0,
    uniqueExercises,
    newPersonalRecords: newPRs,
    activeGoals,
    averageGoalProgress: Math.round(avgGoalProgress),
    weightEntries: weightEntries.length,
    weeklyMVP: determineMVP(workouts, progressRecords, goals)
  };
}

function analyzeWorkouts(currentWeek, previousWeek) {
  const current = {
    totalWorkouts: currentWeek.length,
    totalVolume: currentWeek.reduce((sum, w) => sum + w.volume, 0),
    exerciseBreakdown: getExerciseBreakdown(currentWeek),
    dailyDistribution: getDailyDistribution(currentWeek)
  };

  const previous = {
    totalWorkouts: previousWeek.length,
    totalVolume: previousWeek.reduce((sum, w) => sum + w.volume, 0),
    exerciseBreakdown: getExerciseBreakdown(previousWeek)
  };

  return {
    current,
    previous,
    changes: {
      workoutFrequency: current.totalWorkouts - previous.totalWorkouts,
      volumeChange: current.totalVolume - previous.totalVolume,
      volumeChangePercent: previous.totalVolume > 0 
        ? ((current.totalVolume - previous.totalVolume) / previous.totalVolume) * 100 
        : 0
    }
  };
}

function analyzeStrengthProgress(workouts, progressRecords) {
  const exerciseMaxes = {};
  
  // Find max weight for each exercise this week
  workouts.forEach(workout => {
    const { exercise, weight } = workout;
    if (!exerciseMaxes[exercise] || weight > exerciseMaxes[exercise]) {
      exerciseMaxes[exercise] = weight;
    }
  });

  return {
    exerciseMaxes,
    personalRecords: progressRecords.map(pr => ({
      exercise: pr.exercise,
      newPR: pr.maxWeight,
      improvement: pr.improvement,
      improvementPercent: pr.previousPR > 0 ? (pr.improvement / pr.previousPR) * 100 : 0
    })),
    totalImprovement: progressRecords.reduce((sum, pr) => sum + pr.improvement, 0),
    strengthTrend: calculateStrengthTrend(exerciseMaxes, progressRecords)
  };
}

function analyzeGoalProgress(goals) {
  const activeGoals = goals.filter(g => g.status === 'Active');
  const completedThisWeek = goals.filter(g => g.status === 'Completed').length;
  
  const goalsByType = activeGoals.reduce((acc, goal) => {
    if (!acc[goal.goalType]) {
      acc[goal.goalType] = [];
    }
    acc[goal.goalType].push(goal);
    return acc;
  }, {});

  const urgentGoals = activeGoals.filter(goal => {
    const daysRemaining = Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24));
    return daysRemaining <= 14 && goal.progressPercentage < 75;
  });

  return {
    totalActiveGoals: activeGoals.length,
    completedThisWeek,
    averageProgress: activeGoals.length > 0 
      ? activeGoals.reduce((sum, g) => sum + g.progressPercentage, 0) / activeGoals.length 
      : 0,
    goalsByType,
    urgentGoals,
    progressDistribution: {
      notStarted: activeGoals.filter(g => g.progressPercentage < 10).length,
      started: activeGoals.filter(g => g.progressPercentage >= 10 && g.progressPercentage < 50).length,
      halfway: activeGoals.filter(g => g.progressPercentage >= 50 && g.progressPercentage < 90).length,
      nearCompletion: activeGoals.filter(g => g.progressPercentage >= 90).length
    }
  };
}

function analyzeBodyComposition(currentWeek, previousWeek) {
  if (currentWeek.length === 0 && previousWeek.length === 0) {
    return { noData: true };
  }

  const currentAvg = currentWeek.length > 0 
    ? currentWeek.reduce((sum, w) => sum + w.weight, 0) / currentWeek.length 
    : null;
    
  const previousAvg = previousWeek.length > 0 
    ? previousWeek.reduce((sum, w) => sum + w.weight, 0) / previousWeek.length 
    : null;

  const weightChange = currentAvg && previousAvg ? currentAvg - previousAvg : 0;
  const trend = Math.abs(weightChange) < 0.5 ? 'stable' : weightChange > 0 ? 'increasing' : 'decreasing';

  return {
    currentWeight: currentAvg,
    previousWeight: previousAvg,
    weightChange,
    weightChangePercent: previousAvg ? (weightChange / previousAvg) * 100 : 0,
    trend,
    consistency: currentWeek.length >= 3 ? 'high' : currentWeek.length >= 1 ? 'medium' : 'low'
  };
}

function generateComparisons(currentWorkouts, previousWorkouts, currentWeight, previousWeight) {
  return {
    workout: {
      frequency: `${currentWorkouts.length} vs ${previousWorkouts.length} workouts`,
      volume: `${Math.round(currentWorkouts.reduce((sum, w) => sum + w.volume, 0))} vs ${Math.round(previousWorkouts.reduce((sum, w) => sum + w.volume, 0))} lbs total`,
      consistency: currentWorkouts.length >= previousWorkouts.length ? 'improved' : 'decreased'
    },
    weight: currentWeight.length > 0 && previousWeight.length > 0 ? {
      tracking: `${currentWeight.length} vs ${previousWeight.length} entries`,
      trend: currentWeight.length >= previousWeight.length ? 'more consistent' : 'less consistent'
    } : null
  };
}

function generateInsights(report) {
  const insights = [];
  
  // Workout insights
  if (report.summary.totalWorkouts === 0) {
    insights.push({
      type: 'warning',
      category: 'activity',
      message: 'No workouts logged this week. Consider scheduling at least 3 workout sessions.',
      priority: 'high'
    });
  } else if (report.summary.totalWorkouts >= 5) {
    insights.push({
      type: 'celebration',
      category: 'consistency',
      message: `Excellent consistency with ${report.summary.totalWorkouts} workouts this week!`,
      priority: 'low'
    });
  }

  // Volume insights
  if (report.workoutAnalysis.changes.volumeChangePercent > 20) {
    insights.push({
      type: 'info',
      category: 'volume',
      message: `Volume increased by ${report.workoutAnalysis.changes.volumeChangePercent.toFixed(1)}% from last week. Great progressive overload!`,
      priority: 'medium'
    });
  } else if (report.workoutAnalysis.changes.volumeChangePercent < -20) {
    insights.push({
      type: 'warning',
      category: 'volume',
      message: `Volume decreased by ${Math.abs(report.workoutAnalysis.changes.volumeChangePercent).toFixed(1)}% from last week. Consider increasing intensity.`,
      priority: 'medium'
    });
  }

  // PR insights
  if (report.summary.newPersonalRecords > 0) {
    insights.push({
      type: 'celebration',
      category: 'strength',
      message: `Amazing! You set ${report.summary.newPersonalRecords} new personal record${report.summary.newPersonalRecords > 1 ? 's' : ''} this week!`,
      priority: 'high'
    });
  }

  // Goal insights
  if (report.goalProgress.urgentGoals.length > 0) {
    insights.push({
      type: 'urgent',
      category: 'goals',
      message: `${report.goalProgress.urgentGoals.length} goal${report.goalProgress.urgentGoals.length > 1 ? 's' : ''} need attention with upcoming deadlines.`,
      priority: 'high'
    });
  }

  return insights;
}

function generateRecommendations(report) {
  const recommendations = [];

  // Workout frequency recommendations
  if (report.summary.totalWorkouts < 3) {
    recommendations.push({
      category: 'frequency',
      priority: 'high',
      message: 'Aim for at least 3 workouts next week for optimal progress.',
      actionItems: [
        'Schedule specific workout times',
        'Start with shorter 30-minute sessions',
        'Focus on compound movements'
      ]
    });
  }

  // Volume progression recommendations
  if (report.workoutAnalysis.changes.volumeChangePercent < 5) {
    recommendations.push({
      category: 'progression',
      priority: 'medium',
      message: 'Consider increasing training volume for continued progress.',
      actionItems: [
        'Add 1-2 extra sets to main exercises',
        'Increase weight by 2.5-5 lbs',
        'Add an extra workout day'
      ]
    });
  }

  // Goal-specific recommendations
  report.goalProgress.urgentGoals.forEach(goal => {
    recommendations.push({
      category: 'goals',
      priority: 'high',
      message: `Focus on "${goal.goalTitle}" - deadline approaching with ${goal.progressPercentage.toFixed(0)}% progress.`,
      actionItems: [
        'Increase training frequency for this goal',
        'Track progress daily',
        'Consider adjusting target if unrealistic'
      ]
    });
  });

  return recommendations;
}

function generateProjections(report) {
  const projections = {};

  // Volume projection
  const volumeTrend = report.workoutAnalysis.changes.volumeChangePercent;
  if (volumeTrend !== 0) {
    projections.nextWeekVolume = {
      conservative: Math.round(report.workoutAnalysis.current.totalVolume * 1.05),
      realistic: Math.round(report.workoutAnalysis.current.totalVolume * (1 + volumeTrend/100)),
      optimistic: Math.round(report.workoutAnalysis.current.totalVolume * 1.15)
    };
  }

  // Strength projections based on recent PRs
  if (report.strengthProgress.personalRecords.length > 0) {
    projections.strengthGains = {};
    report.strengthProgress.personalRecords.forEach(pr => {
      projections.strengthGains[pr.exercise] = {
        current: pr.newPR,
        next30Days: Math.round((pr.newPR + pr.improvement * 0.8) * 100) / 100,
        confidence: pr.improvementPercent > 5 ? 'high' : 'medium'
      };
    });
  }

  return projections;
}

// Helper functions
function determineMVP(workouts, progressRecords, goals) {
  if (progressRecords.length > 0) {
    const bestPR = progressRecords.reduce((best, pr) => 
      pr.improvementPercent > (best.improvementPercent || 0) ? pr : best
    );
    return `New PR: ${bestPR.exercise} ${bestPR.maxWeight} lbs (+${bestPR.improvement} lbs)`;
  }
  
  if (workouts.length > 0) {
    const maxVolume = Math.max(...workouts.map(w => w.volume));
    const bestWorkout = workouts.find(w => w.volume === maxVolume);
    return `Best workout: ${bestWorkout.exercise} with ${maxVolume} lbs total volume`;
  }
  
  const nearCompletionGoals = goals.filter(g => g.progressPercentage >= 90);
  if (nearCompletionGoals.length > 0) {
    return `Goal progress: ${nearCompletionGoals[0].goalTitle} at ${nearCompletionGoals[0].progressPercentage.toFixed(0)}%`;
  }
  
  return 'Keep up the consistency!';
}

function getExerciseBreakdown(workouts) {
  return workouts.reduce((acc, workout) => {
    if (!acc[workout.exercise]) {
      acc[workout.exercise] = { count: 0, totalVolume: 0, maxWeight: 0 };
    }
    acc[workout.exercise].count++;
    acc[workout.exercise].totalVolume += workout.volume;
    acc[workout.exercise].maxWeight = Math.max(acc[workout.exercise].maxWeight, workout.weight);
    return acc;
  }, {});
}

function getDailyDistribution(workouts) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const distribution = {};
  
  workouts.forEach(workout => {
    const dayIndex = new Date(workout.date).getDay();
    const dayName = days[dayIndex];
    if (!distribution[dayName]) {
      distribution[dayName] = 0;
    }
    distribution[dayName]++;
  });
  
  return distribution;
}

function calculateStrengthTrend(exerciseMaxes, progressRecords) {
  const totalExercises = Object.keys(exerciseMaxes).length;
  const exercisesWithPRs = progressRecords.length;
  
  if (exercisesWithPRs / totalExercises > 0.5) return 'excellent';
  if (exercisesWithPRs / totalExercises > 0.25) return 'good';
  if (exercisesWithPRs > 0) return 'moderate';
  return 'stable';
}

function createSummaryReport(report) {
  return {
    period: report.period,
    headline: `Week of ${report.period.startDate}: ${report.summary.totalWorkouts} workouts, ${report.summary.newPersonalRecords} PRs`,
    keyMetrics: {
      workouts: report.summary.totalWorkouts,
      volume: report.summary.totalVolume,
      prs: report.summary.newPersonalRecords,
      goalProgress: `${report.summary.averageGoalProgress}%`
    },
    topInsight: report.insights[0]?.message || 'Keep up the great work!',
    nextWeekFocus: report.recommendations[0]?.message || 'Continue current momentum'
  };
}

function createEmailReport(report) {
  const emailHtml = `
    <h2>Your Weekly Fitness Report</h2>
    <p><strong>Week of ${report.period.startDate}</strong></p>
    
    <h3>📊 This Week's Summary</h3>
    <ul>
      <li>Workouts: ${report.summary.totalWorkouts}</li>
      <li>Total Volume: ${report.summary.totalVolume} lbs</li>
      <li>New PRs: ${report.summary.newPersonalRecords}</li>
      <li>Goal Progress: ${report.summary.averageGoalProgress}% average</li>
    </ul>
    
    <h3>🏆 Week's MVP</h3>
    <p>${report.summary.weeklyMVP}</p>
    
    <h3>💡 Key Insights</h3>
    <ul>
      ${report.insights.slice(0, 3).map(insight => `<li>${insight.message}</li>`).join('')}
    </ul>
    
    <h3>🎯 Next Week's Focus</h3>
    <ul>
      ${report.recommendations.slice(0, 2).map(rec => `<li>${rec.message}</li>`).join('')}
    </ul>
  `;
  
  return {
    html: emailHtml,
    text: emailHtml.replace(/<[^>]*>/g, ''), // Strip HTML for text version
    subject: `Weekly Fitness Report - ${report.period.startDate}`,
    summary: report.summary
  };
}