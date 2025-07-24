import React from 'react';
import { photoApi } from '../api';

const PhotoGrid = ({ photos, onPhotoClick }) => {
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  return (
    <div className="photo-grid">
      {photos.map((photo) => (
        <div
          key={photo.path}
          className="photo-card cursor-pointer"
          onClick={() => onPhotoClick?.(photo)}
        >
          <div className="relative">
            {photo.type === 'image' ? (
              <img
                src={photoApi.getPhotoUrl(photo.path)}
                alt={photo.name}
                className="photo-thumbnail"
                loading="lazy"
              />
            ) : (
              <div className="relative">
                <video
                  src={photoApi.getPhotoUrl(photo.path)}
                  className="photo-thumbnail"
                  preload="metadata"
                />
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                  <div className="w-12 h-12 text-white text-4xl">▶</div>
                </div>
              </div>
            )}
            
            <div className="absolute top-2 right-2">
              {photo.type === 'image' ? (
                <div className="w-4 h-4 text-white drop-shadow text-sm">📷</div>
              ) : (
                <div className="w-4 h-4 text-white drop-shadow text-sm">▶</div>
              )}
            </div>
          </div>
          
          <div className="p-3">
            <h3 className="text-sm font-medium text-gray-900 truncate" title={photo.name}>
              {photo.name}
            </h3>
            <div className="flex justify-between items-center mt-1 text-xs text-gray-500">
              <span>{formatFileSize(photo.size)}</span>
              <span>{formatDate(photo.modified)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default PhotoGrid; 