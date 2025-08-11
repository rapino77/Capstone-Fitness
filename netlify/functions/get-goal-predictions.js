const Airtable = require('airtable');

// Goal prediction algorithms
const calculateGoalPrediction = (goal, historicalData, currentTrend) => {
  const goalType = goal.get('Goal Type');
  const targetValue = goal.get('Target Value');
  const currentValue = goal.get('Current Value') || 0;
  const targetDate = new Date(goal.get('Target Date'));
  const createdDate = new Date(goal.get('Created Date'));
  const currentProgress = goal.get('Progress Percentage') || 0;
  
  const daysElapsed = Math.max(1, Math.floor((new Date() - createdDate) / (1000 * 60 * 60 * 24)));
  const daysTotal = Math.max(1, Math.floor((targetDate - createdDate) / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(0, Math.floor((targetDate - new Date()) / (1000 * 60 * 60 * 24)));
  
  // Calculate prediction based on goal type
  let prediction = {};
  
  switch (goalType) {
    case 'Body Weight':
      prediction = predictBodyWeightGoal(goal, historicalData, currentTrend);
      break;
    case 'Exercise PR':
      prediction = predictExercisePRGoal(goal, historicalData, currentTrend);
      break;
    case 'Frequency':
      prediction = predictFrequencyGoal(goal, historicalData, currentTrend);
      break;
    case 'Volume':
      prediction = predictVolumeGoal(goal, historicalData, currentTrend);
      break;
    default:
      prediction = predictGenericGoal(goal, currentProgress, daysElapsed, daysTotal, daysRemaining);
  }
  
  // Add common prediction metrics
  prediction.goalId = goal.id;
  prediction.goalTitle = goal.get('Goal Title');
  prediction.goalType = goalType;
  prediction.targetDate = goal.get('Target Date');
  prediction.daysRemaining = daysRemaining;
  prediction.currentProgress = currentProgress;
  prediction.timeElapsedRatio = daysElapsed / daysTotal;
  
  return prediction;
};

const predictBodyWeightGoal = (goal, weightData, trend) => {
  const targetWeight = goal.get('Target Value');
  const currentWeight = weightData.length > 0 ? weightData[weightData.length - 1].weight : goal.get('Current Value') || 0;
  const daysRemaining = Math.max(0, Math.floor((new Date(goal.get('Target Date')) - new Date()) / (1000 * 60 * 60 * 24)));
  
  if (weightData.length < 3) {
    return {
      likelihood: 'insufficient_data',
      confidence: 'low',
      predictedDate: null,
      weeklyChangeNeeded: 0,
      insights: ['Need more weight data points for accurate prediction']
    };
  }
  
  // Calculate recent trend (last 2 weeks of data)
  const recentData = weightData.slice(-14);
  const weeklyTrend = calculateWeeklyTrend(recentData);
  
  const weightDifference = targetWeight - currentWeight;
  const weeksRemaining = daysRemaining / 7;
  const weeklyChangeNeeded = weightDifference / weeksRemaining;
  
  let likelihood, confidence;
  const insights = [];
  
  // Determine likelihood based on current trend vs needed trend
  const trendDifference = Math.abs(weeklyTrend - weeklyChangeNeeded);
  
  if (trendDifference < 0.5) {
    likelihood = 'very_likely';
    confidence = 'high';
    insights.push('Current weight trend aligns well with goal requirements');
  } else if (trendDifference < 1.0) {
    likelihood = 'likely';
    confidence = 'medium';
    insights.push('Small adjustment to current trend needed');
  } else if (trendDifference < 2.0) {
    likelihood = 'possible';
    confidence = 'medium';
    insights.push('Significant change in habits required');
  } else {
    likelihood = 'unlikely';
    confidence = 'high';
    insights.push('Goal requires major lifestyle changes');
  }
  
  // Calculate predicted completion date based on current trend
  const weeksToComplete = Math.abs(weeklyTrend) > 0.1 ? Math.abs(weightDifference / weeklyTrend) : null;
  const predictedDate = weeksToComplete ? new Date(Date.now() + weeksToComplete * 7 * 24 * 60 * 60 * 1000) : null;
  
  return {
    likelihood,
    confidence,
    predictedDate: predictedDate ? predictedDate.toISOString().split('T')[0] : null,
    weeklyChangeNeeded: Math.abs(weeklyChangeNeeded).toFixed(1),
    currentWeeklyTrend: weeklyTrend.toFixed(1),
    insights
  };
};

const predictExercisePRGoal = (goal, workoutData, trend) => {
  const targetWeight = goal.get('Target Value');
  const exercise = goal.get('Exercise Name');
  const daysRemaining = Math.max(0, Math.floor((new Date(goal.get('Target Date')) - new Date()) / (1000 * 60 * 60 * 24)));
  
  // Filter workout data for this specific exercise
  const exerciseData = workoutData.filter(w => w.exercise === exercise).slice(-10); // Last 10 workouts
  
  if (exerciseData.length < 3) {
    return {
      likelihood: 'insufficient_data',
      confidence: 'low',
      predictedDate: null,
      weeklyProgressNeeded: 0,
      insights: [`Need more ${exercise} workout data for accurate prediction`]
    };
  }
  
  const currentMax = Math.max(...exerciseData.map(w => w.weight));
  const weightIncrease = targetWeight - currentMax;
  
  // Calculate recent progression rate
  const recentSessions = exerciseData.slice(-5);
  const progressionRate = calculateProgressionRate(recentSessions);
  
  const weeksRemaining = daysRemaining / 7;
  const weeklyProgressNeeded = weightIncrease / weeksRemaining;
  
  let likelihood, confidence;
  const insights = [];
  
  if (progressionRate >= weeklyProgressNeeded * 0.8) {
    likelihood = 'very_likely';
    confidence = 'high';
    insights.push('Strong progression trend supports goal achievement');
  } else if (progressionRate >= weeklyProgressNeeded * 0.5) {
    likelihood = 'likely';
    confidence = 'medium';
    insights.push('Good progress, minor adjustments may help');
  } else if (progressionRate > 0) {
    likelihood = 'possible';
    confidence = 'medium';
    insights.push('Current progression rate needs improvement');
  } else {
    likelihood = 'unlikely';
    confidence = 'high';
    insights.push('No recent progression detected');
  }
  
  // Predict completion date
  const weeksToComplete = progressionRate > 0 ? weightIncrease / progressionRate : null;
  const predictedDate = weeksToComplete ? new Date(Date.now() + weeksToComplete * 7 * 24 * 60 * 60 * 1000) : null;
  
  return {
    likelihood,
    confidence,
    predictedDate: predictedDate ? predictedDate.toISOString().split('T')[0] : null,
    weeklyProgressNeeded: weeklyProgressNeeded.toFixed(1),
    currentProgressionRate: progressionRate.toFixed(1),
    insights
  };
};

const predictFrequencyGoal = (goal, workoutData, trend) => {
  const targetFrequency = goal.get('Target Value'); // workouts per week
  const daysRemaining = Math.max(0, Math.floor((new Date(goal.get('Target Date')) - new Date()) / (1000 * 60 * 60 * 24)));
  
  // Calculate recent frequency (last 4 weeks)
  const fourWeeksAgo = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);
  const recentWorkouts = workoutData.filter(w => new Date(w.date) >= fourWeeksAgo);
  const currentFrequency = recentWorkouts.length / 4; // per week
  
  const weeksRemaining = daysRemaining / 7;
  const totalWorkoutsNeeded = targetFrequency * weeksRemaining;
  
  let likelihood, confidence;
  const insights = [];
  
  const frequencyRatio = currentFrequency / targetFrequency;
  
  if (frequencyRatio >= 0.9) {
    likelihood = 'very_likely';
    confidence = 'high';
    insights.push('Current workout frequency is on track');
  } else if (frequencyRatio >= 0.7) {
    likelihood = 'likely';
    confidence = 'medium';
    insights.push('Slight increase in workout frequency needed');
  } else if (frequencyRatio >= 0.5) {
    likelihood = 'possible';
    confidence = 'medium';
    insights.push('Significant increase in workout frequency required');
  } else {
    likelihood = 'unlikely';
    confidence = 'high';
    insights.push('Major lifestyle changes needed to reach frequency goal');
  }
  
  return {
    likelihood,
    confidence,
    predictedDate: null, // Frequency goals are ongoing
    workoutsPerWeekNeeded: targetFrequency,
    currentFrequency: currentFrequency.toFixed(1),
    insights
  };
};

const predictVolumeGoal = (goal, workoutData, trend) => {
  const targetVolume = goal.get('Target Value');
  const daysRemaining = Math.max(0, Math.floor((new Date(goal.get('Target Date')) - new Date()) / (1000 * 60 * 60 * 1000)));
  
  // Calculate recent volume trend
  const recentWorkouts = workoutData.slice(-20); // Last 20 workouts
  const currentWeeklyVolume = calculateWeeklyVolume(recentWorkouts);
  
  const weeksRemaining = daysRemaining / 7;
  const weeklyVolumeNeeded = targetVolume / weeksRemaining;
  
  let likelihood, confidence;
  const insights = [];
  
  const volumeRatio = currentWeeklyVolume / weeklyVolumeNeeded;
  
  if (volumeRatio >= 0.8) {
    likelihood = 'very_likely';
    confidence = 'high';
    insights.push('Current training volume supports goal achievement');
  } else if (volumeRatio >= 0.6) {
    likelihood = 'likely';
    confidence = 'medium';
    insights.push('Moderate increase in training volume needed');
  } else if (volumeRatio >= 0.4) {
    likelihood = 'possible';
    confidence = 'medium';
    insights.push('Significant volume increase required');
  } else {
    likelihood = 'unlikely';
    confidence = 'high';
    insights.push('Goal requires substantial training volume increase');
  }
  
  return {
    likelihood,
    confidence,
    predictedDate: null,
    weeklyVolumeNeeded: weeklyVolumeNeeded.toFixed(0),
    currentWeeklyVolume: currentWeeklyVolume.toFixed(0),
    insights
  };
};

const predictGenericGoal = (goal, currentProgress, daysElapsed, daysTotal, daysRemaining) => {
  const progressRate = currentProgress / (daysElapsed / daysTotal * 100); // Progress rate
  const projectedProgress = progressRate * 100;
  
  let likelihood, confidence;
  const insights = [];
  
  if (projectedProgress >= 95) {
    likelihood = 'very_likely';
    confidence = 'high';
    insights.push('Excellent progress rate');
  } else if (projectedProgress >= 80) {
    likelihood = 'likely';
    confidence = 'medium';
    insights.push('Good progress, stay consistent');
  } else if (projectedProgress >= 60) {
    likelihood = 'possible';
    confidence = 'medium';
    insights.push('Progress needs acceleration');
  } else {
    likelihood = 'unlikely';
    confidence = 'high';
    insights.push('Significant effort increase required');
  }
  
  return {
    likelihood,
    confidence,
    predictedDate: null,
    projectedProgress: Math.min(projectedProgress, 100).toFixed(0),
    insights
  };
};

// Helper functions
const calculateWeeklyTrend = (weightData) => {
  if (weightData.length < 2) return 0;
  
  const firstWeek = weightData.slice(0, Math.min(7, weightData.length));
  const lastWeek = weightData.slice(-Math.min(7, weightData.length));
  
  const firstAvg = firstWeek.reduce((sum, d) => sum + d.weight, 0) / firstWeek.length;
  const lastAvg = lastWeek.reduce((sum, d) => sum + d.weight, 0) / lastWeek.length;
  
  const weeks = Math.max(1, weightData.length / 7);
  return (lastAvg - firstAvg) / weeks;
};

const calculateProgressionRate = (exerciseData) => {
  if (exerciseData.length < 2) return 0;
  
  const weights = exerciseData.map(w => w.weight).sort((a, b) => a - b);
  const sessions = exerciseData.length;
  const weightIncrease = weights[weights.length - 1] - weights[0];
  
  // Convert to weekly rate (assuming 2-3 sessions per week)
  const sessionsPerWeek = 2.5;
  return (weightIncrease / sessions) * sessionsPerWeek;
};

const calculateWeeklyVolume = (workoutData) => {
  if (workoutData.length === 0) return 0;
  
  const totalVolume = workoutData.reduce((sum, w) => {
    return sum + (w.sets * w.reps * w.weight);
  }, 0);
  
  // Estimate weeks covered by data
  const weeks = Math.max(1, workoutData.length / 3); // Assuming 3 workouts per week
  return totalVolume / weeks;
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
    // Check environment variables
    const apiKey = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN || process.env.AIRTABLE_API_KEY;
    const baseId = process.env.AIRTABLE_BASE_ID;
    
    if (!apiKey || !baseId) {
      throw new Error('Missing required environment variables');
    }

    // Configure Airtable
    const base = new Airtable({
      apiKey: apiKey
    }).base(baseId);

    const params = event.queryStringParameters || {};
    const { userId = 'default-user' } = params;

    // Fetch active goals
    const goals = [];
    await base('Goals')
      .select({
        filterByFormula: `AND({User ID} = '${userId}', {Status} = 'Active')`,
        sort: [{ field: 'Target Date', direction: 'asc' }]
      })
      .eachPage((pageRecords, fetchNextPage) => {
        goals.push(...pageRecords);
        fetchNextPage();
      });

    if (goals.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: {
            predictions: [],
            summary: {
              totalActiveGoals: 0,
              predictionsGenerated: 0
            }
          }
        })
      };
    }

    // Fetch supporting data for predictions
    const [workouts, weights] = await Promise.all([
      // Fetch recent workouts
      new Promise((resolve) => {
        const workoutData = [];
        base('Workouts')
          .select({
            filterByFormula: `{User ID} = '${userId}'`,
            sort: [{ field: 'Date', direction: 'desc' }],
            maxRecords: 100
          })
          .eachPage(
            (pageRecords, fetchNextPage) => {
              pageRecords.forEach(record => {
                workoutData.push({
                  date: record.get('Date'),
                  exercise: record.get('Exercise'),
                  sets: record.get('Sets') || 0,
                  reps: record.get('Reps') || 0,
                  weight: record.get('Weight') || 0
                });
              });
              fetchNextPage();
            },
            (error) => {
              if (error) console.error('Error fetching workouts:', error);
              resolve(workoutData);
            }
          );
      }),
      // Fetch weight data
      new Promise((resolve) => {
        const weightData = [];
        base('BodyWeight')
          .select({
            filterByFormula: `{User ID} = '${userId}'`,
            sort: [{ field: 'Date', direction: 'asc' }],
            maxRecords: 60 // Last ~2 months
          })
          .eachPage(
            (pageRecords, fetchNextPage) => {
              pageRecords.forEach(record => {
                weightData.push({
                  date: record.get('Date'),
                  weight: record.get('Weight')
                });
              });
              fetchNextPage();
            },
            (error) => {
              if (error) console.error('Error fetching weights:', error);
              resolve(weightData);
            }
          );
      })
    ]);

    // Generate predictions for each goal
    const predictions = goals.map(goal => {
      try {
        return calculateGoalPrediction(goal, { workouts, weights }, null);
      } catch (error) {
        console.error(`Error predicting goal ${goal.id}:`, error);
        return {
          goalId: goal.id,
          goalTitle: goal.get('Goal Title'),
          likelihood: 'error',
          confidence: 'low',
          insights: ['Unable to generate prediction due to data issues']
        };
      }
    });

    // Generate summary statistics
    const summary = {
      totalActiveGoals: goals.length,
      predictionsGenerated: predictions.length,
      likelyToSucceed: predictions.filter(p => p.likelihood === 'very_likely' || p.likelihood === 'likely').length,
      needsAttention: predictions.filter(p => p.likelihood === 'unlikely' || p.likelihood === 'possible').length,
      insufficientData: predictions.filter(p => p.likelihood === 'insufficient_data').length
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: {
          predictions,
          summary,
          generatedAt: new Date().toISOString()
        }
      })
    };

  } catch (error) {
    console.error('Error generating goal predictions:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to generate goal predictions',
        message: error.message
      })
    };
  }
};