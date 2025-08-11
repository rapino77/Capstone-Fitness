// Direct test without server
const Airtable = require('airtable');
require('dotenv').config();

async function testDirect() {
  console.log('🔍 DIRECT DATABASE TEST...\n');
  
  try {
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);
    
    console.log('=== CHECKING WEIGHTS ===');
    const weightRecords = [];
    await new Promise((resolve, reject) => {
      base('BodyWeight')
        .select({ maxRecords: 10, sort: [{field: 'Date', direction: 'desc'}] })
        .eachPage(
          (records, fetchNextPage) => {
            records.forEach(record => {
              weightRecords.push({
                id: record.id,
                weight: record.get('Weight'),
                date: record.get('Date'),
                userId: record.get('User ID'),
                unit: record.get('Unit'),
                fields: Object.keys(record.fields)
              });
            });
            fetchNextPage();
          },
          error => error ? reject(error) : resolve()
        );
    });
    
    console.log(`Found ${weightRecords.length} weight records:`);
    weightRecords.forEach(w => {
      console.log(`- ${w.date}: ${w.weight} lbs (UserID: ${w.userId || 'MISSING'})`);
    });
    
    console.log('\n=== CHECKING WORKOUTS ===');
    const workoutRecords = [];
    await new Promise((resolve, reject) => {
      base('Workouts')
        .select({ maxRecords: 10, sort: [{field: 'Date', direction: 'desc'}] })
        .eachPage(
          (records, fetchNextPage) => {
            records.forEach(record => {
              workoutRecords.push({
                id: record.id,
                exercise: record.get('Exercise'),
                date: record.get('Date'),
                userId: record.get('User ID'),
                totalDuration: record.get('Total Duration'),
                workTime: record.get('Work Time'),
                fields: Object.keys(record.fields)
              });
            });
            fetchNextPage();
          },
          error => error ? reject(error) : resolve()
        );
    });
    
    console.log(`Found ${workoutRecords.length} workout records:`);
    workoutRecords.forEach(w => {
      console.log(`- ${w.date}: ${w.exercise} (UserID: ${w.userId || 'MISSING'}, Duration: ${w.totalDuration || 'NONE'})`);
    });
    
    // Test if we can create a record
    console.log('\n=== TESTING WEIGHT CREATE ===');
    try {
      const testRecord = await base('BodyWeight').create({
        'Weight': 155,
        'Date': new Date().toISOString().split('T')[0],
        'User ID': 'default-user',
        'Unit': 'lbs',
        'Notes': 'Test from debug script'
      });
      console.log('✅ Successfully created test weight record:', testRecord.id);
    } catch (createError) {
      console.error('❌ Failed to create test record:', createError.message);
    }
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Environment check:');
    console.error('- AIRTABLE_PERSONAL_ACCESS_TOKEN:', process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN ? 'SET' : 'MISSING');
    console.error('- AIRTABLE_BASE_ID:', process.env.AIRTABLE_BASE_ID ? 'SET' : 'MISSING');
  }
}

testDirect();