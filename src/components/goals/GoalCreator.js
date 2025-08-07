import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { format, addWeeks, addMonths } from 'date-fns';
import axios from 'axios';

const GoalCreator = ({ onGoalCreated, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState({ type: '', text: '' });
  
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm({
    defaultValues: {
      goalType: '',
      goalTitle: '',
      targetValue: '',
      currentValue: 0,
      targetDate: format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
      priority: 'Medium',
      exerciseName: '',
      notes: ''
    }
  });

  const watchedGoalType = watch('goalType');
  const watchedTargetValue = watch('targetValue');
  const watchedCurrentValue = watch('currentValue');

  const goalTypes = [
    {
      id: 'Body Weight',
      name: 'Body Weight Goal',
      description: 'Target weight loss, gain, or maintenance',
      icon: '⚖️',
      examples: ['Lose 10 lbs', 'Gain 5 lbs muscle', 'Maintain current weight']
    },
    {
      id: 'Exercise PR',
      name: 'Personal Record',
      description: 'Achieve a new max weight for an exercise',
      icon: '💪',
      examples: ['Bench press 200 lbs', 'Squat 300 lbs', 'Deadlift 400 lbs']
    },
    {
      id: 'Frequency',
      name: 'Workout Frequency',
      description: 'Maintain consistent workout schedule',
      icon: '📅',
      examples: ['Workout 4x per week', 'Exercise daily for 30 days', '3 months of consistency']
    },
    {
      id: 'Volume',
      name: 'Training Volume',
      description: 'Total weight moved or reps completed',
      icon: '📊',
      examples: ['Move 50,000 lbs per week', '1000 pushups this month', 'Increase weekly volume by 20%']
    },
    {
      id: 'Custom',
      name: 'Custom Goal',
      description: 'Define your own fitness target',
      icon: '🎯',
      examples: ['Run a 5K', 'Hold plank for 2 minutes', 'Complete a pull-up']
    }
  ];

  const commonExercises = [
    'Bench Press', 'Squat', 'Deadlift', 'Overhead Press', 'Bent Over Row',
    'Pull-ups', 'Dips', 'Bicep Curls', 'Tricep Extensions', 'Leg Press'
  ];

  const quickDateOptions = [
    { label: '2 weeks', date: addWeeks(new Date(), 2) },
    { label: '1 month', date: addMonths(new Date(), 1) },
    { label: '3 months', date: addMonths(new Date(), 3) },
    { label: '6 months', date: addMonths(new Date(), 6) },
    { label: '1 year', date: addMonths(new Date(), 12) }
  ];

  const handleQuickDate = (date) => {
    setValue('targetDate', format(date, 'yyyy-MM-dd'));
  };

  const generateGoalTitle = () => {
    const goalType = watchedGoalType;
    const targetValue = watchedTargetValue;
    const exerciseName = watch('exerciseName');

    if (!goalType || !targetValue) return;

    let title = '';
    switch (goalType) {
      case 'Body Weight':
        const currentWeight = watchedCurrentValue || 0;
        const difference = targetValue - currentWeight;
        if (difference > 0) {
          title = `Gain ${Math.abs(difference)} lbs`;
        } else if (difference < 0) {
          title = `Lose ${Math.abs(difference)} lbs`;
        } else {
          title = `Maintain ${targetValue} lbs`;
        }
        break;
      case 'Exercise PR':
        title = exerciseName ? `${exerciseName} ${targetValue} lbs PR` : `${targetValue} lbs PR`;
        break;
      case 'Frequency':
        title = `Workout ${targetValue}x per week`;
        break;
      case 'Volume':
        title = `Move ${targetValue} lbs per week`;
        break;
      default:
        title = `Achieve ${targetValue}`;
    }
    
    setValue('goalTitle', title);
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setSubmitMessage({ type: '', text: '' });
    
    console.log('=== GOAL CREATION DEBUG ===');
    console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
    console.log('Full API URL:', `${process.env.REACT_APP_API_URL}/goals`);
    console.log('Goal data:', data);
    console.log('=== END DEBUG ===');

    try {
      // Only send fields that exist in Airtable
      const goalData = {
        userId: 'default-user',
        goalType: data.goalType,
        targetValue: parseFloat(data.targetValue) || 0,
        currentValue: parseFloat(data.currentValue) || 0,
        targetDate: data.targetDate,
        exerciseName: data.exerciseName || ''
      };
      
      console.log('Sending goal data:', goalData);
      
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/goals`, goalData);
      
      if (response.data.success) {
        setSubmitMessage({ type: 'success', text: 'Goal created successfully!' });
        setTimeout(() => {
          if (onGoalCreated) onGoalCreated(response.data.data);
        }, 1500);
      }
    } catch (error) {
      console.error('Goal creation error:', error.response?.data || error);
      console.error('Full error response:', JSON.stringify(error.response?.data, null, 2));
      console.error('Error status:', error.response?.status);
      console.error('Error message:', error.response?.data?.error);
      console.error('Missing fields:', error.response?.data?.missingFields);
      console.error('Received fields:', error.response?.data?.receivedFields);
      
      // Also show the error in an alert for easier debugging
      if (error.response?.data?.error) {
        alert(`Goal creation failed: ${error.response.data.error}\n\nDetails: ${JSON.stringify(error.response.data, null, 2)}`);
      }
      
      setSubmitMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to create goal' 
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Choose Your Goal Type</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {goalTypes.map((type) => (
                  <label key={type.id} className="cursor-pointer">
                    <input
                      type="radio"
                      value={type.id}
                      {...register('goalType', { required: 'Please select a goal type' })}
                      className="sr-only"
                    />
                    <div className={`p-4 rounded-lg border-2 transition-all ${
                      watchedGoalType === type.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <div className="flex items-start space-x-3">
                        <span className="text-2xl">{type.icon}</span>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{type.name}</h4>
                          <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                          <div className="mt-2">
                            <p className="text-xs text-gray-500">Examples:</p>
                            <ul className="text-xs text-gray-500 mt-1">
                              {type.examples.slice(0, 2).map((example, idx) => (
                                <li key={idx}>• {example}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              {errors.goalType && (
                <p className="mt-2 text-sm text-red-600">{errors.goalType.message}</p>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Define Your Target</h3>
              
              {watchedGoalType === 'Exercise PR' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Exercise
                  </label>
                  <select
                    {...register('exerciseName', { 
                      required: watchedGoalType === 'Exercise PR' ? 'Exercise is required for PR goals' : false
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select an exercise</option>
                    {commonExercises.map((exercise) => (
                      <option key={exercise} value={exercise}>{exercise}</option>
                    ))}
                  </select>
                  {errors.exerciseName && (
                    <p className="mt-1 text-sm text-red-600">{errors.exerciseName.message}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Target Value
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('targetValue', { 
                      required: 'Target value is required',
                      min: { value: 0.1, message: 'Target must be positive' }
                    })}
                    onBlur={generateGoalTitle}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={getPlaceholderForGoalType(watchedGoalType)}
                  />
                  {errors.targetValue && (
                    <p className="mt-1 text-sm text-red-600">{errors.targetValue.message}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Value
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('currentValue', { 
                      min: { value: 0, message: 'Current value cannot be negative' }
                    })}
                    onBlur={generateGoalTitle}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                  {errors.currentValue && (
                    <p className="mt-1 text-sm text-red-600">{errors.currentValue.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Goal Title
                </label>
                <input
                  type="text"
                  {...register('goalTitle', { required: 'Goal title is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter a descriptive goal title"
                />
                <button
                  type="button"
                  onClick={generateGoalTitle}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Generate title automatically
                </button>
                {errors.goalTitle && (
                  <p className="mt-1 text-sm text-red-600">{errors.goalTitle.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Priority Level
                </label>
                <select
                  {...register('priority')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Low">Low - Nice to have</option>
                  <option value="Medium">Medium - Important</option>
                  <option value="High">High - Critical</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Set Your Timeline</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Date
                </label>
                <input
                  type="date"
                  {...register('targetDate', { 
                    required: 'Target date is required',
                    validate: value => new Date(value) > new Date() || 'Target date must be in the future'
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.targetDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.targetDate.message}</p>
                )}
                
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2">Quick date options:</p>
                  <div className="flex flex-wrap gap-2">
                    {quickDateOptions.map((option) => (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => handleQuickDate(option.date)}
                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  {...register('notes')}
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add any additional notes, motivation, or strategy for achieving this goal..."
                />
              </div>

              {/* Goal Summary */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Goal Summary</h4>
                <div className="text-sm space-y-1">
                  <p><span className="font-medium">Type:</span> {watchedGoalType}</p>
                  <p><span className="font-medium">Title:</span> {watch('goalTitle') || 'Not set'}</p>
                  <p><span className="font-medium">Target:</span> {watchedTargetValue} {getUnitForGoalType(watchedGoalType)}</p>
                  <p><span className="font-medium">Current:</span> {watchedCurrentValue} {getUnitForGoalType(watchedGoalType)}</p>
                  <p><span className="font-medium">Deadline:</span> {format(new Date(watch('targetDate')), 'MMM dd, yyyy')}</p>
                  <p><span className="font-medium">Priority:</span> {watch('priority')}</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-blue-accent rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl section-header">Create New Goal</h2>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-white hover:text-gray-200"
            >
              ✕
            </button>
          )}
        </div>
        
        {/* Progress Indicator */}
        <div className="flex items-center space-x-2 mb-6">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step <= currentStep 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {step}
              </div>
              {step < 3 && (
                <div className={`w-12 h-1 mx-2 ${
                  step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {renderStep()}

        {submitMessage.text && (
          <div className={`mt-6 p-4 rounded-md ${
            submitMessage.type === 'success' 
              ? 'bg-green-50 text-green-800' 
              : 'bg-red-50 text-red-800'
          }`}>
            {submitMessage.text}
          </div>
        )}

        <div className="flex justify-between mt-8">
          <button
            type="button"
            onClick={prevStep}
            disabled={currentStep === 1}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <div className="space-x-3">
            {currentStep < 3 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating Goal...' : 'Create Goal'}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

// Helper functions
function getPlaceholderForGoalType(goalType) {
  switch (goalType) {
    case 'Body Weight': return 'Target weight (lbs)';
    case 'Exercise PR': return 'Target weight (lbs)';
    case 'Frequency': return 'Workouts per week';
    case 'Volume': return 'Total weight (lbs)';
    default: return 'Target value';
  }
}

function getUnitForGoalType(goalType) {
  switch (goalType) {
    case 'Body Weight': return 'lbs';
    case 'Exercise PR': return 'lbs';
    case 'Frequency': return 'per week';
    case 'Volume': return 'lbs';
    default: return '';
  }
}

export default GoalCreator;