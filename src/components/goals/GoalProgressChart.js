import React, { useState, useEffect } from 'react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import axios from 'axios';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';

const GoalProgressChart = ({ goals }) => {
  const [chartData, setChartData] = useState([]);
  const [selectedGoalId, setSelectedGoalId] = useState('all');
  const [timeRange, setTimeRange] = useState(30); // days
  const [isLoading, setIsLoading] = useState(false);
  const [progressData, setProgressData] = useState([]);

  useEffect(() => {
    if (goals && goals.length > 0) {
      fetchProgressData();
    }
  }, [goals, selectedGoalId, timeRange]);

  const fetchProgressData = async () => {
    try {
      setIsLoading(true);
      
      // Get progress records from the API
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/get-goal-progress`, {
        params: {
          goalId: selectedGoalId === 'all' ? undefined : selectedGoalId,
          days: timeRange
        }
      });

      if (response.data.success) {
        setProgressData(response.data.data || []);
        generateChartData(response.data.data || []);
      }
    } catch (error) {
      console.log('No progress API endpoint found, using simulated data');
      // If API doesn't exist yet, generate simulated progress data
      generateSimulatedData();
    } finally {
      setIsLoading(false);
    }
  };

  const generateSimulatedData = () => {
    // Generate simulated progress data based on current goal values
    const activeGoals = goals.filter(g => g.status === 'Active');
    const dataPoints = [];
    
    for (let i = timeRange; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'MM/dd');
      const dataPoint = { date };
      
      activeGoals.forEach(goal => {
        // Simulate gradual progress
        const progressRate = goal.progressPercentage / timeRange;
        const simulatedProgress = Math.max(0, goal.progressPercentage - (progressRate * i));
        dataPoint[goal.goalTitle || `Goal ${goal.id}`] = parseFloat(simulatedProgress.toFixed(1));
      });
      
      dataPoints.push(dataPoint);
    }
    
    setChartData(dataPoints);
  };

  const generateChartData = (progressRecords) => {
    // Group progress records by date and goal
    const dataByDate = {};
    const today = new Date();
    
    // Initialize data points for each day in the range
    for (let i = timeRange; i >= 0; i--) {
      const date = format(subDays(today, i), 'MM/dd');
      dataByDate[date] = { date };
    }
    
    // Fill in progress data
    progressRecords.forEach(record => {
      const date = format(new Date(record.date), 'MM/dd');
      const goalName = record.goalTitle || `Goal ${record.goalId}`;
      
      if (dataByDate[date]) {
        dataByDate[date][goalName] = record.progressPercentage;
      }
    });
    
    // Convert to array and fill forward missing values
    const dataArray = Object.values(dataByDate);
    const goalNames = [...new Set(progressRecords.map(r => r.goalTitle || `Goal ${r.goalId}`))];
    
    // Fill forward strategy: carry forward the last known value
    goalNames.forEach(goalName => {
      let lastValue = 0;
      dataArray.forEach(point => {
        if (point[goalName] !== undefined) {
          lastValue = point[goalName];
        } else {
          point[goalName] = lastValue;
        }
      });
    });
    
    setChartData(dataArray);
  };

  const activeGoals = goals.filter(g => g.status === 'Active');
  const chartGoals = selectedGoalId === 'all' 
    ? activeGoals 
    : activeGoals.filter(g => g.id === selectedGoalId);

  const colors = [
    '#3B82F6', // blue
    '#10B981', // green
    '#F59E0B', // amber
    '#EF4444', // red
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#14B8A6', // teal
    '#F97316'  // orange
  ];

  if (isLoading) {
    return (
      <div className="bg-blue-primary rounded-lg shadow-md p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (activeGoals.length === 0) {
    return (
      <div className="bg-blue-primary rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Goal Progress Over Time</h3>
        <div className="text-center py-8">
          <p className="text-gray-200">No active goals to display progress for.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-primary rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-white">Goal Progress Over Time</h3>
        
        <div className="flex space-x-4">
          <select
            value={selectedGoalId}
            onChange={(e) => setSelectedGoalId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm"
          >
            <option value="all">All Active Goals</option>
            {activeGoals.map(goal => (
              <option key={goal.id} value={goal.id}>
                {goal.goalTitle || `${goal.goalType} Goal`}
              </option>
            ))}
          </select>
          
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-black text-sm"
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
            <option value={60}>Last 60 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>
      
      {chartData.length > 0 ? (
        <div className="bg-white rounded-lg p-4">
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="date" 
                stroke="#666"
                tick={{ fontSize: 12 }}
              />
              <YAxis 
                stroke="#666"
                tick={{ fontSize: 12 }}
                domain={[0, 100]}
                ticks={[0, 25, 50, 75, 100]}
                label={{ value: 'Progress %', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  border: '1px solid #ccc',
                  borderRadius: '4px'
                }}
                formatter={(value) => `${value}%`}
              />
              <Legend 
                wrapperStyle={{ paddingTop: '20px' }}
                iconType="line"
              />
              
              {/* Reference lines for milestones */}
              <line x1="0" y1="25%" x2="100%" y2="25%" stroke="#e5e7eb" strokeDasharray="3 3" />
              <line x1="0" y1="50%" x2="100%" y2="50%" stroke="#e5e7eb" strokeDasharray="3 3" />
              <line x1="0" y1="75%" x2="100%" y2="75%" stroke="#e5e7eb" strokeDasharray="3 3" />
              
              {chartGoals.map((goal, index) => {
                const goalName = goal.goalTitle || `${goal.goalType} Goal`;
                return (
                  <Area
                    key={goal.id}
                    type="monotone"
                    dataKey={goalName}
                    stroke={colors[index % colors.length]}
                    fill={colors[index % colors.length]}
                    fillOpacity={0.2}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                    activeDot={{ r: 5 }}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
          
          {/* Legend with current values */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
            {chartGoals.map((goal, index) => (
              <div key={goal.id} className="flex items-center space-x-2">
                <div 
                  className="w-4 h-4 rounded"
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <div className="text-sm">
                  <span className="font-medium text-gray-700">
                    {goal.goalTitle || `${goal.goalType} Goal`}
                  </span>
                  <span className="text-gray-500 ml-2">
                    {goal.progressPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg p-8 text-center">
          <p className="text-gray-500">No progress data available for the selected time range.</p>
        </div>
      )}
      
      {/* Progress Summary */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white bg-opacity-10 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-200 mb-1">Active Goals</h4>
          <p className="text-2xl font-bold text-white">{activeGoals.length}</p>
        </div>
        
        <div className="bg-white bg-opacity-10 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-200 mb-1">Average Progress</h4>
          <p className="text-2xl font-bold text-white">
            {activeGoals.length > 0 
              ? (activeGoals.reduce((sum, g) => sum + g.progressPercentage, 0) / activeGoals.length).toFixed(1)
              : 0}%
          </p>
        </div>
        
        <div className="bg-white bg-opacity-10 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-200 mb-1">Goals Near Completion</h4>
          <p className="text-2xl font-bold text-white">
            {activeGoals.filter(g => g.progressPercentage >= 75).length}
          </p>
        </div>
      </div>
    </div>
  );
};

export default GoalProgressChart;