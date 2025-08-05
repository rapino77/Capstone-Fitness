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

    // Configure Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    const params = event.queryStringParameters || {};
    const {
      userId = 'default-user',
      exercise,
      checkLatest = 'false',
      limit = '10',
      analysisType = 'basic', // basic, detailed, trends
      includeProjections = 'false'
    } = params;

    if (checkLatest === 'true') {
      // Check for new PRs in recent workouts
      return await checkForNewPRs(base, userId, headers, analysisType === 'detailed');
    } else {
      // Get existing PR records with enhanced analysis
      return await getPRRecords(base, userId, exercise, limit, headers, analysisType, includeProjections === 'true');
    }

  } catch (error) {
    console.error('PR Detection API error:', error);
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

// Check for new PRs in recent workouts
async function checkForNewPRs(base, userId, headers, detailedAnalysis = false) {
  try {
    // Get recent workouts (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const dateFilter = sevenDaysAgo.toISOString().split('T')[0];

    const recentWorkouts = [];
    await base('Workouts')
      .select({
        filterByFormula: `AND(
          {User ID} = '${userId}', 
          IS_AFTER({Date}, '${dateFilter}')
        )`,
        sort: [{ field: 'Date', direction: 'desc' }]
      })
      .eachPage((records, fetchNextPage) => {
        recentWorkouts.push(...records);
        fetchNextPage();
      });

    if (recentWorkouts.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          data: [],
          message: 'No recent workouts found'
        })
      };
    }

    // Group workouts by exercise to find max weights
    const exerciseMaxes = {};
    
    recentWorkouts.forEach(workout => {
      const exercise = workout.get('Exercise');
      const weight = workout.get('Weight');
      const reps = workout.get('Reps');
      const date = workout.get('Date');
      
      // Calculate 1RM estimate using Brzycki formula: weight / (1.0278 - 0.0278 * reps)
      const estimated1RM = weight / (1.0278 - 0.0278 * reps);
      
      if (!exerciseMaxes[exercise] || estimated1RM > exerciseMaxes[exercise].estimated1RM) {
        exerciseMaxes[exercise] = {
          weight,
          reps,
          estimated1RM,
          date,
          workoutId: workout.id
        };
      }
    });

    // Check against existing PRs
    const newPRs = [];
    
    for (const [exerciseName, maxData] of Object.entries(exerciseMaxes)) {
      // Get current PR for this exercise
      const existingPRs = [];
      await base('Progress Records')
        .select({
          filterByFormula: `AND(
            {User ID} = '${userId}', 
            {Exercise Name} = '${exerciseName}'
          )`,
          sort: [{ field: 'Max Weight', direction: 'desc' }],
          maxRecords: 1
        })
        .eachPage((records, fetchNextPage) => {
          existingPRs.push(...records);
          fetchNextPage();
        });

      const currentPR = existingPRs[0];
      const isNewPR = !currentPR || maxData.weight > currentPR.get('Max Weight');
      
      if (isNewPR) {
        // Create new PR record
        const previousPR = currentPR ? currentPR.get('Max Weight') : 0;
        
        const prRecord = await base('Progress Records').create({
          'User ID': userId,
          'Exercise Name': exerciseName,
          'Max Weight': maxData.weight,
          'Reps': maxData.reps,
          'Date Achieved': maxData.date,
          'Workout ID': [maxData.workoutId],
          'Previous PR': previousPR
        });

        newPRs.push({
          id: prRecord.id,
          exercise: exerciseName,
          newPR: maxData.weight,
          previousPR,
          improvement: maxData.weight - previousPR,
          reps: maxData.reps,
          dateAchieved: maxData.date,
          estimated1RM: maxData.estimated1RM
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: newPRs,
        message: `Found ${newPRs.length} new personal records!`,
        totalWorkoutsChecked: recentWorkouts.length
      })
    };

  } catch (error) {
    throw new Error(`Failed to check for new PRs: ${error.message}`);
  }
}

// Get existing PR records
async function getPRRecords(base, userId, exercise, limit, headers, analysisType = 'basic', includeProjections = false) {
  try {
    let filterFormula = `{User ID} = '${userId}'`;
    
    if (exercise) {
      filterFormula = `AND(${filterFormula}, {Exercise Name} = '${exercise}')`;
    }

    const records = [];
    await base('Progress Records')
      .select({
        filterByFormula: filterFormula,
        sort: [{ field: 'Date Achieved', direction: 'desc' }],
        maxRecords: parseInt(limit)
      })
      .eachPage((pageRecords, fetchNextPage) => {
        records.push(...pageRecords);
        fetchNextPage();
      });

    const formattedRecords = records.map(record => ({
      id: record.id,
      userId: record.get('User ID'),
      exercise: record.get('Exercise Name'),
      maxWeight: record.get('Max Weight'),
      reps: record.get('Reps'),
      dateAchieved: record.get('Date Achieved'),
      workoutId: record.get('Workout ID')?.[0],
      previousPR: record.get('Previous PR'),
      improvement: record.get('Improvement'),
      createdAt: record.get('Created At')
    }));

    // Group by exercise and get latest PR for each
    const exercisePRs = {};
    formattedRecords.forEach(pr => {
      if (!exercisePRs[pr.exercise] || 
          new Date(pr.dateAchieved) > new Date(exercisePRs[pr.exercise].dateAchieved)) {
        exercisePRs[pr.exercise] = pr;
      }
    });

    let responseData = {
      allPRs: formattedRecords,
      currentPRs: Object.values(exercisePRs),
      summary: {
        totalExercises: Object.keys(exercisePRs).length,
        totalPRs: formattedRecords.length
      }
    };

    // Add enhanced analysis based on type
    if (analysisType === 'detailed' || analysisType === 'trends') {
      const enhancedAnalysis = await performEnhancedPRAnalysis(base, userId, formattedRecords, exercisePRs);
      responseData.enhancedAnalysis = enhancedAnalysis;
    }

    if (includeProjections) {
      const projections = calculatePRProjections(exercisePRs);
      responseData.projections = projections;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: responseData
      })
    };

  } catch (error) {
    throw new Error(`Failed to fetch PR records: ${error.message}`);
  }
}

// Enhanced PR Analysis
async function performEnhancedPRAnalysis(base, userId, allPRs, currentPRs) {
  const analysis = {
    strengthProgression: {},
    prFrequency: {},
    strengthCategories: {},
    prTrends: {},
    insights: []
  };

  // Group PRs by exercise for trend analysis
  const exercisePRHistory = {};
  allPRs.forEach(pr => {
    if (!exercisePRHistory[pr.exercise]) {
      exercisePRHistory[pr.exercise] = [];
    }
    exercisePRHistory[pr.exercise].push({
      weight: pr.maxWeight,
      date: pr.dateAchieved,
      improvement: pr.improvement || 0
    });
  });

  // Analyze each exercise's progression
  for (const [exercise, prHistory] of Object.entries(exercisePRHistory)) {
    const sortedHistory = prHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Calculate progression metrics
    const totalImprovement = sortedHistory.reduce((sum, pr) => sum + pr.improvement, 0);
    const averageImprovement = totalImprovement / sortedHistory.length;
    const timeSpan = sortedHistory.length > 1 
      ? (new Date(sortedHistory[sortedHistory.length - 1].date) - new Date(sortedHistory[0].date)) / (1000 * 60 * 60 * 24)
      : 0;
    const improvementRate = timeSpan > 0 ? (totalImprovement / timeSpan) * 30 : 0; // Per month

    analysis.strengthProgression[exercise] = {
      totalPRs: sortedHistory.length,
      totalImprovement,
      averageImprovement,
      improvementRate,
      currentMax: sortedHistory[sortedHistory.length - 1].weight,
      timeSpan,
      progressionTrend: calculateProgressionTrend(sortedHistory)
    };

    // PR Frequency Analysis
    analysis.prFrequency[exercise] = {
      averageDaysBetweenPRs: timeSpan / Math.max(sortedHistory.length - 1, 1),
      lastPRDate: sortedHistory[sortedHistory.length - 1].date,
      daysSinceLastPR: Math.floor((new Date() - new Date(sortedHistory[sortedHistory.length - 1].date)) / (1000 * 60 * 60 * 24))
    };
  }

  // Categorize exercises by strength level
  analysis.strengthCategories = categorizeExercisesByStrength(currentPRs);

  // Generate insights
  analysis.insights = generatePRInsights(analysis);

  return analysis;
}

function calculateProgressionTrend(prHistory) {
  if (prHistory.length < 3) return 'insufficient_data';
  
  const weights = prHistory.map(pr => pr.weight);
  const n = weights.length;
  
  // Simple linear regression
  const xSum = (n * (n - 1)) / 2;
  const ySum = weights.reduce((sum, w) => sum + w, 0);
  const xySum = weights.reduce((sum, w, i) => sum + (w * i), 0);
  const xSquaredSum = (n * (n - 1) * (2 * n - 1)) / 6;
  
  const slope = (n * xySum - xSum * ySum) / (n * xSquaredSum - xSum * xSum);
  
  if (slope > 2) return 'accelerating';
  if (slope > 0.5) return 'steady_growth';
  if (slope > -0.5) return 'plateauing';
  return 'declining';
}

function categorizeExercisesByStrength(currentPRs) {
  const categories = {
    beginner: [],
    intermediate: [], 
    advanced: [],
    elite: []
  };

  // Strength standards (simplified - would normally use body weight ratios)
  const strengthStandards = {
    'Squat': { beginner: 135, intermediate: 225, advanced: 315, elite: 405 },
    'Bench Press': { beginner: 95, intermediate: 135, advanced: 225, elite: 315 },
    'Deadlift': { beginner: 155, intermediate: 275, advanced: 405, elite: 500 },
    'Overhead Press': { beginner: 65, intermediate: 95, advanced: 135, elite: 185 }
  };

  Object.values(currentPRs).forEach(pr => {
    const standards = strengthStandards[pr.exercise] || strengthStandards['Bench Press']; // Default
    const weight = pr.maxWeight;
    
    if (weight >= standards.elite) {
      categories.elite.push(pr);
    } else if (weight >= standards.advanced) {  
      categories.advanced.push(pr);
    } else if (weight >= standards.intermediate) {
      categories.intermediate.push(pr);
    } else {
      categories.beginner.push(pr);
    }
  });

  return categories;
}

function generatePRInsights(analysis) {
  const insights = [];
  
  // Analyze overall progression
  const exerciseCount = Object.keys(analysis.strengthProgression).length;
  const totalPRs = Object.values(analysis.strengthProgression).reduce((sum, prog) => sum + prog.totalPRs, 0);
  const avgImprovementRate = Object.values(analysis.strengthProgression)
    .reduce((sum, prog) => sum + prog.improvementRate, 0) / exerciseCount;

  if (avgImprovementRate > 5) {
    insights.push({
      type: 'celebration',
      category: 'progression',
      message: 'Excellent strength progression! You\'re improving at an exceptional rate.',
      priority: 'high'
    });
  } else if (avgImprovementRate < 1) {
    insights.push({
      type: 'suggestion',
      category: 'progression',
      message: 'Consider adjusting your training program to increase progression rate.',
      priority: 'medium'
    });
  }

  // Check for stagnant exercises
  const stagnantExercises = Object.entries(analysis.prFrequency)
    .filter(([_, freq]) => freq.daysSinceLastPR > 60)
    .map(([exercise, _]) => exercise);

  if (stagnantExercises.length > 0) {
    insights.push({
      type: 'warning',
      category: 'stagnation',
      message: `No recent PRs in: ${stagnantExercises.join(', ')}. Consider program adjustments.`,
      priority: 'high'
    });
  }

  // Strength category distribution
  const { beginner, intermediate, advanced, elite } = analysis.strengthCategories || {};
  const totalExercises = (beginner?.length || 0) + (intermediate?.length || 0) + (advanced?.length || 0) + (elite?.length || 0);
  
  if (totalExercises > 0) {
    const advancedRatio = ((advanced?.length || 0) + (elite?.length || 0)) / totalExercises;
    if (advancedRatio > 0.5) {
      insights.push({
        type: 'celebration',
        category: 'strength_level',
        message: 'You\'ve reached advanced strength levels in most exercises!',
        priority: 'low'
      });
    }
  }

  return insights;
}

// PR Projections
function calculatePRProjections(currentPRs) {
  const projections = {};
  
  Object.values(currentPRs).forEach(pr => {
    const currentWeight = pr.maxWeight;
    const improvement = pr.improvement || 0;
    
    // Simple projection based on recent improvement
    const conservativeProjection = currentWeight + (improvement * 0.8);
    const optimisticProjection = currentWeight + (improvement * 1.5);
    const realisticProjection = currentWeight + improvement;
    
    projections[pr.exercise] = {
      current: currentWeight,
      projections: {
        '30_days': {
          conservative: Math.round(conservativeProjection * 100) / 100,
          realistic: Math.round(realisticProjection * 100) / 100,
          optimistic: Math.round(optimisticProjection * 100) / 100
        },
        '90_days': {
          conservative: Math.round((currentWeight + improvement * 2) * 100) / 100,
          realistic: Math.round((currentWeight + improvement * 3) * 100) / 100,
          optimistic: Math.round((currentWeight + improvement * 4) * 100) / 100
        }
      },
      confidenceFactors: {
        recentProgress: improvement > 0 ? 'high' : 'low',
        consistency: 'medium', // Would need more data to calculate
        trainingAge: 'unknown'
      }
    };
  });
  
  return projections;
}