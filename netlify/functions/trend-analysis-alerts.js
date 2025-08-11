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
      analysisWindow = '30' // days to analyze for trends
    } = params;

    // Configure Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    console.log('Starting trend analysis for user:', userId);

    // Fetch data for trend analysis
    const alerts = await analyzeTrends(base, userId, parseInt(analysisWindow));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        userId,
        analysisWindow: parseInt(analysisWindow),
        alerts,
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('Trend analysis error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to analyze trends',
        message: error.message
      })
    };
  }
};

async function analyzeTrends(base, userId, analysisWindow) {
  const alerts = {
    weightPlateaus: [],
    strengthStalls: [],
    goalRisks: [],
    summary: {
      totalAlerts: 0,
      highPriorityAlerts: 0,
      categories: {
        weight: 0,
        strength: 0,
        goals: 0
      }
    }
  };

  // Calculate date ranges
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - analysisWindow);
  
  // For longer trend analysis (plateaus need more data)
  const longStartDate = new Date();
  longStartDate.setDate(longStartDate.getDate() - (analysisWindow * 2));

  console.log('Analysis window:', {
    shortTerm: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
    longTerm: `${longStartDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
  });

  // 1. Weight Plateau Analysis
  try {
    const weightAlerts = await analyzeWeightPlateaus(base, userId, longStartDate, endDate, analysisWindow);
    alerts.weightPlateaus = weightAlerts;
    alerts.summary.categories.weight = weightAlerts.length;
  } catch (error) {
    console.error('Weight plateau analysis failed:', error);
  }

  // 2. Strength Stall Analysis
  try {
    const strengthAlerts = await analyzeStrengthStalls(base, userId, longStartDate, endDate, analysisWindow);
    alerts.strengthStalls = strengthAlerts;
    alerts.summary.categories.strength = strengthAlerts.length;
  } catch (error) {
    console.error('Strength stall analysis failed:', error);
  }

  // 3. Goal Risk Analysis
  try {
    const goalAlerts = await analyzeGoalRisks(base, userId);
    alerts.goalRisks = goalAlerts;
    alerts.summary.categories.goals = goalAlerts.length;
  } catch (error) {
    console.error('Goal risk analysis failed:', error);
  }

  // Calculate summary
  const allAlerts = [...alerts.weightPlateaus, ...alerts.strengthStalls, ...alerts.goalRisks];
  alerts.summary.totalAlerts = allAlerts.length;
  alerts.summary.highPriorityAlerts = allAlerts.filter(alert => alert.priority === 'high').length;

  console.log('Trend analysis complete:', {
    totalAlerts: alerts.summary.totalAlerts,
    weightPlateaus: alerts.summary.categories.weight,
    strengthStalls: alerts.summary.categories.strength,
    goalRisks: alerts.summary.categories.goals
  });

  return alerts;
}

async function analyzeWeightPlateaus(base, userId, startDate, endDate, analysisWindow) {
  console.log('Analyzing weight plateaus...');
  
  const alerts = [];
  
  // Fetch weight data
  const weightLogs = await fetchRecords(base, 'BodyWeight', {
    filterByFormula: `AND({User ID} = '${userId}', IS_SAME_OR_AFTER({Date}, '${startDate.toISOString().split('T')[0]}'))`,
    sort: [{ field: 'Date', direction: 'asc' }]
  });

  if (weightLogs.length < 5) {
    console.log('Insufficient weight data for plateau analysis');
    return alerts;
  }

  // Convert to weight data points
  const weightData = weightLogs.map(log => ({
    date: log.get('Date'),
    weight: parseFloat(log.get('Weight')) || 0,
    unit: log.get('Unit') || 'lbs'
  })).filter(point => point.weight > 0 && point.date);

  // Sort by date
  weightData.sort((a, b) => new Date(a.date) - new Date(b.date));

  // Analyze for plateau patterns
  const plateauThreshold = 0.5; // Less than 0.5 lbs change over period
  const minimumDataPoints = 4;

  if (weightData.length >= minimumDataPoints) {
    // Check recent trend (last 2 weeks)
    const recentWeeks = 2;
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - (recentWeeks * 7));
    
    const recentData = weightData.filter(point => new Date(point.date) >= recentDate);
    
    if (recentData.length >= 3) {
      const firstWeight = recentData[0].weight;
      const lastWeight = recentData[recentData.length - 1].weight;
      const weightChange = Math.abs(lastWeight - firstWeight);
      
      // Check for plateau (minimal weight change)
      if (weightChange < plateauThreshold) {
        const variance = calculateVariance(recentData.map(d => d.weight));
        
        alerts.push({
          type: 'weight_plateau',
          priority: variance < 0.25 ? 'high' : 'medium',
          title: 'Weight Plateau Detected',
          message: `Your weight has remained stable (${weightChange.toFixed(1)} lbs change) over the last ${recentWeeks} weeks. Consider adjusting your nutrition or exercise routine.`,
          data: {
            timespan: `${recentWeeks} weeks`,
            weightChange: weightChange.toFixed(1),
            variance: variance.toFixed(2),
            currentWeight: lastWeight,
            dataPoints: recentData.length
          },
          recommendations: [
            'Review your caloric intake and macronutrient balance',
            'Consider changing your workout routine to shock your system',
            'Evaluate your sleep and stress levels',
            'Track measurements beyond just weight (body fat, muscle mass)'
          ],
          detectedAt: new Date().toISOString()
        });
      }
    }

    // Check for longer-term stagnation (4+ weeks)
    const longTermWeeks = 4;
    const longTermDate = new Date();
    longTermDate.setDate(longTermDate.getDate() - (longTermWeeks * 7));
    
    const longTermData = weightData.filter(point => new Date(point.date) >= longTermDate);
    
    if (longTermData.length >= 6) {
      const firstWeight = longTermData[0].weight;
      const lastWeight = longTermData[longTermData.length - 1].weight;
      const longTermChange = Math.abs(lastWeight - firstWeight);
      
      if (longTermChange < (plateauThreshold * 1.5)) {
        alerts.push({
          type: 'weight_long_plateau',
          priority: 'high',
          title: 'Extended Weight Plateau',
          message: `Your weight has been stable for ${longTermWeeks}+ weeks (${longTermChange.toFixed(1)} lbs total change). This suggests your body has adapted to your current routine.`,
          data: {
            timespan: `${longTermWeeks}+ weeks`,
            weightChange: longTermChange.toFixed(1),
            currentWeight: lastWeight,
            startWeight: firstWeight,
            dataPoints: longTermData.length
          },
          recommendations: [
            'Consider a structured refeed day or diet break',
            'Implement periodization in your training',
            'Reassess your goals - maintenance might be appropriate',
            'Consider working with a nutritionist or trainer'
          ],
          detectedAt: new Date().toISOString()
        });
      }
    }
  }

  console.log(`Weight plateau analysis complete: ${alerts.length} alerts generated`);
  return alerts;
}

async function analyzeStrengthStalls(base, userId, startDate, endDate, analysisWindow) {
  console.log('Analyzing strength stalls...');
  
  const alerts = [];
  
  // Fetch workout data
  const workouts = await fetchRecords(base, 'Workouts', {
    filterByFormula: `AND({User ID} = '${userId}', IS_SAME_OR_AFTER({Date}, '${startDate.toISOString().split('T')[0]}'))`,
    sort: [{ field: 'Date', direction: 'asc' }]
  });

  if (workouts.length < 6) {
    console.log('Insufficient workout data for stall analysis');
    return alerts;
  }

  // Group by exercise
  const exerciseData = {};
  workouts.forEach(workout => {
    const exercise = workout.get('Exercise');
    const date = workout.get('Date');
    const weight = parseFloat(workout.get('Weight')) || 0;
    const sets = parseInt(workout.get('Sets')) || 1;
    const reps = parseInt(workout.get('Reps')) || 1;

    if (!exercise || !date || weight <= 0) return;

    if (!exerciseData[exercise]) {
      exerciseData[exercise] = [];
    }

    // Calculate estimated 1RM for progression tracking
    const estimatedOneRM = reps > 1 ? weight * (36 / (37 - reps)) : weight;

    exerciseData[exercise].push({
      date,
      weight,
      sets,
      reps,
      volume: sets * reps * weight,
      estimatedOneRM
    });
  });

  // Analyze each exercise for stalls
  const majorExercises = ['Squat', 'Bench Press', 'Deadlift', 'Overhead Press', 'Bent Over Row'];
  
  Object.entries(exerciseData).forEach(([exercise, data]) => {
    if (data.length < 4) return; // Need at least 4 data points

    // Sort by date
    data.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Check for stalls in the last 3-4 workouts
    const recentWorkouts = data.slice(-4);
    if (recentWorkouts.length >= 3) {
      const weights = recentWorkouts.map(w => w.weight);
      const oneRMs = recentWorkouts.map(w => w.estimatedOneRM);
      
      // Check for no progression in recent workouts
      const weightProgression = Math.max(...weights) - Math.min(...weights);
      const oneRMProgression = Math.max(...oneRMs) - Math.min(...oneRMs);
      
      const isStalled = weightProgression < 2.5 && oneRMProgression < 5; // Minimal progression
      
      if (isStalled) {
        const daysSinceFirst = Math.floor((new Date(recentWorkouts[recentWorkouts.length - 1].date) - new Date(recentWorkouts[0].date)) / (1000 * 60 * 60 * 24));
        const isMajorExercise = majorExercises.includes(exercise);
        
        alerts.push({
          type: 'strength_stall',
          priority: isMajorExercise ? 'high' : 'medium',
          title: `Strength Stall: ${exercise}`,
          message: `No significant strength gains in ${exercise} over the last ${recentWorkouts.length} workouts (${daysSinceFirst} days). Consider deload or programming changes.`,
          data: {
            exercise,
            workoutCount: recentWorkouts.length,
            timespan: `${daysSinceFirst} days`,
            currentWeight: weights[weights.length - 1],
            weightRange: `${Math.min(...weights)} - ${Math.max(...weights)} lbs`,
            estimatedOneRM: Math.round(oneRMs[oneRMs.length - 1]),
            totalWorkouts: data.length,
            isMajorExercise
          },
          recommendations: [
            'Consider a deload week (reduce weight by 10-15%)',
            'Change rep ranges or training intensity',
            'Focus on form and technique refinement',
            'Evaluate recovery - sleep, nutrition, stress',
            'Consider periodization or program changes'
          ],
          detectedAt: new Date().toISOString()
        });
      }
    }

    // Check for regression (going backwards)
    if (data.length >= 6) {
      const recent6 = data.slice(-6);
      const firstHalf = recent6.slice(0, 3);
      const secondHalf = recent6.slice(-3);
      
      const firstHalfAvg = firstHalf.reduce((sum, w) => sum + w.estimatedOneRM, 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, w) => sum + w.estimatedOneRM, 0) / secondHalf.length;
      
      const regression = firstHalfAvg - secondHalfAvg;
      
      if (regression > 5) { // Lost more than 5 lbs on estimated 1RM
        alerts.push({
          type: 'strength_regression',
          priority: 'high',
          title: `Strength Regression: ${exercise}`,
          message: `Strength has decreased in ${exercise} over recent workouts. Average estimated 1RM dropped by ${regression.toFixed(1)} lbs. This may indicate overtraining or insufficient recovery.`,
          data: {
            exercise,
            regressionAmount: regression.toFixed(1),
            previousAverage: Math.round(firstHalfAvg),
            currentAverage: Math.round(secondHalfAvg),
            workoutsAnalyzed: 6
          },
          recommendations: [
            'Take an immediate deload week',
            'Assess your recovery - prioritize sleep and nutrition',
            'Reduce training volume temporarily',
            'Check for signs of overtraining syndrome',
            'Consider taking 3-5 days complete rest'
          ],
          detectedAt: new Date().toISOString()
        });
      }
    }
  });

  console.log(`Strength stall analysis complete: ${alerts.length} alerts generated`);
  return alerts;
}

async function analyzeGoalRisks(base, userId) {
  console.log('Analyzing goal risks...');
  
  const alerts = [];
  
  // Fetch active goals
  const goals = await fetchRecords(base, 'Goals', {
    filterByFormula: `AND({User ID} = '${userId}', {Status} = 'Active')`,
    sort: [{ field: 'Target Date', direction: 'asc' }]
  });

  if (goals.length === 0) {
    console.log('No active goals found for risk analysis');
    return alerts;
  }

  goals.forEach(goal => {
    const title = goal.get('Goal Title') || 'Untitled Goal';
    const targetDate = goal.get('Target Date');
    const progress = parseFloat(goal.get('Progress Percentage')) || 0;
    const daysRemaining = goal.get('Days Remaining');
    const goalType = goal.get('Goal Type') || 'Unknown';
    const createdDate = goal.get('Created Date');

    if (!targetDate || daysRemaining === null) return;

    const today = new Date();
    const target = new Date(targetDate);
    const actualDaysRemaining = Math.max(0, Math.floor((target - today) / (1000 * 60 * 60 * 24)));

    // Calculate required daily progress rate
    const remainingProgress = 100 - progress;
    const requiredDailyRate = actualDaysRemaining > 0 ? remainingProgress / actualDaysRemaining : remainingProgress;

    // Calculate current progress rate
    let currentDailyRate = 0;
    if (createdDate) {
      const created = new Date(createdDate);
      const daysSinceCreated = Math.max(1, Math.floor((today - created) / (1000 * 60 * 60 * 24)));
      currentDailyRate = progress / daysSinceCreated;
    }

    // Risk analysis
    const isAtRisk = requiredDailyRate > (currentDailyRate * 1.5) && actualDaysRemaining > 0;
    const isCritical = actualDaysRemaining <= 7 && progress < 80;
    const isStagnant = progress < 10 && actualDaysRemaining <= 30;

    if (isCritical) {
      alerts.push({
        type: 'goal_critical',
        priority: 'high',
        title: `Critical Goal Risk: ${title}`,
        message: `Goal "${title}" has only ${actualDaysRemaining} days remaining with ${progress.toFixed(1)}% completion. Immediate action required.`,
        data: {
          goalId: goal.id,
          goalTitle: title,
          goalType,
          daysRemaining: actualDaysRemaining,
          progress: progress.toFixed(1),
          requiredDailyRate: requiredDailyRate.toFixed(2),
          currentDailyRate: currentDailyRate.toFixed(2)
        },
        recommendations: [
          'Focus exclusively on this goal for the remaining time',
          'Break down remaining tasks into daily action items',
          'Consider if goal timeline needs to be adjusted',
          'Eliminate distractions and non-essential activities'
        ],
        detectedAt: new Date().toISOString()
      });
    } else if (isAtRisk) {
      alerts.push({
        type: 'goal_at_risk',
        priority: 'medium',
        title: `Goal At Risk: ${title}`,
        message: `Goal "${title}" may not be achieved at current pace. Need to increase daily progress rate by ${((requiredDailyRate / Math.max(currentDailyRate, 0.1)) * 100 - 100).toFixed(0)}%.`,
        data: {
          goalId: goal.id,
          goalTitle: title,
          goalType,
          daysRemaining: actualDaysRemaining,
          progress: progress.toFixed(1),
          requiredDailyRate: requiredDailyRate.toFixed(2),
          currentDailyRate: currentDailyRate.toFixed(2),
          progressGapPercentage: ((requiredDailyRate / Math.max(currentDailyRate, 0.1)) * 100 - 100).toFixed(0)
        },
        recommendations: [
          'Increase daily effort and consistency',
          'Review and optimize your strategy',
          'Consider breaking goal into smaller milestones',
          'Identify and remove obstacles to progress'
        ],
        detectedAt: new Date().toISOString()
      });
    } else if (isStagnant) {
      alerts.push({
        type: 'goal_stagnant',
        priority: 'medium',
        title: `Stagnant Goal: ${title}`,
        message: `Goal "${title}" has made minimal progress (${progress.toFixed(1)}%) with limited time remaining. Goal strategy may need revision.`,
        data: {
          goalId: goal.id,
          goalTitle: title,
          goalType,
          daysRemaining: actualDaysRemaining,
          progress: progress.toFixed(1),
          daysSinceCreated: Math.floor((today - new Date(createdDate)) / (1000 * 60 * 60 * 24))
        },
        recommendations: [
          'Reassess if this goal is still relevant and realistic',
          'Break the goal down into smaller, actionable steps',
          'Consider if you need additional resources or support',
          'Evaluate what barriers are preventing progress'
        ],
        detectedAt: new Date().toISOString()
      });
    }
  });

  console.log(`Goal risk analysis complete: ${alerts.length} alerts generated`);
  return alerts;
}

// Helper function to fetch records from Airtable
async function fetchRecords(base, tableName, options) {
  const records = [];
  try {
    await base(tableName)
      .select(options)
      .eachPage((pageRecords, fetchNextPage) => {
        records.push(...pageRecords);
        fetchNextPage();
      });
  } catch (error) {
    console.error(`Error fetching ${tableName}:`, error);
  }
  return records;
}

// Helper function to calculate variance
function calculateVariance(values) {
  if (values.length === 0) return 0;
  
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
}