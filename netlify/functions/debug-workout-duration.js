const axios = require('axios');

async function debugWorkoutDuration() {
  console.log('🔍 Debugging Workout Duration Analytics\n');
  
  const baseUrl = 'http://localhost:8888/.netlify/functions';
  
  try {
    // 1. First check if we can get any workouts
    console.log('1. Fetching recent workouts...');
    const workoutsResponse = await axios.get(`${baseUrl}/get-workouts`, {
      params: {
        userId: 'default-user',
        limit: 5
      }
    });
    
    if (workoutsResponse.data.success) {
      const workouts = workoutsResponse.data.data || workoutsResponse.data.workouts || [];
      console.log(`   ✅ Found ${workouts.length} workouts`);
      
      if (workouts.length > 0) {
        console.log('\n   Sample workout:');
        const sample = workouts[0];
        console.log(`   - Exercise: ${sample.exercise || sample.Exercise}`);
        console.log(`   - Date: ${sample.date || sample.Date}`);
        console.log(`   - Total Duration: ${sample.totalDuration || sample['Total Duration'] || 'NOT SET'}`);
        console.log(`   - Work Time: ${sample.workTime || sample['Work Time'] || 'NOT SET'}`);
        console.log(`   - Available fields:`, Object.keys(sample));
      }
    }
    
    // 2. Now check the duration analytics endpoint
    console.log('\n2. Testing workout-duration-analytics endpoint...');
    const analyticsResponse = await axios.get(`${baseUrl}/workout-duration-analytics`, {
      params: {
        userId: 'default-user',
        days: '30',
        action: 'metrics'
      }
    });
    
    console.log('   ✅ Analytics response received');
    console.log('   Metrics:', JSON.stringify(analyticsResponse.data.metrics, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.data?.details) {
      console.error('Details:', error.response.data.details);
    }
  }
}

// Only run if called directly
if (require.main === module) {
  debugWorkoutDuration();
}