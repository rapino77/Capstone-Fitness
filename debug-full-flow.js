// Debug script to test complete data flow
const axios = require('axios');

const API_BASE = 'http://localhost:8888/.netlify/functions';

async function debugCompleteFlow() {
  console.log('🔍 DEBUGGING COMPLETE DATA FLOW...\n');
  
  // Test 1: Check if weight data exists
  console.log('=== TEST 1: GET WEIGHTS ===');
  try {
    const weightResponse = await axios.get(`${API_BASE}/get-weights`, {
      params: { userId: 'default-user' }
    });
    
    console.log('Weight API Response Status:', weightResponse.status);
    console.log('Weight API Success:', weightResponse.data.success);
    console.log('Weight Data Count:', weightResponse.data.data?.length || 0);
    console.log('Weight Stats:', weightResponse.data.stats);
    
    if (weightResponse.data.data && weightResponse.data.data.length > 0) {
      console.log('Recent weights:', weightResponse.data.data.slice(-3));
    } else {
      console.log('❌ NO WEIGHT DATA FOUND');
    }
  } catch (error) {
    console.error('❌ get-weights failed:', error.message);
    console.error('Response data:', error.response?.data);
  }
  
  // Test 2: Check if workout data exists
  console.log('\n=== TEST 2: GET WORKOUTS ===');
  try {
    const workoutResponse = await axios.get(`${API_BASE}/get-workouts`, {
      params: { userId: 'default-user' }
    });
    
    console.log('Workout API Response Status:', workoutResponse.status);
    console.log('Workout API Success:', workoutResponse.data.success);
    console.log('Workout Data Count:', workoutResponse.data.data?.length || 0);
    
    if (workoutResponse.data.data && workoutResponse.data.data.length > 0) {
      console.log('Recent workouts:', workoutResponse.data.data.slice(-3).map(w => ({
        date: w.date,
        exercise: w.exercise,
        sets: w.sets,
        reps: w.reps,
        weight: w.weight,
        hasDuration: !!(w.totalDuration || w.duration)
      })));
    } else {
      console.log('❌ NO WORKOUT DATA FOUND');
    }
  } catch (error) {
    console.error('❌ get-workouts failed:', error.message);
    console.error('Response data:', error.response?.data);
  }
  
  // Test 3: Check duration analytics
  console.log('\n=== TEST 3: DURATION ANALYTICS ===');
  try {
    const durationResponse = await axios.get(`${API_BASE}/workout-duration-analytics`, {
      params: { userId: 'default-user', days: '30', action: 'metrics' }
    });
    
    console.log('Duration API Response Status:', durationResponse.status);
    console.log('Duration API Success:', durationResponse.data.success);
    console.log('Duration Metrics:', durationResponse.data.metrics);
  } catch (error) {
    console.error('❌ duration analytics failed:', error.message);
    console.error('Response data:', error.response?.data);
  }
  
  // Test 4: Test a simple log-weight call
  console.log('\n=== TEST 4: LOG TEST WEIGHT ===');
  try {
    const testWeight = {
      weight: 150,
      date: new Date().toISOString().split('T')[0],
      unit: 'lbs',
      notes: 'Debug test weight'
    };
    
    const logResponse = await axios.post(`${API_BASE}/log-weight`, testWeight);
    
    console.log('Log Weight Response Status:', logResponse.status);
    console.log('Log Weight Success:', logResponse.data.success);
    console.log('Log Weight ID:', logResponse.data.id);
    
    if (logResponse.data.success) {
      console.log('✅ Weight logged successfully, checking if it appears...');
      
      // Wait a moment and check again
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const checkResponse = await axios.get(`${API_BASE}/get-weights`, {
        params: { userId: 'default-user' }
      });
      
      console.log('After logging - Weight count:', checkResponse.data.data?.length || 0);
      if (checkResponse.data.data?.length > 0) {
        console.log('Latest weight:', checkResponse.data.data[checkResponse.data.data.length - 1]);
      }
    }
  } catch (error) {
    console.error('❌ log-weight failed:', error.message);
    console.error('Response data:', error.response?.data);
  }
  
  // Test 5: Test a simple log-workout call
  console.log('\n=== TEST 5: LOG TEST WORKOUT ===');
  try {
    const testWorkout = {
      exercise: 'Debug Test Exercise',
      sets: 3,
      reps: 10,
      weight: 100,
      date: new Date().toISOString().split('T')[0],
      notes: 'Debug test workout',
      totalDuration: 1800, // 30 minutes
      workTime: 1200, // 20 minutes
      restTime: 600, // 10 minutes
      efficiency: 67
    };
    
    const logWorkoutResponse = await axios.post(`${API_BASE}/log-workout`, testWorkout);
    
    console.log('Log Workout Response Status:', logWorkoutResponse.status);
    console.log('Log Workout Success:', logWorkoutResponse.data.success);
    console.log('Log Workout ID:', logWorkoutResponse.data.recordId);
    
    if (logWorkoutResponse.data.success) {
      console.log('✅ Workout logged successfully, checking if it appears...');
      
      // Wait a moment and check again
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const checkWorkoutResponse = await axios.get(`${API_BASE}/get-workouts`, {
        params: { userId: 'default-user' }
      });
      
      console.log('After logging - Workout count:', checkWorkoutResponse.data.data?.length || 0);
      if (checkWorkoutResponse.data.data?.length > 0) {
        console.log('Latest workout:', checkWorkoutResponse.data.data[0]);
      }
    }
  } catch (error) {
    console.error('❌ log-workout failed:', error.message);
    console.error('Response data:', error.response?.data);
  }
  
  console.log('\n=== DEBUG COMPLETE ===');
}

// Run the debug
debugCompleteFlow().catch(console.error);