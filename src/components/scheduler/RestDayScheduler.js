import React, { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import axios from 'axios';
import { analyzeWorkoutFrequency, getRestDayRecommendations, workoutTemplates } from '../../utils/workoutTemplates';

const RestDayScheduler = () => {
  const [workoutData, setWorkoutData] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [selectedDays, setSelectedDays] = useState(30);
  const [isLoading, setIsLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());

  useEffect(() => {
    fetchWorkoutData();
  }, []);

  useEffect(() => {
    if (workoutData.length > 0) {
      const frequencyAnalysis = analyzeWorkoutFrequency(workoutData, selectedDays);
      setAnalysis(frequencyAnalysis);
    }
  }, [workoutData, selectedDays]);

  const fetchWorkoutData = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/get-workouts`, {
        params: { userId: 'default-user' }
      });
      
      if (response.data.success && (response.data.workouts || response.data.data)) {
        const workouts = response.data.workouts || response.data.data;
        setWorkoutData(workouts);
      }
    } catch (error) {
      console.error('Failed to fetch workout data:', error);
      setWorkoutData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getWeekWorkouts = () => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
    const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 }); // Sunday
    
    return workoutData.filter(workout => {
      const workoutDate = new Date(workout.date || workout.Date);
      return isWithinInterval(workoutDate, { start: weekStart, end: weekEnd });
    });
  };

  const generateWeekView = () => {
    const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
    const weekWorkouts = getWeekWorkouts();
    const days = [];

    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      const dayWorkouts = weekWorkouts.filter(workout => {
        const workoutDate = new Date(workout.date || workout.Date);
        return format(workoutDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd');
      });

      days.push({
        date,
        workouts: dayWorkouts,
        isToday: format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'),
        isPast: date < new Date()
      });
    }

    return days;
  };

  const getRestDayRecommendation = () => {
    if (!analysis) return null;

    const recommendations = getRestDayRecommendations(
      analysis.frequency, 
      analysis.averageRest, 
      analysis.consistency
    );

    return recommendations;
  };

  const getSuggestedSchedule = () => {
    if (!analysis?.suggestedTemplate) return null;

    const template = workoutTemplates[analysis.suggestedTemplate];
    return template;
  };

  const getFrequencyStatus = () => {
    if (!analysis) return { color: 'gray', message: 'Analyzing...' };

    if (analysis.frequency < 2) {
      return { color: 'red', message: 'Low frequency' };
    } else if (analysis.frequency >= 2 && analysis.frequency <= 5) {
      return { color: 'green', message: 'Good frequency' };
    } else {
      return { color: 'yellow', message: 'High frequency' };
    }
  };

  const navigateWeek = (direction) => {
    if (direction === 'prev') {
      setCurrentWeek(prev => addDays(prev, -7));
    } else if (direction === 'next') {
      setCurrentWeek(prev => addDays(prev, 7));
    } else if (direction === 'current') {
      setCurrentWeek(new Date());
    }
  };

  if (isLoading) {
    return (
      <div className="bg-blue-primary rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  const weekDays = generateWeekView();
  const frequencyStatus = getFrequencyStatus();
  const recommendations = getRestDayRecommendation();
  const suggestedTemplate = getSuggestedSchedule();

  return (
    <div className="bg-blue-primary rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl section-header mb-4">Rest Day Scheduler</h2>
        
        {/* Analysis Period Selector */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-white mb-2">Analysis Period</label>
          <select
            value={selectedDays}
            onChange={(e) => setSelectedDays(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black"
          >
            <option value={14}>Last 2 weeks</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>

        {/* Frequency Analysis */}
        {analysis && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-200 mb-1">Weekly Frequency</h3>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-white">{analysis.frequency}</span>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  frequencyStatus.color === 'green' ? 'bg-green-500 text-white' :
                  frequencyStatus.color === 'yellow' ? 'bg-yellow-500 text-black' :
                  'bg-red-500 text-white'
                }`}>
                  {frequencyStatus.message}
                </div>
              </div>
              <p className="text-xs text-gray-300 mt-1">
                {analysis.totalWorkouts} workouts in {analysis.daysAnalyzed} days
              </p>
            </div>

            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-200 mb-1">Average Rest</h3>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-white">{analysis.averageRest}</span>
                <span className="text-sm text-gray-300">days</span>
              </div>
              <p className="text-xs text-gray-300 mt-1">Between workout sessions</p>
            </div>

            <div className="bg-white bg-opacity-10 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-200 mb-1">Consistency</h3>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-white">{analysis.consistency}%</span>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  analysis.consistency >= 80 ? 'bg-green-500 text-white' :
                  analysis.consistency >= 60 ? 'bg-yellow-500 text-black' :
                  'bg-red-500 text-white'
                }`}>
                  {analysis.consistency >= 80 ? 'Excellent' : analysis.consistency >= 60 ? 'Good' : 'Needs Work'}
                </div>
              </div>
              <p className="text-xs text-gray-300 mt-1">Workout spacing regularity</p>
            </div>
          </div>
        )}

        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-6 bg-white bg-opacity-10 rounded-lg p-4">
          <button
            onClick={() => navigateWeek('prev')}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
          >
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <div className="text-center">
            <h3 className="text-lg font-medium text-white">
              {format(startOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d')} - {format(endOfWeek(currentWeek, { weekStartsOn: 1 }), 'MMM d, yyyy')}
            </h3>
            <button
              onClick={() => navigateWeek('current')}
              className="text-sm text-blue-200 hover:text-white mt-1"
            >
              Go to current week
            </button>
          </div>
          
          <button
            onClick={() => navigateWeek('next')}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-full transition-colors"
          >
            <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Week Calendar */}
        <div className="grid grid-cols-7 gap-2 mb-6">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-200 py-2">
              {day}
            </div>
          ))}
          
          {weekDays.map((day, index) => (
            <div key={index} className={`rounded-lg p-3 min-h-[100px] ${
              day.isToday ? 'bg-blue-600 border-2 border-blue-400' :
              day.workouts.length > 0 ? 'bg-green-500 bg-opacity-80' :
              'bg-gray-500 bg-opacity-50'
            }`}>
              <div className="text-center">
                <div className="text-sm font-medium text-white mb-1">
                  {format(day.date, 'd')}
                </div>
                
                {day.workouts.length > 0 ? (
                  <div className="space-y-1">
                    <div className="text-xs text-white font-medium">
                      💪 {day.workouts.length} workout{day.workouts.length > 1 ? 's' : ''}
                    </div>
                    {day.workouts.slice(0, 2).map((workout, i) => (
                      <div key={i} className="text-xs text-white truncate">
                        {workout.exercise || workout.Exercise}
                      </div>
                    ))}
                    {day.workouts.length > 2 && (
                      <div className="text-xs text-white">
                        +{day.workouts.length - 2} more
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-xs text-white opacity-75">
                    😴 Rest Day
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Recommendations */}
        {recommendations && recommendations.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <span className="mr-2">💡</span>
              Rest Day Recommendations
            </h3>
            <div className="space-y-3">
              {recommendations.map((rec, index) => (
                <div key={index} className={`p-3 rounded-lg border-l-4 ${
                  rec.type === 'warning' ? 'bg-red-500 bg-opacity-20 border-red-400' :
                  rec.type === 'success' ? 'bg-green-500 bg-opacity-20 border-green-400' :
                  rec.type === 'caution' ? 'bg-yellow-500 bg-opacity-20 border-yellow-400' :
                  'bg-blue-500 bg-opacity-20 border-blue-400'
                }`}>
                  <p className="text-white text-sm">{rec.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Suggested Template */}
        {suggestedTemplate && (
          <div className="bg-white bg-opacity-10 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
              <span className="mr-2">📋</span>
              Suggested Workout Template
            </h3>
            <div className="bg-white rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-2">{suggestedTemplate.name}</h4>
              <p className="text-gray-600 text-sm mb-3">{suggestedTemplate.description}</p>
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <span>📅 {suggestedTemplate.frequency} workouts/week</span>
                <span>😴 {suggestedTemplate.restDays} rest day between sessions</span>
              </div>
              <div className="mt-3">
                <p className="text-sm text-gray-700">
                  <strong>Based on your analysis:</strong> {analysis?.recommendation}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RestDayScheduler;