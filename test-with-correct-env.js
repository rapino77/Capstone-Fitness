// Test with correct environment variables from .env file
const Airtable = require('airtable');

// Manually set the correct values from .env file
const AIRTABLE_PERSONAL_ACCESS_TOKEN = 'patg29eYzmTxzkPBs.3589c09365cc76b4fea9184ada42e0e94bb6908657f8080e3a1bf804d7f96460';
const AIRTABLE_BASE_ID = 'appOIQOvR5PEoKqnx';

async function testWithCorrectEnv() {
  console.log('🔍 TESTING WITH CORRECT VALUES FROM .ENV FILE...\n');
  
  console.log('Using values:');
  console.log('- Token:', AIRTABLE_PERSONAL_ACCESS_TOKEN.substring(0, 20) + '...');
  console.log('- Base ID:', AIRTABLE_BASE_ID);
  
  try {
    const base = new Airtable({
      apiKey: AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(AIRTABLE_BASE_ID);
    
    console.log('\n=== TESTING TABLE ACCESS ===');
    
    // Try common table names
    const tableNames = ['Workouts', 'BodyWeight', 'Goals'];
    
    for (const tableName of tableNames) {
      console.log(`\nTesting table: ${tableName}`);
      try {
        const records = await base(tableName).select({ maxRecords: 1 }).firstPage();
        console.log(`✅ ${tableName} table found! Records: ${records.length}`);
        if (records.length > 0) {
          console.log('Available fields:', Object.keys(records[0].fields));
        }
      } catch (error) {
        console.log(`❌ ${tableName}: ${error.message}`);
        if (error.statusCode) {
          console.log(`   Status code: ${error.statusCode}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Status code:', error.statusCode);
  }
}

testWithCorrectEnv();