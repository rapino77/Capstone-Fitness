const { handler } = require('./get-goal-progress');

async function testGetGoalProgress() {
  console.log('🧪 Testing get-goal-progress function...');
  
  const mockEvent = {
    httpMethod: 'GET',
    queryStringParameters: {
      days: '30'
    }
  };
  
  const mockContext = {};
  
  try {
    const result = await handler(mockEvent, mockContext);
    console.log('✅ Response status:', result.statusCode);
    
    if (result.statusCode === 200) {
      const data = JSON.parse(result.body);
      console.log('✅ Response data:', {
        success: data.success,
        dataCount: data.data?.length || 0,
        dateRange: data.dateRange
      });
    } else {
      console.log('❌ Error response:', result.body);
    }
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testGetGoalProgress();