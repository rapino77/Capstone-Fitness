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
        params: { userId: 'default-user' }
      });
      
      console.log('⚖️ Weight API response:', weightResponse.data);
      
      if (weightResponse.data.success && (weightResponse.data.weights || weightResponse.data.data)) {
        const allWeights = weightResponse.data.weights || weightResponse.data.data;
        
        // Filter weights for this week
        const weekWeights = allWeights.filter(weight => {
          const weightDate = new Date(weight.date || weight.Date);
          return weightDate >= start && weightDate <= end;
        }).map(w => ({
          date: new Date(w.date || w.Date),
          weight: w.weight || w.Weight,
          unit: w.unit || w.Unit || 'lbs'
        })).sort((a, b) => a.date - b.date);

        if (weekWeights.length > 0) {
          report.weight.startWeight = weekWeights[0].weight;
          report.weight.endWeight = weekWeights[weekWeights.length - 1].weight;
          report.weight.change = report.weight.endWeight - report.weight.startWeight;
          report.weight.measurements = weekWeights;
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
      
      console.log('🎯 Goals API response:', goalsResponse.data);
      
      if (goalsResponse.data.success && goalsResponse.data.goals) {
        // Filter goals that were achieved this week
        const goalsAchieved = goalsResponse.data.goals.filter(goal => {
          const achievedDate = goal.achieved_date || goal['Achieved Date'];
          if (!achievedDate) return false;
          
          const achievedDateObj = new Date(achievedDate);
          return achievedDateObj >= start && achievedDateObj <= end;
        }).map(goal => ({
          title: goal.title || goal.Title,
          type: goal.type || goal.Type,
          targetValue: goal.target_value || goal['Target Value'],
          currentValue: goal.current_value || goal['Current Value'],
          achievedDate: new Date(goal.achieved_date || goal['Achieved Date'])
        }));

        report.goalsAchieved = goalsAchieved;
      }
    } catch (error) {
      console.error('Error fetching goals:', error);
    }

    return report;
  };

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
    } else if (direction === 'next' && !isCurrentWeek) {
      setCurrentWeek(addWeeks(currentWeek, 1));
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const renderSection = (sectionKey, title, content) => {
    const isExpanded = expandedSections[sectionKey];
    return (
      <div className="mb-6">
        <button
          onClick={() => toggleSection(sectionKey)}
          className="w-full flex justify-between items-center p-3 bg-gray-700 hover:bg-gray-600 rounded-t-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <h3 className="text-lg font-semibold text-gray-100">{title}</h3>
          <svg
            className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isExpanded && (
          <div className="p-4 bg-gray-750 border-x border-b border-gray-600 rounded-b-lg">
            {content}
          </div>
        )}
      </div>
    );
  };

  const renderSummary = () => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-400">{reportData.summary.totalWorkouts}</div>
        <div className="text-sm text-gray-300">Workouts</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-green-400">{reportData.summary.totalSets}</div>
        <div className="text-sm text-gray-300">Sets</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-yellow-400">{reportData.summary.totalReps}</div>
        <div className="text-sm text-gray-300">Reps</div>
      </div>
      <div className="text-center">
        <div className="text-2xl font-bold text-red-400">{Math.round(reportData.summary.totalWeight)}</div>
        <div className="text-sm text-gray-300">lbs Lifted</div>
      </div>
    </div>
  );

  const renderWorkouts = () => (
    <div className="space-y-4">
      {reportData.workouts.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">😴</div>
          <p>No workouts logged this week</p>
          <p className="text-sm">Time to get moving!</p>
        </div>
      ) : (
        reportData.workouts.map((workout, index) => (
          <div key={index} className="bg-gray-700 rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-lg font-semibold text-gray-100">
                {format(workout.date, 'EEEE, MMM d')}
              </h4>
              <span className="text-sm text-gray-400">
                {workout.exercises.length} exercises
              </span>
            </div>
            <div className="grid gap-2">
              {workout.exercises.map((exercise, exerciseIndex) => (
                <div key={exerciseIndex} className="flex justify-between items-center py-2 border-b border-gray-600 last:border-b-0">
                  <span className="text-gray-200 font-medium">{exercise.name}</span>
                  <div className="text-right">
                    <span className="text-gray-300">{exercise.sets}×{exercise.reps}</span>
                    {exercise.weight > 0 && (
                      <span className="text-gray-300 ml-2">@ {exercise.weight}lbs</span>
                    )}
                    {exercise.isPR && (
                      <span className="ml-2 px-2 py-1 bg-yellow-500 text-yellow-900 text-xs font-bold rounded">PR!</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderWeight = () => (
    <div className="space-y-4">
      {reportData.weight.measurements.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">⚖️</div>
          <p>No weight measurements this week</p>
          <p className="text-sm">Consider tracking your progress!</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-xl font-bold text-gray-100">
                {reportData.weight.startWeight ? `${reportData.weight.startWeight} lbs` : 'N/A'}
              </div>
              <div className="text-sm text-gray-400">Week Start</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-gray-100">
                {reportData.weight.endWeight ? `${reportData.weight.endWeight} lbs` : 'N/A'}
              </div>
              <div className="text-sm text-gray-400">Week End</div>
            </div>
            <div className="text-center">
              <div className={`text-xl font-bold ${
                reportData.weight.change > 0 ? 'text-red-400' : 
                reportData.weight.change < 0 ? 'text-green-400' : 'text-gray-400'
              }`}>
                {reportData.weight.change > 0 ? '+' : ''}{reportData.weight.change.toFixed(1)} lbs
              </div>
              <div className="text-sm text-gray-400">Change</div>
            </div>
          </div>
          <div className="space-y-2">
            {reportData.weight.measurements.map((measurement, index) => (
              <div key={index} className="flex justify-between items-center py-2 bg-gray-700 rounded px-3">
                <span className="text-gray-300">{format(measurement.date, 'MMM d')}</span>
                <span className="text-gray-100 font-semibold">{measurement.weight} {measurement.unit}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );

  const renderGoals = () => (
    <div className="space-y-4">
      {reportData.goalsAchieved.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <div className="text-4xl mb-2">🎯</div>
          <p>No goals achieved this week</p>
          <p className="text-sm">Keep pushing towards your targets!</p>
        </div>
      ) : (
        reportData.goalsAchieved.map((goal, index) => (
          <div key={index} className="bg-green-800 border border-green-600 rounded-lg p-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="text-lg font-semibold text-green-100">{goal.title}</h4>
                <p className="text-green-300 text-sm">Target: {goal.targetValue}</p>
                <p className="text-green-300 text-sm">Achieved: {goal.currentValue}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl mb-1">🎉</div>
                <div className="text-sm text-green-300">{format(goal.achievedDate, 'MMM d')}</div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderChallenges = () => {
    // Generate mock challenges for demonstration
    const mockChallenges = reportData.workouts.length > 0 ? [
      {
        name: "Weekly Workout Challenge",
        description: "Complete 4 workouts this week",
        progress: reportData.summary.totalWorkouts,
        target: 4,
        progressPercentage: (reportData.summary.totalWorkouts / 4) * 100,
        startDate: weekStart,
        points: 50,
        weeklyContribution: reportData.summary.totalWorkouts,
        daysRemaining: Math.ceil((weekEnd - new Date()) / (1000 * 60 * 60 * 24))
      }
    ] : [];

    return (
      <div className="space-y-4">
        {mockChallenges.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <div className="text-4xl mb-2">🏆</div>
            <p>No active challenges</p>
            <p className="text-sm">Check back for new challenges!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {mockChallenges.map((challenge, index) => (
              <div key={index} className="bg-gray-700 border border-gray-600 rounded-lg p-4">
                {/* Challenge Header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-lg text-white">{challenge.name}</h4>
                    <p className="text-sm text-gray-300">{challenge.description}</p>
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
        )}

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
          {renderSection('summary', 'Weekly Summary', renderSummary())}
          
          {/* Workouts Section */}
          {renderSection('workouts', 'Workouts Breakdown', renderWorkouts())}

          {/* Weight Section */}
          {renderSection('weight', 'Weight Tracking', renderWeight())}

          {/* Goals Section */}
          {renderSection('goals', 'Goals & Achievements', renderGoals())}

          {/* Challenges Section */}
          {renderSection('challenges', 'Active Challenges', renderChallenges())}

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