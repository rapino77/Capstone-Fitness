import React, { useState, useCallback } from 'react';
import { format } from 'date-fns';

const ProgressPhotos = () => {
  const [photos, setPhotos] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);

  const handleFileUpload = useCallback((files) => {
    const newPhotos = Array.from(files).map(file => {
      if (file.type.startsWith('image/')) {
        return {
          id: Date.now() + Math.random(),
          file,
          url: URL.createObjectURL(file),
          date: new Date().toISOString().split('T')[0],
          notes: '',
          type: 'progress'
        };
      }
      return null;
    }).filter(Boolean);

    setPhotos(prev => [...prev, ...newPhotos]);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    handleFileUpload(files);
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
  }, []);

  const handleFileInput = useCallback((e) => {
    const files = e.target.files;
    if (files) {
      handleFileUpload(files);
    }
  }, [handleFileUpload]);

  const removePhoto = (photoId) => {
    setPhotos(prev => {
      const photo = prev.find(p => p.id === photoId);
      if (photo) {
        URL.revokeObjectURL(photo.url);
      }
      return prev.filter(p => p.id !== photoId);
    });
  };

  const updatePhotoNotes = (photoId, notes) => {
    setPhotos(prev => prev.map(photo => 
      photo.id === photoId ? { ...photo, notes } : photo
    ));
  };

  const updatePhotoDate = (photoId, date) => {
    setPhotos(prev => prev.map(photo => 
      photo.id === photoId ? { ...photo, date } : photo
    ));
  };

  const updatePhotoType = (photoId, type) => {
    setPhotos(prev => prev.map(photo => 
      photo.id === photoId ? { ...photo, type } : photo
    ));
  };

  const openPhotoModal = (photo) => {
    setSelectedPhoto(photo);
  };

  const closePhotoModal = () => {
    setSelectedPhoto(null);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Progress Photos</h3>
          <p className="text-sm text-gray-600">Track your visual progress over time</p>
        </div>
        <div className="text-2xl">📸</div>
      </div>

      {/* Upload Area */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragOver 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <div className="space-y-4">
          <div className="text-4xl">📷</div>
          <div>
            <p className="text-lg font-medium text-gray-700">Upload Progress Photos</p>
            <p className="text-sm text-gray-500">
              Drag and drop images here, or{' '}
              <label className="text-blue-600 hover:text-blue-700 cursor-pointer underline">
                browse files
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            </p>
          </div>
          <div className="text-xs text-gray-400">
            Supported formats: JPG, PNG, GIF (max 10MB per file)
          </div>
        </div>
      </div>

      {/* Photo Grid */}
      {photos.length > 0 && (
        <div className="mt-8">
          <h4 className="text-md font-semibold text-gray-900 mb-4">
            Your Photos ({photos.length})
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {photos
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                onRemove={removePhoto}
                onUpdateNotes={updatePhotoNotes}
                onUpdateDate={updatePhotoDate}
                onUpdateType={updatePhotoType}
                onView={openPhotoModal}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {photos.length === 0 && (
        <div className="mt-8 text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">📸</div>
          <p className="text-gray-500">No progress photos yet</p>
          <p className="text-sm text-gray-400">Start your visual progress journey by uploading your first photo</p>
        </div>
      )}

      {/* Photo Comparison Helper */}
      {photos.length >= 2 && (
        <div className="mt-8 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
          <h4 className="font-semibold text-gray-900 mb-2">💡 Progress Tip</h4>
          <p className="text-sm text-gray-700 mb-3">
            Compare your photos side-by-side to see your transformation! Consider taking photos:
          </p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>• At the same time of day (lighting consistency)</li>
            <li>• In the same location and pose</li>
            <li>• Every 2-4 weeks for best results</li>
            <li>• From multiple angles (front, side, back)</li>
          </ul>
        </div>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <PhotoModal photo={selectedPhoto} onClose={closePhotoModal} />
      )}
    </div>
  );
};

const PhotoCard = ({ photo, onRemove, onUpdateNotes, onUpdateDate, onUpdateType, onView }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localNotes, setLocalNotes] = useState(photo.notes);
  const [localDate, setLocalDate] = useState(photo.date);
  const [localType, setLocalType] = useState(photo.type);

  const saveChanges = () => {
    onUpdateNotes(photo.id, localNotes);
    onUpdateDate(photo.id, localDate);
    onUpdateType(photo.id, localType);
    setIsEditing(false);
  };

  const cancelChanges = () => {
    setLocalNotes(photo.notes);
    setLocalDate(photo.date);
    setLocalType(photo.type);
    setIsEditing(false);
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'before':
        return 'bg-red-100 text-red-700';
      case 'after':
        return 'bg-green-100 text-green-700';
      case 'milestone':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-blue-100 text-blue-700';
    }
  };

  return (
    <div className="bg-gray-50 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Photo */}
      <div className="relative aspect-square bg-gray-200">
        <img
          src={photo.url}
          alt={`Progress from ${format(new Date(photo.date), 'MMM dd, yyyy')}`}
          className="w-full h-full object-cover cursor-pointer"
          onClick={() => onView(photo)}
        />
        <div className="absolute top-2 right-2 space-x-1">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="bg-white bg-opacity-80 rounded-full p-1 hover:bg-opacity-100 transition-opacity"
          >
            <span className="text-sm">✏️</span>
          </button>
          <button
            onClick={() => onRemove(photo.id)}
            className="bg-white bg-opacity-80 rounded-full p-1 hover:bg-opacity-100 transition-opacity"
          >
            <span className="text-sm">🗑️</span>
          </button>
        </div>
        <div className="absolute bottom-2 left-2">
          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(localType)}`}>
            {localType}
          </span>
        </div>
      </div>

      {/* Details */}
      <div className="p-3">
        {isEditing ? (
          <div className="space-y-2">
            <input
              type="date"
              value={localDate}
              onChange={(e) => setLocalDate(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
            />
            <select
              value={localType}
              onChange={(e) => setLocalType(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded px-2 py-1"
            >
              <option value="progress">Progress</option>
              <option value="before">Before</option>
              <option value="after">After</option>
              <option value="milestone">Milestone</option>
            </select>
            <textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              placeholder="Add notes..."
              className="w-full text-xs border border-gray-300 rounded px-2 py-1 h-16 resize-none"
            />
            <div className="flex space-x-1">
              <button
                onClick={saveChanges}
                className="flex-1 bg-blue-600 text-white text-xs py-1 rounded hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={cancelChanges}
                className="flex-1 bg-gray-300 text-gray-700 text-xs py-1 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="text-sm font-medium text-gray-900">
              {format(new Date(photo.date), 'MMM dd, yyyy')}
            </div>
            {photo.notes && (
              <div className="text-xs text-gray-600 line-clamp-2">
                {photo.notes}
              </div>
            )}
            <div className="text-xs text-gray-400">
              {Math.round(photo.file.size / 1024)}KB
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PhotoModal = ({ photo, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl max-h-full overflow-auto">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">
              Progress Photo - {format(new Date(photo.date), 'MMMM dd, yyyy')}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-xl"
            >
              ✕
            </button>
          </div>
          
          <div className="text-center">
            <img
              src={photo.url}
              alt={`Full size progress from ${format(new Date(photo.date), 'MMM dd, yyyy')}`}
              className="max-w-full max-h-96 mx-auto rounded-lg"
            />
          </div>

          {photo.notes && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-1">Notes</h4>
              <p className="text-sm text-gray-700">{photo.notes}</p>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
            <span>Type: {photo.type}</span>
            <span>Size: {Math.round(photo.file.size / 1024)}KB</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgressPhotos;