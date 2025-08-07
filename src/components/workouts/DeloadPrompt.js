import React, { useState } from 'react';
import { format } from 'date-fns';

const DeloadPrompt = ({ 
  deloadData, 
  onAccept, 
  onDecline, 
  onClose,
  isVisible 
}) => {
  const [selectedOption, setSelectedOption] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  if (!isVisible || !deloadData) {
    return null;
  }

  const handleAccept = () => {
    if (selectedOption) {
      onAccept(selectedOption);
    }
  };

  const handleDecline = () => {
    onDecline();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold mb-2">{deloadData.title}</h2>
              <p className="text-orange-100">{deloadData.message}</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-orange-200 text-2xl font-bold"
            >
              ×
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* Performance Comparison */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Performance Comparison</h3>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600 font-medium">Last Workout</div>
                  <div className="font-mono text-lg">{deloadData.comparison.last}</div>
                  {deloadData.lastWorkout?.date && (
                    <div className="text-xs text-gray-500 mt-1">
                      {format(new Date(deloadData.lastWorkout.date), 'MMM dd, yyyy')}
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-gray-600 font-medium">Current Workout</div>
                  <div className="font-mono text-lg">{deloadData.comparison.current}</div>
                  <div className="text-xs text-gray-500 mt-1">Today</div>
                </div>
              </div>
              
              {/* Change Indicators */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="text-sm font-medium text-gray-700 mb-2">Changes Detected:</div>
                <div className="space-y-1">
                  {deloadData.comparison.changes.map((change, index) => (
                    <div key={index} className="flex items-center text-sm">
                      <span className="text-red-500 mr-2">↓</span>
                      <span className="text-red-700">{change.message}</span>
                    </div>
                  ))}
                </div>
                
                {deloadData.volumeImpact && (
                  <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                    <div className="text-sm text-red-800">
                      <span className="font-medium">Volume Impact:</span> {deloadData.volumeImpact}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Deload Options */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Suggested Deload Options</h3>
            
            {deloadData.options.length > 0 ? (
              <div className="space-y-3">
                {deloadData.options.map((option, index) => (
                  <div 
                    key={index}
                    className={`border rounded-lg p-4 cursor-pointer transition-all ${
                      selectedOption?.type === option.type
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedOption(option)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <input
                            type="radio"
                            checked={selectedOption?.type === option.type}
                            onChange={() => setSelectedOption(option)}
                            className="mr-3"
                          />
                          <div>
                            <h4 className="font-medium text-gray-900 capitalize">{option.type} Deload</h4>
                            <p className="text-sm text-gray-600">{option.description}</p>
                          </div>
                        </div>
                        
                        <div className="ml-6">
                          <div className="font-mono text-lg text-blue-700 mb-2">
                            {option.preview}
                          </div>
                          
                          <div className="text-xs text-gray-500 mb-2">
                            Benefits: {option.benefits.join(' • ')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="ml-4 text-right">
                        <div className="text-2xl font-bold text-orange-600">-{option.percentage}%</div>
                        <div className="text-xs text-gray-500">from peak</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-gray-500">
                <div className="text-4xl mb-2">💪</div>
                <div className="font-medium">No deload options available</div>
                <div className="text-sm mt-1">Your current weight is already at a good level</div>
              </div>
            )}
          </div>

          {/* Recommendations */}
          <div className="mb-6">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              <span>Training Recommendations</span>
              <span className="ml-1">{showDetails ? '▼' : '▶'}</span>
            </button>
            
            {showDetails && (
              <div className="mt-3 bg-blue-50 rounded-lg p-4">
                <ul className="text-sm text-blue-800 space-y-1">
                  {deloadData.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={handleDecline}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Keep Current Weight
            </button>
            
            {deloadData.options.length > 0 && (
              <button
                onClick={handleAccept}
                disabled={!selectedOption}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  selectedOption
                    ? 'bg-orange-500 text-white hover:bg-orange-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Apply {selectedOption?.type || ''} Deload
              </button>
            )}
          </div>

          {/* Help Text */}
          <div className="mt-4 text-xs text-gray-500 text-center">
            Deloads help prevent overreaching and promote long-term strength gains.
            You can always adjust the weight manually after applying a deload.
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeloadPrompt;