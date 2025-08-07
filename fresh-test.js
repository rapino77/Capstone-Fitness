require('dotenv').config();
const Airtable = require('airtable');

console.log('Environment check:');
console.log('BASE_ID from env:', process.env.AIRTABLE_BASE_ID);
console.log('TOKEN exists:', !!process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN);

async function quickTest() {
  try {
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    console.log('\nTesting Workouts table...');
    const records = [];
    await new Promise((resolve, reject) => {
      base('Workouts')
        .select({ maxRecords: 1 })
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
    
    console.log('Success! Found', records.length, 'records');
    if (records.length > 0) {
      console.log('Sample:', records[0].fields);
    }
  } catch (error) {
    console.error('Failed:', error.message);
  }
}

quickTest();