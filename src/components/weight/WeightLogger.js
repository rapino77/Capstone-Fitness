import React, { useState, useEffect } from 'react';
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

const WeightLogger = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });
  const [weightData, setWeightData] = useState([]);
  const [correlationData, setCorrelationData] = useState(null);
  const [stats, setStats] = useState({
    current: 0,
    highest: 0,
    lowest: 0,
    average: 0,
    change: 0,
    trends: null
  });
  const [isLoading, setIsLoading] = useState(true);
  const [showCorrelation, setShowCorrelation] = useState(false);
  
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
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/get-weights`, {
        params: { chartData: 'true' }
      });
      
      if (response.data.success) {
        // Filter out invalid data entries
        const validData = (response.data.data || []).filter(entry => {
          return entry && 
                 entry.weight && 
                 !isNaN(Number(entry.weight)) && 
                 entry.date && 
                 !isNaN(new Date(entry.date).getTime());
        });
        
        console.log('Filtered weight data:', validData);
        setWeightData(validData);
        setStats(response.data.stats || {});
      }
    } catch (error) {
      console.error('Failed to fetch weight data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCorrelationData = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/get-weight-performance-correlation`);
      
      if (response.data.success) {
        setCorrelationData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch correlation data:', error);
    }
  };

  useEffect(() => {
    fetchWeightData();
    fetchCorrelationData();
  }, []);

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setSubmitMessage({ type: '', text: '' });

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/log-weight`, data);
      
      if (response.data.success) {
        setSubmitMessage({ type: 'success', text: 'Weight logged successfully!' });
        reset({ ...data, weight: '' });
        fetchWeightData(); // Refresh the chart
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
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold mb-6">Log Body Weight</h2>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-bold mb-4">Weight Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm text-gray-600">Current Weight</p>
              <p className="text-2xl font-bold text-blue-600">
                {stats.current?.toFixed(1) || '-'} lbs
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm text-gray-600">Total Change</p>
              <p className={`text-2xl font-bold ${stats.change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {stats.change > 0 ? '+' : ''}{stats.change?.toFixed(1) || '0'} lbs
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm text-gray-600">Highest</p>
              <p className="text-2xl font-bold text-gray-700">
                {stats.highest?.toFixed(1) || '-'} lbs
              </p>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm text-gray-600">Lowest</p>
              <p className="text-2xl font-bold text-gray-700">
                {stats.lowest?.toFixed(1) || '-'} lbs
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
              onClick={() => setShowCorrelation(false)}
              className={`px-3 py-1 rounded text-sm ${
                !showCorrelation 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Weight Trends
            </button>
            <button
              onClick={() => setShowCorrelation(true)}
              className={`px-3 py-1 rounded text-sm ${
                showCorrelation 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Weight vs Performance
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-gray-500">Loading chart...</p>
          </div>
        ) : !showCorrelation && weightData.length > 0 ? (
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={weightData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={formatXAxis}
              />
              <YAxis 
                domain={['dataMin - 5', 'dataMax + 5']}
                label={{ value: 'Weight (lbs)', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip 
                labelFormatter={formatTooltipDate}
                formatter={(value, name) => {
                  if (name === 'Weight') return [`${value} lbs`, name];
                  if (name === '7-Day Average') return [`${value} lbs`, name];
                  if (name === '30-Day Average') return [`${value} lbs`, name];
                  return [value, name];
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="weight" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 6 }}
                name="Weight"
              />
              {/* 7-day moving average */}
              <Line 
                type="monotone" 
                dataKey="ma7" 
                stroke="#10B981" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="7-Day Average"
              />
              {/* 30-day moving average */}
              <Line 
                type="monotone" 
                dataKey="ma30" 
                stroke="#F59E0B" 
                strokeWidth={2}
                strokeDasharray="10 5"
                dot={false}
                name="30-Day Average"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : showCorrelation && correlationData ? (
          <div className="space-y-4">
            {/* Correlation Statistics */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Correlation Coefficient</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {correlationData.correlation?.coefficient?.toFixed(3) || '0.000'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Relationship Strength</p>
                  <p className="text-lg font-semibold text-green-600 capitalize">
                    {correlationData.correlation?.strength || 'No data'}
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
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatXAxis}
                  />
                  <YAxis yAxisId="weight" orientation="left" domain={['dataMin - 5', 'dataMax + 5']} />
                  <YAxis yAxisId="volume" orientation="right" />
                  <Tooltip 
                    labelFormatter={formatTooltipDate}
                    formatter={(value, name) => {
                      if (name === 'Body Weight') return [`${value} lbs`, name];
                      if (name === 'Training Volume') return [`${(value / 1000).toFixed(1)}k lbs`, name];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Area
                    yAxisId="volume"
                    type="monotone"
                    dataKey="volume"
                    fill="#93C5FD"
                    stroke="#3B82F6"
                    fillOpacity={0.3}
                    name="Training Volume"
                  />
                  <Line
                    yAxisId="weight"
                    type="monotone"
                    dataKey="weight"
                    stroke="#EF4444"
                    strokeWidth={3}
                    dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                    name="Body Weight"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex justify-center items-center h-64">
                <p className="text-gray-500">No correlation data available. Need matching weight and workout data.</p>
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
          <div className="flex justify-center items-center h-64">
            <p className="text-gray-500">
              {!showCorrelation 
                ? "No weight data available. Start logging your weight!" 
                : "Loading correlation data..."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeightLogger;