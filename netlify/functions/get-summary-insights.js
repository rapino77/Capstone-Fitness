const Airtable = require('airtable');

// Generate comprehensive weekly/monthly summary with insights
const generateSummaryInsights = async (base, userId, period = 'weekly') => {
  const now = new Date();
  const periodDays = period === 'weekly' ? 7 : 30;
  const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const previousPeriodStart = new Date(startDate.getTime() - periodDays * 24 * 60 * 60 * 1000);
  
  // Format dates for Airtable
  const currentPeriodStart = startDate.toISOString().split('T')[0];
  const previousPeriodStartStr = previousPeriodStart.toISOString().split('T')[0];
  const currentPeriodStartStr = startDate.toISOString().split('T')[0];

  console.log(`Generating ${period} summary from ${currentPeriodStart} to ${now.toISOString().split('T')[0]}`);

  // Fetch data for current and previous periods
  const [currentWorkouts, previousWorkouts, currentWeights, previousWeights, goals, prs] = await Promise.all([
    fetchWorkouts(base, userId, currentPeriodStart),
    fetchWorkouts(base, userId, previousPeriodStartStr, currentPeriodStartStr),
    fetchWeights(base, userId, currentPeriodStart),
    fetchWeights(base, userId, previousPeriodStartStr, currentPeriodStartStr),
    fetchGoals(base, userId),
    fetchPRs(base, userId, currentPeriodStart)
  ]);

  // Calculate metrics for current period
  const currentMetrics = calculatePeriodMetrics(currentWorkouts, currentWeights, goals, prs);
  const previousMetrics = calculatePeriodMetrics(previousWorkouts, previousWeights, goals, []);

  // Generate insights and recommendations
  const insights = generateInsights(currentMetrics, previousMetrics, period);
  const recommendations = generateRecommendations(currentMetrics, previousMetrics, goals);

  // Create summary cards
  const summaryCards = createSummaryCards(currentMetrics, previousMetrics, period);

  return {
    period: period,
    dateRange: {
      start: currentPeriodStart,
      end: now.toISOString().split('T')[0]
    },
    metrics: currentMetrics,
    previousMetrics: previousMetrics,
    summaryCards,
    insights,
    recommendations,
    highlights: generateHighlights(currentMetrics, prs),
    trends: calculateTrends(currentMetrics, previousMetrics)
  };
};

const fetchWorkouts = async (base, userId, startDate, endDate = null) => {
  const workouts = [];
  let filterFormula = `AND({User ID} = '${userId}', IS_SAME_OR_AFTER({Date}, '${startDate}'))`;
  
  if (endDate) {
    filterFormula = `AND({User ID} = '${userId}', IS_SAME_OR_AFTER({Date}, '${startDate}'), IS_BEFORE({Date}, '${endDate}'))`;
  }

  await base('Workouts')
    .select({
      filterByFormula: filterFormula,
      sort: [{ field: 'Date', direction: 'asc' }]
    })
    .eachPage((pageRecords, fetchNextPage) => {
      pageRecords.forEach(record => {
        workouts.push({
          date: record.get('Date'),
          exercise: record.get('Exercise'),
          sets: record.get('Sets') || 0,
          reps: record.get('Reps') || 0,
          weight: record.get('Weight') || 0,
          duration: record.get('Duration') || 0
        });
      });
      fetchNextPage();
    });

  return workouts;
};

const fetchWeights = async (base, userId, startDate, endDate = null) => {
  const weights = [];
  let filterFormula = `AND({User ID} = '${userId}', IS_SAME_OR_AFTER({Date}, '${startDate}'))`;
  
  if (endDate) {
    filterFormula = `AND({User ID} = '${userId}', IS_SAME_OR_AFTER({Date}, '${startDate}'), IS_BEFORE({Date}, '${endDate}'))`;
  }

  await base('BodyWeight')
    .select({
      filterByFormula: filterFormula,
      sort: [{ field: 'Date', direction: 'asc' }]
    })
    .eachPage((pageRecords, fetchNextPage) => {
      pageRecords.forEach(record => {
        weights.push({
          date: record.get('Date'),
          weight: record.get('Weight')
        });
      });
      fetchNextPage();
    });

  return weights;
};

const fetchGoals = async (base, userId) => {
  const goals = [];
  await base('Goals')
    .select({
      filterByFormula: `AND({User ID} = '${userId}', {Status} = 'Active')`,
      sort: [{ field: 'Target Date', direction: 'asc' }]
    })
    .eachPage((pageRecords, fetchNextPage) => {
      pageRecords.forEach(record => {
        goals.push({
          id: record.id,
          title: record.get('Goal Title'),
          type: record.get('Goal Type'),
          progress: record.get('Progress Percentage') || 0,
          targetDate: record.get('Target Date'),
          daysRemaining: record.get('Days Remaining') || 0
        });
      });
      fetchNextPage();
    });

  return goals;
};

const fetchPRs = async (base, userId, startDate) => {
  const prs = [];
  await base('Progress Records')
    .select({
      filterByFormula: `AND({User ID} = '${userId}', IS_SAME_OR_AFTER({Date Achieved}, '${startDate}'))`,
      sort: [{ field: 'Date Achieved', direction: 'desc' }]
    })
    .eachPage((pageRecords, fetchNextPage) => {
      pageRecords.forEach(record => {
        prs.push({
          exercise: record.get('Exercise Name'),
          weight: record.get('Max Weight'),
          improvement: record.get('Improvement'),
          date: record.get('Date Achieved')
        });
      });
      fetchNextPage();
    });

  return prs;
};

const calculatePeriodMetrics = (workouts, weights, goals, prs) => {
  // Workout metrics
  const totalWorkouts = workouts.length;
  const uniqueWorkoutDays = new Set(workouts.map(w => w.date)).size;
  const totalVolume = workouts.reduce((sum, w) => sum + (w.sets * w.reps * w.weight), 0);
  const totalDuration = workouts.reduce((sum, w) => sum + w.duration, 0);
  const avgDuration = totalWorkouts > 0 ? totalDuration / totalWorkouts : 0;
  
  // Exercise variety
  const uniqueExercises = new Set(workouts.map(w => w.exercise)).size;
  const exerciseBreakdown = {};
  workouts.forEach(w => {
    if (!exerciseBreakdown[w.exercise]) {
      exerciseBreakdown[w.exercise] = { count: 0, volume: 0 };
    }
    exerciseBreakdown[w.exercise].count++;
    exerciseBreakdown[w.exercise].volume += (w.sets * w.reps * w.weight);
  });

  // Weight metrics
  const weightEntries = weights.length;
  const weightChange = weights.length >= 2 ? weights[weights.length - 1].weight - weights[0].weight : 0;
  const avgWeight = weights.length > 0 ? weights.reduce((sum, w) => sum + w.weight, 0) / weights.length : 0;

  // Goal metrics
  const activeGoals = goals.length;
  const goalsNearDeadline = goals.filter(g => g.daysRemaining <= 7 && g.daysRemaining > 0).length;
  const avgGoalProgress = goals.length > 0 ? goals.reduce((sum, g) => sum + g.progress, 0) / goals.length : 0;

  // PR metrics
  const totalPRs = prs.length;
  const uniqueExercisesPRs = new Set(prs.map(pr => pr.exercise)).size;
  const totalImprovement = prs.reduce((sum, pr) => sum + (pr.improvement || 0), 0);

  return {
    workouts: {
      total: totalWorkouts,
      uniqueDays: uniqueWorkoutDays,
      volume: totalVolume,
      duration: totalDuration,
      avgDuration: avgDuration,
      uniqueExercises: uniqueExercises,
      breakdown: exerciseBreakdown
    },
    weight: {
      entries: weightEntries,
      change: weightChange,
      average: avgWeight
    },
    goals: {
      active: activeGoals,
      nearDeadline: goalsNearDeadline,
      avgProgress: avgGoalProgress
    },
    prs: {
      total: totalPRs,
      uniqueExercises: uniqueExercisesPRs,
      totalImprovement: totalImprovement
    }
  };
};

const createSummaryCards = (current, previous, period) => {
  const periodLabel = period === 'weekly' ? 'Week' : 'Month';
  const cards = [];

  // Workouts Summary Card
  const workoutChange = current.workouts.total - (previous.workouts.total || 0);
  cards.push({
    title: `${periodLabel} Workout Summary`,
    value: current.workouts.total,
    subtitle: `${current.workouts.uniqueDays} active days`,
    change: workoutChange,
    changeType: workoutChange > 0 ? 'positive' : workoutChange < 0 ? 'negative' : 'neutral',
    icon: '💪',
    details: [
      `${(current.workouts.volume / 1000).toFixed(1)}k lbs total volume`,
      `${current.workouts.uniqueExercises} different exercises`,
      current.workouts.avgDuration > 0 ? `${Math.round(current.workouts.avgDuration)} min avg duration` : null
    ].filter(Boolean)
  });

  // Performance Summary Card
  const volumeChange = current.workouts.volume - (previous.workouts.volume || 0);
  cards.push({
    title: `${periodLabel} Performance`,
    value: `${(current.workouts.volume / 1000).toFixed(1)}k`,
    subtitle: 'lbs total volume',
    change: Math.round(volumeChange / 1000),
    changeType: volumeChange > 0 ? 'positive' : volumeChange < 0 ? 'negative' : 'neutral',
    icon: '📈',
    details: [
      current.prs.total > 0 ? `${current.prs.total} new PRs` : null,
      current.prs.totalImprovement > 0 ? `+${current.prs.totalImprovement.toFixed(1)} lbs PR improvement` : null,
      `${current.workouts.uniqueExercises} exercises trained`
    ].filter(Boolean)
  });

  // Weight Summary Card (if weight data exists)
  if (current.weight.entries > 0) {
    cards.push({
      title: `${periodLabel} Body Weight`,
      value: current.weight.average.toFixed(1),
      subtitle: 'lbs average',
      change: current.weight.change,
      changeType: Math.abs(current.weight.change) > 0.5 ? 
        (current.weight.change > 0 ? 'neutral' : 'positive') : 'neutral',
      icon: '⚖️',
      details: [
        `${current.weight.entries} weigh-ins`,
        current.weight.change !== 0 ? 
          `${current.weight.change > 0 ? '+' : ''}${current.weight.change.toFixed(1)} lbs change` : 'No change',
      ]
    });
  }

  // Goals Summary Card
  if (current.goals.active > 0) {
    cards.push({
      title: `${periodLabel} Goal Progress`,
      value: `${current.goals.avgProgress.toFixed(0)}%`,
      subtitle: 'average progress',
      change: null,
      changeType: 'neutral',
      icon: '🎯',
      details: [
        `${current.goals.active} active goals`,
        current.goals.nearDeadline > 0 ? `⚠️ ${current.goals.nearDeadline} due this week` : 'No urgent deadlines'
      ]
    });
  }

  return cards;
};

const generateInsights = (current, previous, period) => {
  const insights = [];
  const periodLabel = period === 'weekly' ? 'week' : 'month';

  // Workout consistency insights
  const workoutDensity = current.workouts.uniqueDays / (period === 'weekly' ? 7 : 30);
  if (workoutDensity >= 0.5) {
    insights.push({
      type: 'positive',
      category: 'consistency',
      title: 'Great Workout Consistency',
      message: `You trained on ${current.workouts.uniqueDays} days this ${periodLabel}. Excellent consistency!`,
      priority: 'high'
    });
  } else if (workoutDensity >= 0.3) {
    insights.push({
      type: 'neutral',
      category: 'consistency',
      title: 'Moderate Consistency',
      message: `${current.workouts.uniqueDays} workout days this ${periodLabel}. Consider adding 1-2 more sessions.`,
      priority: 'medium'
    });
  } else {
    insights.push({
      type: 'negative',
      category: 'consistency',
      title: 'Consistency Opportunity',
      message: `Only ${current.workouts.uniqueDays} workout days this ${periodLabel}. Aim for more regular training.`,
      priority: 'high'
    });
  }

  // Volume progression insights
  if (previous.workouts.volume > 0) {
    const volumeChange = ((current.workouts.volume - previous.workouts.volume) / previous.workouts.volume) * 100;
    if (volumeChange > 10) {
      insights.push({
        type: 'positive',
        category: 'progression',
        title: 'Strong Volume Increase',
        message: `Training volume increased by ${volumeChange.toFixed(0)}% compared to last ${periodLabel}.`,
        priority: 'high'
      });
    } else if (volumeChange < -10) {
      insights.push({
        type: 'warning',
        category: 'progression',
        title: 'Volume Decrease',
        message: `Training volume decreased by ${Math.abs(volumeChange).toFixed(0)}%. Consider increasing intensity.`,
        priority: 'medium'
      });
    }
  }

  // PR insights
  if (current.prs.total > 0) {
    insights.push({
      type: 'celebration',
      category: 'achievement',
      title: 'Personal Records Set!',
      message: `Congratulations on ${current.prs.total} new personal records this ${periodLabel}!`,
      priority: 'high'
    });
  }

  // Exercise variety insights
  if (current.workouts.uniqueExercises < 5 && current.workouts.total > 5) {
    insights.push({
      type: 'suggestion',
      category: 'variety',
      title: 'Exercise Variety',
      message: `You focused on ${current.workouts.uniqueExercises} exercises. Consider adding variety for balanced development.`,
      priority: 'low'
    });
  }

  // Weight trend insights
  if (current.weight.entries >= 3) {
    const weeklyChange = current.weight.change * (7 / (period === 'weekly' ? 7 : 30));
    if (Math.abs(weeklyChange) > 2) {
      insights.push({
        type: 'warning',
        category: 'weight',
        title: 'Rapid Weight Change',
        message: `Weight change of ${weeklyChange.toFixed(1)} lbs/week detected. Consider reviewing nutrition.`,
        priority: 'high'
      });
    }
  }

  return insights;
};

const generateRecommendations = (current, previous, goals) => {
  const recommendations = [];

  // Frequency recommendations
  if (current.workouts.uniqueDays < 3) {
    recommendations.push({
      type: 'frequency',
      title: 'Increase Workout Frequency',
      description: 'Aim for 3-4 workout days per week for optimal results.',
      actionItems: [
        'Schedule specific workout days',
        'Start with shorter sessions if time is limited',
        'Consider home workouts on busy days'
      ],
      priority: 'high'
    });
  }

  // Volume recommendations
  if (current.workouts.volume < 50000 && current.workouts.total >= 3) {
    recommendations.push({
      type: 'intensity',
      title: 'Progressive Overload Focus',
      description: 'Gradually increase weight or reps to continue making progress.',
      actionItems: [
        'Add 5-10 lbs when you can complete all reps easily',
        'Increase reps before increasing weight',
        'Track your lifts to monitor progress'
      ],
      priority: 'medium'
    });
  }

  // Goal-based recommendations
  const urgentGoals = goals.filter(g => g.daysRemaining <= 14 && g.daysRemaining > 0);
  if (urgentGoals.length > 0) {
    recommendations.push({
      type: 'goals',
      title: 'Urgent Goal Deadline',
      description: `${urgentGoals.length} goals have deadlines within 2 weeks.`,
      actionItems: urgentGoals.map(g => `Focus on: ${g.title} (${g.daysRemaining} days left)`),
      priority: 'high'
    });
  }

  // Exercise variety recommendations
  if (current.workouts.uniqueExercises < 6 && current.workouts.total >= 4) {
    recommendations.push({
      type: 'variety',
      title: 'Exercise Variety',
      description: 'Add more exercises for balanced muscle development.',
      actionItems: [
        'Include both push and pull movements',
        'Add compound exercises for efficiency',
        'Try new exercises monthly to prevent plateaus'
      ],
      priority: 'low'
    });
  }

  return recommendations;
};

const generateHighlights = (metrics, prs) => {
  const highlights = [];

  // Workout highlights
  if (metrics.workouts.total > 0) {
    highlights.push(`💪 Completed ${metrics.workouts.total} workouts`);
    
    if (metrics.workouts.volume > 0) {
      highlights.push(`📊 Moved ${(metrics.workouts.volume / 1000).toFixed(1)}k lbs total`);
    }
    
    if (metrics.workouts.uniqueExercises > 0) {
      highlights.push(`🎯 Trained ${metrics.workouts.uniqueExercises} different exercises`);
    }
  }

  // PR highlights
  if (prs.length > 0) {
    highlights.push(`🏆 Set ${prs.length} new personal records`);
    
    if (metrics.prs.totalImprovement > 0) {
      highlights.push(`📈 Improved by ${metrics.prs.totalImprovement.toFixed(1)} lbs total`);
    }
  }

  // Weight highlights
  if (metrics.weight.entries > 0) {
    highlights.push(`⚖️ Logged weight ${metrics.weight.entries} times`);
  }

  return highlights;
};

const calculateTrends = (current, previous) => {
  const trends = {};

  // Workout trends
  if (previous.workouts.total > 0) {
    trends.workouts = {
      direction: current.workouts.total > previous.workouts.total ? 'up' : 
                 current.workouts.total < previous.workouts.total ? 'down' : 'stable',
      change: current.workouts.total - previous.workouts.total,
      percentage: ((current.workouts.total - previous.workouts.total) / previous.workouts.total * 100).toFixed(0)
    };
  }

  // Volume trends
  if (previous.workouts.volume > 0) {
    trends.volume = {
      direction: current.workouts.volume > previous.workouts.volume ? 'up' : 
                 current.workouts.volume < previous.workouts.volume ? 'down' : 'stable',
      change: Math.round((current.workouts.volume - previous.workouts.volume) / 1000),
      percentage: ((current.workouts.volume - previous.workouts.volume) / previous.workouts.volume * 100).toFixed(0)
    };
  }

  return trends;
};

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
    const apiKey = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN || process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    
    if (!apiKey || !baseId) {
      throw new Error('Missing required environment variables');
    }

    const base = new Airtable({ apiKey }).base(baseId);
    const params = event.queryStringParameters || {};
    const { userId = 'default-user', period = 'weekly' } = params;

    if (!['weekly', 'monthly'].includes(period)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Period must be either "weekly" or "monthly"' })
      };
    }

    const summary = await generateSummaryInsights(base, userId, period);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: summary
      })
    };

  } catch (error) {
    console.error('Error generating summary insights:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to generate summary insights',
        message: error.message
      })
    };
  }
};