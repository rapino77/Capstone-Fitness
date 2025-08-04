import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import axios from 'axios';

const WorkoutForm = ({ onSuccess }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm({
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      sets: 3,
      reps: 10,
      weight: 0
    }
  });

  const commonExercises = [
    'Bench Press',
    'Squat',
    'Deadlift',
    'Overhead Press',
    'Bent Over Row',
    'Pull-ups',
    'Dips',
    'Bicep Curls',
    'Tricep Extensions',
    'Leg Press',
    'Lunges',
    'Shoulder Raises',
    'Other'
  ];

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setSubmitMessage({ type: '', text: '' });

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/log-workout`, data);
      
      if (response.data.success) {
        setSubmitMessage({ type: 'success', text: 'Workout logged successfully!' });
        reset();
        if (onSuccess) onSuccess(response.data);
      }
    } catch (error) {
      setSubmitMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to log workout' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-2xl font-bold mb-6">Log Workout</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Exercise
          </label>
          <select
            {...register('exercise', { required: 'Exercise is required' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select an exercise</option>
            {commonExercises.map((exercise) => (
              <option key={exercise} value={exercise}>{exercise}</option>
            ))}
          </select>
          {errors.exercise && (
            <p className="mt-1 text-sm text-red-600">{errors.exercise.message}</p>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sets
            </label>
            <input
              type="number"
              {...register('sets', { 
                required: 'Sets is required',
                min: { value: 1, message: 'Minimum 1 set' },
                max: { value: 100, message: 'Maximum 100 sets' }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.sets && (
              <p className="mt-1 text-sm text-red-600">{errors.sets.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reps
            </label>
            <input
              type="number"
              {...register('reps', { 
                required: 'Reps is required',
                min: { value: 1, message: 'Minimum 1 rep' },
                max: { value: 1000, message: 'Maximum 1000 reps' }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.reps && (
              <p className="mt-1 text-sm text-red-600">{errors.reps.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Weight (lbs)
            </label>
            <input
              type="number"
              step="0.5"
              {...register('weight', { 
                required: 'Weight is required',
                min: { value: 0, message: 'Weight cannot be negative' },
                max: { value: 2000, message: 'Maximum 2000 lbs' }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.weight && (
              <p className="mt-1 text-sm text-red-600">{errors.weight.message}</p>
            )}
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
            rows="3"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Any additional notes about your workout..."
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
          {isSubmitting ? 'Logging...' : 'Log Workout'}
        </button>
      </form>
    </div>
  );
};

export default WorkoutForm;