import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import axios from 'axios';

const GoalTracker = ({ onUpdateGoal, refreshTrigger = 0 }) => {
  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('Active');
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [progressValue, setProgressValue] = useState('');
  const [progressNotes, setProgressNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchGoals = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/goals`, {
        params: {
          status: filter,
          sortBy: 'Created Date',
          sortDirection: 'desc'
        }
      });
      
      if (response.data.success) {
        setGoals(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch goals:', error);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals, refreshTrigger]);


  const handleProgressUpdate = async (goalId) => {
    if (!progressValue || progressValue === '') return;

    try {
      setIsUpdating(true);
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/update-goal-progress`, {
        goalId,
        progressValue: Number(progressValue),
        notes: progressNotes
      });
      
      if (response.data.success) {
        // Update local state with new goal data
        setGoals(prevGoals => 
          prevGoals.map(goal => 
            goal.id === goalId ? {
              ...goal,
              currentValue: response.data.data.currentValue,
              progressPercentage: response.data.data.goalProgress,
              status: response.data.data.status
            } : goal
          )
        );
        
        setSelectedGoal(null);
        setProgressValue('');
        setProgressNotes('');
        
        if (response.data.data.completed) {
          // Show completion celebration
          alert(`🏆 Congratulations! Goal completed successfully!`);
        }

        if (onUpdateGoal) onUpdateGoal();
        
        // Refresh goals to get updated data
        fetchGoals();
      }
    } catch (error) {
      console.error('Failed to update progress:', error);
      alert('Failed to update progress. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = async (goalId, newStatus) => {
    try {
      const response = await axios.put(`${process.env.REACT_APP_API_URL}/goals/${goalId}`, {
        status: newStatus
      });
      
      if (response.data.success) {
        fetchGoals(); // Refresh the list
        if (onUpdateGoal) onUpdateGoal(response.data.data);
      }
    } catch (error) {
      console.error('Failed to update goal status:', error);
    }
  };

  const getProgressColor = (percentage) => {
    if (percentage >= 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    if (percentage >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Completed': return 'bg-blue-100 text-blue-800';
      case 'Paused': return 'bg-yellow-100 text-yellow-800';
      case 'Cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'text-red-600';
      case 'Medium': return 'text-yellow-600';
      case 'Low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const getDaysRemainingStatus = (daysRemaining) => {
    if (daysRemaining < 0) return { text: 'Overdue', color: 'text-red-600' };
    if (daysRemaining <= 7) return { text: `${daysRemaining} days left`, color: 'text-red-600' };
    if (daysRemaining <= 30) return { text: `${daysRemaining} days left`, color: 'text-yellow-600' };
    return { text: `${daysRemaining} days left`, color: 'text-gray-600' };
  };

  const filteredGoals = goals.filter(goal => 
    filter === 'all' || goal.status === filter
  );

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-center items-center h-64">
          <p className="text-gray-500">Loading goals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Goal Tracker</h2>
        
        {/* Filter Tabs */}
        <div className="flex space-x-1">
          {['Active', 'Completed', 'Paused', 'all'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-3 py-1 rounded-md text-sm font-medium ${
                filter === status
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {status === 'all' ? 'All' : status}
            </button>
          ))}
        </div>
      </div>

      {filteredGoals.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No {filter.toLowerCase()} goals found.</p>
          <p className="text-gray-400 text-sm mt-2">Create your first goal to get started!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGoals.map((goal) => {
            const progressPercentage = Math.min((goal.currentValue / goal.targetValue) * 100, 100);
            const daysStatus = getDaysRemainingStatus(goal.daysRemaining);
            
            return (
              <div key={goal.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900">{goal.goalTitle}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(goal.status)}`}>
                        {goal.status}
                      </span>
                      <span className={`text-sm font-medium ${getPriorityColor(goal.priority)}`}>
                        {goal.priority} Priority
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-600 mb-2">
                      <span>{goal.goalType}</span>
                      {goal.exerciseName && <span>• {goal.exerciseName}</span>}
                      <span>• Target: {format(new Date(goal.targetDate), 'MMM dd, yyyy')}</span>
                      <span className={`• ${daysStatus.color}`}>{daysStatus.text}</span>
                    </div>
                  </div>
                  
                  {goal.status === 'Active' && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedGoal(selectedGoal === goal.id ? null : goal.id)}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-md text-sm hover:bg-blue-200"
                      >
                        Update Progress
                      </button>
                      <button
                        onClick={() => handleStatusChange(goal.id, 'Paused')}
                        className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-md text-sm hover:bg-yellow-200"
                      >
                        Pause
                      </button>
                    </div>
                  )}
                  
                  {goal.status === 'Paused' && (
                    <button
                      onClick={() => handleStatusChange(goal.id, 'Active')}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200"
                    >
                      Resume
                    </button>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Progress: {goal.currentValue} / {goal.targetValue}</span>
                    <span>{progressPercentage.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progressPercentage)}`}
                      style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Progress Update Form */}
                {selectedGoal === goal.id && (
                  <div className="bg-gray-50 rounded-md p-4 mt-3">
                    <h4 className="font-medium text-gray-900 mb-3">Update Progress</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          New Progress Value
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={progressValue}
                          onChange={(e) => setProgressValue(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder={`Current: ${goal.currentValue}`}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notes (Optional)
                        </label>
                        <input
                          type="text"
                          value={progressNotes}
                          onChange={(e) => setProgressNotes(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="How did you achieve this progress?"
                        />
                      </div>
                    </div>
                    <div className="flex space-x-3 mt-4">
                      <button
                        onClick={() => handleProgressUpdate(goal.id)}
                        disabled={isUpdating || !progressValue}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isUpdating ? 'Updating...' : 'Update Progress'}
                      </button>
                      <button
                        onClick={() => {
                          setSelectedGoal(null);
                          setProgressValue('');
                          setProgressNotes('');
                        }}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Goal Notes */}
                {goal.notes && (
                  <div className="mt-3 text-sm text-gray-600">
                    <p><span className="font-medium">Notes:</span> {goal.notes}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GoalTracker;