const Airtable = require('airtable');

// Weight calculation utilities
const calculateWeightPerformanceCorrelation = (weightData, performanceData) => {
  if (!weightData?.length || !performanceData?.length) {
    return {
      correlation: 0,
      strength: 'no_data',
      dataPoints: 0
    };
  }
  
  // Align data by date (find matching dates within 1 day)
  const alignedData = [];
  
  weightData.forEach(weightPoint => {
    const matchingPerformance = performanceData.find(perfPoint => 
      Math.abs(new Date(perfPoint.date) - new Date(weightPoint.date)) < 24 * 60 * 60 * 1000
    );
    
    if (matchingPerformance && weightPoint.weight && matchingPerformance.totalVolume) {
      alignedData.push({
        weight: weightPoint.weight,
        volume: matchingPerformance.totalVolume,
        date: weightPoint.date,
        ma7: weightPoint.ma7,
        ma30: weightPoint.ma30
      });
    }
  });
  
  if (alignedData.length < 3) {
    return {
      correlation: 0,
      strength: 'insufficient_data',
      dataPoints: alignedData.length,
      alignedData
    };
  }
  
  // Calculate Pearson correlation coefficient
  const n = alignedData.length;
  const weights = alignedData.map(d => d.weight);
  const volumes = alignedData.map(d => d.volume);
  
  const sumX = weights.reduce((a, b) => a + b, 0);
  const sumY = volumes.reduce((a, b) => a + b, 0);
  const sumXY = alignedData.reduce((sum, d) => sum + (d.weight * d.volume), 0);
  const sumX2 = weights.reduce((sum, x) => sum + (x * x), 0);
  const sumY2 = volumes.reduce((sum, y) => sum + (y * y), 0);
  
  const numerator = (n * sumXY) - (sumX * sumY);
  const denominator = Math.sqrt(((n * sumX2) - (sumX * sumX)) * ((n * sumY2) - (sumY * sumY)));
  
  const correlation = denominator === 0 ? 0 : numerator / denominator;
  
  // Determine correlation strength
  let strength;
  const absCorr = Math.abs(correlation);
  if (absCorr < 0.1) strength = 'negligible';
  else if (absCorr < 0.3) strength = 'weak';
  else if (absCorr < 0.5) strength = 'moderate';
  else if (absCorr < 0.7) strength = 'strong';
  else strength = 'very_strong';
  
  return {
    correlation: Number(correlation.toFixed(3)),
    strength,
    dataPoints: n,
    alignedData
  };
};

const generateInsights = (correlation, alignedData) => {
  const insights = [];
  
  if (correlation.dataPoints >= 5) {
    if (correlation.strength === 'strong' || correlation.strength === 'very_strong') {
      if (correlation.correlation > 0) {
        insights.push({
          type: 'success',
          title: 'Positive Weight-Performance Correlation',
          message: `Strong positive correlation (${correlation.correlation}) suggests muscle gain as training volume increases with body weight.`,
          priority: 'high'
        });
      } else {
        insights.push({
          type: 'info',
          title: 'Inverse Weight-Performance Relationship',
          message: `Strong negative correlation (${correlation.correlation}) indicates improved performance as weight decreases, suggesting effective cutting phase.`,
          priority: 'high'
        });
      }
    } else if (correlation.strength === 'moderate') {
      insights.push({
        type: 'info',
        title: 'Moderate Correlation Detected',
        message: `Moderate correlation (${correlation.correlation}) between weight and performance. Monitor trends over time.`,
        priority: 'medium'
      });
    } else {
      insights.push({
        type: 'neutral',
        title: 'Weight and Performance Independent',
        message: 'No strong correlation between body weight and training performance detected.',
        priority: 'low'
      });
    }
  } else {
    insights.push({
      type: 'warning',
      title: 'Insufficient Data for Correlation',
      message: `Only ${correlation.dataPoints} matching data points. Need more consistent logging for meaningful analysis.`,
      priority: 'medium'
    });
  }
  
  return insights;
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
    if (!process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN || !process.env.AIRTABLE_BASE_ID) {
      throw new Error('Missing required environment variables');
    }

    // Parse query parameters
    const params = event.queryStringParameters || {};
    const { 
      startDate, 
      endDate,
      limit = '100'
    } = params;

    // Configure Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    // Build filter formula for date range
    let filterFormulas = [];
    
    if (startDate) {
      filterFormulas.push(`IS_AFTER({Date}, '${startDate}')`);
    }
    
    if (endDate) {
      filterFormulas.push(`IS_BEFORE({Date}, '${endDate}')`);
    }

    const filterFormula = filterFormulas.length > 0 
      ? `AND(${filterFormulas.join(', ')})` 
      : '';

    // Query configuration
    const queryConfig = {
      pageSize: Math.min(parseInt(limit), 100),
      sort: [{ field: 'Date', direction: 'asc' }]
    };

    if (filterFormula) {
      queryConfig.filterByFormula = filterFormula;
    }

    // Fetch weight data
    console.log('Fetching weight data...');
    const weightRecords = [];
    try {
      await new Promise((resolve, reject) => {
        base('BodyWeight')
          .select(queryConfig)
          .eachPage(
            (pageRecords, fetchNextPage) => {
              weightRecords.push(...pageRecords);
              if (weightRecords.length < parseInt(limit)) {
                fetchNextPage();
              } else {
                resolve();
              }
            },
            (error) => {
              if (error) {
                console.error('Error fetching weight data:', error);
                // Don't reject - just resolve with empty data
                resolve();
              } else {
                resolve();
              }
            }
          );
      });
    } catch (error) {
      console.error('Weight data fetch error:', error);
      // Continue with empty weight data
    }

    // Fetch workout data for performance metrics
    console.log('Fetching workout data...');
    const workoutRecords = [];
    try {
      await new Promise((resolve, reject) => {
        base('Workouts')
          .select({
            ...queryConfig,
            fields: ['Date', 'Duration', 'Notes']
          })
          .eachPage(
            (pageRecords, fetchNextPage) => {
              workoutRecords.push(...pageRecords);
              if (workoutRecords.length < parseInt(limit)) {
                fetchNextPage();
              } else {
                resolve();
              }
            },
            (error) => {
              if (error) {
                console.error('Error fetching workout data:', error);
                resolve();
              } else {
                resolve();
              }
            }
          );
      });
    } catch (error) {
      console.error('Workout data fetch error:', error);
      // Continue with empty workout data
    }

    // Fetch exercise data to calculate training volume
    console.log('Fetching exercise data...');
    const exerciseRecords = [];
    try {
      await new Promise((resolve, reject) => {
        base('Exercises')
          .select({
            pageSize: Math.min(parseInt(limit) * 10, 100), // More exercises per workout
            sort: [{ field: 'Workout ID', direction: 'asc' }]
          })
          .eachPage(
            (pageRecords, fetchNextPage) => {
              exerciseRecords.push(...pageRecords);
              if (exerciseRecords.length < parseInt(limit) * 10) {
                fetchNextPage();
              } else {
                resolve();
              }
            },
            (error) => {
              if (error) {
                console.error('Error fetching exercise data:', error);
                resolve();
              } else {
                resolve();
              }
            }
          );
      });
    } catch (error) {
      console.error('Exercise data fetch error:', error);
      // Continue with empty exercise data
    }

    // Process weight data with moving averages
    console.log(`Processing ${weightRecords.length} weight records`);
    const weightData = weightRecords.length > 0 ? weightRecords.map(record => ({
      date: record.get('Date'),
      weight: record.get('Weight'),
      unit: record.get('Unit') || 'lbs'
    })).filter(item => item.date && item.weight && !isNaN(item.weight)) : [];

    // Calculate moving averages for weight data
    const weightDataWithMA = weightData.length > 0 ? weightData.map((item, index) => {
      // 7-day moving average
      const start7 = Math.max(0, index - 6);
      const recent7 = weightData.slice(start7, index + 1);
      const ma7 = recent7.reduce((sum, d) => sum + d.weight, 0) / recent7.length;

      // 30-day moving average
      const start30 = Math.max(0, index - 29);
      const recent30 = weightData.slice(start30, index + 1);
      const ma30 = recent30.reduce((sum, d) => sum + d.weight, 0) / recent30.length;

      return {
        ...item,
        ma7: Number(ma7.toFixed(1)),
        ma30: Number(ma30.toFixed(1))
      };
    }) : [];

    // Process workout data to calculate daily training volume
    console.log(`Processing ${workoutRecords.length} workout records and ${exerciseRecords.length} exercise records`);
    const workoutVolumeMap = new Map();
    
    if (workoutRecords.length > 0 && exerciseRecords.length > 0) {
      // Group exercises by workout
      const exercisesByWorkout = new Map();
      exerciseRecords.forEach(record => {
        try {
          const workoutId = record.get('Workout ID');
          if (workoutId && workoutId.length > 0) {
            const workoutRef = workoutId[0];
            if (!exercisesByWorkout.has(workoutRef)) {
              exercisesByWorkout.set(workoutRef, []);
            }
            exercisesByWorkout.get(workoutRef).push({
              sets: record.get('Sets') || 0,
              reps: record.get('Reps') || 0,
              weight: record.get('Weight') || 0
            });
          }
        } catch (error) {
          console.error('Error processing exercise record:', error);
        }
      });

      // Calculate total volume per workout
      workoutRecords.forEach(workout => {
        try {
          const workoutId = workout.id;
          const date = workout.get('Date');
          const exercises = exercisesByWorkout.get(workoutId) || [];
          
          const totalVolume = exercises.reduce((sum, exercise) => {
            return sum + (exercise.sets * exercise.reps * exercise.weight);
          }, 0);

          if (date && totalVolume > 0) {
            workoutVolumeMap.set(date, (workoutVolumeMap.get(date) || 0) + totalVolume);
          }
        } catch (error) {
          console.error('Error processing workout record:', error);
        }
      });
    }

    // Convert workout volume map to array
    const performanceData = Array.from(workoutVolumeMap.entries()).map(([date, totalVolume]) => ({
      date,
      totalVolume
    }));

    // Calculate correlation
    const correlation = calculateWeightPerformanceCorrelation(weightDataWithMA, performanceData);
    const insights = generateInsights(correlation, correlation.alignedData);

    // Prepare response data
    const responseData = {
      weightData: weightDataWithMA,
      performanceData,
      correlation: {
        coefficient: correlation.correlation,
        strength: correlation.strength,
        dataPoints: correlation.dataPoints
      },
      combinedData: correlation.alignedData,
      insights,
      summary: {
        weightDataPoints: weightData.length,
        performanceDataPoints: performanceData.length,
        alignedDataPoints: correlation.dataPoints,
        dateRange: {
          start: weightData.length > 0 ? weightData[0].date : null,
          end: weightData.length > 0 ? weightData[weightData.length - 1].date : null
        }
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: responseData
      })
    };

  } catch (error) {
    console.error('Error fetching weight-performance correlation:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to fetch weight-performance correlation',
        message: error.message
      })
    };
  }
};