const Airtable = require('airtable');

const checkWorkoutFields = async () => {
  try {
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    console.log('Checking Workouts table for duration fields...\n');

    // Get a few recent workouts
    const records = await base('Workouts')
      .select({
        maxRecords: 5,
        sort: [{ field: 'Date', direction: 'desc' }]
      })
      .firstPage();

    if (records.length === 0) {
      console.log('No workout records found.');
      return;
    }

    console.log(`Found ${records.length} workout records.\n`);

    // Check first record for available fields
    const firstRecord = records[0];
    const availableFields = Object.keys(firstRecord.fields);
    
    console.log('Available fields in Workouts table:');
    availableFields.forEach(field => console.log(`  - ${field}`));
    
    console.log('\nDuration field check:');
    const durationFields = [
      'Total Duration',
      'Work Time',
      'Rest Time',
      'Set Count',
      'Average Set Duration',
      'Average Rest Duration',
      'Workout Efficiency',
      'Start Time',
      'End Time'
    ];
    
    const missingFields = durationFields.filter(field => !availableFields.includes(field));
    const presentFields = durationFields.filter(field => availableFields.includes(field));
    
    if (presentFields.length > 0) {
      console.log('\n✅ Present duration fields:');
      presentFields.forEach(field => console.log(`  - ${field}`));
    }
    
    if (missingFields.length > 0) {
      console.log('\n❌ Missing duration fields:');
      missingFields.forEach(field => console.log(`  - ${field}`));
    }
    
    // Check if any records have duration data
    console.log('\nChecking for duration data in existing workouts:');
    let workoutsWithDuration = 0;
    
    records.forEach((record, index) => {
      const hasDuration = record.get('Total Duration') || record.get('Work Time');
      if (hasDuration) {
        workoutsWithDuration++;
        console.log(`  Record ${index + 1}: Has duration data`);
        console.log(`    - Total Duration: ${record.get('Total Duration')} seconds`);
        console.log(`    - Work Time: ${record.get('Work Time')} seconds`);
      }
    });
    
    if (workoutsWithDuration === 0) {
      console.log('  ❌ No existing workouts have duration data');
      console.log('  This is why duration analytics shows no data!');
      console.log('\nTo see duration analytics:');
      console.log('  1. Use the workout timer when logging new workouts');
      console.log('  2. The timer will automatically save duration data');
      console.log('  3. Duration analytics will then show data for timed workouts');
    }

  } catch (error) {
    console.error('Error checking workout fields:', error.message);
  }
};

// Run the check
checkWorkoutFields();