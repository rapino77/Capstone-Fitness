import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { format, subDays } from 'date-fns';
import axios from 'axios';
import VirtualScrollList from '../common/VirtualScrollList';
import { useOptimizedFetch } from '../../hooks/useOptimizedFetch';

const WorkoutHistory = () => {
  const [workouts, setWorkouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(null);
  const [isResetting, setIsResetting] = useState(false);
  const [filters, setFilters] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    exercise: '',
    sortBy: 'Date',
    sortDirection: 'desc'
  });
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 20,
    total: 0,
    hasMore: false
  });

  const isFetching = useRef(false);

  const fetchWorkouts = useCallback(async (resetOffset = false, customOffset = null) => {
    if (isFetching.current) return; // Prevent multiple simultaneous fetches
    
    try {
      isFetching.current = true;
      setIsLoading(true);
      const offset = resetOffset ? 0 : (customOffset !== null ? customOffset : 0);
      
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/get-workouts`, {
        params: {
          ...filters,
          offset,
          limit: 20 // Use fixed limit for now
        }
      });
      
      if (response.data.success) {
        setWorkouts(response.data.data);
        setPagination(prevPagination => ({
          ...prevPagination,
          ...response.data.pagination,
          offset: resetOffset ? 0 : prevPagination.offset
        }));
      }
    } catch (error) {
      console.error('Failed to fetch workouts:', error);
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [filters]); // Only depend on filters

  useEffect(() => {
    fetchWorkouts(true);
  }, [filters, fetchWorkouts]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleLoadMore = () => {
    setPagination(prev => {
      const newOffset = prev.offset + prev.limit;
      fetchWorkouts(false, newOffset);
      return { ...prev, offset: newOffset };
    });
  };

  const handleDeleteWorkout = async (workoutId) => {
    if (window.confirm('Are you sure you want to delete this workout?')) {
      setIsDeleting(workoutId);
      try {
        const response = await axios.delete(`${process.env.REACT_APP_API_URL}/delete-workout/${workoutId}`);
        if (response.data.success) {
          // Remove workout from local state
          setWorkouts(prevWorkouts => prevWorkouts.filter(w => w.id !== workoutId));
        }
      } catch (error) {
        console.error('Failed to delete workout:', error);
        alert('Failed to delete workout. Please try again.');
      } finally {
        setIsDeleting(null);
      }
    }
  };

  const handleResetAllWorkouts = async () => {
    const confirmMessage = `⚠️ DEVELOPMENT MODE RESET ⚠️\n\nThis will permanently delete ALL ${workouts.length} workout records from your Airtable database.\n\nThis action cannot be undone!\n\nType "DELETE ALL" to confirm:`;
    
    const userInput = window.prompt(confirmMessage);
    
    if (userInput === 'DELETE ALL') {
      setIsResetting(true);
      try {
        const response = await axios.delete(`${process.env.REACT_APP_API_URL}/reset-all-workouts`);
        if (response.data.success) {
          // Clear all workouts from local state
          setWorkouts([]);
          alert(`✅ Successfully deleted ${response.data.deletedCount} workout records`);
        }
      } catch (error) {
        console.error('Failed to reset workouts:', error);
        alert('Failed to reset workouts. Please try again.');
      } finally {
        setIsResetting(false);
      }
    } else if (userInput !== null) {
      alert('Reset cancelled. You must type "DELETE ALL" exactly to confirm.');
    }
  };

  const groupWorkoutsByDate = (workouts) => {
    return workouts.reduce((groups, workout) => {
      const date = workout.date;
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(workout);
      return groups;
    }, {});
  };

  // Memoized filtering and sorting for performance
  const { sortedWorkouts, groupedWorkouts } = useMemo(() => {
    // Apply client-side filtering
    const filtered = workouts.filter(workout => {
      // Filter by exercise name
      if (filters.exercise && !workout.exercise.toLowerCase().includes(filters.exercise.toLowerCase())) {
        return false;
      }
      
      // Filter by date range
      const workoutDate = new Date(workout.date);
      const startDate = new Date(filters.startDate);
      const endDate = new Date(filters.endDate);
      
      if (workoutDate < startDate || workoutDate > endDate) {
        return false;
      }
      
      return true;
    });

    // Sort workouts
    const sorted = [...filtered].sort((a, b) => {
      const direction = filters.sortDirection === 'asc' ? 1 : -1;
      
      switch (filters.sortBy) {
        case 'Date':
          return direction * (new Date(b.date) - new Date(a.date));
        case 'Exercise':
          return direction * a.exercise.localeCompare(b.exercise);
        case 'Weight':
          return direction * (b.weight - a.weight);
        default:
          return 0;
      }
    });

    const grouped = groupWorkoutsByDate(sorted);

    return {
      sortedWorkouts: sorted,
      groupedWorkouts: grouped
    };
  }, [workouts, filters]);

  return (
    <div className="bg-blue-primary rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl section-header">Workout History</h2>
        <div className="flex items-center space-x-4">
          <p className="text-sm text-white">
            Showing {sortedWorkouts.length} of {workouts.length} workouts
          </p>
          {workouts.length > 0 && (
            <button
              onClick={handleResetAllWorkouts}
              disabled={isResetting}
              className={`bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors ${
                isResetting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              title="Development mode: Reset all workouts"
            >
              {isResetting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Resetting...
                </span>
              ) : (
                '🗑️ Reset All'
              )}
            </button>
          )}
        </div>
      </div>
      
      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Start Date
            </label>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white mb-1">
              End Date
            </label>
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Exercise
            </label>
            <input
              type="text"
              name="exercise"
              value={filters.exercise}
              onChange={handleFilterChange}
              placeholder="Filter by exercise"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-white mb-1">
              Sort By
            </label>
            <div className="flex space-x-2">
              <select
                name="sortBy"
                value={filters.sortBy}
                onChange={handleFilterChange}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Date">Date</option>
                <option value="Exercise">Exercise</option>
                <option value="Weight">Weight</option>
              </select>
              <button
                onClick={() => setFilters(prev => ({ 
                  ...prev, 
                  sortDirection: prev.sortDirection === 'asc' ? 'desc' : 'asc' 
                }))}
                className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                title={`Sort ${filters.sortDirection === 'asc' ? 'descending' : 'ascending'}`}
              >
                {filters.sortDirection === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Workout List */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">Loading workouts...</p>
        </div>
      ) : sortedWorkouts.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedWorkouts).map(([date, dateWorkouts]) => (
            <div key={date} className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-3 text-white">
                {format(new Date(date), 'EEEE, MMMM d, yyyy')}
              </h3>
              <div className="space-y-2">
                {dateWorkouts.map((workout) => (
                  <div 
                    key={workout.id} 
                    className="bg-gray-50 p-4 rounded-lg flex justify-between items-center hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{workout.exercise}</h4>
                      <p className="text-sm text-gray-600">
                        {workout.sets} sets × {workout.reps} reps @ {workout.weight} lbs
                      </p>
                      {workout.notes && (
                        <p className="text-sm text-gray-500 mt-1">{workout.notes}</p>
                      )}
                    </div>
                      <div className="flex items-center justify-between sm:justify-end space-x-3 sm:space-x-4 flex-shrink-0">
                        <div className="text-left sm:text-right order-2 sm:order-1">
                          <p className="text-xs sm:text-sm text-gray-500">
                            Total: {workout.sets * workout.reps * workout.weight} lbs
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteWorkout(workout.id)}
                          disabled={isDeleting === workout.id}
                          className={`text-red-600 hover:text-red-800 active:text-red-900 transition-colors touch-manipulation p-1 rounded order-1 sm:order-2 ${
                            isDeleting === workout.id ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          title="Delete workout"
                        >
                          {isDeleting === workout.id ? (
                            <span className="text-sm">Deleting...</span>
                          ) : (
                            <svg className="w-5 h-5 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {pagination.hasMore && (
            <div className="flex justify-center mt-4 sm:mt-6">
              <button
                onClick={handleLoadMore}
                disabled={isLoading}
                className="bg-blue-600 text-white py-3 sm:py-2 px-4 sm:px-6 rounded-lg sm:rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation font-medium text-base"
                style={{ minHeight: '52px' }}
              >
                Load More
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex justify-center items-center h-48 sm:h-64">
          <div className="text-center px-4">
            <p className="text-gray-300 text-base sm:text-lg">
              {workouts.length === 0 
                ? "No workouts found. Start logging your workouts!" 
                : "No workouts match your filters. Try adjusting your search criteria."}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutHistory;