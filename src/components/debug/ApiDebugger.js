import React, { useState } from 'react';
import axios from 'axios';

const ApiDebugger = () => {
  const [results, setResults] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const apiEndpoints = [
    'get-analytics',
    'get-goal-predictions',
    'get-summary-insights',
    'get-weight-performance-correlation',
    'export-progress-report',
    'test-summary'
  ];

  const testEndpoint = async (endpoint) => {
    setIsLoading(true);
    const startTime = Date.now();
    
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/${endpoint}`, {
        timeout: 10000
      });
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      setResults(prev => ({
        ...prev,
        [endpoint]: {
          status: 'success',
          statusCode: response.status,
          duration: `${duration}ms`,
          hasData: !!response.data,
          dataKeys: response.data ? Object.keys(response.data) : []
        }
      }));
    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      setResults(prev => ({
        ...prev,
        [endpoint]: {
          status: 'error',
          statusCode: error.response?.status || 'No Response',
          duration: `${duration}ms`,
          errorMessage: error.message,
          errorType: error.code || 'Unknown'
        }
      }));
    }
  };

  const testAllEndpoints = async () => {
    setIsLoading(true);
    setResults({});
    
    for (const endpoint of apiEndpoints) {
      await testEndpoint(endpoint);
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setIsLoading(false);
  };

  const getStatusColor = (result) => {
    if (!result) return 'bg-gray-100';
    if (result.status === 'success') return 'bg-green-100 text-green-800';
    if (result.statusCode === 404) return 'bg-red-100 text-red-800';
    if (result.statusCode === 500) return 'bg-yellow-100 text-yellow-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">API Endpoint Debugger</h3>
        <button
          onClick={testAllEndpoints}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test All Endpoints'}
        </button>
      </div>

      <div className="text-sm text-gray-600 mb-4">
        <p>API Base URL: <code className="bg-gray-100 px-2 py-1 rounded">{process.env.REACT_APP_API_URL}</code></p>
        <p className="mt-1">This tool helps debug which API endpoints are working correctly.</p>
      </div>

      <div className="space-y-3">
        {apiEndpoints.map(endpoint => {
          const result = results[endpoint];
          
          return (
            <div key={endpoint} className="border border-gray-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                    /{endpoint}
                  </code>
                  <button
                    onClick={() => testEndpoint(endpoint)}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Test
                  </button>
                </div>
                
                {result && (
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(result)}`}>
                    {result.statusCode} - {result.duration}
                  </span>
                )}
              </div>

              {result && (
                <div className="text-xs space-y-1">
                  {result.status === 'success' ? (
                    <div className="text-green-700">
                      <div>✅ Success - Response received</div>
                      {result.dataKeys.length > 0 && (
                        <div>Data keys: {result.dataKeys.join(', ')}</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-red-700">
                      <div>❌ {result.errorMessage}</div>
                      {result.statusCode === 404 && (
                        <div className="text-blue-600 mt-1">
                          💡 Endpoint not found - Make sure you're running <code>netlify dev</code> instead of <code>npm start</code>
                        </div>
                      )}
                      {result.statusCode === 500 && (
                        <div className="text-orange-600 mt-1">
                          💡 Server error - Check the function logs for details
                        </div>
                      )}
                      {result.errorType === 'ECONNREFUSED' && (
                        <div className="text-purple-600 mt-1">
                          💡 Connection refused - Netlify dev server might not be running
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
        <div className="font-medium text-blue-800 mb-2">Troubleshooting Tips:</div>
        <ul className="text-blue-700 space-y-1">
          <li>• If you see 404 errors, run <code className="bg-blue-100 px-1 rounded">netlify dev</code> instead of <code className="bg-blue-100 px-1 rounded">npm start</code></li>
          <li>• If you see 500 errors, check the terminal running netlify dev for error details</li>
          <li>• Make sure your <code>.env</code> file has the correct Airtable credentials</li>
          <li>• Ensure you have data in your Airtable base for the functions to process</li>
        </ul>
      </div>
    </div>
  );
};

export default ApiDebugger;