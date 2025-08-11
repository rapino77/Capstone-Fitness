// Check what tables and fields exist
const Airtable = require('airtable');
require('dotenv').config();

async function checkTables() {
  console.log('🔍 CHECKING AIRTABLE STRUCTURE...\n');
  
  const base = new Airtable({
    apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
  }).base(process.env.AIRTABLE_BASE_ID);
  
  const tablesToCheck = ['BodyWeight', 'Workouts', 'Goals', 'Body Weight', 'Weight'];
  
  for (const tableName of tablesToCheck) {
    console.log(`\n=== TESTING TABLE: ${tableName} ===`);
    try {
      const records = [];
      await new Promise((resolve, reject) => {
        base(tableName)
          .select({ maxRecords: 1 })
          .eachPage(
            (pageRecords, fetchNextPage) => {
              records.push(...pageRecords);
              resolve(); // Don't fetch more pages
            },
            error => error ? reject(error) : resolve()
          );
      });
      
      console.log(`✅ Table '${tableName}' exists!`);
      if (records.length > 0) {
        console.log('Available fields:', Object.keys(records[0].fields));
        console.log('Sample record:', records[0].fields);
      } else {
        console.log('Table is empty');
      }
      
    } catch (error) {
      console.log(`❌ Table '${tableName}' not found or error:`, error.message);
    }
  }
}

checkTables();