require('dotenv').config();
const Airtable = require('airtable');

async function testConnection() {
  console.log('🔍 Testing Airtable connection...');
  console.log('Token:', process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN ? 'Set' : 'Missing');
  console.log('Base ID:', process.env.AIRTABLE_BASE_ID ? 'Set' : 'Missing');
  
  const base = new Airtable({
    apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
  }).base(process.env.AIRTABLE_BASE_ID);

  // Test different possible table names
  const tableNames = ['Workouts', 'Workout', 'workouts', 'Table 1', 'tblWorkouts'];
  
  for (const tableName of tableNames) {
    try {
      console.log(`📊 Trying table name: "${tableName}"`);
      const records = [];
      await new Promise((resolve, reject) => {
        base(tableName)
          .select({ maxRecords: 3 })
          .eachPage(
            (pageRecords, fetchNextPage) => {
              records.push(...pageRecords);
              resolve();
            },
            (error) => {
              if (error) reject(error);
              else resolve();
            }
          );
      });
      
      console.log(`✅ Found table "${tableName}" with ${records.length} records`);
      if (records.length > 0) {
        console.log('Sample record fields:', Object.keys(records[0].fields));
        console.log('Sample data:', records[0].fields);
      }
      break;
    } catch (error) {
      console.log(`❌ Table "${tableName}" not found:`, error.message);
    }
  }
}

testConnection();