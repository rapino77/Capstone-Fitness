import React, { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
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
  ComposedChart,
  Area
} from 'recharts';
import { useTheme } from '../../context/ThemeContext';
import WeightEntriesTable from './WeightEntriesTable';

const WeightLogger = () => {
  const { theme } = useTheme();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });
  const [weightData, setWeightData] = useState([]);
  const [allWeightEntries, setAllWeightEntries] = useState([]);
  const [correlationData, setCorrelationData] = useState(null);
  const [stats, setStats] = useState({
    current: 0,
    highest: 0,
    lowest: 0,
    average: 0,
    change7Day: 0,
    change30Day: 0,
    change90Day: 0,
    trends: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState('chart'); // 'chart', 'table', 'correlation'
  const [isResetting, setIsResetting] = useState(false);
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      unit: 'lbs'
    }
  });

  const fetchWeightData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch chart data
      const chartResponse = await axios.get(`${process.env.REACT_APP_API_URL}/get-weights`, {
        params: { chartData: 'true' }
      });
      
      // Fetch all weight entries for table view
      const allResponse = await axios.get(`${process.env.REACT_APP_API_URL}/get-weights`);
      
      if (chartResponse.data.success) {
        // Filter out invalid data entries for chart
        const validData = (chartResponse.data.data || []).filter(entry => {
          return entry && 
                 entry.weight && 
                 !isNaN(Number(entry.weight)) && 
                 entry.date && 
                 !isNaN(new Date(entry.date).getTime());
        });
        
        console.log('Filtered weight data:', validData);
        console.log('Received stats:', chartResponse.data.stats);
        console.log('=== FRONTEND DEBUGGING ===');
        console.log('Stats highest value:', chartResponse.data.stats?.highest);
        console.log('Stats lowest value:', chartResponse.data.stats?.lowest);
        console.log('All weights in frontend data:', validData.map(d => d.weight).sort((a, b) => b - a));
        console.log('=== END FRONTEND DEBUGGING ===');
        setWeightData(validData);
        setStats(chartResponse.data.stats || {});
      }

      if (allResponse.data.success) {
        // Set all weight entries for table view
        const allEntries = (allResponse.data.data || []).filter(entry => {
          return entry && entry.weight && entry.date;
        });
        
        console.log('All weight entries:', allEntries);
        setAllWeightEntries(allEntries);
      }
    } catch (error) {
      console.error('Failed to fetch weight data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCorrelationData = useCallback(async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/get-weight-performance-correlation`);
      
      if (response.data.success) {
        setCorrelationData(response.data.data);
      } else {
        // Set empty correlation data to show appropriate message
        setCorrelationData({
          weightData: [],
          performanceData: [],
          correlation: { coefficient: 0, strength: 'no_data', dataPoints: 0 },
          combinedData: [],
          insights: [{
            type: 'info',
            title: 'No Data Available',
            message: 'Start logging weight and workouts to see correlation analysis.',
            priority: 'low'
          }],
          summary: {
            weightDataPoints: 0,
            performanceDataPoints: 0,
            alignedDataPoints: 0
          }
        });
      }
    } catch (error) {
      console.error('Failed to fetch correlation data:', error);
      
      // Set error state with helpful message
      setCorrelationData({
        weightData: [],
        performanceData: [],
        correlation: { coefficient: 0, strength: 'error', dataPoints: 0 },
        combinedData: [],
        insights: [{
          type: 'warning',
          title: 'Unable to Load Correlation Data',
          message: 'There was an error loading the correlation analysis. This feature requires both weight and workout data.',
          priority: 'medium'
        }],
        summary: {
          weightDataPoints: 0,
          performanceDataPoints: 0,
          alignedDataPoints: 0
        }
      });
    }
  }, []); // No dependencies needed for this function

  useEffect(() => {
    fetchWeightData();
    fetchCorrelationData();
  }, [fetchCorrelationData]);

  // Refetch correlation data when weight data changes (after logging new weight)
  useEffect(() => {
    if (!isLoading && weightData.length > 0 && viewMode === 'correlation') {
      fetchCorrelationData();
    }
  }, [isLoading, weightData.length, viewMode, fetchCorrelationData]); // Include all dependencies

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setSubmitMessage({ type: '', text: '' });

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/log-weight`, data);
      
      if (response.data.success) {
        setSubmitMessage({ type: 'success', text: 'Weight logged successfully! Body weight goals updated automatically.' });
        reset({ ...data, weight: '' });
        fetchWeightData(); // Refresh all weight data
        
        // Refresh correlation data if we're viewing it
        if (viewMode === 'correlation') {
          fetchCorrelationData();
        }
        
        // Note: Body weight goals are automatically updated by the log-weight function
        console.log('Weight logged successfully. Body weight goals should be updated automatically.');
      }
    } catch (error) {
      setSubmitMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to log weight' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetWeights = async () => {
    const confirmation = window.confirm(
      '⚠️ WARNING: This will permanently delete ALL weight entries!\n\n' +
      'This action cannot be undone. Are you absolutely sure you want to reset all weight data?'
    );

    if (!confirmation) return;

    const doubleConfirmation = window.confirm(
      '🚨 FINAL CONFIRMATION 🚨\n\n' +
      'You are about to delete ALL weight history permanently.\n\n' +
      'Type "DELETE" in the next prompt to confirm this irreversible action.'
    );

    if (!doubleConfirmation) return;

    const finalConfirmation = window.prompt(
      'Type "DELETE" exactly (all caps) to confirm deletion of all weight entries:'
    );

    if (finalConfirmation !== 'DELETE') {
      alert('Reset cancelled. Weight entries were not deleted.');
      return;
    }

    setIsResetting(true);
    try {
      const response = await axios.delete(`${process.env.REACT_APP_API_URL}/reset-weights`);
      
      if (response.data.success) {
        setSubmitMessage({ 
          type: 'success', 
          text: `Successfully deleted ${response.data.deletedCount} weight entries. All weight data has been reset.` 
        });
        
        // Clear all local state
        setWeightData([]);
        setAllWeightEntries([]);
        setStats({
          current: 0,
          highest: 0,
          lowest: 0,
          average: 0,
          change7Day: 0,
          change30Day: 0,
          change90Day: 0,
          trends: null
        });
        
        // Refresh data to confirm deletion
        setTimeout(() => {
          fetchWeightData();
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to reset weight entries:', error);
      setSubmitMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to reset weight entries. Please try again.' 
      });
    } finally {
      setIsResetting(false);
    }
  };

  const formatXAxis = (tickItem) => {
    try {
      if (!tickItem) return '';
      const date = new Date(tickItem);
      if (isNaN(date.getTime())) return '';
      return format(date, 'MM/dd');
    } catch (error) {
      console.warn('Invalid date in formatXAxis:', tickItem);
      return '';
    }
  };

  const formatTooltipDate = (value) => {
    try {
      if (!value) return '';
      const date = new Date(value);
      if (isNaN(date.getTime())) return '';
      return format(date, 'MMM dd, yyyy');
    } catch (error) {
      console.warn('Invalid date in formatTooltipDate:', value);
      return '';
    }
  };

  return (
    <div className="space-y-6">
      <div 
        className="rounded-lg shadow-sm p-6 border transition-colors duration-200"
        style={{
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.border
        }}
      >
        <h2 
          className="text-2xl font-bold mb-6 transition-colors duration-200"
          style={{ color: theme.colors.text }}
        >
          Log Body Weight
        </h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label 
                className="block text-sm font-medium mb-1 transition-colors duration-200"
                style={{ color: theme.colors.text }}
              >
                Weight
              </label>
              <input
                type="number"
                step="0.1"
                {...register('weight', { 
                  required: 'Weight is required',
                  min: { value: 1, message: 'Weight must be positive' },
                  max: { value: 1000, message: 'Weight seems too high' }
                })}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 transition-all duration-200"
                style={{
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                  '--tw-ring-color': theme.colors.primary
                }}
                placeholder="Enter weight"
              />
              {errors.weight && (
                <p className="mt-1 text-sm text-red-600">{errors.weight.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit
              </label>
              <select
                {...register('unit')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="lbs">Pounds (lbs)</option>
                <option value="kg">Kilograms (kg)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date
            </label>
            <input
              type="date"
              {...register('date', { 
                required: 'Date is required',
                validate: value => new Date(value) <= new Date() || 'Date cannot be in the future'
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.date && (
              <p className="mt-1 text-sm text-red-600">{errors.date.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              {...register('notes')}
              rows="2"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any notes about your weight..."
            />
          </div>

          {submitMessage.text && (
            <div className={`p-4 rounded-md ${
              submitMessage.type === 'success' 
                ? 'bg-green-50 text-green-800' 
                : 'bg-red-50 text-red-800'
            }`}>
              {submitMessage.text}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Logging...' : 'Log Weight'}
          </button>
        </form>
      </div>

      {stats && (
        <div 
          className="rounded-lg shadow-sm p-6 border transition-colors duration-200"
          style={{
            backgroundColor: theme.colors.background,
            borderColor: theme.colors.border
          }}
        >
          <h3 
            className="text-xl font-bold mb-4 transition-colors duration-200"
            style={{ color: theme.colors.text }}
          >
            Weight Statistics
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div 
              className="p-4 rounded transition-colors duration-200"
              style={{ backgroundColor: theme.colors.backgroundTertiary }}
            >
              <p 
                className="text-sm font-medium transition-colors duration-200"
                style={{ color: theme.colors.textSecondary }}
              >
                Current Weight
              </p>
              <p 
                className="text-2xl font-bold transition-colors duration-200"
                style={{ color: theme.colors.primary }}
              >
                {stats.current?.toFixed(1) || '-'} lbs
              </p>
            </div>
            <div 
              className="p-4 rounded transition-colors duration-200"
              style={{ backgroundColor: theme.colors.backgroundTertiary }}
            >
              <p 
                className="text-sm font-medium transition-colors duration-200"
                style={{ color: theme.colors.textSecondary }}
              >
                7-Day Change
              </p>
              <p 
                className="text-2xl font-bold transition-colors duration-200"
                style={{ 
                  color: stats.change7Day > 0 ? theme.colors.error : stats.change7Day < 0 ? theme.colors.success : theme.colors.text
                }}
              >
                {stats.change7Day > 0 ? '+' : ''}{stats.change7Day?.toFixed(1) || '0'} lbs
              </p>
            </div>
            <div 
              className="p-4 rounded transition-colors duration-200"
              style={{ backgroundColor: theme.colors.backgroundTertiary }}
            >
              <p 
                className="text-sm font-medium transition-colors duration-200"
                style={{ color: theme.colors.textSecondary }}
              >
                30-Day Change
              </p>
              <p 
                className="text-2xl font-bold transition-colors duration-200"
                style={{ 
                  color: stats.change30Day > 0 ? theme.colors.error : stats.change30Day < 0 ? theme.colors.success : theme.colors.text
                }}
              >
                {stats.change30Day > 0 ? '+' : ''}{stats.change30Day?.toFixed(1) || '0'} lbs
              </p>
            </div>
            <div 
              className="p-4 rounded transition-colors duration-200"
              style={{ backgroundColor: theme.colors.backgroundTertiary }}
            >
              <p 
                className="text-sm font-medium transition-colors duration-200"
                style={{ color: theme.colors.textSecondary }}
              >
                90-Day Change
              </p>
              <p 
                className="text-2xl font-bold transition-colors duration-200"
                style={{ 
                  color: stats.change90Day > 0 ? theme.colors.error : stats.change90Day < 0 ? theme.colors.success : theme.colors.text
                }}
              >
                {stats.change90Day > 0 ? '+' : ''}{stats.change90Day?.toFixed(1) || '0'} lbs
              </p>
            </div>
          </div>

          {/* Additional stats row */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div 
              className="p-4 rounded transition-colors duration-200"
              style={{ backgroundColor: theme.colors.backgroundTertiary }}
            >
              <p 
                className="text-sm font-medium transition-colors duration-200"
                style={{ color: theme.colors.textSecondary }}
              >
                Highest
              </p>
              <p 
                className="text-2xl font-bold transition-colors duration-200"
                style={{ color: theme.colors.text }}
              >
                {(stats.highest && stats.highest > 0) ? stats.highest.toFixed(1) : '-'} lbs
              </p>
            </div>
            <div 
              className="p-4 rounded transition-colors duration-200"
              style={{ backgroundColor: theme.colors.backgroundTertiary }}
            >
              <p 
                className="text-sm font-medium transition-colors duration-200"
                style={{ color: theme.colors.textSecondary }}
              >
                Lowest
              </p>
              <p 
                className="text-2xl font-bold transition-colors duration-200"
                style={{ color: theme.colors.text }}
              >
                {(stats.lowest && stats.lowest > 0) ? stats.lowest.toFixed(1) : '-'} lbs
              </p>
            </div>
          </div>

          {/* Weight Trends */}
          {stats.trends && (
            <div className="border-t pt-6">
              <h4 className="text-lg font-semibold mb-4">Weight Trends</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* 7-day trend */}
                <div className="bg-blue-50 p-4 rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-blue-800">7-Day Trend</p>
                      <p className="text-sm text-blue-600 capitalize">{stats.trends['7day']?.direction || 'No data'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-800">
                        {stats.trends['7day']?.rate > 0 ? '+' : ''}{stats.trends['7day']?.rate || 0} lbs/week
                      </p>
                      <p className="text-xs text-blue-600">
                        {stats.trends['7day']?.confidence || 0}% confidence
                      </p>
                    </div>
                  </div>
                </div>

                {/* 30-day trend */}
                <div className="bg-green-50 p-4 rounded">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-green-800">30-Day Trend</p>
                      <p className="text-sm text-green-600 capitalize">{stats.trends['30day']?.direction || 'No data'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-800">
                        {stats.trends['30day']?.rate > 0 ? '+' : ''}{stats.trends['30day']?.rate || 0} lbs/week
                      </p>
                      <p className="text-xs text-green-600">
                        {stats.trends['30day']?.confidence || 0}% confidence
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Weight Progress</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === 'chart'
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Chart View
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === 'table'
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => setViewMode('correlation')}
              className={`px-3 py-1 rounded text-sm ${
                viewMode === 'correlation'
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Weight vs Performance
            </button>
            <button
              onClick={handleResetWeights}
              disabled={isResetting || isLoading}
              className="px-3 py-1 rounded text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed border border-red-600"
              title="Reset all weight entries (permanent deletion)"
            >
              {isResetting ? 'Resetting...' : 'Reset All'}
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-gray-500">Loading data...</p>
          </div>
        ) : viewMode === 'chart' && weightData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={weightData}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke={theme.colors.chart.grid}
              />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatXAxis}
                stroke={theme.colors.textSecondary}
              />
              <YAxis 
                domain={['dataMin - 5', 'dataMax + 5']}
                label={{ 
                  value: 'Weight (lbs)', 
                  angle: -90, 
                  position: 'insideLeft',
                  style: { textAnchor: 'middle', fill: theme.colors.textSecondary }
                }}
                stroke={theme.colors.textSecondary}
              />
              <Tooltip 
                labelFormatter={formatTooltipDate}
                formatter={(value, name) => {
                  if (name === 'Weight') return [`${value} lbs`, name];
                  if (name === '7-Day Average') return [`${value} lbs`, name];
                  if (name === '30-Day Average') return [`${value} lbs`, name];
                  return [value, name];
                }}
                contentStyle={{
                  backgroundColor: theme.colors.background,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: '8px',
                  color: theme.colors.text
                }}
              />
              <Legend 
                wrapperStyle={{ color: theme.colors.text }}
              />
              <Line 
                type="monotone" 
                dataKey="weight" 
                stroke={theme.colors.chart.primary} 
                strokeWidth={2}
                dot={{ fill: theme.colors.chart.primary, strokeWidth: 2, r: 3 }}
                activeDot={{ r: 6, fill: theme.colors.chart.primary }}
                name="Weight"
              />
              {/* 7-day moving average */}
              <Line 
                type="monotone" 
                dataKey="ma7" 
                stroke={theme.colors.chart.tertiary} 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="7-Day Average"
              />
              {/* 30-day moving average */}
              <Line 
                type="monotone" 
                dataKey="ma30" 
                stroke={theme.colors.chart.quaternary} 
                strokeWidth={2}
                strokeDasharray="10 5"
                dot={false}
                name="30-Day Average"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : viewMode === 'table' ? (
          <WeightEntriesTable
            weightEntries={allWeightEntries}
            onUpdate={fetchWeightData}
            onDelete={fetchWeightData}
            isLoading={isLoading}
          />
        ) : viewMode === 'correlation' && correlationData ? (
          <div className="space-y-4">
            {/* Correlation Statistics */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Correlation Coefficient</p>
                  <p className={`text-2xl font-bold ${
                    correlationData.correlation?.strength === 'error' ? 'text-red-600' :
                    correlationData.correlation?.strength === 'no_data' ? 'text-gray-400' : 'text-blue-600'
                  }`}>
                    {correlationData.correlation?.strength === 'error' ? 'Error' :
                     correlationData.correlation?.strength === 'no_data' ? 'N/A' :
                     correlationData.correlation?.coefficient?.toFixed(3) || '0.000'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Relationship Strength</p>
                  <p className={`text-lg font-semibold capitalize ${
                    correlationData.correlation?.strength === 'error' ? 'text-red-600' :
                    correlationData.correlation?.strength === 'no_data' ? 'text-gray-400' : 'text-green-600'
                  }`}>
                    {correlationData.correlation?.strength === 'error' ? 'Error' :
                     correlationData.correlation?.strength === 'no_data' ? 'No Data' :
                     correlationData.correlation?.strength || 'Unknown'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Data Points</p>
                  <p className="text-2xl font-bold text-gray-700">
                    {correlationData.correlation?.dataPoints || 0}
                  </p>
                </div>
              </div>
            </div>

            {/* Combined Chart */}
            {correlationData.combinedData && correlationData.combinedData.length > 0 ? (
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart data={correlationData.combinedData}>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    stroke={theme.colors.chart.grid}
                  />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatXAxis}
                    stroke={theme.colors.textSecondary}
                  />
                  <YAxis 
                    yAxisId="weight" 
                    orientation="left" 
                    domain={['dataMin - 5', 'dataMax + 5']}
                    stroke={theme.colors.textSecondary}
                  />
                  <YAxis 
                    yAxisId="volume" 
                    orientation="right"
                    stroke={theme.colors.textSecondary}
                  />
                  <Tooltip 
                    labelFormatter={formatTooltipDate}
                    formatter={(value, name) => {
                      if (name === 'Body Weight') return [`${value} lbs`, name];
                      if (name === 'Training Volume') return [`${(value / 1000).toFixed(1)}k lbs`, name];
                      return [value, name];
                    }}
                    contentStyle={{
                      backgroundColor: theme.colors.background,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: '8px',
                      color: theme.colors.text
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ color: theme.colors.text }}
                  />
                  <Area
                    yAxisId="volume"
                    type="monotone"
                    dataKey="volume"
                    fill={`${theme.colors.chart.secondary}30`}
                    stroke={theme.colors.chart.secondary}
                    fillOpacity={0.3}
                    name="Training Volume"
                  />
                  <Line
                    yAxisId="weight"
                    type="monotone"
                    dataKey="weight"
                    stroke={theme.colors.chart.primary}
                    strokeWidth={3}
                    dot={{ fill: theme.colors.chart.primary, strokeWidth: 2, r: 4 }}
                    name="Body Weight"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg">
                <div className="text-center p-8">
                  <p className="text-gray-500 mb-2">
                    {correlationData.correlation?.strength === 'error' 
                      ? 'Unable to load correlation data'
                      : 'No correlation data available'}
                  </p>
                  <p className="text-sm text-gray-400">
                    {correlationData.correlation?.strength === 'error'
                      ? 'Please try again later or check your data'
                      : 'Start logging both weight and workouts to see the correlation between body weight and training performance'}
                  </p>
                </div>
              </div>
            )}

            {/* Insights */}
            {correlationData.insights && correlationData.insights.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-800">Insights:</h4>
                {correlationData.insights.map((insight, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg ${
                      insight.type === 'success' ? 'bg-green-50 text-green-800' :
                      insight.type === 'warning' ? 'bg-yellow-50 text-yellow-800' :
                      insight.type === 'info' ? 'bg-blue-50 text-blue-800' :
                      'bg-gray-50 text-gray-800'
                    }`}
                  >
                    <p className="font-medium">{insight.title}</p>
                    <p className="text-sm mt-1">{insight.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg">
            <div className="text-center p-8">
              <p className="text-gray-500 mb-2">
                {viewMode === 'chart' && "No weight data available for chart view"}
                {viewMode === 'table' && "No weight entries available"}
                {viewMode === 'correlation' && "Loading correlation data..."}
              </p>
              {viewMode !== 'correlation' && (
                <p className="text-sm text-gray-400">
                  Start logging your weight to see data here
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeightLogger;