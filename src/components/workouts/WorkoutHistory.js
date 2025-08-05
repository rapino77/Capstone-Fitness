import React, { useState, useEffect, useCallback, useRef } from 'react';
import { format, subDays } from 'date-fns';
import axios from 'axios';

const WorkoutHistory = () => {
  const [workouts, setWorkouts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
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

  const fetchWorkouts = useCallback(async (resetOffset = false) => {
    if (isFetching.current) return; // Prevent multiple simultaneous fetches
    
    try {
      isFetching.current = true;
      setIsLoading(true);
      const offset = resetOffset ? 0 : pagination.offset;
      
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/get-workouts`, {
        params: {
          ...filters,
          offset,
          limit: pagination.limit
        }
      });
      
      if (response.data.success) {
        setWorkouts(response.data.data);
        setPagination({
          ...pagination,
          ...response.data.pagination,
          offset: resetOffset ? 0 : pagination.offset
        });
      }
    } catch (error) {
      console.error('Failed to fetch workouts:', error);
    } finally {
      setIsLoading(false);
      isFetching.current = false;
    }
  }, [filters, pagination.limit]); // Only depend on limit, not entire pagination object

  useEffect(() => {
    fetchWorkouts(true);
  }, [filters, fetchWorkouts]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleLoadMore = () => {
    const newOffset = pagination.offset + pagination.limit;
    setPagination(prev => ({ ...prev, offset: newOffset }));
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

  const groupedWorkouts = groupWorkoutsByDate(workouts);

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Workout History</h2>
      
      {/* Filters */}
      <div className="mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sort By
            </label>
            <select
              name="sortBy"
              value={filters.sortBy}
              onChange={handleFilterChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Date">Date</option>
              <option value="Exercise">Exercise</option>
              <option value="Weight">Weight</option>
            </select>
          </div>
        </div>
      </div>

      {/* Workout List */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">Loading workouts...</p>
        </div>
      ) : workouts.length > 0 ? (
        <div className="space-y-6">
          {Object.entries(groupedWorkouts).map(([date, dateWorkouts]) => (
            <div key={date} className="border-b pb-4">
              <h3 className="text-lg font-semibold mb-3 text-gray-700">
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
                    <div className="text-right">
                      <p className="text-sm text-gray-500">
                        Total Volume: {workout.sets * workout.reps * workout.weight} lbs
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {pagination.hasMore && (
            <div className="flex justify-center mt-6">
              <button
                onClick={handleLoadMore}
                disabled={isLoading}
                className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">No workouts found. Start logging your workouts!</p>
        </div>
      )}
    </div>
  );
};

export default WorkoutHistory;