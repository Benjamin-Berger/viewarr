import React, { useState, useEffect } from 'react';
import { photoApi } from './api';
import FolderList from './components/FolderList';
import PhotoGrid from './components/PhotoGrid';

function App() {
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load folders on component mount
  useEffect(() => {
    loadFolders();
  }, []);

  // Load photos when folder is selected
  useEffect(() => {
    if (selectedFolder) {
      loadPhotos(selectedFolder.path);
    } else {
      setPhotos([]);
    }
  }, [selectedFolder]);

  const loadFolders = async () => {
    try {
      setLoading(true);
      setError(null);
      const foldersData = await photoApi.getFolders();
      setFolders(foldersData);
    } catch (err) {
      setError('Failed to load folders. Please check if the backend is running.');
      console.error('Error loading folders:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadPhotos = async (folderPath) => {
    try {
      setLoading(true);
      setError(null);
      const photoData = await photoApi.getPhotos(folderPath);
      setPhotos(photoData.photos);
    } catch (err) {
      setError('Failed to load photos from this folder.');
      console.error('Error loading photos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderSelect = (folder) => {
    setSelectedFolder(folder);
  };

  const handlePhotoClick = (photo) => {
    // For now, just log the photo. In the future, this could open a modal or lightbox
    console.log('Photo clicked:', photo);
    // You could implement a lightbox/modal here
  };

  if (loading && folders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-4">⏳</div>
          <p className="text-gray-600">Loading photo viewer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 text-primary-600 text-2xl">📸</div>
              <h1 className="text-xl font-semibold text-gray-900">Photo Viewer</h1>
            </div>
            
            {selectedFolder && (
              <div className="text-sm text-gray-500">
                Viewing: <span className="font-medium text-gray-900">{selectedFolder.name}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={loadFolders}
              className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
            >
              Try again
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <FolderList
              folders={folders}
              selectedFolder={selectedFolder?.path}
              onFolderSelect={handleFolderSelect}
            />
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-3">
            {selectedFolder ? (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">
                    {selectedFolder.name}
                  </h2>
                  <p className="text-gray-600">
                    {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
                  </p>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-6 h-6 animate-spin text-primary-600 mr-2">⏳</div>
                    <span className="text-gray-600">Loading photos...</span>
                  </div>
                ) : photos.length > 0 ? (
                  <PhotoGrid photos={photos} onPhotoClick={handlePhotoClick} />
                ) : (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 text-gray-300 mx-auto mb-3 text-4xl">📸</div>
                    <p className="text-gray-500">No photos found in this folder</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 text-gray-300 mx-auto mb-4 text-5xl">📸</div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Welcome to Photo Viewer
                </h2>
                <p className="text-gray-600">
                  Select a folder from the sidebar to view your photos
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App; 