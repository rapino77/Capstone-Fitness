const Airtable = require('airtable');

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    // Check environment variables
    if (!process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN) {
      throw new Error('AIRTABLE_PERSONAL_ACCESS_TOKEN environment variable is not set');
    }
    if (!process.env.AIRTABLE_BASE_ID) {
      throw new Error('AIRTABLE_BASE_ID environment variable is not set');
    }

    const data = JSON.parse(event.body);
    const { action = 'create', userId = 'default-user' } = data;

    // Configure Airtable
    const base = new Airtable({
      apiKey: process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN
    }).base(process.env.AIRTABLE_BASE_ID);

    let response = {};

    switch (action) {
      case 'create':
        // Create initial periodization record for user
        const phaseRecord = await base('Periodization').create({
          'User ID': userId,
          'Current Phase': 'HYPERTROPHY',
          'Phase Start Date': new Date().toISOString().split('T')[0],
          'Week in Phase': 1,
          'Total Weeks in Phase': 4,
          'Next Phase': 'STRENGTH',
          'Rotation Enabled': true,
          'Auto Progression': true
        });

        response = {
          success: true,
          message: 'Periodization tracking initialized',
          recordId: phaseRecord.id,
          data: phaseRecord.fields
        };
        break;

      case 'get':
        // Get current periodization status
        const records = [];
        await new Promise((resolve, reject) => {
          base('Periodization')
            .select({
              filterByFormula: `{User ID} = '${userId}'`,
              sort: [{ field: 'Created Time', direction: 'desc' }],
              maxRecords: 1
            })
            .eachPage(
              (pageRecords, fetchNextPage) => {
                records.push(...pageRecords);
                fetchNextPage();
              },
              (error) => {
                if (error) reject(error);
                else resolve();
              }
            );
        });

        if (records.length === 0) {
          // Create default record if none exists
          const defaultRecord = await base('Periodization').create({
            'User ID': userId,
            'Current Phase': 'HYPERTROPHY',
            'Phase Start Date': new Date().toISOString().split('T')[0],
            'Week in Phase': 1,
            'Total Weeks in Phase': 4,
            'Next Phase': 'STRENGTH',
            'Rotation Enabled': true,
            'Auto Progression': true
          });

          response = {
            success: true,
            data: {
              id: defaultRecord.id,
              currentPhase: 'HYPERTROPHY',
              phaseStartDate: new Date().toISOString().split('T')[0],
              weekInPhase: 1,
              totalWeeksInPhase: 4,
              nextPhase: 'STRENGTH',
              rotationEnabled: true,
              autoProgression: true
            },
            isNewRecord: true
          };
        } else {
          const record = records[0];
          response = {
            success: true,
            data: {
              id: record.id,
              currentPhase: record.get('Current Phase'),
              phaseStartDate: record.get('Phase Start Date'),
              weekInPhase: record.get('Week in Phase'),
              totalWeeksInPhase: record.get('Total Weeks in Phase'),
              nextPhase: record.get('Next Phase'),
              rotationEnabled: record.get('Rotation Enabled'),
              autoProgression: record.get('Auto Progression'),
              lastUpdated: record.get('Last Updated')
            }
          };
        }
        break;

      case 'update':
        const { 
          recordId,
          currentPhase,
          phaseStartDate,
          weekInPhase,
          totalWeeksInPhase,
          nextPhase,
          rotationEnabled,
          autoProgression 
        } = data;

        if (!recordId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Record ID required for update' })
          };
        }

        const updateData = {
          'Last Updated': new Date().toISOString()
        };

        if (currentPhase) updateData['Current Phase'] = currentPhase;
        if (phaseStartDate) updateData['Phase Start Date'] = phaseStartDate;
        if (weekInPhase !== undefined) updateData['Week in Phase'] = weekInPhase;
        if (totalWeeksInPhase !== undefined) updateData['Total Weeks in Phase'] = totalWeeksInPhase;
        if (nextPhase) updateData['Next Phase'] = nextPhase;
        if (rotationEnabled !== undefined) updateData['Rotation Enabled'] = rotationEnabled;
        if (autoProgression !== undefined) updateData['Auto Progression'] = autoProgression;

        const updatedRecord = await base('Periodization').update(recordId, updateData);

        response = {
          success: true,
          message: 'Periodization settings updated',
          recordId: updatedRecord.id,
          data: updatedRecord.fields
        };
        break;

      case 'advance-phase':
        // Automatically advance to next phase
        const phaseRecords = [];
        await new Promise((resolve, reject) => {
          base('Periodization')
            .select({
              filterByFormula: `{User ID} = '${userId}'`,
              sort: [{ field: 'Created Time', direction: 'desc' }],
              maxRecords: 1
            })
            .eachPage(
              (pageRecords, fetchNextPage) => {
                phaseRecords.push(...pageRecords);
                fetchNextPage();
              },
              (error) => {
                if (error) reject(error);
                else resolve();
              }
            );
        });

        if (phaseRecords.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'No periodization record found for user' })
          };
        }

        const currentRecord = phaseRecords[0];
        const currentPhaseValue = currentRecord.get('Current Phase');
        const nextPhaseValue = currentRecord.get('Next Phase');
        
        // Define phase cycle and durations
        const phaseCycle = {
          'HYPERTROPHY': { next: 'STRENGTH', duration: 4 },
          'STRENGTH': { next: 'POWER', duration: 4 },
          'POWER': { next: 'DELOAD', duration: 3 },
          'DELOAD': { next: 'HYPERTROPHY', duration: 1 }
        };

        const newPhase = nextPhaseValue || phaseCycle[currentPhaseValue]?.next || 'HYPERTROPHY';
        const newPhaseDuration = phaseCycle[newPhase]?.duration || 4;
        const nextAfterNew = phaseCycle[newPhase]?.next || 'HYPERTROPHY';

        const advancedRecord = await base('Periodization').update(currentRecord.id, {
          'Current Phase': newPhase,
          'Phase Start Date': new Date().toISOString().split('T')[0],
          'Week in Phase': 1,
          'Total Weeks in Phase': newPhaseDuration,
          'Next Phase': nextAfterNew,
          'Last Updated': new Date().toISOString()
        });

        response = {
          success: true,
          message: `Advanced from ${currentPhaseValue} to ${newPhase} phase`,
          previousPhase: currentPhaseValue,
          newPhase: newPhase,
          data: advancedRecord.fields
        };
        break;

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action. Use: create, get, update, or advance-phase' })
        };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error('Error in periodization setup:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Failed to handle periodization request',
        message: error.message,
        details: error.stack?.split('\n')[0] || 'Unknown error'
      })
    };
  }
};