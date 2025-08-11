const Airtable = require('airtable');

const checkAirtableFields = async () => {
  console.log('🔍 Checking Airtable table structure...\n');
  
  try {
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    // Test creating a minimal workout record
    console.log('1. Testing minimal workout record (no duration fields)...');
    try {
      const minimalRecord = await base('Workouts').create({
        'User ID': 'test-user',
        'Exercise': 'Test Exercise',
        'Sets': 3,
        'Reps': 10,
        'Weight': 100,
        'Date': new Date().toISOString().split('T')[0],
        'Notes': 'Field test - minimal'
      });
      
      console.log('✅ Minimal record created successfully');
      console.log('Record ID:', minimalRecord.id);
      console.log('Fields present:', Object.keys(minimalRecord.fields));
      
      // Delete test record
      await base('Workouts').destroy(minimalRecord.id);
      console.log('✅ Test record deleted\n');
      
    } catch (error) {
      console.error('❌ Failed to create minimal record:', error.message);
      console.log('This suggests basic fields might be missing\n');
    }

    // Test creating a record with duration fields
    console.log('2. Testing workout record with duration fields...');
    try {
      const durationRecord = await base('Workouts').create({
        'User ID': 'test-user',
        'Exercise': 'Test Exercise',
        'Sets': 3,
        'Reps': 10,
        'Weight': 100,
        'Date': new Date().toISOString().split('T')[0],
        'Notes': 'Field test - with duration',
        // Duration fields
        'Total Duration': 1800,
        'Work Time': 900,
        'Rest Time': 900,
        'Set Count': 3,
        'Average Set Duration': 300,
        'Average Rest Duration': 300,
        'Workout Efficiency': 50,
        'Start Time': new Date().toISOString(),
        'End Time': new Date().toISOString()
      });
      
      console.log('✅ Duration record created successfully');
      console.log('Duration fields are properly configured!');
      
      // Delete test record
      await base('Workouts').destroy(durationRecord.id);
      
    } catch (error) {
      console.error('❌ Failed to create record with duration fields:', error.message);
      console.log('\nDuration fields need to be added to your Airtable Workouts table.');
      console.log('\nRequired fields:');
      console.log('- Total Duration (Number)');
      console.log('- Work Time (Number)');
      console.log('- Rest Time (Number)');
      console.log('- Set Count (Number)');
      console.log('- Average Set Duration (Number)');
      console.log('- Average Rest Duration (Number)');
      console.log('- Workout Efficiency (Number)');
      console.log('- Start Time (Date with time)');
      console.log('- End Time (Date with time)');
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
};

checkAirtableFields();