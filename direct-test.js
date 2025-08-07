const Airtable = require('airtable');

// Use the actual values directly
const baseId = 'appOIQOvR5PEoKqnx';
const token = 'patg29eYzmTxzkPBs.3589c09365cc76b4fea9184ada42e0e94bb6908657f8080e3a1bf804d7f96460';

console.log('Direct test with hardcoded values...');

async function testDirect() {
  try {
    const base = new Airtable({
      apiKey: token
    }).base(baseId);

    console.log('Testing Workouts table...');
    const records = [];
    await new Promise((resolve, reject) => {
      base('Workouts')
        .select({ maxRecords: 3 })
        .eachPage(
          (pageRecords, fetchNextPage) => {
            records.push(...pageRecords);
            resolve();
          },
          (error) => {
            reject(error);
          }
        );
    });
    
    console.log('✅ Found', records.length, 'workout records');
    if (records.length > 0) {
      console.log('Sample workout data:');
      records.forEach((record, i) => {
        console.log(`Record ${i+1}:`, record.fields);
      });
    } else {
      console.log('No workout records found - table exists but is empty');
    }

  } catch (error) {
    console.error('❌ Failed:', error.message);
    
    // Try other common table names
    const tableNames = ['BodyWeight', 'Goals', 'Table 1', 'Table1'];
    for (const tableName of tableNames) {
      try {
        console.log(`Trying "${tableName}"...`);
        const base = new Airtable({ apiKey: token }).base(baseId);
        const testRecords = [];
        await new Promise((resolve, reject) => {
          base(tableName).select({ maxRecords: 1 }).eachPage(
            (records) => { testRecords.push(...records); resolve(); },
            (err) => reject(err)
          );
        });
        console.log(`✅ Found table "${tableName}" with ${testRecords.length} records`);
        if (testRecords.length > 0) {
          console.log('Fields:', Object.keys(testRecords[0].fields));
        }
        break;
      } catch (e) {
        console.log(`❌ "${tableName}" not found`);
      }
    }
  }
}

testDirect();