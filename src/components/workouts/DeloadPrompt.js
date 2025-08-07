import React, { useState } from 'react';

const DeloadPrompt = ({ 
  deloadData, 
  onAccept, 
  onDecline, 
  onClose,
  isVisible 
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!isVisible || !deloadData) {
    return null;
  }

  // Use the moderate deload option (15% reduction) as the default suggestion
  const suggestedDeload = deloadData.options && deloadData.options.length > 0 
    ? deloadData.options.find(option => option.type === 'moderate') || deloadData.options[1] || deloadData.options[0]
    : null;

  const handleYesDeload = () => {
    if (suggestedDeload) {
      onAccept(suggestedDeload);
    }
  };

  const handleNoDeload = () => {
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
          {/* Performance Comparison - Simplified */}
          <div className="mb-6">
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
              <div className="flex items-center mb-3">
                <span className="text-red-500 text-xl mr-3">⚠️</span>
                <div>
                  <div className="font-medium text-red-800">Performance Decrease Detected</div>
                  <div className="text-sm text-red-600 mt-1">
                    Your current workout shows lower numbers than your last session
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600 font-medium mb-1">Last Workout</div>
                  <div className="font-mono text-gray-900">{deloadData.comparison.last}</div>
                </div>
                <div>
                  <div className="text-gray-600 font-medium mb-1">Current Workout</div>
                  <div className="font-mono text-gray-900">{deloadData.comparison.current}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Deload Suggestion - Simplified */}
          {suggestedDeload && (
            <div className="mb-6">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center mb-3">
                  <span className="text-blue-500 text-xl mr-3">🔄</span>
                  <div>
                    <div className="font-medium text-blue-800">Suggested Deload</div>
                    <div className="text-sm text-blue-600 mt-1">
                      Reduce weight to promote recovery and prevent overreaching
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg p-3 border border-blue-200">
                  <div className="font-mono text-lg text-blue-700 mb-2">
                    {suggestedDeload.preview}
                  </div>
                  <div className="text-sm text-blue-600">
                    {suggestedDeload.description} • Benefits: Recovery, technique focus, long-term gains
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Explanation */}
          <div className="mb-6">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center text-sm font-medium text-gray-700 hover:text-gray-900 mb-3"
            >
              <span>Why deload?</span>
              <span className="ml-1">{showDetails ? '▼' : '▶'}</span>
            </button>
            
            {showDetails && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-700 space-y-2">
                  <p>• <strong>Prevents overreaching:</strong> Gives your body time to recover</p>
                  <p>• <strong>Improves technique:</strong> Lighter weights help focus on form</p>
                  <p>• <strong>Promotes long-term gains:</strong> Strategic rest leads to better progress</p>
                  <p>• <strong>Mental break:</strong> Reduces training stress and builds confidence</p>
                </div>
              </div>
            )}
          </div>

          {/* Simple Action Buttons */}
          <div className="flex space-x-3">
            <button
              onClick={handleNoDeload}
              className="flex-1 px-6 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              No, Continue with Current Weight
            </button>
            
            {suggestedDeload && (
              <button
                onClick={handleYesDeload}
                className="flex-1 px-6 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
              >
                Yes, Apply Deload
              </button>
            )}
          </div>

          {/* Help Text */}
          <div className="mt-4 text-xs text-gray-500 text-center">
            You can always adjust weights manually in the form after making your choice
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeloadPrompt;