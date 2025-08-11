import React, { useState } from 'react';
import axios from 'axios';

const ExportProgressReport = () => {
  const [exportOptions, setExportOptions] = useState({
    format: 'json',
    timeframe: '90',
    includeWorkouts: true,
    includeWeight: true,
    includeGoals: true,
    includePRs: true,
    includeAnalytics: true
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);

  const handleOptionChange = (option, value) => {
    setExportOptions(prev => ({
      ...prev,
      [option]: value
    }));
  };

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setExportStatus(null);
      
      const params = {
        ...exportOptions,
        includeWorkouts: exportOptions.includeWorkouts.toString(),
        includeWeight: exportOptions.includeWeight.toString(),
        includeGoals: exportOptions.includeGoals.toString(),
        includePRs: exportOptions.includePRs.toString(),
        includeAnalytics: exportOptions.includeAnalytics.toString()
      };

      const response = await axios.get(`${process.env.REACT_APP_API_URL}/export-progress-report`, {
        params,
        responseType: exportOptions.format === 'json' ? 'json' : 'blob'
      });

      if (exportOptions.format === 'json') {
        // For JSON format, create a blob and download
        const blob = new Blob([JSON.stringify(response.data, null, 2)], {
          type: 'application/json'
        });
        downloadFile(blob, `fitness-report-${new Date().toISOString().split('T')[0]}.json`);
      } else {
        // For CSV and text formats, the response is already a blob
        const extension = exportOptions.format === 'csv' ? 'csv' : 'txt';
        downloadFile(response.data, `fitness-report-${new Date().toISOString().split('T')[0]}.${extension}`);
      }

      setExportStatus({
        type: 'success',
        message: `Report exported successfully as ${exportOptions.format.toUpperCase()}`
      });
    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus({
        type: 'error',
        message: 'Failed to export report. Please try again.'
      });
    } finally {
      setIsExporting(false);
    }
  };

  const downloadFile = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const getTimeframeLabel = (days) => {
    switch (days) {
      case '7':
        return '1 Week';
      case '30':
        return '1 Month';
      case '90':
        return '3 Months';
      case '180':
        return '6 Months';
      case '365':
        return '1 Year';
      default:
        return `${days} Days`;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Export Progress Report</h3>
          <p className="text-sm text-gray-600">Download your complete fitness data and analytics</p>
        </div>
        <div className="text-2xl">📊</div>
      </div>

      {/* Export Options */}
      <div className="space-y-6">
        {/* Format Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Export Format</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { value: 'json', label: 'JSON', description: 'Complete data with full structure' },
              { value: 'csv', label: 'CSV', description: 'Spreadsheet-friendly format' },
              { value: 'text', label: 'Text', description: 'Human-readable summary' }
            ].map(format => (
              <div
                key={format.value}
                onClick={() => handleOptionChange('format', format.value)}
                className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                  exportOptions.format === format.value
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">{format.label}</div>
                <div className="text-xs text-gray-500">{format.description}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Time Frame Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Time Period</label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {['7', '30', '90', '180', '365'].map(days => (
              <button
                key={days}
                onClick={() => handleOptionChange('timeframe', days)}
                className={`px-3 py-2 text-sm rounded-md transition-colors ${
                  exportOptions.timeframe === days
                    ? 'bg-blue-100 text-blue-700 border border-blue-300'
                    : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                }`}
              >
                {getTimeframeLabel(days)}
              </button>
            ))}
          </div>
        </div>

        {/* Data Inclusion Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Include Data</label>
          <div className="space-y-3">
            {[
              { key: 'includeWorkouts', label: 'Workout Data', description: 'Exercises, sets, reps, weights' },
              { key: 'includeWeight', label: 'Body Weight', description: 'Weight tracking entries and trends' },
              { key: 'includeGoals', label: 'Goals', description: 'Goal progress and achievements' },
              { key: 'includePRs', label: 'Personal Records', description: 'PRs and improvements' },
              { key: 'includeAnalytics', label: 'Analytics', description: 'Performance metrics and insights' }
            ].map(option => (
              <label key={option.key} className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  checked={exportOptions[option.key]}
                  onChange={(e) => handleOptionChange(option.key, e.target.checked)}
                  className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{option.label}</div>
                  <div className="text-xs text-gray-500">{option.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Export Summary */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Export Summary</h4>
          <div className="text-xs text-gray-600 space-y-1">
            <div>Format: {exportOptions.format.toUpperCase()}</div>
            <div>Period: {getTimeframeLabel(exportOptions.timeframe)}</div>
            <div>
              Data: {[
                exportOptions.includeWorkouts && 'Workouts',
                exportOptions.includeWeight && 'Weight',
                exportOptions.includeGoals && 'Goals',
                exportOptions.includePRs && 'PRs',
                exportOptions.includeAnalytics && 'Analytics'
              ].filter(Boolean).join(', ')}
            </div>
          </div>
        </div>

        {/* Export Status */}
        {exportStatus && (
          <div className={`p-3 rounded-lg ${
            exportStatus.type === 'success' 
              ? 'bg-green-50 text-green-700 border border-green-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            <div className="flex items-center space-x-2">
              <span>{exportStatus.type === 'success' ? '✅' : '❌'}</span>
              <span className="text-sm">{exportStatus.message}</span>
            </div>
          </div>
        )}

        {/* Export Button */}
        <div className="flex justify-end">
          <button
            onClick={handleExport}
            disabled={isExporting || Object.values(exportOptions).slice(2).every(v => !v)}
            className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
              isExporting || Object.values(exportOptions).slice(2).every(v => !v)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isExporting && (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            )}
            <span>{isExporting ? 'Exporting...' : 'Export Report'}</span>
            <span>📥</span>
          </button>
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Export Formats</h4>
        <div className="text-xs text-gray-600 space-y-1">
          <div><strong>JSON:</strong> Complete structured data, ideal for backup or data analysis</div>
          <div><strong>CSV:</strong> Spreadsheet format, compatible with Excel and Google Sheets</div>
          <div><strong>Text:</strong> Readable summary report with key highlights and statistics</div>
        </div>
      </div>
    </div>
  );
};

export default ExportProgressReport;