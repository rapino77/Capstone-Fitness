import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { calculateOneRepMax } from '../../utils/prDetection';

const PersonalRecordsSidebar = ({ userId = 'default-user', refreshTrigger = 0 }) => {
  const [personalRecords, setPersonalRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date'); // 'date', 'weight', 'exercise', 'oneRM'
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterCategory, setFilterCategory] = useState('all');

  // Exercise categories for filtering
  const exerciseCategories = {
    all: 'All Exercises',
    compound: 'Compound Lifts',
    upper: 'Upper Body',
    lower: 'Lower Body',
    cardio: 'Cardio'
  };

  const categorizeExercise = (exercise) => {
    const lowerExercise = exercise.toLowerCase();
    
    // Compound lifts
    if (['squat', 'deadlift', 'bench press', 'overhead press', 'pull-up', 'row'].some(lift => lowerExercise.includes(lift))) {
      return 'compound';
    }
    
    // Upper body
    if (['bench', 'press', 'curl', 'tricep', 'shoulder', 'chest', 'back', 'lat', 'dip'].some(muscle => lowerExercise.includes(muscle))) {
      return 'upper';
    }
    
    // Lower body
    if (['squat', 'leg', 'calf', 'glute', 'hip', 'lunge', 'deadlift'].some(muscle => lowerExercise.includes(muscle))) {
      return 'lower';
    }
    
    // Cardio
    if (['run', 'bike', 'treadmill', 'elliptical', 'cardio'].some(cardio => lowerExercise.includes(cardio))) {
      return 'cardio';
    }
    
    return 'other';
  };

  // Calculate all personal records from workout history
  const calculatePersonalRecords = useCallback((workouts) => {
    if (!workouts || workouts.length === 0) return [];

    const exerciseGroups = {};
    
    // Group workouts by exercise
    workouts.forEach(workout => {
      const exercise = workout.exercise || workout.Exercise || 'Unknown Exercise';
      const weight = parseFloat(workout.weight || workout.Weight || 0);
      const reps = parseInt(workout.reps || workout.Reps || 0);
      const sets = parseInt(workout.sets || workout.Sets || 1);
      const date = workout.date || workout.Date;

      if (weight > 0 && reps > 0) {
        if (!exerciseGroups[exercise]) {
          exerciseGroups[exercise] = [];
        }

        exerciseGroups[exercise].push({
          weight,
          reps,
          sets,
          date,
          volume: weight * reps * sets,
          oneRM: calculateOneRepMax(weight, reps),
          workout: workout
        });
      }
    });

    const prs = [];

    // Find PRs for each exercise
    Object.entries(exerciseGroups).forEach(([exercise, workouts]) => {
      // Sort by weight descending to find max weight
      const sortedByWeight = [...workouts].sort((a, b) => b.weight - a.weight);
      const maxWeightWorkout = sortedByWeight[0];

      // Sort by 1RM descending to find max 1RM
      const sortedByOneRM = [...workouts].sort((a, b) => b.oneRM - a.oneRM);
      const maxOneRMWorkout = sortedByOneRM[0];

      // Sort by volume descending to find max volume
      const sortedByVolume = [...workouts].sort((a, b) => b.volume - a.volume);
      const maxVolumeWorkout = sortedByVolume[0];

      // Find most recent workout
      const sortedByDate = [...workouts].sort((a, b) => new Date(b.date) - new Date(a.date));
      const mostRecentWorkout = sortedByDate[0];

      // Create PR entry
      const prEntry = {
        exercise,
        category: categorizeExercise(exercise),
        totalWorkouts: workouts.length,
        
        // Max Weight PR
        maxWeight: {
          weight: maxWeightWorkout.weight,
          reps: maxWeightWorkout.reps,
          sets: maxWeightWorkout.sets,
          date: maxWeightWorkout.date,
          oneRM: maxWeightWorkout.oneRM,
          workout: maxWeightWorkout.workout
        },

        // Max 1RM PR
        maxOneRM: {
          weight: maxOneRMWorkout.weight,
          reps: maxOneRMWorkout.reps,
          sets: maxOneRMWorkout.sets,
          date: maxOneRMWorkout.date,
          oneRM: maxOneRMWorkout.oneRM,
          workout: maxOneRMWorkout.workout
        },

        // Max Volume PR
        maxVolume: {
          weight: maxVolumeWorkout.weight,
          reps: maxVolumeWorkout.reps,
          sets: maxVolumeWorkout.sets,
          date: maxVolumeWorkout.date,
          volume: maxVolumeWorkout.volume,
          workout: maxVolumeWorkout.workout
        },

        // Most Recent
        mostRecent: {
          weight: mostRecentWorkout.weight,
          reps: mostRecentWorkout.reps,
          sets: mostRecentWorkout.sets,
          date: mostRecentWorkout.date,
          oneRM: mostRecentWorkout.oneRM,
          workout: mostRecentWorkout.workout
        }
      };

      prs.push(prEntry);
    });

    return prs;
  }, []);

  // Fetch and calculate personal records
  const fetchPersonalRecords = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/get-workouts`, {
        params: {
          userId,
          limit: 500, // Get more workouts for comprehensive PR analysis
          _t: Date.now()
        }
      });

      if (response.data.success && response.data.data) {
        const workouts = response.data.data;
        const calculatedPRs = calculatePersonalRecords(workouts);
        setPersonalRecords(calculatedPRs);
      } else {
        setError('Failed to fetch workout data');
      }
    } catch (err) {
      console.error('Error fetching personal records:', err);
      setError('Error loading personal records');
    } finally {
      setIsLoading(false);
    }
  }, [userId, calculatePersonalRecords]);

  useEffect(() => {
    fetchPersonalRecords();
  }, [fetchPersonalRecords, refreshTrigger]);

  // Filter and sort personal records
  const filteredAndSortedPRs = personalRecords
    .filter(pr => {
      // Filter by search term
      if (searchTerm && !pr.exercise.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Filter by category
      if (filterCategory !== 'all' && pr.category !== filterCategory) {
        return false;
      }
      
      return true;
    })
    .sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'exercise':
          aValue = a.exercise.toLowerCase();
          bValue = b.exercise.toLowerCase();
          break;
        case 'weight':
          aValue = a.maxWeight.weight;
          bValue = b.maxWeight.weight;
          break;
        case 'oneRM':
          aValue = a.maxOneRM.oneRM;
          bValue = b.maxOneRM.oneRM;
          break;
        case 'date':
          aValue = new Date(a.mostRecent.date);
          bValue = new Date(b.mostRecent.date);
          break;
        default:
          aValue = new Date(a.mostRecent.date);
          bValue = new Date(b.mostRecent.date);
      }

      if (sortOrder === 'desc') {
        return aValue < bValue ? 1 : -1;
      } else {
        return aValue > bValue ? 1 : -1;
      }
    });

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-2/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="text-center text-red-500">
          <div className="mb-2">⚠️ {error}</div>
          <button
            onClick={fetchPersonalRecords}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600 transition-colors text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <span className="mr-2">🏆</span>
            Personal Records
          </h3>
          <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
            {filteredAndSortedPRs.length} exercises
          </span>
        </div>

        {/* Search and Filters */}
        <div className="space-y-2">
          {/* Search */}
          <input
            type="text"
            placeholder="Search exercises..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {Object.entries(exerciseCategories).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          {/* Sort Controls */}
          <div className="flex space-x-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="date">Recent</option>
              <option value="exercise">Exercise</option>
              <option value="weight">Max Weight</option>
              <option value="oneRM">Max 1RM</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors"
              title={`Sort ${sortOrder === 'desc' ? 'ascending' : 'descending'}`}
            >
              {sortOrder === 'desc' ? '↓' : '↑'}
            </button>
          </div>
        </div>
      </div>

      {/* Personal Records List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredAndSortedPRs.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredAndSortedPRs.map((pr, index) => (
              <PersonalRecordItem key={pr.exercise} pr={pr} />
            ))}
          </div>
        ) : (
          <div className="p-6 text-center text-gray-500">
            {personalRecords.length === 0 ? (
              <div>
                <div className="text-4xl mb-2">💪</div>
                <div className="font-medium mb-1">No Personal Records Yet</div>
                <div className="text-sm">Start logging workouts to see your PRs!</div>
              </div>
            ) : (
              <div>
                <div className="text-4xl mb-2">🔍</div>
                <div className="font-medium mb-1">No Records Found</div>
                <div className="text-sm">Try adjusting your search or filters</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {personalRecords.length > 0 && (
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="text-center">
              <div className="font-semibold text-gray-900">{personalRecords.length}</div>
              <div className="text-gray-500">Total Exercises</div>
            </div>
            <div className="text-center">
              <div className="font-semibold text-gray-900">
                {personalRecords.reduce((sum, pr) => sum + pr.totalWorkouts, 0)}
              </div>
              <div className="text-gray-500">Total Workouts</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Individual Personal Record Item Component
const PersonalRecordItem = ({ pr }) => {
  const [expanded, setExpanded] = useState(false);

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Unknown date';
    }
  };

  const getCategoryEmoji = (category) => {
    switch (category) {
      case 'compound': return '🏋️';
      case 'upper': return '💪';
      case 'lower': return '🦵';
      case 'cardio': return '❤️';
      default: return '🏃';
    }
  };

  const daysSinceLastWorkout = Math.floor(
    (new Date() - new Date(pr.mostRecent.date)) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="p-4 hover:bg-gray-50 transition-colors">
      <div 
        className="cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span>{getCategoryEmoji(pr.category)}</span>
              <h4 className="font-medium text-gray-900 text-sm">{pr.exercise}</h4>
            </div>
            <div className="mt-1 text-xs text-gray-500">
              Max: {pr.maxWeight.weight}lbs × {pr.maxWeight.reps} ({pr.maxOneRM.oneRM}lb 1RM)
            </div>
            <div className="mt-1 text-xs text-gray-500">
              {daysSinceLastWorkout === 0 ? 'Today' :
               daysSinceLastWorkout === 1 ? '1 day ago' :
               daysSinceLastWorkout < 7 ? `${daysSinceLastWorkout} days ago` :
               daysSinceLastWorkout < 30 ? `${Math.floor(daysSinceLastWorkout / 7)} weeks ago` :
               `${Math.floor(daysSinceLastWorkout / 30)} months ago`}
            </div>
          </div>
          <div className="text-xs text-gray-400">
            {expanded ? '▲' : '▼'}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
          {/* Max Weight */}
          <div className="bg-yellow-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-yellow-800 text-sm">🥇 Max Weight</div>
                <div className="text-yellow-700 text-sm">
                  {pr.maxWeight.sets} × {pr.maxWeight.reps} @ {pr.maxWeight.weight}lbs
                </div>
              </div>
              <div className="text-xs text-yellow-600">
                {formatDate(pr.maxWeight.date)}
              </div>
            </div>
          </div>

          {/* Max 1RM */}
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-blue-800 text-sm">💎 Max 1RM</div>
                <div className="text-blue-700 text-sm">
                  {pr.maxOneRM.oneRM}lbs ({pr.maxOneRM.weight}lbs × {pr.maxOneRM.reps})
                </div>
              </div>
              <div className="text-xs text-blue-600">
                {formatDate(pr.maxOneRM.date)}
              </div>
            </div>
          </div>

          {/* Max Volume */}
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-green-800 text-sm">📊 Max Volume</div>
                <div className="text-green-700 text-sm">
                  {pr.maxVolume.volume.toLocaleString()}lbs total
                </div>
                <div className="text-xs text-green-600">
                  {pr.maxVolume.sets} × {pr.maxVolume.reps} @ {pr.maxVolume.weight}lbs
                </div>
              </div>
              <div className="text-xs text-green-600">
                {formatDate(pr.maxVolume.date)}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="text-xs text-gray-600 text-center">
              Total sessions: {pr.totalWorkouts} | Last workout: {formatDate(pr.mostRecent.date)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalRecordsSidebar;