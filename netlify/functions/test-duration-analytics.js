const axios = require('axios');

const testDurationAnalytics = async () => {
  const baseUrl = 'http://localhost:8888/.netlify/functions';
  
  console.log('Testing workout-duration-analytics endpoint...\n');
  
  try {
    // Test metrics action
    console.log('1. Testing metrics action...');
    const metricsResponse = await axios.get(`${baseUrl}/workout-duration-analytics`, {
      params: {
        userId: 'default-user',
        days: '30',
        action: 'metrics'
      }
    });
    
    console.log('✅ Metrics response:', JSON.stringify(metricsResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.status === 500) {
      console.error('Server Error Details:', error.response.data);
    }
  }
};

// Run the test
testDurationAnalytics();