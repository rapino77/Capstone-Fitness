const Airtable = require('airtable');

// Generate comprehensive progress report data
const generateProgressReport = async (base, userId, options = {}) => {
  const {
    format = 'json',
    timeframe = 90, // days
    includeWorkouts = true,
    includeWeight = true,
    includeGoals = true,
    includePRs = true,
    includeAnalytics = true
  } = options;

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - timeframe * 24 * 60 * 60 * 1000);
  
  console.log(`Generating progress report for user ${userId} from ${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`);

  const report = {
    metadata: {
      userId,
      generatedAt: endDate.toISOString(),
      reportPeriod: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        timeframeDays: timeframe
      },
      format,
      includedData: {
        workouts: includeWorkouts,
        weight: includeWeight,
        goals: includeGoals,
        prs: includePRs,
        analytics: includeAnalytics
      }
    },
    data: {}
  };

  // Fetch workout data
  if (includeWorkouts) {
    console.log('Fetching workout data...');
    report.data.workouts = await fetchWorkoutData(base, userId, startDate);
  }

  // Fetch weight data
  if (includeWeight) {
    console.log('Fetching weight data...');
    report.data.weight = await fetchWeightData(base, userId, startDate);
  }

  // Fetch goals data
  if (includeGoals) {
    console.log('Fetching goals data...');
    report.data.goals = await fetchGoalsData(base, userId);
  }

  // Fetch PRs data
  if (includePRs) {
    console.log('Fetching PRs data...');
    report.data.prs = await fetchPRsData(base, userId, startDate);
  }

  // Generate analytics
  if (includeAnalytics) {
    console.log('Generating analytics...');
    report.data.analytics = generateAnalytics(report.data);
  }

  // Add summary statistics
  report.summary = generateSummary(report.data);

  return report;
};

const fetchWorkoutData = async (base, userId, startDate) => {
  const workouts = [];
  
  await base('Workouts')
    .select({
      filterByFormula: `AND({User ID} = '${userId}', IS_SAME_OR_AFTER({Date}, '${startDate.toISOString().split('T')[0]}'))`,
      sort: [{ field: 'Date', direction: 'desc' }]
    })
    .eachPage((pageRecords, fetchNextPage) => {
      pageRecords.forEach(record => {
        workouts.push({
          id: record.id,
          date: record.get('Date'),
          exercise: record.get('Exercise'),
          sets: record.get('Sets') || 0,
          reps: record.get('Reps') || 0,
          weight: record.get('Weight') || 0,
          duration: record.get('Duration') || 0,
          notes: record.get('Notes') || '',
          volume: (record.get('Sets') || 0) * (record.get('Reps') || 0) * (record.get('Weight') || 0)
        });
      });
      fetchNextPage();
    });

  return {
    totalWorkouts: workouts.length,
    workouts: workouts,
    exerciseBreakdown: calculateExerciseBreakdown(workouts),
    weeklyBreakdown: calculateWeeklyBreakdown(workouts),
    volumeProgression: calculateVolumeProgression(workouts)
  };
};

const fetchWeightData = async (base, userId, startDate) => {
  const weights = [];
  
  await base('BodyWeight')
    .select({
      filterByFormula: `AND({User ID} = '${userId}', IS_SAME_OR_AFTER({Date}, '${startDate.toISOString().split('T')[0]}'))`,
      sort: [{ field: 'Date', direction: 'asc' }]
    })
    .eachPage((pageRecords, fetchNextPage) => {
      pageRecords.forEach(record => {
        weights.push({
          id: record.id,
          date: record.get('Date'),
          weight: record.get('Weight'),
          unit: record.get('Unit') || 'lbs',
          notes: record.get('Notes') || ''
        });
      });
      fetchNextPage();
    });

  return {
    totalEntries: weights.length,
    entries: weights,
    statistics: calculateWeightStatistics(weights),
    trend: calculateWeightTrend(weights)
  };
};

const fetchGoalsData = async (base, userId) => {
  const goals = [];
  
  await base('Goals')
    .select({
      filterByFormula: `{User ID} = '${userId}'`,
      sort: [{ field: 'Created Date', direction: 'desc' }]
    })
    .eachPage((pageRecords, fetchNextPage) => {
      pageRecords.forEach(record => {
        goals.push({
          id: record.id,
          title: record.get('Goal Title'),
          type: record.get('Goal Type'),
          targetValue: record.get('Target Value'),
          currentValue: record.get('Current Value'),
          progress: record.get('Progress Percentage') || 0,
          status: record.get('Status'),
          targetDate: record.get('Target Date'),
          createdDate: record.get('Created Date'),
          daysRemaining: record.get('Days Remaining'),
          description: record.get('Description') || ''
        });
      });
      fetchNextPage();
    });

  return {
    totalGoals: goals.length,
    activeGoals: goals.filter(g => g.status === 'Active').length,
    completedGoals: goals.filter(g => g.status === 'Completed').length,
    goals: goals,
    goalsByType: calculateGoalsByType(goals),
    progressSummary: calculateGoalProgress(goals)
  };
};

const fetchPRsData = async (base, userId, startDate) => {
  const prs = [];
  
  await base('Progress Records')
    .select({
      filterByFormula: `AND({User ID} = '${userId}', IS_SAME_OR_AFTER({Date Achieved}, '${startDate.toISOString().split('T')[0]}'))`,
      sort: [{ field: 'Date Achieved', direction: 'desc' }]
    })
    .eachPage((pageRecords, fetchNextPage) => {
      pageRecords.forEach(record => {
        prs.push({
          id: record.id,
          exercise: record.get('Exercise Name'),
          maxWeight: record.get('Max Weight'),
          improvement: record.get('Improvement'),
          dateAchieved: record.get('Date Achieved'),
          previousRecord: record.get('Previous Record'),
          recordType: record.get('Record Type')
        });
      });
      fetchNextPage();
    });

  return {
    totalPRs: prs.length,
    prs: prs,
    exercisesPRs: calculateExercisePRs(prs),
    improvementTotal: prs.reduce((sum, pr) => sum + (pr.improvement || 0), 0),
    monthlyBreakdown: calculateMonthlyPRBreakdown(prs)
  };
};

// Analytics helper functions
const calculateExerciseBreakdown = (workouts) => {
  const breakdown = {};
  workouts.forEach(workout => {
    if (!breakdown[workout.exercise]) {
      breakdown[workout.exercise] = {
        count: 0,
        totalVolume: 0,
        maxWeight: 0,
        totalSets: 0,
        totalReps: 0
      };
    }
    breakdown[workout.exercise].count++;
    breakdown[workout.exercise].totalVolume += workout.volume;
    breakdown[workout.exercise].maxWeight = Math.max(breakdown[workout.exercise].maxWeight, workout.weight);
    breakdown[workout.exercise].totalSets += workout.sets;
    breakdown[workout.exercise].totalReps += workout.reps;
  });
  
  return Object.entries(breakdown)
    .map(([exercise, data]) => ({ exercise, ...data }))
    .sort((a, b) => b.totalVolume - a.totalVolume);
};

const calculateWeeklyBreakdown = (workouts) => {
  const weeks = {};
  workouts.forEach(workout => {
    const date = new Date(workout.date);
    const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weeks[weekKey]) {
      weeks[weekKey] = {
        weekStart: weekKey,
        workoutCount: 0,
        totalVolume: 0,
        exercises: new Set()
      };
    }
    
    weeks[weekKey].workoutCount++;
    weeks[weekKey].totalVolume += workout.volume;
    weeks[weekKey].exercises.add(workout.exercise);
  });
  
  return Object.values(weeks).map(week => ({
    ...week,
    uniqueExercises: week.exercises.size,
    exercises: Array.from(week.exercises)
  })).sort((a, b) => new Date(b.weekStart) - new Date(a.weekStart));
};

const calculateVolumeProgression = (workouts) => {
  const exercises = {};
  
  workouts.forEach(workout => {
    if (!exercises[workout.exercise]) {
      exercises[workout.exercise] = [];
    }
    exercises[workout.exercise].push({
      date: workout.date,
      weight: workout.weight,
      volume: workout.volume
    });
  });
  
  // Calculate progression for each exercise
  Object.keys(exercises).forEach(exercise => {
    exercises[exercise] = exercises[exercise]
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .map((session, index, array) => ({
        ...session,
        progression: index > 0 ? session.weight - array[0].weight : 0
      }));
  });
  
  return exercises;
};

const calculateWeightStatistics = (weights) => {
  if (weights.length === 0) return {};
  
  const weightValues = weights.map(w => w.weight);
  const sortedWeights = [...weightValues].sort((a, b) => a - b);
  
  return {
    current: weights[weights.length - 1]?.weight,
    starting: weights[0]?.weight,
    change: weights.length >= 2 ? weights[weights.length - 1].weight - weights[0].weight : 0,
    min: Math.min(...weightValues),
    max: Math.max(...weightValues),
    average: weightValues.reduce((sum, w) => sum + w, 0) / weightValues.length,
    median: sortedWeights[Math.floor(sortedWeights.length / 2)]
  };
};

const calculateWeightTrend = (weights) => {
  if (weights.length < 3) return 'insufficient_data';
  
  const recentWeights = weights.slice(-7); // Last 7 entries
  const avgRecent = recentWeights.reduce((sum, w) => sum + w.weight, 0) / recentWeights.length;
  const earlyWeights = weights.slice(0, 7); // First 7 entries
  const avgEarly = earlyWeights.reduce((sum, w) => sum + w.weight, 0) / earlyWeights.length;
  
  const difference = avgRecent - avgEarly;
  const weeklyRate = difference / (weights.length / 7);
  
  if (Math.abs(weeklyRate) < 0.2) return 'stable';
  return weeklyRate > 0 ? 'increasing' : 'decreasing';
};

const calculateGoalsByType = (goals) => {
  const types = {};
  goals.forEach(goal => {
    if (!types[goal.type]) {
      types[goal.type] = { count: 0, completed: 0, active: 0 };
    }
    types[goal.type].count++;
    if (goal.status === 'Completed') types[goal.type].completed++;
    if (goal.status === 'Active') types[goal.type].active++;
  });
  
  return types;
};

const calculateGoalProgress = (goals) => {
  const activeGoals = goals.filter(g => g.status === 'Active');
  if (activeGoals.length === 0) return {};
  
  const totalProgress = activeGoals.reduce((sum, g) => sum + g.progress, 0);
  const avgProgress = totalProgress / activeGoals.length;
  
  return {
    averageProgress: avgProgress,
    goalsNearCompletion: activeGoals.filter(g => g.progress >= 80).length,
    goalsNearDeadline: activeGoals.filter(g => g.daysRemaining <= 7 && g.daysRemaining > 0).length
  };
};

const calculateExercisePRs = (prs) => {
  const exercisePRs = {};
  prs.forEach(pr => {
    if (!exercisePRs[pr.exercise]) {
      exercisePRs[pr.exercise] = [];
    }
    exercisePRs[pr.exercise].push(pr);
  });
  
  return Object.entries(exercisePRs).map(([exercise, records]) => ({
    exercise,
    totalPRs: records.length,
    totalImprovement: records.reduce((sum, pr) => sum + (pr.improvement || 0), 0),
    latestPR: records.sort((a, b) => new Date(b.dateAchieved) - new Date(a.dateAchieved))[0]
  }));
};

const calculateMonthlyPRBreakdown = (prs) => {
  const months = {};
  prs.forEach(pr => {
    const date = new Date(pr.dateAchieved);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!months[monthKey]) {
      months[monthKey] = { month: monthKey, count: 0, improvement: 0 };
    }
    months[monthKey].count++;
    months[monthKey].improvement += pr.improvement || 0;
  });
  
  return Object.values(months).sort((a, b) => b.month.localeCompare(a.month));
};

const generateAnalytics = (data) => {
  const analytics = {};
  
  // Workout analytics
  if (data.workouts) {
    const { workouts } = data.workouts;
    analytics.workoutFrequency = {
      totalWorkouts: workouts.length,
      averagePerWeek: workouts.length / 12, // Assuming 3-month period
      longestStreak: calculateLongestStreak(workouts),
      currentStreak: calculateCurrentStreak(workouts)
    };
    
    analytics.volumeAnalytics = {
      totalVolume: workouts.reduce((sum, w) => sum + w.volume, 0),
      averageVolume: workouts.length > 0 ? workouts.reduce((sum, w) => sum + w.volume, 0) / workouts.length : 0,
      topExercise: data.workouts.exerciseBreakdown[0]?.exercise || null
    };
  }
  
  // Performance trends
  analytics.performanceTrends = {
    progressiveOverload: calculateProgressiveOverload(data),
    consistencyScore: calculateConsistencyScore(data),
    diversityScore: calculateDiversityScore(data)
  };
  
  return analytics;
};

const calculateLongestStreak = (workouts) => {
  // Simplified streak calculation
  const workoutDates = [...new Set(workouts.map(w => w.date))].sort();
  let longestStreak = 0;
  let currentStreak = 1;
  
  for (let i = 1; i < workoutDates.length; i++) {
    const prevDate = new Date(workoutDates[i - 1]);
    const currDate = new Date(workoutDates[i]);
    const daysDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);
    
    if (daysDiff <= 2) { // Allow for rest days
      currentStreak++;
    } else {
      longestStreak = Math.max(longestStreak, currentStreak);
      currentStreak = 1;
    }
  }
  
  return Math.max(longestStreak, currentStreak);
};

const calculateCurrentStreak = (workouts) => {
  const today = new Date();
  const workoutDates = [...new Set(workouts.map(w => w.date))].sort((a, b) => new Date(b) - new Date(a));
  
  let streak = 0;
  for (const dateStr of workoutDates) {
    const workoutDate = new Date(dateStr);
    const daysSince = (today - workoutDate) / (1000 * 60 * 60 * 24);
    
    if (daysSince <= 2) { // Within 2 days
      streak++;
    } else {
      break;
    }
  }
  
  return streak;
};

const calculateProgressiveOverload = (data) => {
  // Simplified progressive overload calculation
  if (!data.workouts?.workouts) return 0;
  
  const exercises = {};
  data.workouts.workouts.forEach(workout => {
    if (!exercises[workout.exercise]) exercises[workout.exercise] = [];
    exercises[workout.exercise].push(workout);
  });
  
  let improvingExercises = 0;
  Object.values(exercises).forEach(exerciseWorkouts => {
    const sorted = exerciseWorkouts.sort((a, b) => new Date(a.date) - new Date(b.date));
    if (sorted.length >= 2) {
      const firstWeight = sorted[0].weight;
      const lastWeight = sorted[sorted.length - 1].weight;
      if (lastWeight > firstWeight) improvingExercises++;
    }
  });
  
  return Object.keys(exercises).length > 0 ? (improvingExercises / Object.keys(exercises).length) * 100 : 0;
};

const calculateConsistencyScore = (data) => {
  if (!data.workouts?.workouts) return 0;
  
  const totalDays = 90; // 3 months
  const workoutDays = new Set(data.workouts.workouts.map(w => w.date)).size;
  const targetDays = totalDays / 7 * 3; // 3 days per week target
  
  return Math.min(100, (workoutDays / targetDays) * 100);
};

const calculateDiversityScore = (data) => {
  if (!data.workouts?.workouts) return 0;
  
  const uniqueExercises = new Set(data.workouts.workouts.map(w => w.exercise)).size;
  const targetExercises = 10; // Ideal number of different exercises
  
  return Math.min(100, (uniqueExercises / targetExercises) * 100);
};

const generateSummary = (data) => {
  const summary = {
    overview: {},
    achievements: [],
    keyMetrics: {}
  };
  
  // Overview
  if (data.workouts) {
    summary.overview.totalWorkouts = data.workouts.totalWorkouts;
    summary.overview.totalVolume = data.workouts.workouts.reduce((sum, w) => sum + w.volume, 0);
    summary.overview.uniqueExercises = new Set(data.workouts.workouts.map(w => w.exercise)).size;
  }
  
  if (data.weight) {
    summary.overview.weightEntries = data.weight.totalEntries;
    summary.overview.weightChange = data.weight.statistics?.change || 0;
  }
  
  if (data.goals) {
    summary.overview.activeGoals = data.goals.activeGoals;
    summary.overview.completedGoals = data.goals.completedGoals;
  }
  
  if (data.prs) {
    summary.overview.totalPRs = data.prs.totalPRs;
    summary.overview.totalImprovement = data.prs.improvementTotal;
  }
  
  // Achievements
  if (data.prs?.totalPRs > 0) {
    summary.achievements.push(`Set ${data.prs.totalPRs} personal records`);
  }
  
  if (data.goals?.completedGoals > 0) {
    summary.achievements.push(`Completed ${data.goals.completedGoals} goals`);
  }
  
  if (data.workouts?.totalWorkouts >= 30) {
    summary.achievements.push('Consistent training with 30+ workouts');
  }
  
  return summary;
};

// Format conversion functions
const formatAsCSV = (data) => {
  const rows = [];
  
  // Add workouts data
  if (data.data.workouts?.workouts) {
    rows.push(['Workout Data']);
    rows.push(['Date', 'Exercise', 'Sets', 'Reps', 'Weight', 'Volume', 'Duration', 'Notes']);
    data.data.workouts.workouts.forEach(workout => {
      rows.push([
        workout.date,
        workout.exercise,
        workout.sets,
        workout.reps,
        workout.weight,
        workout.volume,
        workout.duration,
        workout.notes
      ]);
    });
    rows.push([]); // Empty row
  }
  
  // Add weight data
  if (data.data.weight?.entries) {
    rows.push(['Weight Data']);
    rows.push(['Date', 'Weight', 'Unit', 'Notes']);
    data.data.weight.entries.forEach(entry => {
      rows.push([entry.date, entry.weight, entry.unit, entry.notes]);
    });
    rows.push([]); // Empty row
  }
  
  // Add PRs data
  if (data.data.prs?.prs) {
    rows.push(['Personal Records']);
    rows.push(['Date', 'Exercise', 'Weight', 'Improvement', 'Previous Record']);
    data.data.prs.prs.forEach(pr => {
      rows.push([pr.dateAchieved, pr.exercise, pr.maxWeight, pr.improvement, pr.previousRecord]);
    });
  }
  
  return rows.map(row => row.join(',')).join('\n');
};

const formatAsText = (data) => {
  let text = `FITNESS PROGRESS REPORT\n`;
  text += `Generated: ${data.metadata.generatedAt}\n`;
  text += `Period: ${data.metadata.reportPeriod.startDate} to ${data.metadata.reportPeriod.endDate}\n`;
  text += `Duration: ${data.metadata.reportPeriod.timeframeDays} days\n\n`;
  
  // Summary
  text += `SUMMARY\n`;
  text += `-------\n`;
  Object.entries(data.summary.overview).forEach(([key, value]) => {
    text += `${key}: ${value}\n`;
  });
  text += `\n`;
  
  // Achievements
  if (data.summary.achievements.length > 0) {
    text += `ACHIEVEMENTS\n`;
    text += `------------\n`;
    data.summary.achievements.forEach(achievement => {
      text += `• ${achievement}\n`;
    });
    text += `\n`;
  }
  
  // Top exercises
  if (data.data.workouts?.exerciseBreakdown) {
    text += `TOP EXERCISES BY VOLUME\n`;
    text += `-----------------------\n`;
    data.data.workouts.exerciseBreakdown.slice(0, 5).forEach((exercise, index) => {
      text += `${index + 1}. ${exercise.exercise}: ${(exercise.totalVolume / 1000).toFixed(1)}k lbs\n`;
    });
    text += `\n`;
  }
  
  return text;
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
    
    const {
      userId = 'default-user',
      format = 'json',
      timeframe = '90',
      includeWorkouts = 'true',
      includeWeight = 'true',
      includeGoals = 'true',
      includePRs = 'true',
      includeAnalytics = 'true'
    } = params;

    if (!['json', 'csv', 'text'].includes(format)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Format must be json, csv, or text' })
      };
    }

    const options = {
      format,
      timeframe: parseInt(timeframe),
      includeWorkouts: includeWorkouts === 'true',
      includeWeight: includeWeight === 'true',
      includeGoals: includeGoals === 'true',
      includePRs: includePRs === 'true',
      includeAnalytics: includeAnalytics === 'true'
    };

    const progressReport = await generateProgressReport(base, userId, options);

    // Format response based on requested format
    let responseBody;
    let contentType = 'application/json';

    switch (format) {
      case 'csv':
        responseBody = formatAsCSV(progressReport);
        contentType = 'text/csv';
        headers['Content-Disposition'] = `attachment; filename="fitness-report-${userId}-${new Date().toISOString().split('T')[0]}.csv"`;
        break;
      case 'text':
        responseBody = formatAsText(progressReport);
        contentType = 'text/plain';
        headers['Content-Disposition'] = `attachment; filename="fitness-report-${userId}-${new Date().toISOString().split('T')[0]}.txt"`;
        break;
      default:
        responseBody = JSON.stringify({
          success: true,
          data: progressReport
        }, null, 2);
        break;
    }

    headers['Content-Type'] = contentType;

    return {
      statusCode: 200,
      headers,
      body: responseBody
    };

  } catch (error) {
    console.error('Error generating progress report:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to generate progress report',
        message: error.message
      })
    };
  }
};