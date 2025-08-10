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
      days = '30', // Last N days
      action = 'metrics' // 'metrics', 'recommendations', 'trends'
    } = params;

    // Configure Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Fetch workout records with duration data
    const workouts = [];
    await new Promise((resolve, reject) => {
      base('Workouts')
        .select({
          filterByFormula: `AND({User ID} = '${userId}', {Date} >= '${startDate.toISOString().split('T')[0]}', {Date} <= '${endDate.toISOString().split('T')[0]}')`,
          sort: [{ field: 'Date', direction: 'desc' }],
          pageSize: 100
        })
        .eachPage(
          (records, fetchNextPage) => {
            records.forEach(record => {
              const workout = {
                id: record.id,
                date: record.get('Date'),
                exercise: record.get('Exercise'),
                sets: record.get('Sets'),
                reps: record.get('Reps'),
                weight: record.get('Weight'),
                totalDuration: record.get('Total Duration'),
                workTime: record.get('Work Time'),
                restTime: record.get('Rest Time'),
                setCount: record.get('Set Count'),
                avgSetDuration: record.get('Average Set Duration'),
                avgRestDuration: record.get('Average Rest Duration'),
                efficiency: record.get('Workout Efficiency'),
                startTime: record.get('Start Time'),
                endTime: record.get('End Time'),
                notes: record.get('Notes')
              };
              
              // Only include workouts with duration data
              if (workout.totalDuration || workout.workTime) {
                workouts.push(workout);
              }
            });
            fetchNextPage();
          },
          error => {
            if (error) reject(error);
            else resolve();
          }
        );
    });

    console.log(`Retrieved ${workouts.length} workouts with duration data for analytics`);

    // Import analytics functions
    const { calculateWorkoutMetrics, generateDurationRecommendations, formatDuration } = require('../src/utils/workoutTimer.js');

    let response = {};

    switch (action) {
      case 'metrics':
        const metrics = calculateWorkoutMetrics(workouts);
        
        // Add formatted versions for display
        const formattedMetrics = {
          ...metrics,
          formatted: {
            totalDuration: formatDuration(metrics.totalDuration),
            averageDuration: formatDuration(metrics.averageDuration),
            shortestWorkout: formatDuration(metrics.shortestWorkout),
            longestWorkout: formatDuration(metrics.longestWorkout),
            totalWorkTime: formatDuration(metrics.totalWorkTime),
            totalRestTime: formatDuration(metrics.totalRestTime),
            averageRestTime: formatDuration(metrics.averageRestTime)
          }
        };

        response = {
          success: true,
          timeRange: {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            days: parseInt(days)
          },
          metrics: formattedMetrics,
          workoutCount: workouts.length
        };
        break;

      case 'recommendations':
        const recMetrics = calculateWorkoutMetrics(workouts);
        const recommendations = generateDurationRecommendations(recMetrics);
        
        response = {
          success: true,
          recommendations,
          baseMetrics: {
            averageDuration: formatDuration(recMetrics.averageDuration),
            averageEfficiency: recMetrics.averageEfficiency,
            workoutFrequency: recMetrics.workoutFrequency
          }
        };
        break;

      case 'trends':
        // Calculate weekly trends
        const weeklyTrends = calculateWeeklyTrends(workouts);
        
        response = {
          success: true,
          trends: weeklyTrends,
          timeRange: {
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
          }
        };
        break;

      case 'exercise-breakdown':
        const exerciseBreakdown = calculateExerciseBreakdown(workouts);
        
        response = {
          success: true,
          exerciseBreakdown,
          totalExercises: Object.keys(exerciseBreakdown).length
        };
        break;

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action. Use: metrics, recommendations, trends, or exercise-breakdown' })
        };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Error in duration analytics:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to calculate duration analytics',
        message: error.message,
        details: error.stack?.split('\n')[0] || 'Unknown error'
      })
    };
  }
};

// Helper function to calculate weekly trends
function calculateWeeklyTrends(workouts) {
  const weeks = {};
  
  workouts.forEach(workout => {
    const date = new Date(workout.date);
    const weekStart = new Date(date);
    weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
    const weekKey = weekStart.toISOString().split('T')[0];
    
    if (!weeks[weekKey]) {
      weeks[weekKey] = {
        weekStart: weekKey,
        workouts: [],
        totalDuration: 0,
        totalWorkTime: 0,
        totalRestTime: 0,
        avgEfficiency: 0,
        workoutCount: 0
      };
    }
    
    weeks[weekKey].workouts.push(workout);
    weeks[weekKey].totalDuration += workout.totalDuration || 0;
    weeks[weekKey].totalWorkTime += workout.workTime || 0;
    weeks[weekKey].totalRestTime += workout.restTime || 0;
    weeks[weekKey].workoutCount += 1;
  });
  
  // Calculate averages and format
  return Object.values(weeks)
    .map(week => ({
      ...week,
      avgDuration: week.workoutCount > 0 ? Math.round(week.totalDuration / week.workoutCount) : 0,
      avgEfficiency: week.workoutCount > 0 ? Math.round(week.workouts.reduce((sum, w) => sum + (w.efficiency || 0), 0) / week.workoutCount) : 0,
      formatted: {
        totalDuration: formatDuration(week.totalDuration),
        avgDuration: formatDuration(week.workoutCount > 0 ? Math.round(week.totalDuration / week.workoutCount) : 0)
      }
    }))
    .sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart));
}

// Helper function to calculate exercise-specific breakdowns
function calculateExerciseBreakdown(workouts) {
  const exercises = {};
  
  workouts.forEach(workout => {
    const exercise = workout.exercise;
    if (!exercises[exercise]) {
      exercises[exercise] = {
        name: exercise,
        workouts: [],
        totalDuration: 0,
        totalWorkTime: 0,
        avgDuration: 0,
        avgEfficiency: 0,
        count: 0
      };
    }
    
    exercises[exercise].workouts.push(workout);
    exercises[exercise].totalDuration += workout.totalDuration || 0;
    exercises[exercise].totalWorkTime += workout.workTime || 0;
    exercises[exercise].count += 1;
  });
  
  // Calculate averages
  Object.values(exercises).forEach(exercise => {
    exercise.avgDuration = exercise.count > 0 ? Math.round(exercise.totalDuration / exercise.count) : 0;
    exercise.avgEfficiency = exercise.count > 0 ? Math.round(exercise.workouts.reduce((sum, w) => sum + (w.efficiency || 0), 0) / exercise.count) : 0;
    exercise.formatted = {
      avgDuration: formatDuration(exercise.avgDuration),
      totalDuration: formatDuration(exercise.totalDuration)
    };
  });
  
  return exercises;
}

// Format duration helper (server-side version)
function formatDuration(seconds) {
  if (!seconds || seconds <= 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}