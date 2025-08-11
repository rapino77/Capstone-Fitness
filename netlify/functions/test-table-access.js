const axios = require('axios');

async function testTableAccess() {
  console.log('🔍 Testing Airtable table access...\n');
  
  try {
    const response = await axios.get('http://localhost:8888/.netlify/functions/test-airtable-tables');
    
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
    if (response.data.tables) {
      console.log('\n📊 Table Access Summary:');
      Object.entries(response.data.tables).forEach(([tableName, info]) => {
        if (info.accessible) {
          console.log(`✅ ${tableName}: Accessible (${info.recordCount} records, fields: ${info.sampleFields.join(', ')})`);
        } else {
          console.log(`❌ ${tableName}: ${info.error}`);
        }
      });
    }
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
  }
}

testTableAccess();