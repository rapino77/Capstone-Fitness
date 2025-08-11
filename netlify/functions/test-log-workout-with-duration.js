const axios = require('axios');

async function testLogWorkoutWithDuration() {
  console.log('🔍 Testing workout logging with duration data\n');
  
  const baseUrl = 'http://localhost:8888/.netlify/functions';
  
  try {
    // Create a test workout with duration data
    const testWorkout = {
      userId: 'default-user',
      exercise: 'Test Bench Press',
      sets: 3,
      reps: 10,
      weight: 135,
      date: new Date().toISOString().split('T')[0],
      notes: 'Test workout with duration data',
      // Duration data that should be saved
      totalDuration: 1800, // 30 minutes
      workTime: 900, // 15 minutes
      restTime: 900, // 15 minutes
      setCount: 3,
      avgSetDuration: 300, // 5 minutes per set
      avgRestDuration: 300, // 5 minutes rest
      efficiency: 50, // 50% work time
      startTime: new Date(Date.now() - 1800000).toISOString(), // 30 min ago
      endTime: new Date().toISOString()
    };
    
    console.log('1. Logging workout with duration data...');
    console.log('   Duration info:', {
      totalDuration: `${testWorkout.totalDuration} seconds (${testWorkout.totalDuration/60} minutes)`,
      workTime: `${testWorkout.workTime} seconds`,
      efficiency: `${testWorkout.efficiency}%`
    });
    
    const logResponse = await axios.post(`${baseUrl}/log-workout`, testWorkout);
    
    if (logResponse.data.success) {
      console.log('   ✅ Workout logged successfully!');
      console.log('   Record ID:', logResponse.data.recordId);
      
      // Wait a moment for the data to be saved
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Now check if the duration analytics picks it up
      console.log('\n2. Checking duration analytics...');
      const analyticsResponse = await axios.get(`${baseUrl}/workout-duration-analytics`, {
        params: {
          userId: 'default-user',
          days: '1', // Just today
          action: 'metrics'
        }
      });
      
      console.log('   Analytics response:', JSON.stringify(analyticsResponse.data, null, 2));
      
      if (analyticsResponse.data.metrics && analyticsResponse.data.metrics.totalWorkouts > 0) {
        console.log('\n   ✅ Duration data is being tracked!');
        console.log('   Total workouts with duration:', analyticsResponse.data.metrics.totalWorkouts);
        console.log('   Total duration:', analyticsResponse.data.metrics.formatted.totalDuration);
      } else {
        console.log('\n   ❌ Duration data not found in analytics');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
  }
}

// Run if called directly
if (require.main === module) {
  testLogWorkoutWithDuration();
}