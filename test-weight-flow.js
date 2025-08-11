// Test script to verify weight data flow
const axios = require('axios');

async function testWeightFlow() {
  console.log('🔍 Testing Weight Data Flow...');
  
  try {
    // Test get-weights endpoint
    console.log('\n📞 Testing get-weights API...');
    const response = await axios.get('http://localhost:8888/.netlify/functions/get-weights', {
      params: {
        userId: 'default-user'
      }
    });
    
    console.log('✅ get-weights response:', {
      success: response.data.success,
      dataCount: response.data.data?.length || 0,
      statsCount: response.data.stats?.dataPoints || 0,
      recentWeights: response.data.data?.slice(-3).map(w => ({
        date: w.date,
        weight: w.weight,
        unit: w.unit
      })) || []
    });
    
    if (response.data.data && response.data.data.length > 0) {
      console.log('📊 Latest weight entry:', response.data.data[response.data.data.length - 1]);
    } else {
      console.log('❌ No weight data found');
    }
    
  } catch (error) {
    console.error('❌ get-weights API failed:', error.message);
  }
}

testWeightFlow();