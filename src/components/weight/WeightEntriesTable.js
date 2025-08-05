import React, { useState } from 'react';
import { format } from 'date-fns';
import axios from 'axios';
// import { useTheme } from '../../context/ThemeContext'; // TODO: Apply theming

const WeightEntriesTable = ({ weightEntries, onUpdate, onDelete, isLoading }) => {
  // const { theme } = useTheme(); // TODO: Apply theming to table
  const [editingId, setEditingId] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');

  // Sort the weight entries
  const sortedEntries = [...weightEntries].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];
    
    if (sortField === 'date') {
      aVal = new Date(aVal);
      bVal = new Date(bVal);
    }
    
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const startEditing = (entry) => {
    setEditingId(entry.id);
    setEditingData({
      weight: entry.weight,
      date: entry.date,
      unit: entry.unit || 'lbs',
      notes: entry.notes || ''
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingData({});
  };

  const saveEdit = async (recordId) => {
    setIsUpdating(true);
    try {
      const response = await axios.put(`${process.env.REACT_APP_API_URL}/update-weight`, {
        recordId,
        ...editingData
      });

      if (response.data.success) {
        onUpdate(); // Refresh the data
        setEditingId(null);
        setEditingData({});
      }
    } catch (error) {
      console.error('Failed to update weight:', error);
      alert('Failed to update weight entry. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const deleteEntry = async (recordId) => {
    if (!window.confirm('Are you sure you want to delete this weight entry?')) {
      return;
    }

    setIsDeleting(recordId);
    try {
      const response = await axios.delete(`${process.env.REACT_APP_API_URL}/delete-weight?recordId=${recordId}`);

      if (response.data.success) {
        onDelete(); // Refresh the data
      }
    } catch (error) {
      console.error('Failed to delete weight:', error);
      alert('Failed to delete weight entry. Please try again.');
    } finally {
      setIsDeleting(null);
    }
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch (error) {
      return dateString;
    }
  };

  const formatEditDate = (dateString) => {
    try {
      return format(new Date(dateString), 'yyyy-MM-dd');
    } catch (error) {
      return dateString;
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) {
      return <span className="text-gray-400">↕</span>;
    }
    return sortDirection === 'asc' ? 
      <span className="text-blue-600">↑</span> : 
      <span className="text-blue-600">↓</span>;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">Loading weight entries...</p>
      </div>
    );
  }

  if (weightEntries.length === 0) {
    return (
      <div className="flex justify-center items-center h-64 bg-gray-50 rounded-lg">
        <div className="text-center p-8">
          <p className="text-gray-500 mb-2">No weight entries found</p>
          <p className="text-sm text-gray-400">Start logging your weight to see entries here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Weight Entries</h3>
        <p className="text-sm text-gray-600 mt-1">
          {weightEntries.length} entries • Click any row to edit
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('date')}
              >
                <div className="flex items-center space-x-1">
                  <span>Date</span>
                  {getSortIcon('date')}
                </div>
              </th>
              <th 
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('weight')}
              >
                <div className="flex items-center space-x-1">
                  <span>Weight</span>
                  {getSortIcon('weight')}
                </div>
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Unit
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Notes
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedEntries.map((entry) => (
              <tr 
                key={entry.id} 
                className={`hover:bg-gray-50 ${editingId === entry.id ? 'bg-blue-50' : ''}`}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {editingId === entry.id ? (
                    <input
                      type="date"
                      value={formatEditDate(editingData.date)}
                      onChange={(e) => setEditingData({ ...editingData, date: e.target.value })}
                      className="block w-full px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    formatDate(entry.date)
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {editingId === entry.id ? (
                    <input
                      type="number"
                      step="0.1"
                      value={editingData.weight}
                      onChange={(e) => setEditingData({ ...editingData, weight: e.target.value })}
                      className="block w-20 px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <span className="font-medium">{entry.weight}</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {editingId === entry.id ? (
                    <select
                      value={editingData.unit}
                      onChange={(e) => setEditingData({ ...editingData, unit: e.target.value })}
                      className="block w-16 px-2 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="lbs">lbs</option>
                      <option value="kg">kg</option>
                    </select>
                  ) : (
                    entry.unit || 'lbs'
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">
                  {editingId === entry.id ? (
                    <input
                      type="text"
                      value={editingData.notes}
                      onChange={(e) => setEditingData({ ...editingData, notes: e.target.value })}
                      placeholder="Optional notes..."
                      className="block w-full px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <span className="truncate block" title={entry.notes}>
                      {entry.notes || '-'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {editingId === entry.id ? (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => saveEdit(entry.id)}
                        disabled={isUpdating}
                        className="text-green-600 hover:text-green-900 disabled:opacity-50"
                      >
                        {isUpdating ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEditing}
                        disabled={isUpdating}
                        className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => startEditing(entry)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteEntry(entry.id)}
                        disabled={isDeleting === entry.id}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        {isDeleting === entry.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary row */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
        <div className="flex justify-between text-sm text-gray-600">
          <span>Total entries: {weightEntries.length}</span>
          <span>
            Range: {Math.min(...weightEntries.map(e => e.weight)).toFixed(1)} - {Math.max(...weightEntries.map(e => e.weight)).toFixed(1)} lbs
          </span>
        </div>
        {/* Debug info for troubleshooting */}
        <div className="mt-2 text-xs text-gray-500">
          <details>
            <summary className="cursor-pointer hover:text-gray-700">Debug: Click to see all weights</summary>
            <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono">
              All weights: [{weightEntries.map(e => e.weight).sort((a, b) => b - a).join(', ')}]
            </div>
          </details>
        </div>
      </div>
    </div>
  );
};

export default WeightEntriesTable;