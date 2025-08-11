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
              try {
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
              } catch (fieldError) {
                // If duration fields don't exist, just skip this record
                console.log('Duration fields not found in record, skipping...');
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
    
    // If no workouts with duration data, return empty analytics
    if (workouts.length === 0) {
      console.log('No workouts with duration data found. Returning empty analytics.');
    }

    // Analytics functions (server-side implementations)
    const calculateWorkoutMetrics = (workouts) => {
      if (!workouts || workouts.length === 0) {
        return {
          totalWorkouts: 0,
          totalDuration: 0,
          averageDuration: 0,
          shortestWorkout: 0,
          longestWorkout: 0,
          totalWorkTime: 0,
          totalRestTime: 0,
          averageRestTime: 0,
          workoutFrequency: 0,
          efficiencyTrend: [],
          averageEfficiency: 0
        };
      }

      const durations = workouts.map(w => w.totalDuration || 0).filter(d => d > 0);
      const workTimes = workouts.map(w => w.workTime || 0).filter(d => d > 0);
      const restTimes = workouts.map(w => w.restTime || 0).filter(d => d > 0);
      
      const totalDuration = durations.reduce((sum, d) => sum + d, 0);
      const totalWorkTime = workTimes.reduce((sum, d) => sum + d, 0);
      const totalRestTime = restTimes.reduce((sum, d) => sum + d, 0);
      
      // Calculate workout frequency (workouts per week)
      const sortedWorkouts = workouts.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
      const firstWorkout = sortedWorkouts[0];
      const lastWorkout = sortedWorkouts[sortedWorkouts.length - 1];
      const daySpan = Math.max(1, Math.floor((new Date(lastWorkout.date) - new Date(firstWorkout.date)) / (1000 * 60 * 60 * 24)));
      const workoutFrequency = (workouts.length / daySpan) * 7;
      
      // Calculate efficiency trend (last 10 workouts)
      const recentWorkouts = workouts.slice(-10);
      const efficiencyTrend = recentWorkouts.map(w => ({
        date: w.date,
        efficiency: w.efficiency || (w.totalDuration > 0 ? Math.round(((w.workTime || 0) / w.totalDuration) * 100) : 0)
      }));
      
      return {
        totalWorkouts: workouts.length,
        totalDuration,
        averageDuration: durations.length > 0 ? Math.round(totalDuration / durations.length) : 0,
        shortestWorkout: durations.length > 0 ? Math.min(...durations) : 0,
        longestWorkout: durations.length > 0 ? Math.max(...durations) : 0,
        totalWorkTime,
        totalRestTime,
        averageRestTime: restTimes.length > 0 ? Math.round(totalRestTime / restTimes.length) : 0,
        workoutFrequency: Math.round(workoutFrequency * 10) / 10,
        efficiencyTrend,
        averageEfficiency: efficiencyTrend.length > 0 ? Math.round(efficiencyTrend.reduce((sum, e) => sum + e.efficiency, 0) / efficiencyTrend.length) : 0
      };
    };

    const generateDurationRecommendations = (metrics, currentWorkout = null) => {
      const recommendations = [];
      
      if (metrics.totalWorkouts === 0) {
        return [{
          type: 'info',
          title: 'Welcome to Workout Tracking!',
          message: 'Start timing your workouts to get personalized insights and recommendations.',
          priority: 'low'
        }];
      }
      
      // Workout duration recommendations
      if (metrics.averageDuration > 0) {
        if (metrics.averageDuration > 5400) { // > 90 minutes
          recommendations.push({
            type: 'warning',
            title: 'Long Workout Duration',
            message: `Your average workout is ${formatDuration(metrics.averageDuration)}. Consider shortening sessions to maintain intensity.`,
            priority: 'medium'
          });
        } else if (metrics.averageDuration < 1800) { // < 30 minutes
          recommendations.push({
            type: 'info',
            title: 'Short Workout Duration',
            message: `Your average workout is ${formatDuration(metrics.averageDuration)}. You might benefit from longer sessions.`,
            priority: 'low'
          });
        }
      }
      
      // Efficiency recommendations
      if (metrics.averageEfficiency > 0) {
        if (metrics.averageEfficiency < 30) {
          recommendations.push({
            type: 'tip',
            title: 'Improve Workout Efficiency',
            message: `Your workouts are ${metrics.averageEfficiency}% efficient. Try reducing rest times or eliminating distractions.`,
            priority: 'medium'
          });
        } else if (metrics.averageEfficiency > 70) {
          recommendations.push({
            type: 'success',
            title: 'Great Workout Efficiency!',
            message: `Your workouts are ${metrics.averageEfficiency}% efficient. You're making great use of your time.`,
            priority: 'low'
          });
        }
      }
      
      // Frequency recommendations
      if (metrics.workoutFrequency > 0) {
        if (metrics.workoutFrequency < 2) {
          recommendations.push({
            type: 'info',
            title: 'Increase Workout Frequency',
            message: `You're averaging ${metrics.workoutFrequency} workouts per week. Aim for 3-4 sessions for optimal results.`,
            priority: 'medium'
          });
        } else if (metrics.workoutFrequency > 6) {
          recommendations.push({
            type: 'warning',
            title: 'High Workout Frequency',
            message: `You're averaging ${metrics.workoutFrequency} workouts per week. Make sure to include rest days for recovery.`,
            priority: 'high'
          });
        }
      }
      
      return recommendations.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });
    };

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