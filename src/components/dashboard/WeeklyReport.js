import React, { useState, useEffect, useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isWithinInterval } from 'date-fns';
// Using inline SVG icons instead of heroicons
import axios from 'axios';

const WeeklyReport = () => {
  const reportContentRef = useRef(null);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedSections, setExpandedSections] = useState({
    workouts: true,
    weight: true,
    goals: true,
    challenges: true,
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
      
      if (workoutsResponse.data.success && (workoutsResponse.data.workouts || workoutsResponse.data.data)) {
        allWorkouts = workoutsResponse.data.workouts || workoutsResponse.data.data;
        
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
        let totalDuration = 0;
        weekWorkouts.forEach(w => {
          report.summary.totalExercises += (w.exercises || w.Exercises || []).length;
          report.summary.totalSets += w.sets || w.Sets || 0;
          report.summary.totalReps += w.reps || w.Reps || 0;
          report.summary.totalWeight += w.weight || w.Weight || 0;
          totalDuration += w.duration || w.Duration || 0;
        });

        if (report.summary.totalWorkouts > 0) {
          report.summary.avgWorkoutDuration = totalDuration / report.summary.totalWorkouts;
        }

        // Find PRs from this week's workouts
        report.personalRecords = weekWorkouts
          .flatMap(w => w.exercises || w.Exercises || [])
          .filter(ex => ex.isPR)
          .map(pr => ({ exercise: pr.name, weight: pr.weight, reps: pr.reps }));

      }
    } catch (error) {
      console.error('Error fetching workouts:', error);
    }

    try {
      // Fetch weight data for the week
      const weightResponse = await axios.get(`${process.env.REACT_APP_API_URL}/get-weights`, {
        params: { userId: 'default-user', startDate: format(start, 'yyyy-MM-dd'), endDate: format(end, 'yyyy-MM-dd') }
      });
      if (weightResponse.data.success) {
        const weights = weightResponse.data.weights;
        if (weights.length > 0) {
          report.weight.startWeight = weights[0].weight;
          report.weight.endWeight = weights[weights.length - 1].weight;
          report.weight.change = report.weight.endWeight - report.weight.startWeight;
          report.weight.measurements = weights;
        }
      }
    } catch (error) {
      console.error('Error fetching weights:', error);
    }

    try {
      // Fetch goals data
      const goalsResponse = await axios.get(`${process.env.REACT_APP_API_URL}/get-goals`, {
        params: { userId: 'default-user' }
      });
      if (goalsResponse.data.success) {
        report.goalsAchieved = goalsResponse.data.goals.filter(g => g.status === 'achieved' && new Date(g.endDate) >= start && new Date(g.endDate) <= end);
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
    }

    return report;
  };

  // Return empty data structure when no real data exists
  const generateEmptyWeeklyReport = (start, end) => ({
    weekStart: start,
    weekEnd: end,
    summary: { totalWorkouts: 0, totalExercises: 0, totalSets: 0, totalReps: 0, totalWeight: 0, avgWorkoutDuration: 0, streak: 0 },
    workouts: [],
    weight: { startWeight: null, endWeight: null, change: 0, measurements: [] },
    goalsAchieved: [],
    personalRecords: [],
    challenges: [
      {
        id: 'challenge1',
        title: '30-Day Squat Challenge',
        progress: 15,
        target: 30,
        progressPercentage: 50,
        startDate: '2023-10-01',
        points: 250,
        weeklyContribution: 5,
        daysRemaining: 15,
      },
    ]
  });

  const navigateWeek = (direction) => {
    setCurrentWeek(current => {
      return direction === 'next' ? addWeeks(current, 1) : subWeeks(current, 1);
    });
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };


  const getProgressColor = (percentage) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-yellow-500';
    if (percentage >= 50) return 'bg-blue-500';
    return 'bg-gray-400';
  };

  const getGoalRecommendations = (goal) => {
    const recommendations = {
      'Weight Loss': [
        'Incorporate high-intensity interval training (HIIT) to maximize calorie burn.',
        'Focus on compound exercises like squats and deadlifts.',
        'Ensure you are in a consistent but moderate calorie deficit.'
      ],
      'Strength Gain': [
        'Follow a progressive overload plan by gradually increasing weight or reps.',
        'Ensure adequate protein intake to support muscle repair and growth.',
        'Prioritize sleep to allow for muscle recovery.'
      ],
      'Muscle Gain': [
        'Consume a slight caloric surplus with high protein.',
        'Train each muscle group 2-3 times per week.',
        'Focus on hypertrophy-specific training (e.g., 8-12 reps per set).'
      ],
      'Improve Endurance': [
        'Incorporate both long, steady-state cardio and shorter, high-intensity sessions.',
        'Gradually increase the duration or intensity of your cardio workouts.',
        'Stay hydrated and fuel properly before long workouts.'
      ],
      'Flexibility': [
        'Incorporate dynamic stretching before workouts and static stretching after.',
        'Try yoga or Pilates to improve overall flexibility and core strength.',
        'Hold static stretches for at least 30 seconds for best results.'
      ],
      'Maintain Fitness': [
        'Aim for a balanced routine of strength, cardio, and flexibility work.',
        'Listen to your body and incorporate active recovery days.',
        'Stay consistent with your workouts, even if they are shorter.'
      ]
    };
    return recommendations[goal.type] || [];
  };

  const renderSection = (key, title, content) => (
    <div className="mb-6">
      <button onClick={() => toggleSection(key)} className="w-full text-left">
        <h3 className="text-lg font-semibold text-gray-700 flex justify-between items-center">
          {title}
          <svg className={`h-5 w-5 transform transition-transform ${expandedSections[key] ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
        </h3>
      </button>
      {expandedSections[key] && <div className="mt-4">{content()}</div>}
    </div>
  );

  // Challenge progress calculation
  const getChallengeProgress = () => {
    if (!reportData || !reportData.challenges) return [];

    return reportData.challenges.map(challenge => {
      const weeklyContribution = calculateWeeklyWorkouts(); 
      const consecutiveDays = calculateConsecutiveWorkouts(challenge);
      
      let progress = 0;
      let progressPercentage = 0;
      
      switch(challenge.type) {
        case 'workout_streak':
          progress = consecutiveDays;
          break;
        case 'weekly_workouts':
          progress = weeklyContribution;
          break;
        case 'total_volume':
          progress = reportData.summary.totalWeight;
          break;
        default:
          progress = challenge.progress; // Fallback to mock data
      }

      progressPercentage = (progress / challenge.target) * 100;

      return {
        ...challenge,
        progress,
        progressPercentage,
        weeklyContribution,
      };
    });
  };

  // Helper function to calculate consecutive workout days
  const calculateConsecutiveWorkouts = (challenge) => {
    // This is a simplified example. A real implementation would need to check
    // workout history beyond the current week.
    if (reportData && reportData.workouts.length > 0) {
      return reportData.workouts.length; // Placeholder
    }
    return 0;
  };

  // Helper function to calculate weekly workouts
  const calculateWeeklyWorkouts = () => {
    if (reportData && reportData.workouts) {
      return reportData.workouts.length;
    }
    return 0;
    
    return uniqueDays.size;
  };

  if (!reportData) {
    return null;
  }

  return (
    <div className="bg-blue-secondary rounded-lg shadow-lg">
      {/* Header with Week Navigation */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-lg">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl section-header">Weekly Fitness Report</h2>
          {isCurrentWeek && (
            <span className="bg-white text-black px-3 py-1 rounded-full text-sm font-medium">
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

      <div className="p-6 space-y-6 text-white">
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
                  <div className="bg-gradient-to-br from-blue-100 to-blue-200 p-4 rounded-lg shadow-md border border-blue-300">
                    <p className="text-sm text-black font-medium">Workouts</p>
                    <p className="text-2xl font-bold text-blue-700">{reportData.summary.totalWorkouts}</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-100 to-green-200 p-4 rounded-lg shadow-md border border-green-300">
                    <p className="text-sm text-black font-medium">Total Exercises</p>
                    <p className="text-2xl font-bold text-green-700">{reportData.summary.totalExercises}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-100 to-purple-200 p-4 rounded-lg shadow-md border border-purple-300">
                    <p className="text-sm text-black font-medium">Total Weight</p>
                    <p className="text-2xl font-bold text-purple-700">{reportData.summary.totalWeight.toLocaleString()} lbs</p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-100 to-orange-200 p-4 rounded-lg shadow-md border border-orange-300">
                    <p className="text-sm text-black font-medium">Week Streak</p>
                    <p className="text-2xl font-bold text-orange-700">{reportData.summary.streak} weeks</p>
                  </div>
                </div>
              ) : (
                <div className="mt-4 bg-gray-50 p-6 rounded-lg text-center">
                  <p className="text-black mb-2">No workouts logged this week</p>
                  <p className="text-sm text-gray-600">Start logging workouts to see your weekly summary!</p>
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

        {/* Goal Review Section */}
        <div>
          <button
            onClick={() => toggleSection('goals')}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="text-lg font-semibold flex items-center">
              <svg className="h-5 w-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Goal Review ({reportData.currentGoals?.length || 0} active, {reportData.goalsAchieved?.length || 0} achieved this week)
            </h3>
            <svg className={`h-5 w-5 transform transition-transform ${expandedSections.goals ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {expandedSections.goals && (
            <div className="mt-4 space-y-6">
              {/* Goals Achieved This Week */}
              {reportData.goalsAchieved && reportData.goalsAchieved.length > 0 && (
                <div>
                  <h4 className="font-medium text-white mb-3 flex items-center">
                    <span className="text-2xl mr-2">🎉</span>
                    Goals Achieved This Week
                  </h4>
                  <div className="space-y-3">
                    {reportData.goalsAchieved.map((goal, index) => (
                      <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-medium text-green-800">{goal.name}</h5>
                            <p className="text-sm text-green-600">
                              Achieved on {format(goal.achievedDate, 'MMM d')} • {goal.achievedValue} / {goal.targetValue}
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
                </div>
              )}

              {/* Current Active Goals */}
              {reportData.currentGoals && reportData.currentGoals.length > 0 ? (
                <div>
                  <h4 className="font-medium text-white mb-3 flex items-center">
                    <span className="text-2xl mr-2">🎯</span>
                    Current Goals Status
                  </h4>
                  <div className="space-y-4">
                    {reportData.currentGoals.map((goal, index) => {
                      const recommendations = getGoalRecommendations(goal);
                      return (
                        <div key={index} className="bg-white bg-opacity-10 rounded-lg p-4 border border-gray-300">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h5 className="font-medium text-white">{goal.name}</h5>
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                  Active
                                </span>
                              </div>
                              <div className="text-sm text-gray-200 space-x-4">
                                <span>{goal.type}</span>
                                {goal.exerciseName && <span>• {goal.exerciseName}</span>}
                                <span>• Due: {format(goal.targetDate, 'MMM dd, yyyy')}</span>
                                <span className={`${goal.daysRemaining < 0 ? 'text-red-300' : goal.daysRemaining < 7 ? 'text-yellow-300' : 'text-gray-300'}`}>
                                  • {goal.daysRemaining < 0 ? `${Math.abs(goal.daysRemaining)} days overdue` : `${goal.daysRemaining} days left`}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="mb-3">
                            <div className="flex justify-between text-sm text-gray-200 mb-1">
                              <span>Progress: {goal.currentValue} / {goal.targetValue}</span>
                              <span>{goal.progressPercentage.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-600 rounded-full h-3">
                              <div
                                className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(goal.progressPercentage)}`}
                                style={{ width: `${Math.min(goal.progressPercentage, 100)}%` }}
                              />
                            </div>
                          </div>

                          {/* Recommendations */}
                          <div className="space-y-2">
                            <h6 className="text-sm font-medium text-gray-200">Recommendations:</h6>
                            {recommendations.map((rec, recIndex) => (
                              <div key={recIndex} className={`text-sm p-2 rounded flex items-start space-x-2 ${
                                rec.type === 'urgent' ? 'bg-red-500 bg-opacity-20 border border-red-400' :
                                rec.type === 'warning' ? 'bg-yellow-500 bg-opacity-20 border border-yellow-400' :
                                rec.type === 'success' ? 'bg-green-500 bg-opacity-20 border border-green-400' :
                                'bg-blue-500 bg-opacity-20 border border-blue-400'
                              }`}>
                                <span>{rec.icon}</span>
                                <span className="text-gray-100">{rec.message}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                !reportData.goalsAchieved?.length && (
                  <div className="bg-gray-50 p-6 rounded-lg text-center">
                    <p className="text-gray-500 mb-2">No active goals found</p>
                    <p className="text-sm text-gray-400">Visit the Goals tab to set and track your fitness goals!</p>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* Challenges Section */}
        <div>
          <button
            onClick={() => toggleSection('challenges')}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="text-lg font-semibold flex items-center">
              <svg className="h-5 w-5 mr-2 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Weekly Challenge Progress
            </h3>
            <svg className={`h-5 w-5 transform transition-transform ${expandedSections.challenges ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          
          {expandedSections.challenges && (
            <div className="mt-4">
              {getChallengeProgress().length > 0 ? (
                <div className="space-y-4">
                  {getChallengeProgress().map((challenge, index) => (
                    <div key={index} className="bg-white bg-opacity-10 rounded-lg p-4 border border-gray-300">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="text-2xl">{challenge.icon}</span>
                          <div>
                            <h5 className="font-medium text-white">{challenge.name}</h5>
                            <p className="text-sm text-gray-300">{challenge.description}</p>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium mt-1 inline-block ${
                              challenge.status === 'completed' ? 'bg-green-100 text-green-800' :
                              challenge.status === 'at_risk' ? 'bg-red-100 text-red-800' :
                              challenge.status === 'on_track' ? 'bg-blue-100 text-blue-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {challenge.status === 'completed' ? '✅ Completed' :
                               challenge.status === 'at_risk' ? '⚠️ At Risk' :
                               challenge.status === 'on_track' ? '🎯 On Track' : 
                               '⏳ In Progress'}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-white">{challenge.progress}</div>
                          <div className="text-sm text-gray-300">/ {challenge.target}</div>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mb-3">
                        <div className="w-full bg-gray-600 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full transition-all duration-500 ${
                              challenge.progressPercentage >= 100 ? 'bg-green-500' :
                              challenge.progressPercentage >= 75 ? 'bg-yellow-500' :
                              challenge.progressPercentage >= 50 ? 'bg-blue-500' : 'bg-gray-400'
                            }`}
                            style={{ width: `${Math.min(challenge.progressPercentage, 100)}%` }}
                          />
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {challenge.progressPercentage.toFixed(0)}% complete
                        </div>
                      </div>

                      {/* Challenge Details */}
                      <div className="text-sm text-gray-200">
                        <div className="flex justify-between items-center">
                          <span>Started: {format(new Date(challenge.startDate), 'MMM d')}</span>
                          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                            {challenge.points} pts
                          </span>
                        </div>
                        {challenge.weeklyContribution > 0 && (
                          <div className="mt-2 text-green-300">
                            📈 +{challenge.weeklyContribution} progress this week
                          </div>
                        )}
                        {challenge.daysRemaining && (
                          <div className="mt-1">
                            ⏰ {challenge.daysRemaining > 0 ? `${challenge.daysRemaining} days remaining` : 'Challenge expired'}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-gray-50 p-6 rounded-lg text-center">
                  <p className="text-gray-500 mb-2">No active challenges</p>
                  <p className="text-sm text-gray-400">Visit the Challenge System in Log Workout to create your first challenge!</p>
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

  const handleExport = () => {
    if (!reportContentRef.current) return;

    setLoading(true);
    const reportElement = reportContentRef.current;

    html2canvas(reportElement, {
      scale: 2, // Higher resolution
      useCORS: true, // For images from other origins
      backgroundColor: '#ffffff' // Explicitly set background
    }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
      const weekStartDate = format(weekStart, 'yyyy-MM-dd');
      pdf.save(`Weekly-Report-${weekStartDate}.pdf`);
      setLoading(false);
    }).catch(err => {
      console.error("Could not generate PDF", err);
      setError("Failed to generate PDF report.");
      setLoading(false);
    });
  };

  return (
    <div className="bg-gray-800 text-white rounded-lg shadow-lg p-4 sm:p-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-100">Weekly Fitness Report</h2>
        <div className="flex items-center mt-2 sm:mt-0">
          <button onClick={() => navigateWeek('prev')} className="p-2 rounded-md hover:bg-gray-700">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-center font-semibold text-gray-300 w-48">
            {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
          </span>
          <button onClick={() => navigateWeek('next')} disabled={isCurrentWeek} className="p-2 rounded-md hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
          </button>
          <button
            onClick={handleExport}
            disabled={loading}
            className="ml-4 px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-500 flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export PDF
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-400">Generating your weekly report...</p>
        </div>
      )}

      {error && <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded-md mb-4">{error}</div>}

      {!loading && !error && reportData && (
        <div ref={reportContentRef} className="bg-gray-800 p-4">
          {/* Summary Section */}
          {renderSection('summary', 'Weekly Summary', renderSummary)}
          
          {/* Workouts Section */}
          {renderSection('workouts', 'Workouts Breakdown', renderWorkouts)}

          {/* Weight Section */}
          {renderSection('weight', 'Weight Tracking', renderWeight)}

          {/* Goals Section */}
          {renderSection('goals', 'Goals & Achievements', renderGoals)}

          {/* Challenges Section */}
          {renderSection('challenges', 'Active Challenges', renderChallenges)}

          {/* Personal Records Section */}
          {reportData.personalRecords.length > 0 && (
            <div className="bg-yellow-900 bg-opacity-25 border border-yellow-700 rounded-lg p-4 mt-4">
              <h3 className="font-semibold text-yellow-300 mb-3 flex items-center">
                <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
                  <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
                </svg>
                New Personal Records!
              </h3>
              <div className="space-y-2">
                {reportData.personalRecords.map((pr, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="font-medium text-gray-200">{pr.exercise}</span>
                    <span className="text-yellow-400">{pr.weight} lbs × {pr.reps} reps</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default WeeklyReport;