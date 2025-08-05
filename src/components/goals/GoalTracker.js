import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import axios from 'axios';
import CelebrationSystem, { useCelebration, celebrateMilestone, celebrateGoalCompletion } from '../common/CelebrationSystem';

const GoalTracker = ({ onUpdateGoal, refreshTrigger = 0 }) => {
  const [goals, setGoals] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('Active');
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [progressValue, setProgressValue] = useState('');
  const [progressNotes, setProgressNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isRefreshingAll, setIsRefreshingAll] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const { celebration, celebrate, closeCelebration } = useCelebration();

  const fetchGoals = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/goals`, {
        params: {
          status: 'all', // Always fetch all goals, we'll filter in the component
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
  }, []);

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
        const updatedGoal = goals.find(g => g.id === goalId);
        const oldProgressPercentage = updatedGoal?.progressPercentage || 0;
        const newProgressPercentage = response.data.data.goalProgress || 0;
        const isCompleted = response.data.data.status === 'Completed';
        
        // Update the goal with new values
        setGoals(prevGoals => 
          prevGoals.map(goal => 
            goal.id === goalId ? {
              ...goal,
              currentValue: response.data.data.currentValue,
              progressPercentage: newProgressPercentage,
              status: response.data.data.status
            } : goal
          )
        );
        
        setSelectedGoal(null);
        setProgressValue('');
        setProgressNotes('');
        
        // Check for milestone achievements
        const milestones = [25, 50, 75, 100];
        const passedMilestone = milestones.find(milestone => 
          oldProgressPercentage < milestone && newProgressPercentage >= milestone
        );
        
        if (passedMilestone) {
          if (passedMilestone === 100 || isCompleted) {
            // Goal completed celebration
            const celebrationData = celebrateGoalCompletion(
              updatedGoal.goalTitle, 
              Math.abs(new Date(updatedGoal.targetDate) - new Date(updatedGoal.createdDate)) / (1000 * 60 * 60 * 24)
            );
            celebrate(celebrationData.type, celebrationData.data);
            
            // The goal will automatically disappear from active view due to filtering
            // No need to manually remove it since it's now archived
          } else {
            // Milestone celebration
            const celebrationData = celebrateMilestone(
              updatedGoal.goalTitle,
              passedMilestone,
              newProgressPercentage
            );
            celebrate(celebrationData.type, celebrationData.data);
          }
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

  const handleArchiveGoal = async (goalId) => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/archive-completed-goals`, {
        goalId
      });
      
      if (response.data.success) {
        fetchGoals(); // Refresh the list
        alert('Goal archived successfully!');
      }
    } catch (error) {
      console.error('Failed to archive goal:', error);
      alert(error.response?.data?.error || 'Failed to archive goal');
    }
  };

  const handleRefreshAllGoals = async () => {
    try {
      setIsRefreshingAll(true);
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/calculate-goal-progress`);
      
      if (response.data.success) {
        // Refresh the goals list to show updated progress
        await fetchGoals();
        console.log('Goal progress refreshed:', response.data);
      }
    } catch (error) {
      console.error('Failed to refresh goal progress:', error);
      alert('Failed to refresh goal progress. Please try again.');
    } finally {
      setIsRefreshingAll(false);
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

  const filteredGoals = goals.filter(goal => {
    if (showArchived) {
      return goal.status === 'Archived';
    }
    if (filter === 'all') {
      return goal.status !== 'Archived';
    }
    return goal.status === filter && goal.status !== 'Archived';
  });

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
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-gray-900">
            {showArchived ? 'Archived Goals' : 'Goal Tracker'}
          </h2>
          
          <div className="flex items-center space-x-4">
            {/* Archive Toggle */}
            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`px-3 py-2 rounded-md text-sm font-medium flex items-center space-x-2 ${
                showArchived 
                  ? 'bg-gray-600 text-white hover:bg-gray-700' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
              <span>{showArchived ? 'View Active' : 'View Archived'}</span>
            </button>

            {/* Refresh Button - only show for active goals */}
            {!showArchived && (
              <button
                onClick={handleRefreshAllGoals}
                disabled={isRefreshingAll}
                className="px-3 py-2 bg-green-100 text-green-700 rounded-md text-sm font-medium hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1"
              >
                <span>{isRefreshingAll ? 'Refreshing...' : 'Refresh Progress'}</span>
              </button>
            )}

            {/* Filter Tabs - only show for active goals */}
            {!showArchived && (
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
            )}
          </div>
        </div>

        {/* Archived Goals Info */}
        {showArchived && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-600">
              These are your completed goals that have been automatically archived. 
              You can review your past achievements and the progress you made.
            </p>
          </div>
        )}
      </div>

      {filteredGoals.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">
            {showArchived 
              ? 'No archived goals yet.' 
              : `No ${filter.toLowerCase()} goals found.`}
          </p>
          <p className="text-gray-400 text-sm mt-2">
            {showArchived 
              ? 'Completed goals will appear here automatically.' 
              : 'Create your first goal to get started!'}
          </p>
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
                      {showArchived ? (
                        <>
                          <span>• Completed: {goal.completionDate ? format(new Date(goal.completionDate), 'MMM dd, yyyy') : 'N/A'}</span>
                          <span className="text-green-600">• Achieved: {goal.currentValue} / {goal.targetValue}</span>
                        </>
                      ) : (
                        <>
                          <span>• Target: {format(new Date(goal.targetDate), 'MMM dd, yyyy')}</span>
                          <span className={`• ${daysStatus.color}`}>{daysStatus.text}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {!showArchived && goal.status === 'Active' && (
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
                  
                  {!showArchived && goal.status === 'Paused' && (
                    <button
                      onClick={() => handleStatusChange(goal.id, 'Active')}
                      className="px-3 py-1 bg-green-100 text-green-700 rounded-md text-sm hover:bg-green-200"
                    >
                      Resume
                    </button>
                  )}
                  
                  {!showArchived && goal.status === 'Completed' && (
                    <button
                      onClick={() => handleArchiveGoal(goal.id)}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md text-sm hover:bg-gray-200 flex items-center space-x-1"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      <span>Archive</span>
                    </button>
                  )}
                  
                  {showArchived && (
                    <div className="flex items-center space-x-2 text-sm text-green-600">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium">Goal Achieved!</span>
                    </div>
                  )}
                </div>

                {/* Progress Bar with Milestone Indicators */}
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Progress: {goal.currentValue} / {goal.targetValue}</span>
                    <span>{progressPercentage.toFixed(1)}%</span>
                  </div>
                  
                  {/* Progress Bar with Milestone Markers */}
                  <div className="relative w-full bg-gray-200 rounded-full h-3">
                    {/* Milestone Markers */}
                    {[25, 50, 75].map(milestone => (
                      <div
                        key={milestone}
                        className={`absolute top-0 w-0.5 h-3 ${
                          progressPercentage >= milestone ? 'bg-white' : 'bg-gray-400'
                        }`}
                        style={{ left: `${milestone}%` }}
                        title={`${milestone}% milestone`}
                      />
                    ))}
                    
                    {/* Progress Fill */}
                    <div
                      className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(progressPercentage)} relative overflow-hidden`}
                      style={{ width: `${Math.min(progressPercentage, 100)}%` }}
                    >
                      {/* Milestone Achievement Glow */}
                      {[25, 50, 75, 100].map(milestone => 
                        progressPercentage >= milestone && (
                          <div
                            key={milestone}
                            className="absolute inset-0 bg-white opacity-20 animate-pulse"
                          />
                        )
                      )}
                    </div>
                  </div>
                  
                  {/* Milestone Status */}
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    {[25, 50, 75, 100].map(milestone => (
                      <span 
                        key={milestone}
                        className={`${
                          progressPercentage >= milestone 
                            ? 'text-green-600 font-medium' 
                            : 'text-gray-400'
                        }`}
                      >
                        {progressPercentage >= milestone ? '✓' : ''} {milestone}%
                      </span>
                    ))}
                  </div>
                </div>

                {/* Progress Update Form - only for active goals */}
                {!showArchived && selectedGoal === goal.id && (
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

      {/* Celebration System */}
      {celebration && (
        <CelebrationSystem
          show={celebration.show}
          type={celebration.type}
          data={celebration.data}
          onClose={closeCelebration}
          duration={celebration.duration}
        />
      )}
    </div>
  );
};

export default GoalTracker;