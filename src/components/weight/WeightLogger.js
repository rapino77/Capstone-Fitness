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
  ResponsiveContainer
} from 'recharts';

const WeightLogger = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });
  const [weightData, setWeightData] = useState([]);
  const [stats, setStats] = useState({
    current: 0,
    highest: 0,
    lowest: 0,
    average: 0,
    change: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  
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

  useEffect(() => {
    fetchWeightData();
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold mb-4">Weight Progress</h3>
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-gray-500">Loading chart...</p>
          </div>
        ) : weightData.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
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
                formatter={(value) => [`${value} lbs`, 'Weight']}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="weight" 
                stroke="#3B82F6" 
                strokeWidth={2}
                dot={{ fill: '#3B82F6', strokeWidth: 2 }}
                activeDot={{ r: 6 }}
                name="Weight"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex justify-center items-center h-64">
            <p className="text-gray-500">No weight data available. Start logging your weight!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default WeightLogger;