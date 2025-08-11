// Test weight logging and retrieval directly
const Airtable = require('airtable');
const { format, startOfWeek, endOfWeek } = require('date-fns');

// Use the correct values from .env file
const AIRTABLE_PERSONAL_ACCESS_TOKEN = 'patg29eYzmTxzkPBs.3589c09365cc76b4fea9184ada42e0e94bb6908657f8080e3a1bf804d7f96460';
const AIRTABLE_BASE_ID = 'appOIQOvR5PEoKqnx';

async function testWeightLogging() {
  console.log('🔍 TESTING WEIGHT LOGGING AND RETRIEVAL...\n');
  
  const base = new Airtable({
    apiKey: AIRTABLE_PERSONAL_ACCESS_TOKEN
  }).base(AIRTABLE_BASE_ID);

  // Step 1: Log a test weight
  console.log('=== STEP 1: LOGGING TEST WEIGHT ===');
  const testWeight = {
    Weight: 155,
    Date: new Date().toISOString().split('T')[0],
    'User ID': 'default-user',
    Unit: 'lbs'
  };
  
  try {
    const newRecord = await base('BodyWeight').create(testWeight);
    console.log('✅ Weight logged successfully:', newRecord.id);
    console.log('Saved data:', newRecord.fields);
  } catch (error) {
    console.error('❌ Failed to log weight:', error.message);
    return;
  }

  // Step 2: Get all weights for default-user
  console.log('\n=== STEP 2: RETRIEVING WEIGHTS FOR default-user ===');
  const userWeights = [];
  try {
    await new Promise((resolve, reject) => {
      base('BodyWeight')
        .select({
          filterByFormula: `{User ID} = 'default-user'`,
          sort: [{ field: 'Date', direction: 'desc' }]
        })
        .eachPage(
          (records, fetchNextPage) => {
            records.forEach(record => {
              userWeights.push({
                id: record.id,
                date: record.get('Date'),
                weight: record.get('Weight'),
                userId: record.get('User ID'),
                unit: record.get('Unit')
              });
            });
            fetchNextPage();
          },
          error => error ? reject(error) : resolve()
        );
    });

    console.log(`Found ${userWeights.length} weights for default-user:`);
    userWeights.slice(0, 5).forEach(w => {
      console.log(`  - ${w.date}: ${w.weight} ${w.unit}`);
    });
  } catch (error) {
    console.error('❌ Failed to retrieve weights:', error.message);
    return;
  }

  // Step 3: Check this week's weights (what Weekly Report should show)
  console.log('\n=== STEP 3: THIS WEEK\'S WEIGHTS (for Weekly Report) ===');
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
  
  console.log(`Week: ${weekStart.toDateString()} to ${weekEnd.toDateString()}`);
  
  const thisWeekWeights = userWeights.filter(weight => {
    const weightDate = new Date(weight.date);
    return weightDate >= weekStart && weightDate <= weekEnd;
  });

  console.log(`This week's weights: ${thisWeekWeights.length}`);
  thisWeekWeights.forEach(w => {
    console.log(`  - ${w.date}: ${w.weight} ${w.unit}`);
  });

  // Step 4: Simulate what WeeklyReport.js does
  console.log('\n=== STEP 4: SIMULATING WEEKLY REPORT LOGIC ===');
  if (thisWeekWeights.length > 0) {
    const startWeight = thisWeekWeights[thisWeekWeights.length - 1].weight; // oldest this week
    const endWeight = thisWeekWeights[0].weight; // newest this week  
    const change = endWeight - startWeight;
    
    console.log('Weekly Report would show:');
    console.log(`  Start Weight: ${startWeight} lbs`);
    console.log(`  End Weight: ${endWeight} lbs`);
    console.log(`  Change: ${change > 0 ? '+' : ''}${change.toFixed(1)} lbs`);
    console.log(`  Measurements: ${thisWeekWeights.length}`);
    
    console.log('\n✅ DATA IS AVAILABLE - Weekly Report should show this data!');
  } else {
    console.log('❌ NO WEIGHTS THIS WEEK - Weekly Report will show empty');
  }
}

testWeightLogging();