const { useState, useEffect } = React;

const API_BASE_URL = 'http://localhost:8000';

const photoApi = {
  getFolders: async () => {
    const response = await axios.get(`${API_BASE_URL}/api/folders`);
    return response.data;
  },
  getPhotos: async (folderPath) => {
    const response = await axios.get(`${API_BASE_URL}/api/photos/${folderPath}`);
    return response.data;
  },
  getPhotoUrl: (photoPath) => {
    return `${API_BASE_URL}/api/photo/${photoPath}`;
  }
};

// Utility functions
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

const PhotoGrid = ({ photos, onPhotoClick, imageSize, showImageInfo, setHoveredVideo, videoSpeed, showSpeedOverlay, overlayTarget }) => {
  const gridStyle = {
    display: 'grid',
    gridTemplateColumns: `repeat(auto-fill, minmax(${imageSize}px, 1fr))`,
    gap: '1rem'
  };

  return React.createElement('div', { style: gridStyle },
    photos.map((photo) => 
      React.createElement('div', {
        key: photo.path,
        className: 'photo-card cursor-pointer',
        onClick: () => onPhotoClick?.(photo)
      },
        React.createElement('div', { className: 'relative' },
          photo.type === 'image' ? 
            React.createElement('img', {
              src: photoApi.getPhotoUrl(photo.path),
              alt: photo.name,
              style: { width: '100%', height: `${imageSize}px`, objectFit: 'cover', transition: 'transform 0.2s' },
              loading: 'lazy'
            }) :
            React.createElement('div', { className: 'relative' },
              React.createElement('video', {
                src: photoApi.getPhotoUrl(photo.path),
                style: { width: '100%', height: `${imageSize}px`, objectFit: 'cover', transition: 'transform 0.2s' },
                preload: 'metadata',
                muted: true,
                loop: true,
                onMouseEnter: (e) => {
                  e.target.play().catch(() => {});
                  setHoveredVideo(e.target);
                },
                onMouseLeave: (e) => {
                  e.target.pause();
                  e.target.currentTime = 0;
                  setHoveredVideo(null);
                }
              }),
              // Speed overlay for hovered video
              showSpeedOverlay && overlayTarget === 'hover' && React.createElement('div', {
                className: 'absolute top-2 left-2 z-20 bg-black bg-opacity-70 text-white px-3 py-1 rounded text-base font-bold pointer-events-none',
                style: { transition: 'opacity 0.3s', opacity: showSpeedOverlay ? 1 : 0 }
              }, `${videoSpeed.toFixed(2)}x`),
              React.createElement('div', { 
                className: 'absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 pointer-events-none'
              },
                React.createElement('div', { className: 'text-white text-4xl' }, '▶')
              )
            ),
          React.createElement('div', { className: 'absolute top-2 right-2' },
            photo.type === 'image' ?
              React.createElement('div', { className: 'text-white drop-shadow text-sm' }, '📷') :
              React.createElement('div', { className: 'text-white drop-shadow text-sm' }, '▶')
          )
        ),
        showImageInfo && React.createElement('div', { className: 'p-3' },
          React.createElement('h3', { 
            className: 'text-sm font-medium text-gray-900 truncate',
            title: photo.name
          }, photo.name),
          React.createElement('div', { className: 'flex justify-between items-center mt-1 text-xs text-gray-500' },
            React.createElement('span', null, formatFileSize(photo.size)),
            React.createElement('span', null, formatDate(photo.modified))
          )
        )
      )
    )
  );
};

const FolderList = ({ folders, selectedFolder, onFolderSelect }) => {
  return React.createElement('div', { className: 'divide-y divide-gray-200' },
    folders.map((folder) =>
      React.createElement('div', {
        key: folder.path,
        className: `p-4 cursor-pointer transition-colors duration-200 ${
          selectedFolder === folder.path
            ? 'bg-blue-50 border-r-2 border-blue-500'
            : 'hover:bg-gray-50'
        }`,
        onClick: () => onFolderSelect(folder)
      },
        React.createElement('div', { className: 'flex items-center space-x-3' },
          React.createElement('div', { className: 'text-gray-500 text-lg' }, '📁'),
          React.createElement('div', { className: 'flex-1 min-w-0' },
            React.createElement('p', { className: 'text-sm font-medium text-gray-900 truncate' }, folder.name),
            React.createElement('p', { className: 'text-xs text-gray-500' },
              `${folder.file_count} ${folder.file_count === 1 ? 'file' : 'files'}`
            )
          )
        )
      )
    ),
    folders.length === 0 && 
      React.createElement('div', { className: 'p-8 text-center' },
        React.createElement('div', { className: 'text-gray-300 text-4xl mb-3' }, '📁'),
        React.createElement('p', { className: 'text-gray-500' }, 'No folders found'),
        React.createElement('p', { className: 'text-sm text-gray-400 mt-1' },
          'Add some folders to the photos directory to get started'
        )
      )
  );
};

function App() {
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [imageSize, setImageSize] = useState(200); // Default size in pixels
  const [showImageInfo, setShowImageInfo] = useState(true); // Default to showing info
  const [selectedPhoto, setSelectedPhoto] = useState(null); // For full-screen view
  const [hoveredVideo, setHoveredVideo] = useState(null); // Track hovered video
  const [videoSpeed, setVideoSpeed] = useState(1); // Current speed for overlay
  const [showSpeedOverlay, setShowSpeedOverlay] = useState(false); // Overlay visibility
  const [overlayTarget, setOverlayTarget] = useState(null); // 'hover' or 'fullscreen'
  const [fillScreen, setFillScreen] = useState(false); // Toggle fill screen mode

  useEffect(() => {
    loadFolders();
  }, []);

  useEffect(() => {
    if (selectedFolder) {
      loadPhotos(selectedFolder.path);
    } else {
      setPhotos([]);
    }
  }, [selectedFolder]);

  useEffect(() => {
    let overlayTimeout;
    if (showSpeedOverlay) {
      overlayTimeout = setTimeout(() => setShowSpeedOverlay(false), 700);
    }
    return () => clearTimeout(overlayTimeout);
  }, [showSpeedOverlay]);

  const toggleImageInfo = React.useCallback(() => {
    setShowImageInfo(!showImageInfo);
  }, [showImageInfo]);

  // Handle Escape key to close full-screen modal
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (selectedPhoto) {
        // Always allow Escape to close full-screen first
        if (event.key === 'Escape') {
          event.preventDefault();
          closeFullScreen();
          return;
        }
        // Always allow info toggle next
        if (event.key === 'i' || event.key === 'I') {
          event.preventDefault();
          toggleImageInfo();
          return;
        }
        // Toggle fill screen mode
        if (event.key === 'f' || event.key === 'F') {
          event.preventDefault();
          setFillScreen(!fillScreen);
          return;
        }
        // Video speed control for full-screen
        if (selectedPhoto.type === 'video' && (event.key === 'q' || event.key === 'Q' || event.key === 'e' || event.key === 'E')) {
          event.preventDefault();
          const video = document.querySelector('.fixed video');
          if (video) {
            let newSpeed = video.playbackRate;
            if (event.key === 'q' || event.key === 'Q') {
              newSpeed = Math.max(0.1, Math.round((video.playbackRate - 0.1) * 10) / 10);
            } else if (event.key === 'e' || event.key === 'E') {
              newSpeed = Math.min(8.0, Math.round((video.playbackRate + 0.1) * 10) / 10);
            }
            video.playbackRate = newSpeed;
            setVideoSpeed(newSpeed);
            setOverlayTarget('fullscreen');
            setShowSpeedOverlay(true);
          }
          return;
        }
        // Reset speed for full-screen
        if (selectedPhoto.type === 'video' && (event.key === 'r' || event.key === 'R')) {
          event.preventDefault();
          const video = document.querySelector('.fixed video');
          if (video) {
            video.playbackRate = 1.0;
            setVideoSpeed(1.0);
            setOverlayTarget('fullscreen');
            setShowSpeedOverlay(true);
          }
          return;
        }
        // Prevent scrolling
        if (['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'].includes(event.key)) {
          event.preventDefault();
          
          const currentIndex = photos.findIndex(photo => photo.path === selectedPhoto.path);
          let nextIndex;
          
          if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            // Previous image
            nextIndex = currentIndex > 0 ? currentIndex - 1 : photos.length - 1;
          } else {
            // Next image
            nextIndex = currentIndex < photos.length - 1 ? currentIndex + 1 : 0;
          }
          
          setSelectedPhoto(photos[nextIndex]);
        } else if (selectedPhoto.type === 'video' && (event.key === 'a' || event.key === 'A')) {
          event.preventDefault();
          const video = document.querySelector('.fixed video');
          if (video && video.readyState >= 1) {
            video.currentTime = Math.max(0, video.currentTime - 5);
          }
        } else if (selectedPhoto.type === 'video' && (event.key === 'd' || event.key === 'D')) {
          event.preventDefault();
          const video = document.querySelector('.fixed video');
          if (video && video.readyState >= 1 && video.duration) {
            video.currentTime = Math.min(video.duration, video.currentTime + 5);
          }
        }
      } else {
        // When not in full-screen mode, 'i' key still toggles info
        if (event.key === 'i' || event.key === 'I') {
          event.preventDefault();
          toggleImageInfo();
        }
        // Video speed control for hovered video
        if (hoveredVideo && (event.key === 'q' || event.key === 'Q' || event.key === 'e' || event.key === 'E')) {
          event.preventDefault();
          let newSpeed = hoveredVideo.playbackRate;
          if (event.key === 'q' || event.key === 'Q') {
            newSpeed = Math.max(0.1, Math.round((hoveredVideo.playbackRate - 0.1) * 10) / 10);
          } else if (event.key === 'e' || event.key === 'E') {
            newSpeed = Math.min(8.0, Math.round((hoveredVideo.playbackRate + 0.1) * 10) / 10);
          }
          hoveredVideo.playbackRate = newSpeed;
          setVideoSpeed(newSpeed);
          setOverlayTarget('hover');
          setShowSpeedOverlay(true);
        }
        // Reset speed for hovered video
        if (hoveredVideo && (event.key === 'r' || event.key === 'R')) {
          event.preventDefault();
          hoveredVideo.playbackRate = 1.0;
          setVideoSpeed(1.0);
          setOverlayTarget('hover');
          setShowSpeedOverlay(true);
        }
        // Video seek for hovered video
        if (hoveredVideo && (event.key === 'a' || event.key === 'A')) {
          event.preventDefault();
          if (hoveredVideo.readyState >= 1) {
            hoveredVideo.currentTime = Math.max(0, hoveredVideo.currentTime - 5);
          }
        } else if (hoveredVideo && (event.key === 'd' || event.key === 'D')) {
          event.preventDefault();
          if (hoveredVideo.readyState >= 1 && hoveredVideo.duration) {
            hoveredVideo.currentTime = Math.min(hoveredVideo.duration, hoveredVideo.currentTime + 5);
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedPhoto, photos, toggleImageInfo, hoveredVideo, fillScreen]);

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
    setSelectedPhoto(photo);
  };

  const closeFullScreen = () => {
    setSelectedPhoto(null);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleImageSizeChange = (event) => {
    setImageSize(parseInt(event.target.value));
  };

  if (loading && folders.length === 0) {
    return React.createElement('div', { className: 'min-h-screen flex items-center justify-center' },
      React.createElement('div', { className: 'text-center' },
        React.createElement('div', { className: 'text-blue-600 text-4xl mb-4' }, '⏳'),
        React.createElement('p', { className: 'text-gray-600' }, 'Loading photo viewer...')
      )
    );
  }

  return React.createElement('div', { className: 'min-h-screen bg-gray-50' },
    React.createElement('header', { className: 'bg-white shadow-sm border-b border-gray-200' },
      React.createElement('div', { className: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8' },
        React.createElement('div', { className: 'flex items-center justify-between h-16' },
          React.createElement('div', { className: 'flex items-center space-x-3' },
            React.createElement('div', { className: 'text-blue-600 text-2xl' }, '📸'),
            React.createElement('h1', { className: 'text-xl font-semibold text-gray-900' }, 'Viewarr')
          ),
          React.createElement('div', { className: 'flex items-center space-x-4' },
            selectedFolder && 
              React.createElement('div', { className: 'text-sm text-gray-500' },
                'Viewing: ',
                React.createElement('span', { className: 'font-medium text-gray-900' }, selectedFolder.name)
              ),
            React.createElement('div', { className: 'flex items-center space-x-2 bg-red-200 p-3 rounded border-2 border-red-500' },
              React.createElement('span', { className: 'text-sm font-bold text-red-800' }, 'SIZE:'),
              React.createElement('input', {
                type: 'range',
                min: '100',
                max: '1500',
                value: imageSize,
                onChange: handleImageSizeChange,
                className: 'w-32 h-4 bg-red-300 rounded-lg appearance-none cursor-pointer slider'
              }),
              React.createElement('span', { className: 'text-sm font-bold text-red-800 w-16' }, `${imageSize}px`)
            ),
            React.createElement('div', { className: 'flex items-center space-x-2 bg-green-200 p-3 rounded border-2 border-green-500' },
              React.createElement('span', { className: 'text-sm font-bold text-green-800' }, 'INFO:'),
              React.createElement('button', {
                onClick: toggleImageInfo,
                className: `relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  showImageInfo ? 'bg-green-600' : 'bg-gray-300'
                }`
              },
                React.createElement('span', {
                  className: `inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showImageInfo ? 'translate-x-6' : 'translate-x-1'
                  }`
                })
              ),
              React.createElement('span', { className: 'text-sm font-bold text-green-800 w-12' }, showImageInfo ? 'ON' : 'OFF')
            )
          )
        )
      )
    ),
    React.createElement('div', { className: 'flex h-screen' },
      React.createElement('div', { 
        className: `transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-16' : 'w-80'
        } bg-white shadow-sm border-r border-gray-200 flex-shrink-0`
      },
        React.createElement('div', { className: 'flex items-center justify-between p-4 border-b border-gray-200' },
          !sidebarCollapsed && React.createElement('h2', { className: 'text-lg font-semibold text-gray-900' }, 'Folders'),
          React.createElement('button', {
            onClick: toggleSidebar,
            className: 'p-2 rounded-lg hover:bg-gray-100 transition-colors',
            title: sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
          }, sidebarCollapsed ? '▶' : '◀')
        ),
        !sidebarCollapsed && React.createElement(FolderList, {
          folders: folders,
          selectedFolder: selectedFolder?.path,
          onFolderSelect: handleFolderSelect
        }),
        sidebarCollapsed && React.createElement('div', { className: 'p-2' },
          folders.map((folder) =>
            React.createElement('div', {
              key: folder.path,
              className: `p-2 cursor-pointer rounded-lg transition-colors duration-200 ${
                selectedFolder?.path === folder.path
                  ? 'bg-blue-100 text-blue-600'
                  : 'hover:bg-gray-100'
              }`,
              onClick: () => handleFolderSelect(folder),
              title: folder.name
            }, '📁')
          )
        )
      ),
      React.createElement('div', { className: 'flex-1 overflow-auto p-8' },
        error ? 
          React.createElement('div', { className: 'mb-6 bg-red-50 border border-red-200 rounded-lg p-4' },
            React.createElement('p', { className: 'text-red-800' }, error),
            React.createElement('button', {
              onClick: loadFolders,
              className: 'mt-2 text-sm text-red-600 hover:text-red-800 underline'
            }, 'Try again')
          ) : 
          selectedFolder ? 
            React.createElement('div', null,
              React.createElement('div', { className: 'mb-6' },
                React.createElement('h2', { className: 'text-2xl font-bold text-gray-900 mb-2' }, selectedFolder.name),
                React.createElement('p', { className: 'text-gray-600' },
                  `${photos.length} ${photos.length === 1 ? 'photo' : 'photos'}`
                )
              ),
              loading ? 
                React.createElement('div', { className: 'flex items-center justify-center py-12' },
                  React.createElement('div', { className: 'text-blue-600 mr-2' }, '⏳'),
                  React.createElement('span', { className: 'text-gray-600' }, 'Loading photos...')
                ) : 
                photos.length > 0 ? 
                  React.createElement(PhotoGrid, { 
                    photos: photos, 
                    onPhotoClick: handlePhotoClick,
                    imageSize: imageSize,
                    showImageInfo: showImageInfo,
                    setHoveredVideo: setHoveredVideo,
                    videoSpeed: videoSpeed,
                    showSpeedOverlay: showSpeedOverlay,
                    overlayTarget: overlayTarget
                  }) : 
                  React.createElement('div', { className: 'text-center py-12' },
                    React.createElement('div', { className: 'text-gray-300 text-4xl mb-3' }, '📸'),
                    React.createElement('p', { className: 'text-gray-500' }, 'No photos found in this folder')
                  )
            ) : 
            React.createElement('div', { className: 'text-center py-12' },
              React.createElement('div', { className: 'text-gray-300 text-5xl mb-4' }, '📸'),
              React.createElement('h2', { className: 'text-xl font-semibold text-gray-900 mb-2' },
                'Welcome to Viewarr'
              ),
              React.createElement('p', { className: 'text-gray-600' },
                'Select a folder from the sidebar to view your photos'
              )
            )
      ),
      // Full-screen image modal
      selectedPhoto && React.createElement('div', {
        className: 'fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center',
        onClick: closeFullScreen
      },
        React.createElement('div', {
          className: 'relative max-w-full max-h-full p-4',
          onClick: (e) => e.stopPropagation()
        },
          // Speed overlay for fullscreen video
          showSpeedOverlay && overlayTarget === 'fullscreen' && selectedPhoto.type === 'video' && React.createElement('div', {
            className: 'absolute top-4 left-4 z-20 bg-black bg-opacity-70 text-white px-4 py-2 rounded text-lg font-bold pointer-events-none',
            style: { transition: 'opacity 0.3s', opacity: showSpeedOverlay ? 1 : 0 }
          }, `${videoSpeed.toFixed(2)}x`),
          // Close button
          React.createElement('button', {
            onClick: closeFullScreen,
            className: 'absolute top-4 right-4 z-10 bg-black bg-opacity-50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75 transition-colors'
          }, '✕'),
          // Image info overlay
          showImageInfo && React.createElement('div', {
            className: 'absolute top-4 left-4 z-10 bg-black bg-opacity-50 text-white rounded-lg p-3 max-w-md'
          },
            React.createElement('h3', { className: 'text-lg font-semibold mb-2' }, selectedPhoto.name),
            React.createElement('div', { className: 'text-sm text-gray-300' },
              React.createElement('div', null, `Size: ${formatFileSize(selectedPhoto.size)}`),
              React.createElement('div', null, `Modified: ${formatDate(selectedPhoto.modified)}`),
              React.createElement('div', null, `Type: ${selectedPhoto.type}`)
            )
          ),
          // Main image/video
          selectedPhoto.type === 'image' ?
            React.createElement('img', {
              src: photoApi.getPhotoUrl(selectedPhoto.path),
              alt: selectedPhoto.name,
              className: fillScreen ? 'w-full h-full object-contain' : 'max-w-full max-h-full object-contain',
              style: fillScreen ? { width: '100vw', height: '100vh' } : { maxHeight: 'calc(100vh - 2rem)' }
            }) :
            React.createElement('video', {
              src: photoApi.getPhotoUrl(selectedPhoto.path),
              controls: true,
              className: fillScreen ? 'w-full h-full object-contain' : 'max-w-full max-h-full object-contain',
              style: fillScreen ? { width: '100vw', height: '100vh' } : { maxHeight: 'calc(100vh - 2rem)' },
              autoPlay: true
            })
        )
      )
    )
  );
}

ReactDOM.render(React.createElement(App), document.getElementById('root')); 