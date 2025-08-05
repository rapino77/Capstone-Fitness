/**
 * Weight trend calculation utilities
 * Provides functions for calculating moving averages and trend analysis
 */

/**
 * Calculate moving average for a given period
 * @param {Array} data - Array of weight data points with {date, weight} structure
 * @param {number} days - Number of days for moving average (7, 30, etc.)
 * @returns {Array} Array with moving average added to each data point
 */
export const calculateMovingAverage = (data, days) => {
  if (!data || data.length === 0) return [];
  
  // Sort data by date to ensure chronological order
  const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  return sortedData.map((item, index) => {
    // For moving average, we need at least 'days' data points
    const startIndex = Math.max(0, index - days + 1);
    const relevantData = sortedData.slice(startIndex, index + 1);
    
    // Calculate average weight for the period
    const sum = relevantData.reduce((acc, curr) => acc + curr.weight, 0);
    const average = sum / relevantData.length;
    
    return {
      ...item,
      [`ma${days}`]: Number(average.toFixed(1)),
      // Include how many data points were used (for transparency)
      [`ma${days}Count`]: relevantData.length
    };
  });
};

/**
 * Calculate both 7-day and 30-day moving averages
 * @param {Array} data - Array of weight data points
 * @returns {Array} Array with both moving averages added
 */
export const calculateAllMovingAverages = (data) => {
  if (!data || data.length === 0) return [];
  
  // Calculate 7-day moving average
  const dataWith7Day = calculateMovingAverage(data, 7);
  
  // Calculate 30-day moving average
  const dataWithBoth = calculateMovingAverage(dataWith7Day, 30);
  
  return dataWithBoth;
};

/**
 * Calculate weight trend direction and rate of change
 * @param {Array} data - Array of weight data points with moving averages
 * @param {number} period - Period to analyze (7 or 30 days)
 * @returns {Object} Trend analysis object
 */
export const calculateWeightTrend = (data, period = 7) => {
  if (!data || data.length < 2) {
    return {
      direction: 'insufficient_data',
      rate: 0,
      confidence: 0
    };
  }
  
  const maKey = `ma${period}`;
  const validData = data.filter(item => item[maKey] !== undefined);
  
  if (validData.length < 2) {
    return {
      direction: 'insufficient_data',
      rate: 0,
      confidence: 0
    };
  }
  
  // Get the most recent and oldest data points with sufficient data
  const recent = validData[validData.length - 1];
  const older = validData[Math.max(0, validData.length - period)];
  
  const recentWeight = recent[maKey];
  const olderWeight = older[maKey];
  const daysDiff = Math.max(1, (new Date(recent.date) - new Date(older.date)) / (1000 * 60 * 60 * 24));
  
  // Calculate rate of change (lbs per week)
  const weightChange = recentWeight - olderWeight;
  const ratePerWeek = (weightChange / daysDiff) * 7;
  
  // Determine trend direction
  let direction;
  if (Math.abs(ratePerWeek) < 0.1) {
    direction = 'maintaining';
  } else if (ratePerWeek > 0) {
    direction = 'gaining';
  } else {
    direction = 'losing';
  }
  
  // Calculate confidence based on data consistency
  const confidence = Math.min(validData.length / period, 1) * 100;
  
  return {
    direction,
    rate: Number(ratePerWeek.toFixed(2)),
    confidence: Number(confidence.toFixed(1)),
    period,
    dataPoints: validData.length
  };
};

/**
 * Calculate correlation between weight and performance metrics
 * @param {Array} weightData - Array of weight data points
 * @param {Array} performanceData - Array of performance data points
 * @returns {Object} Correlation analysis
 */
export const calculateWeightPerformanceCorrelation = (weightData, performanceData) => {
  if (!weightData?.length || !performanceData?.length) {
    return {
      correlation: 0,
      strength: 'no_data',
      dataPoints: 0
    };
  }
  
  // Align data by date (find matching dates)
  const alignedData = [];
  
  weightData.forEach(weightPoint => {
    const matchingPerformance = performanceData.find(perfPoint => 
      Math.abs(new Date(perfPoint.date) - new Date(weightPoint.date)) < 24 * 60 * 60 * 1000 // Within 1 day
    );
    
    if (matchingPerformance && weightPoint.weight && matchingPerformance.totalVolume) {
      alignedData.push({
        weight: weightPoint.weight,
        volume: matchingPerformance.totalVolume,
        date: weightPoint.date
      });
    }
  });
  
  if (alignedData.length < 3) {
    return {
      correlation: 0,
      strength: 'insufficient_data',
      dataPoints: alignedData.length
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
    alignedData // Include for debugging/visualization
  };
};

/**
 * Generate weight insights based on trend analysis
 * @param {Object} trend - Trend analysis object
 * @param {Object} correlation - Correlation analysis object
 * @returns {Array} Array of insight objects
 */
export const generateWeightInsights = (trend, correlation) => {
  const insights = [];
  
  // Trend insights
  if (trend.confidence > 70) {
    if (trend.direction === 'losing' && trend.rate < -1) {
      insights.push({
        type: 'warning',
        title: 'Rapid Weight Loss',
        message: `You're losing weight at ${Math.abs(trend.rate).toFixed(1)} lbs/week. Consider if this aligns with your goals.`,
        priority: 'high'
      });
    } else if (trend.direction === 'gaining' && trend.rate > 1) {
      insights.push({
        type: 'warning',
        title: 'Rapid Weight Gain',
        message: `You're gaining weight at ${trend.rate.toFixed(1)} lbs/week. Monitor if this matches your objectives.`,
        priority: 'high'
      });
    } else if (trend.direction === 'maintaining') {
      insights.push({
        type: 'success',
        title: 'Stable Weight',
        message: 'Your weight has been stable over the recent period.',
        priority: 'medium'
      });
    }
  }
  
  // Correlation insights
  if (correlation.dataPoints >= 5) {
    if (correlation.strength === 'strong' || correlation.strength === 'very_strong') {
      if (correlation.correlation > 0) {
        insights.push({
          type: 'info',
          title: 'Weight-Performance Link',
          message: 'Your training volume tends to increase with body weight. This could indicate muscle gain.',
          priority: 'medium'
        });
      } else {
        insights.push({
          type: 'info',
          title: 'Weight-Performance Inverse',
          message: 'Your performance increases as weight decreases, suggesting effective cutting.',
          priority: 'medium'
        });
      }
    }
  }
  
  // Data quality insights
  if (trend.confidence < 50) {
    insights.push({
      type: 'info',
      title: 'More Data Needed',
      message: 'Log weight more consistently for better trend analysis.',
      priority: 'low'
    });
  }
  
  return insights;
};