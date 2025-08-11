import React, { useState, useEffect } from 'react';
import axios from 'axios';

const DurationDebug = () => {
  const [debugInfo, setDebugInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        // Get recent workouts
        const workoutsRes = await axios.get(`${process.env.REACT_APP_API_URL}/get-workouts`, {
          params: { userId: 'default-user', limit: 10 }
        });

        // Get duration analytics
        const analyticsRes = await axios.get(`${process.env.REACT_APP_API_URL}/workout-duration-analytics`, {
          params: { userId: 'default-user', days: '30', action: 'metrics' }
        });

        const workouts = workoutsRes.data.data || [];
        const metrics = analyticsRes.data.metrics;

        // Check which workouts have duration data
        const workoutsWithDuration = workouts.filter(w => 
          w.totalDuration || w['Total Duration'] || 
          w.workTime || w['Work Time']
        );

        setDebugInfo({
          totalWorkouts: workouts.length,
          workoutsWithDuration: workoutsWithDuration.length,
          metrics: metrics,
          sampleWorkout: workouts[0],
          sampleDurationWorkout: workoutsWithDuration[0]
        });
      } catch (error) {
        setDebugInfo({ error: error.message });
      } finally {
        setLoading(false);
      }
    };

    fetchDebugInfo();
  }, []);

  if (loading) return <div>Loading debug info...</div>;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
      <h3 className="font-bold text-yellow-800 mb-2">Duration Analytics Debug Info</h3>
      <pre className="text-xs bg-white p-2 rounded overflow-auto">
        {JSON.stringify(debugInfo, null, 2)}
      </pre>
      <div className="mt-2 text-yellow-700">
        <p>Total Workouts: {debugInfo?.totalWorkouts || 0}</p>
        <p>Workouts with Duration Data: {debugInfo?.workoutsWithDuration || 0}</p>
        {debugInfo?.sampleWorkout && (
          <p>Sample fields: {Object.keys(debugInfo.sampleWorkout).join(', ')}</p>
        )}
      </div>
    </div>
  );
};

export default DurationDebug;