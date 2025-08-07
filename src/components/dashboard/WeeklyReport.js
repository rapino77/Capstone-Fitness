import React, { useState, useEffect } from 'react';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isWithinInterval } from 'date-fns';
// Using inline SVG icons instead of heroicons
import axios from 'axios';

const WeeklyReport = () => {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    workouts: true,
    weight: true,
    goals: true,
    summary: true
  });

  // Get week boundaries
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 }); // Sunday
  
  // Check if current week is the actual current week
  const isCurrentWeek = isWithinInterval(new Date(), { start: weekStart, end: weekEnd });

  useEffect(() => {
    fetchWeeklyReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWeek]); // fetchWeeklyReport is not included to avoid infinite loops

  const fetchWeeklyReport = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔄 Fetching weekly report for:', weekStart, 'to', weekEnd);
      // Try to fetch real data from existing endpoints
      const reportData = await fetchRealWeeklyData(weekStart, weekEnd);
      console.log('📊 Weekly report data:', reportData);
      setReportData(reportData);
    } catch (err) {
      console.error('Failed to fetch weekly report:', err);
      // Use empty data on error
      const emptyData = generateEmptyWeeklyReport(weekStart, weekEnd);
      setReportData(emptyData);
    } finally {
      setLoading(false);
    }
  };

  // Fetch real data from existing endpoints
  const fetchRealWeeklyData = async (start, end) => {
    const report = {
      weekStart: start,
      weekEnd: end,
      summary: {
        totalWorkouts: 0,
        totalExercises: 0,
        totalSets: 0,
        totalReps: 0,
        totalWeight: 0,
        avgWorkoutDuration: 0,
        streak: 0
      },
      workouts: [],
      weight: {
        startWeight: null,
        endWeight: null,
        change: 0,
        measurements: []
      },
      goalsAchieved: [],
      personalRecords: []
    };

    let allWorkouts = [];
    
    try {
      // Fetch workouts for the week
      console.log('📞 Calling get-workouts API...');
      const workoutsResponse = await axios.get(`${process.env.REACT_APP_API_URL}/get-workouts`, {
        params: { userId: 'default-user' }
      });
      
      console.log('💪 Workouts API response:', workoutsResponse.data);
      
      if (workoutsResponse.data.success && workoutsResponse.data.workouts) {
        allWorkouts = workoutsResponse.data.workouts;
        
        // Filter workouts for this week
        const weekWorkouts = allWorkouts.filter(workout => {
          const workoutDate = new Date(workout.date || workout.Date);
          return workoutDate >= start && workoutDate <= end;
        });

        // Process workouts into daily groups
        const workoutsByDate = {};
        weekWorkouts.forEach(workout => {
          const date = workout.date || workout.Date;
          if (!workoutsByDate[date]) {
            workoutsByDate[date] = {
              date: new Date(date),
              exercises: []
            };
          }
          
          workoutsByDate[date].exercises.push({
            name: workout.exercise || workout.Exercise,
            sets: workout.sets || workout.Sets || 0,
            reps: workout.reps || workout.Reps || 0,
            weight: workout.weight || workout.Weight || 0,
            isPR: workout.isPR || workout['Is PR'] || false
          });
        });

        report.workouts = Object.values(workoutsByDate).sort((a, b) => a.date - b.date);

        // Calculate summary
        report.summary.totalWorkouts = Object.keys(workoutsByDate).length;
        report.summary.totalExercises = weekWorkouts.length;
        report.summary.totalSets = weekWorkouts.reduce((sum, w) => sum + (w.sets || w.Sets || 0), 0);
        report.summary.totalReps = weekWorkouts.reduce((sum, w) => sum + ((w.sets || w.Sets || 0) * (w.reps || w.Reps || 0)), 0);
        report.summary.totalWeight = weekWorkouts.reduce((sum, w) => sum + ((w.sets || w.Sets || 0) * (w.reps || w.Reps || 0) * (w.weight || w.Weight || 0)), 0);
        report.summary.avgWorkoutDuration = 45; // Default estimate
        report.summary.streak = 1; // Default
      }

      // Fetch weight measurements for the week
      console.log('📞 Calling get-weights API...');
      const weightsResponse = await axios.get(`${process.env.REACT_APP_API_URL}/get-weights`, {
        params: { userId: 'default-user' }
      });
      
      console.log('⚖️ Weights API response:', weightsResponse.data);
      
      if (weightsResponse.data.success && weightsResponse.data.weights) {
        const allWeights = weightsResponse.data.weights;
        
        // Filter weights for this week
        const weekWeights = allWeights.filter(weight => {
          const weightDate = new Date(weight.date || weight.Date);
          return weightDate >= start && weightDate <= end;
        }).sort((a, b) => new Date(a.date || a.Date) - new Date(b.date || b.Date));

        if (weekWeights.length > 0) {
          report.weight.startWeight = weekWeights[0].weight || weekWeights[0].Weight;
          report.weight.endWeight = weekWeights[weekWeights.length - 1].weight || weekWeights[weekWeights.length - 1].Weight;
          report.weight.change = report.weight.endWeight - report.weight.startWeight;
          report.weight.measurements = weekWeights.map(w => ({
            date: new Date(w.date || w.Date),
            weight: w.weight || w.Weight
          }));
        }
      }

      // Fetch goals (if endpoint exists)
      try {
        const goalsResponse = await axios.get(`${process.env.REACT_APP_API_URL}/goals`, {
          params: { userId: 'default-user' }
        });
        
        if (goalsResponse.data.success && goalsResponse.data.goals) {
          const completedThisWeek = goalsResponse.data.goals.filter(goal => {
            if (goal.status !== 'Completed' && goal.Status !== 'Completed') return false;
            const completionDate = new Date(goal.completionDate || goal['Completion Date']);
            return completionDate >= start && completionDate <= end;
          });

          report.goalsAchieved = completedThisWeek.map(goal => ({
            name: goal.name || goal.Name || goal['Goal Name'],
            type: goal.type || goal.Type || goal['Goal Type'],
            achievedDate: new Date(goal.completionDate || goal['Completion Date']),
            targetValue: goal.targetValue || goal['Target Value'],
            achievedValue: goal.achievedValue || goal['Achieved Value']
          }));
        }
      } catch (goalsErr) {
        console.log('Goals endpoint not available:', goalsErr.message);
      }

      // Check for PRs in this week's workouts
      const weekWorkouts = allWorkouts.filter(workout => {
        const workoutDate = new Date(workout.date || workout.Date);
        return workoutDate >= start && workoutDate <= end;
      });
      
      report.personalRecords = weekWorkouts
        .filter(w => w.isPR || w['Is PR'])
        .map(w => ({
          exercise: w.exercise || w.Exercise,
          weight: w.weight || w.Weight || 0,
          reps: w.reps || w.Reps || 0,
          date: new Date(w.date || w.Date)
        }));

    } catch (apiErr) {
      console.log('API endpoints not available, using empty data:', apiErr.message);
      
      // Check if this is likely an environment configuration issue
      if (apiErr.response?.status === 500 || apiErr.message.includes('Network Error')) {
        console.warn('⚠️ This might be due to missing environment variables (AIRTABLE_PERSONAL_ACCESS_TOKEN, AIRTABLE_BASE_ID)');
      }
    }

    return report;
  };

  // Return empty data structure when no real data exists
  const generateEmptyWeeklyReport = (start, end) => {
    return {
      weekStart: start,
      weekEnd: end,
      summary: {
        totalWorkouts: 0,
        totalExercises: 0,
        totalSets: 0,
        totalReps: 0,
        totalWeight: 0,
        avgWorkoutDuration: 0,
        streak: 0
      },
      workouts: [],
      weight: {
        startWeight: null,
        endWeight: null,
        change: 0,
        measurements: []
      },
      goalsAchieved: [],
      personalRecords: []
    };
  };

  const navigateWeek = (direction) => {
    if (direction === 'prev') {
      setCurrentWeek(subWeeks(currentWeek, 1));
    } else if (direction === 'next') {
      setCurrentWeek(addWeeks(currentWeek, 1));
    } else if (direction === 'current') {
      setCurrentWeek(new Date());
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-4 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!reportData) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header with Week Navigation */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-lg">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold">Weekly Fitness Report</h2>
          {isCurrentWeek && (
            <span className="bg-white text-blue-600 px-3 py-1 rounded-full text-sm font-medium">
              Current Week
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-4">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="text-center">
            <p className="text-lg font-medium">
              {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
            </p>
            {!isCurrentWeek && (
              <button
                onClick={() => navigateWeek('current')}
                className="text-sm underline hover:no-underline mt-1"
              >
                Go to current week
              </button>
            )}
          </div>
          
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            disabled={isCurrentWeek}
          >
            <svg className={`h-5 w-5 ${isCurrentWeek ? 'opacity-50' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Summary Section */}
        <div>
          <button
            onClick={() => toggleSection('summary')}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="text-lg font-semibold flex items-center">
              <svg className="h-5 w-5 mr-2 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
              </svg>
              Week Summary
            </h3>
            <svg className={`h-5 w-5 transform transition-transform ${expandedSections.summary ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {expandedSections.summary && (
            <>
              {reportData.summary.totalWorkouts > 0 ? (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Workouts</p>
                    <p className="text-2xl font-bold text-blue-600">{reportData.summary.totalWorkouts}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Exercises</p>
                    <p className="text-2xl font-bold text-green-600">{reportData.summary.totalExercises}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Weight</p>
                    <p className="text-2xl font-bold text-purple-600">{reportData.summary.totalWeight.toLocaleString()} lbs</p>
                  </div>
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Week Streak</p>
                    <p className="text-2xl font-bold text-orange-600">{reportData.summary.streak} weeks</p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 bg-gray-50 p-6 rounded-lg text-center">
                  <p className="text-gray-500 mb-2">No workouts logged this week</p>
                  <p className="text-sm text-gray-400">Start logging workouts to see your weekly summary!</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Workouts Section */}
        <div>
          <button
            onClick={() => toggleSection('workouts')}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="text-lg font-semibold flex items-center">
              <svg className="h-5 w-5 mr-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Workout Details ({reportData.workouts.length} sessions)
            </h3>
            <svg className={`h-5 w-5 transform transition-transform ${expandedSections.workouts ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {expandedSections.workouts && (
            <div className="mt-4">
              {reportData.workouts.length > 0 ? (
                <div className="space-y-4">
                  {reportData.workouts.map((workout, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <h4 className="font-medium text-gray-700 mb-2">
                        {format(workout.date, 'EEEE, MMM d')}
                      </h4>
                      <div className="space-y-2">
                        {workout.exercises.map((exercise, exIndex) => (
                          <div key={exIndex} className="flex items-center justify-between text-sm">
                            <span className="flex items-center">
                              {exercise.name}
                              {exercise.isPR && (
                                <svg className="h-4 w-4 ml-2 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
                                  <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
                                </svg>
                              )}
                            </span>
                            <span className="text-gray-600">
                              {exercise.sets} × {exercise.reps} @ {exercise.weight} lbs
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 p-6 rounded-lg text-center">
                  <p className="text-gray-500 mb-2">No workouts recorded this week</p>
                  <p className="text-sm text-gray-400">Visit the Workout tab to start logging your exercises!</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Weight Progress Section */}
        <div>
          <button
            onClick={() => toggleSection('weight')}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="text-lg font-semibold flex items-center">
              <svg className="h-5 w-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
              Body Weight Progress
            </h3>
            <svg className={`h-5 w-5 transform transition-transform ${expandedSections.weight ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {expandedSections.weight && (
            <div className="mt-4">
              {reportData.weight.measurements.length > 0 ? (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <p className="text-sm text-gray-600">Start of Week</p>
                      <p className="text-xl font-semibold">{reportData.weight.startWeight} lbs</p>
                    </div>
                    <div className={`text-2xl font-bold ${reportData.weight.change < 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {reportData.weight.change > 0 ? '+' : ''}{reportData.weight.change} lbs
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">End of Week</p>
                      <p className="text-xl font-semibold">{reportData.weight.endWeight} lbs</p>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {reportData.weight.measurements.length} measurements recorded this week
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-6 rounded-lg text-center">
                  <p className="text-gray-500 mb-2">No weight measurements this week</p>
                  <p className="text-sm text-gray-400">Visit the Weight tab to start tracking your body weight!</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Goals Achieved Section */}
        <div>
          <button
            onClick={() => toggleSection('goals')}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="text-lg font-semibold flex items-center">
              <svg className="h-5 w-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Goals Achieved ({reportData.goalsAchieved.length})
            </h3>
            <svg className={`h-5 w-5 transform transition-transform ${expandedSections.goals ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {expandedSections.goals && (
            <div className="mt-4">
              {reportData.goalsAchieved.length > 0 ? (
                <div className="space-y-3">
                  {reportData.goalsAchieved.map((goal, index) => (
                    <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-green-800">{goal.name}</h4>
                          <p className="text-sm text-green-600">
                            Achieved on {format(goal.achievedDate, 'MMM d')}
                          </p>
                        </div>
                        <svg className="h-8 w-8 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
                          <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 p-6 rounded-lg text-center">
                  <p className="text-gray-500 mb-2">No goals completed this week</p>
                  <p className="text-sm text-gray-400">Visit the Goals tab to set and track your fitness goals!</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Personal Records Section */}
        {reportData.personalRecords.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-semibold text-yellow-800 mb-3 flex items-center">
              <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
                <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
              </svg>
              New Personal Records!
            </h3>
            <div className="space-y-2">
              {reportData.personalRecords.map((pr, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="font-medium">{pr.exercise}</span>
                  <span className="text-yellow-700">{pr.weight} lbs × {pr.reps} reps</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeeklyReport;