const { useState, useEffect } = React;

const API_BASE_URL = 'http://localhost:8000';

const photoApi = {
  getFolders: async () => {
    const response = await axios.get(`${API_BASE_URL}/api/folders`);
    return response.data;
  },
  getSubfolders: async (folderPath) => {
    const response = await axios.get(`${API_BASE_URL}/api/subfolders/${encodeURIComponent(folderPath)}`);
    return response.data;
  },
  getPhotos: async (folderPath) => {
    const response = await axios.get(`${API_BASE_URL}/api/photos/${encodeURIComponent(folderPath)}`);
    return response.data;
  },
  getPhotoUrl: (photoPath) => {
    return `${API_BASE_URL}/api/photo/${encodeURIComponent(photoPath)}`;
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

// Performance monitoring for lazy loading
const lazyLoadingStats = {
  totalVideos: 0,
  loadedVideos: 0,
  hoverLoads: 0,
  clickLoads: 0,
  startTime: Date.now()
};

const logLazyLoadingStats = () => {
  const elapsed = Date.now() - lazyLoadingStats.startTime;
  console.log('📊 Lazy Loading Performance Stats:');
  console.log(`- Total videos: ${lazyLoadingStats.totalVideos}`);
  console.log(`- Loaded videos: ${lazyLoadingStats.loadedVideos}`);
  console.log(`- Hover loads: ${lazyLoadingStats.hoverLoads}`);
  console.log(`- Click loads: ${lazyLoadingStats.clickLoads}`);
  console.log(`- Load rate: ${((lazyLoadingStats.loadedVideos / lazyLoadingStats.totalVideos) * 100).toFixed(1)}%`);
  console.log(`- Time elapsed: ${(elapsed / 1000).toFixed(1)}s`);
};

// Make stats available globally for debugging
window.getLazyLoadingStats = () => {
  const elapsed = Date.now() - lazyLoadingStats.startTime;
  return {
    ...lazyLoadingStats,
    elapsedSeconds: (elapsed / 1000).toFixed(1),
    loadRate: lazyLoadingStats.totalVideos > 0 ? ((lazyLoadingStats.loadedVideos / lazyLoadingStats.totalVideos) * 100).toFixed(1) : '0'
  };
};

window.resetLazyLoadingStats = () => {
  lazyLoadingStats.totalVideos = 0;
  lazyLoadingStats.loadedVideos = 0;
  lazyLoadingStats.hoverLoads = 0;
  lazyLoadingStats.clickLoads = 0;
  lazyLoadingStats.startTime = Date.now();
  console.log('🔄 Lazy loading stats reset');
};

// Video Thumbnail Component with Lazy Loading
const VideoThumbnail = ({ photo, imageSize, isMuted, setHoveredVideo, hoveredVideo, showSpeedOverlay, videoSpeed, overlayTarget, originalAspectRatio, onPhotoClick }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailStatus, setThumbnailStatus] = useState('not_started');
  const [videoAspectRatio, setVideoAspectRatio] = useState(null);
  const videoRef = React.useRef(null);
  const hoverTimeoutRef = React.useRef(null);
  const thumbnailPollingRef = React.useRef(null);

  // Track this video in stats
  React.useEffect(() => {
    lazyLoadingStats.totalVideos++;
  }, []);

  // Add event listener for video ready state
  React.useEffect(() => {
    const video = videoRef.current;
    if (video) {
      const handleCanPlay = () => {
        console.log('Video canplay event fired for:', photo.path);
        setIsVideoReady(true);
      };
      
      const handleLoadedMetadata = () => {
        console.log('Video loadedmetadata event fired for:', photo.path);
        if (video.videoWidth && video.videoHeight) {
          const aspectRatio = video.videoWidth / video.videoHeight;
          console.log('Video aspect ratio:', aspectRatio, 'for:', photo.path);
          setVideoAspectRatio(aspectRatio);
        }
      };
      
      video.addEventListener('canplay', handleCanPlay);
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      
      return () => {
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };
    }
  }, [isLoaded]);

  // Auto-play video when it becomes ready and we're hovering
  React.useEffect(() => {
    if (isVideoReady && isHovered && videoRef.current) {
      console.log('Video became ready while hovering, attempting to play:', photo.path);
      videoRef.current.play().catch((error) => {
        console.log('Error auto-playing video:', error);
      });
      setHoveredVideo(videoRef.current);
      setHasPlayed(true);
    }
  }, [isVideoReady, isHovered, photo.path]);

  // Fallback: if video is loaded but not ready after 1 second, show it anyway
  React.useEffect(() => {
    if (isLoaded && !isVideoReady) {
      const timeout = setTimeout(() => {
        console.log('Using timeout fallback for video:', photo.path);
        setIsVideoReady(true);
      }, 1000);
      
      return () => clearTimeout(timeout);
    }
  }, [isLoaded, isVideoReady, photo.path]);

  // Load thumbnail asynchronously
  React.useEffect(() => {
    const loadThumbnail = async () => {
      try {
        // First check if thumbnail is ready
        const statusResponse = await fetch(`${API_BASE_URL}/api/thumbnail-status/${encodeURIComponent(photo.path)}`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          
          if (statusData.status === 'ready') {
            setThumbnail(statusData.thumbnail);
            setThumbnailStatus('ready');
            return;
          } else if (statusData.status === 'processing') {
            setThumbnailStatus('processing');
            // Start polling for completion
            startThumbnailPolling();
            return;
          }
        }
        
        // If not started, initiate thumbnail generation
        const response = await fetch(`${API_BASE_URL}/api/thumbnail/${encodeURIComponent(photo.path)}`);
        if (response.ok) {
          const data = await response.json();
          
          if (data.thumbnail) {
            // Immediate response (cached)
            setThumbnail(data.thumbnail);
            setThumbnailStatus('ready');
          } else if (data.status === 'processing' || data.status === 'queued') {
            // Started processing or queued, begin polling
            setThumbnailStatus('processing');
            startThumbnailPolling();
          }
        }
      } catch (error) {
        console.log('Could not load thumbnail for video:', photo.path);
        setThumbnailStatus('failed');
      }
    };
    
    loadThumbnail();
    
    // Cleanup polling on unmount
    return () => {
      if (thumbnailPollingRef.current) {
        clearTimeout(thumbnailPollingRef.current);
      }
    };
  }, [photo.path]);

  // Calculate aspect ratio from thumbnail when it loads
  React.useEffect(() => {
    if (thumbnail && thumbnailStatus === 'ready') {
      const img = new Image();
      img.onload = () => {
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        console.log('Calculated aspect ratio from thumbnail:', aspectRatio, 'for:', photo.path);
        setVideoAspectRatio(aspectRatio);
      };
      img.src = thumbnail;
    }
  }, [thumbnail, thumbnailStatus, photo.path]);

  const startThumbnailPolling = () => {
    const pollThumbnail = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/thumbnail-status/${encodeURIComponent(photo.path)}`);
        if (response.ok) {
          const data = await response.json();
          
          if (data.status === 'ready') {
            setThumbnail(data.thumbnail);
            setThumbnailStatus('ready');
            return; // Stop polling
          } else if (data.status === 'processing') {
            // Continue polling
            thumbnailPollingRef.current = setTimeout(pollThumbnail, 1000); // Poll every second
          }
        }
      } catch (error) {
        console.log('Error polling thumbnail status:', error);
        setThumbnailStatus('failed');
      }
    };
    
    // Start polling after 1 second
    thumbnailPollingRef.current = setTimeout(pollThumbnail, 1000);
  };

  // Cleanup effect
  React.useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (thumbnailPollingRef.current) {
        clearTimeout(thumbnailPollingRef.current);
      }
    };
  }, []);

  const handleMouseEnter = (e) => {
    console.log('Mouse enter for video:', photo.path, 'isLoaded:', isLoaded, 'isVideoReady:', isVideoReady);
    setIsHovered(true);
    
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Add a small delay to prevent loading on quick hovers
    hoverTimeoutRef.current = setTimeout(() => {
      if (videoRef.current && !isLoaded && !isLoading) {
        console.log('Loading video on hover:', photo.path);
        setIsLoading(true);
        // Load the video source only when hovered for a moment
        videoRef.current.src = photoApi.getPhotoUrl(photo.path);
        setIsLoaded(true);
        // Don't set isVideoReady yet - wait for canplay event
        setIsLoading(false);
        lazyLoadingStats.loadedVideos++;
        lazyLoadingStats.hoverLoads++;
        logLazyLoadingStats();
      }
      if (videoRef.current && isLoaded) {
        console.log('Playing video on hover:', photo.path, 'isVideoReady:', isVideoReady);
        videoRef.current.play().catch((error) => {
          console.log('Error playing video:', error);
        });
        setHoveredVideo(videoRef.current);
      }
    }, 200); // 200ms delay
  };

  const handleMouseLeave = (e) => {
    setIsHovered(false);
    setIsLoading(false);
    
    // Clear the timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    if (videoRef.current && isLoaded) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setHoveredVideo(null);
    }
  };

  const handleClick = () => {
    // Clear any pending hover timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    // Ensure video is loaded when clicked
    if (videoRef.current && !isLoaded) {
      setIsLoading(true);
      videoRef.current.src = photoApi.getPhotoUrl(photo.path);
      setIsLoaded(true);
      // Don't set isVideoReady yet - wait for canplay event
      setIsLoading(false);
      lazyLoadingStats.loadedVideos++;
      lazyLoadingStats.clickLoads++;
      logLazyLoadingStats();
    }
    onPhotoClick?.(photo);
  };

  // Determine video style based on layout mode
  const videoStyle = originalAspectRatio ? 
    { width: '100%', height: 'auto', maxWidth: '100%', transition: 'transform 0.2s' } :
    { width: '100%', height: `${imageSize}px`, objectFit: 'cover', transition: 'transform 0.2s' };

  // Thumbnail style - for original aspect ratio, preserve original aspect ratio without distortion
  const thumbnailStyle = originalAspectRatio ? 
    { width: '100%', height: 'auto', maxWidth: '100%', transition: 'transform 0.2s' } :
    { width: '100%', height: `${imageSize}px`, objectFit: 'cover', transition: 'transform 0.2s' };

  // Base video element style that maintains grid layout
  const baseVideoStyle = originalAspectRatio ? 
    { width: '100%', height: 'auto', maxWidth: '100%' } :
    { width: '100%', height: `${imageSize}px`, objectFit: 'cover' };

  return React.createElement('div', { 
    className: 'relative',
    style: originalAspectRatio ? {
      width: '100%',
      aspectRatio: videoAspectRatio ? videoAspectRatio.toString() : '16/9', // Use calculated aspect ratio or default
      backgroundColor: 'transparent',
      border: '1px solid transparent' // Invisible border to maintain shape
    } : {
      width: '100%',
      height: `${imageSize}px`
    }
  },
    // Always show thumbnail when available, but fade it out when video is ready
    thumbnail && thumbnailStatus === 'ready' ? 
      React.createElement('img', {
        src: thumbnail,
        style: {
          ...thumbnailStyle,
          ...(originalAspectRatio && {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            position: 'absolute',
            top: 0,
            left: 0,
            opacity: (isVideoReady && (isHovered || hasPlayed)) ? 0 : 1,
            transition: 'opacity 1s ease-in-out',
            zIndex: 1
          }),
          ...(!originalAspectRatio && {
            opacity: (isVideoReady && (isHovered || hasPlayed)) ? 0 : 1,
            transition: 'opacity 1s ease-in-out',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 1,
            width: '100%',
            height: `${imageSize}px`,
            objectFit: 'cover'
          })
        },
        className: 'w-full h-auto',
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        onClick: handleClick
      }) : null,
    // Video element (always rendered, but only visible when ready to play)
    React.createElement('video', {
      ref: videoRef,
      style: { 
        ...baseVideoStyle, 
        opacity: (isVideoReady && (isHovered || hasPlayed)) ? 1 : 0,
        pointerEvents: isVideoReady ? 'auto' : 'none',
        position: originalAspectRatio ? 'absolute' : (isVideoReady ? 'relative' : 'absolute'),
        top: originalAspectRatio ? 0 : (isVideoReady ? 'auto' : 0),
        left: originalAspectRatio ? 0 : (isVideoReady ? 'auto' : 0),
        ...(originalAspectRatio && {
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }),
        ...(!originalAspectRatio && {
          width: '100%',
          height: `${imageSize}px`,
          objectFit: 'cover'
        }),
        overflow: 'hidden',
        transition: 'opacity 1s ease-in-out',
        zIndex: originalAspectRatio ? (isVideoReady ? 2 : 1) : 1,
        backgroundColor: '#000000' // Black background to prevent white flash
      },
      preload: 'none', // Don't preload anything
      muted: isMuted,
      loop: true,
      onMouseEnter: handleMouseEnter,
      onMouseLeave: handleMouseLeave,
      onClick: handleClick
    }),
    // Thumbnail processing indicator
    !isLoaded && thumbnailStatus === 'processing' && React.createElement('div', {
      className: 'absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 pointer-events-none'
    },
      React.createElement('div', { className: 'text-white text-xs' }, 'Generating thumbnail...')
    ),
    // Loading indicator
    (isLoading || (isLoaded && !isVideoReady)) && React.createElement('div', {
      className: 'absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 pointer-events-none'
    },
      React.createElement('div', { className: 'text-white text-sm' }, 'Loading...')
    ),
    // Speed overlay for hovered video
    showSpeedOverlay && overlayTarget === 'hover' && React.createElement('div', {
      className: 'absolute top-2 left-2 z-20 bg-black bg-opacity-70 text-white px-3 py-1 rounded text-base font-bold pointer-events-none',
      style: { transition: 'opacity 0.3s', opacity: showSpeedOverlay ? 1 : 0 }
    }, `${videoSpeed.toFixed(2)}x`),
    // Play button overlay (shows when not hovered or when video not ready)
    React.createElement('div', {
      className: 'absolute inset-0 flex items-center justify-center bg-black bg-opacity-30 pointer-events-none',
      style: { 
        opacity: (hoveredVideo && hoveredVideo.src === photoApi.getPhotoUrl(photo.path)) || (isHovered && isVideoReady) ? 0 : 1, 
        transition: 'opacity 0.2s',
        zIndex: 10
      }
    },
      React.createElement('div', { className: 'text-white text-4xl' }, '▶')
    ),
    // Top-right corner play symbol
    React.createElement('div', {
      className: 'absolute top-2 right-2 text-white drop-shadow text-sm',
      style: { zIndex: 10 }
    }, '▶')
  );
};

const PhotoGrid = ({ photos, onPhotoClick, imageSize, showImageInfo, setHoveredVideo, hoveredVideo, videoSpeed, showSpeedOverlay, overlayTarget, originalAspectRatio, isMuted }) => {
  // Row-first masonry logic
  if (originalAspectRatio) {
    // Calculate number of columns based on window width and imageSize
    const columnCount = Math.max(1, Math.floor(window.innerWidth / (imageSize + 16)));
    // Distribute photos into columns row-first
    const columns = Array.from({ length: columnCount }, () => []);
    photos.forEach((photo, idx) => {
      columns[idx % columnCount].push(photo);
    });
    // Render columns
    return React.createElement('div', {
      style: {
        display: 'flex',
        gap: '1rem',
        alignItems: 'flex-start',
        width: '100%'
      }
    },
      columns.map((col, colIdx) =>
        React.createElement('div', {
          key: colIdx,
          style: { flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }
        },
          col.map((photo) =>
            React.createElement('div', {
              key: photo.path,
              className: 'photo-card cursor-pointer',
              style: { 
                marginBottom: '1rem',
                width: '100%'
              },
              onClick: () => onPhotoClick?.(photo)
            },
              React.createElement('div', { className: 'relative' },
                photo.type === 'image' ?
                  React.createElement('img', {
                    src: photoApi.getPhotoUrl(photo.path),
                    alt: photo.name,
                    style: { width: '100%', height: 'auto', maxWidth: '100%', transition: 'transform 0.2s' },
                    loading: 'lazy'
                  }) :
                  React.createElement(VideoThumbnail, {
                    photo: photo,
                    imageSize: imageSize,
                    isMuted: isMuted,
                    setHoveredVideo: setHoveredVideo,
                    hoveredVideo: hoveredVideo,
                    showSpeedOverlay: showSpeedOverlay,
                    videoSpeed: videoSpeed,
                    overlayTarget: overlayTarget,
                    originalAspectRatio: originalAspectRatio,
                    onPhotoClick: onPhotoClick
                  }),
                React.createElement('div', { className: 'absolute top-2 right-2' },
                  photo.type === 'image' ?
                    React.createElement('div', { className: 'text-white drop-shadow text-sm' }, '📷') :
                    React.createElement('div', { className: 'text-white drop-shadow text-sm' }, '▶')
                )
              ),
              showImageInfo && React.createElement('div', { 
                className: 'p-3',
                style: { 
                  position: 'relative',
                  zIndex: 10,
                  backgroundColor: 'white',
                  borderTop: '1px solid #e5e7eb'
                }
              },
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
        )
      )
    );
  }

  // Default grid layout
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
            React.createElement(VideoThumbnail, {
              photo: photo,
              imageSize: imageSize,
              isMuted: isMuted,
              setHoveredVideo: setHoveredVideo,
              hoveredVideo: hoveredVideo,
              showSpeedOverlay: showSpeedOverlay,
              videoSpeed: videoSpeed,
              overlayTarget: overlayTarget,
              originalAspectRatio: originalAspectRatio,
              onPhotoClick: onPhotoClick
            }),
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

const FolderList = ({ folders, selectedFolder, onFolderSelect, expandedFolders, setExpandedFolders, subfolders, setSubfolders, selectedFolders, setSelectedFolders, loadPhotosFromMultipleFolders }) => {
  // Helper function to get all subfolder paths recursively
  const getAllSubfolderPaths = async (folderPath) => {
    const paths = [];
    
    try {
      // Fetch subfolders for this path if not already cached
      let folderSubfolders = subfolders[folderPath];
      if (!folderSubfolders) {
        folderSubfolders = await photoApi.getSubfolders(folderPath);
        setSubfolders(prev => ({ ...prev, [folderPath]: folderSubfolders }));
      }
      
      for (const subfolder of folderSubfolders) {
        paths.push(subfolder.path);
        // Recursively get subfolders of this subfolder
        const subPaths = await getAllSubfolderPaths(subfolder.path);
        paths.push(...subPaths);
      }
    } catch (error) {
      console.error(`Error getting subfolders for ${folderPath}:`, error);
    }
    
    return paths;
  };

  const toggleFolder = async (folder) => {
    const isExpanded = expandedFolders.has(folder.path);
    
    if (isExpanded) {
      // Collapse folder
      const newExpanded = new Set(expandedFolders);
      newExpanded.delete(folder.path);
      setExpandedFolders(newExpanded);
    } else {
      // Expand folder and load subfolders
      const newExpanded = new Set(expandedFolders);
      newExpanded.add(folder.path);
      setExpandedFolders(newExpanded);
      
      // Load subfolders if not already cached
      if (!subfolders[folder.path]) {
        try {
          const subfolderData = await photoApi.getSubfolders(folder.path);
          setSubfolders(prev => ({ ...prev, [folder.path]: subfolderData }));
        } catch (error) {
          console.error('Error loading subfolders:', error);
        }
      }
    }
  };

  const renderFolder = (folder, level = 0) => {
    const getAllSubfolderPaths = async (folderPath) => {
      const paths = [];
      
      try {
        // Fetch subfolders for this path if not already cached
        let folderSubfolders = subfolders[folderPath];
        if (!folderSubfolders) {
          folderSubfolders = await photoApi.getSubfolders(folderPath);
          setSubfolders(prev => ({ ...prev, [folderPath]: folderSubfolders }));
        }
        
        for (const subfolder of folderSubfolders) {
          paths.push(subfolder.path);
          // Recursively get subfolders of this subfolder
          const subPaths = await getAllSubfolderPaths(subfolder.path);
          paths.push(...subPaths);
        }
      } catch (error) {
        console.error(`Error getting subfolders for ${folderPath}:`, error);
      }
      
      return paths;
    };
    const isExpanded = expandedFolders.has(folder.path);
    const folderSubfolders = subfolders[folder.path] || [];
    const hasSubfolders = folder.has_subfolders;
    const isChecked = selectedFolders.has(folder.path);
    
    const handleFolderClick = () => {
      // Clear all checkboxes when clicking on folder area
      setSelectedFolders(new Set());
      onFolderSelect(folder);
    };
    
    const handleCheckboxClick = async (e) => {
      e.stopPropagation();
      const newSelected = new Set(selectedFolders);
      
      // Check if this folder is collapsed and has subfolders
      const isCollapsed = !expandedFolders.has(folder.path);
      const hasSubfolders = folder.has_subfolders;
      
      if (isCollapsed && hasSubfolders) {
        // If collapsed and has subfolders, toggle all subfolders recursively
        const allSubfolderPaths = await getAllSubfolderPaths(folder.path);
        console.log('Collapsed folder with subfolders detected. All subfolder paths:', allSubfolderPaths);
        
        if (isChecked) {
          // Remove this folder and all its subfolders
          newSelected.delete(folder.path);
          allSubfolderPaths.forEach(path => newSelected.delete(path));
        } else {
          // Add this folder and all its subfolders
          newSelected.add(folder.path);
          allSubfolderPaths.forEach(path => newSelected.add(path));
        }
      } else {
        // Normal single folder toggle
        if (isChecked) {
          newSelected.delete(folder.path);
        } else {
          newSelected.add(folder.path);
        }
      }
      
      setSelectedFolders(newSelected);
      
      console.log('Checkbox clicked for folder:', folder.path);
      console.log('Is collapsed:', isCollapsed, 'Has subfolders:', hasSubfolders);
      console.log('New selected folders:', Array.from(newSelected));
      
      // Clear the selected folder when using checkboxes
      onFolderSelect(null);
      
      // Load photos from all selected folders
      if (newSelected.size > 0) {
        console.log('Calling loadPhotosFromMultipleFolders with:', Array.from(newSelected));
        loadPhotosFromMultipleFolders(Array.from(newSelected));
      } else {
        // Clear photos when no folders are selected
        console.log('No folders selected, clearing photos');
        setPhotos([]);
      }
    };
    
    return React.createElement('div', { key: folder.path },
      React.createElement('div', {
        className: `p-4 cursor-pointer transition-colors duration-200 ${
          selectedFolder === folder.path
            ? 'bg-blue-50 border-r-2 border-blue-500'
            : 'hover:bg-gray-50'
        }`,
        style: { paddingLeft: `${level * 16 + 16}px` },
        onClick: handleFolderClick
      },
        React.createElement('div', { className: 'flex items-center space-x-3' },
          hasSubfolders && React.createElement('button', {
            className: `text-gray-400 hover:text-gray-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`,
            onClick: (e) => {
              e.stopPropagation();
              toggleFolder(folder);
            },
            style: { width: '16px', height: '16px' }
          }, '▶'),
          React.createElement('div', { className: 'text-gray-500 text-lg' }, '📁'),
          React.createElement('div', { className: 'flex-1 min-w-0' },
            React.createElement('p', { className: 'text-sm font-medium text-gray-900 truncate' }, folder.name),
            React.createElement('p', { className: 'text-xs text-gray-500' },
              `${folder.file_count} ${folder.file_count === 1 ? 'file' : 'files'}`
            )
          ),
          React.createElement('input', {
            type: 'checkbox',
            checked: isChecked,
            onChange: handleCheckboxClick,
            className: 'ml-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded',
            onClick: (e) => e.stopPropagation()
          })
        )
      ),
      // Render subfolders if expanded
      isExpanded && folderSubfolders.map(subfolder => renderFolder(subfolder, level + 1))
    );
  };

  return React.createElement('div', { className: 'divide-y divide-gray-200' },
    folders.map(folder => renderFolder(folder)),
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
  const [originalAspectRatio, setOriginalAspectRatio] = useState(false); // Toggle original aspect ratio in grid
  const [isMuted, setIsMuted] = useState(true); // Track mute state for videos
  const [expandedFolders, setExpandedFolders] = useState(new Set()); // Track which folders are expanded
  const [subfolders, setSubfolders] = useState({}); // Cache subfolders by parent folder path
  const [selectedFolders, setSelectedFolders] = useState(new Set()); // Track which folders are checked

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
        // Toggle mute for full-screen video
        if (selectedPhoto.type === 'video' && (event.key === 'm' || event.key === 'M')) {
          event.preventDefault();
          const video = document.querySelector('.fixed video');
          if (video) {
            video.muted = !video.muted;
            setIsMuted(video.muted);
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
        // Toggle original aspect ratio in grid
        if (event.key === 'p' || event.key === 'P') {
          event.preventDefault();
          setOriginalAspectRatio(!originalAspectRatio);
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
        // Toggle mute for hovered video
        if (hoveredVideo && (event.key === 'm' || event.key === 'M')) {
          event.preventDefault();
          hoveredVideo.muted = !hoveredVideo.muted;
          setIsMuted(hoveredVideo.muted);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
      }, [selectedPhoto, photos, toggleImageInfo, hoveredVideo, fillScreen, originalAspectRatio]);

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

  const loadPhotosFromMultipleFolders = async (folderPaths) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading photos from multiple folders:', folderPaths);
      
      // Load photos from all selected folders
      const allPhotos = [];
      for (const folderPath of folderPaths) {
        try {
          const photoData = await photoApi.getPhotos(folderPath);
          console.log(`Loaded ${photoData.photos.length} photos from ${folderPath}`);
          allPhotos.push(...photoData.photos);
        } catch (err) {
          console.error(`Error loading photos from ${folderPath}:`, err);
        }
      }
      
      console.log(`Total photos loaded: ${allPhotos.length}`);
      
      // Sort all photos by name
      allPhotos.sort((a, b) => a.name.localeCompare(b.name));
      setPhotos(allPhotos);
    } catch (err) {
      setError('Failed to load photos from selected folders.');
      console.error('Error loading photos from multiple folders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFolderSelect = (folder) => {
    if (folder === null) {
      // Clear selected folder when using checkboxes
      setSelectedFolder(null);
    } else {
      setSelectedFolder(folder);
      // Clear all checkboxes when selecting a single folder
      setSelectedFolders(new Set());
    }
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
            selectedFolder && selectedFolders.size === 0 &&
              React.createElement('div', { className: 'text-sm text-gray-500' },
                'Viewing: ',
                React.createElement('span', { className: 'font-medium text-gray-900' }, selectedFolder.name)
              ),
            selectedFolders.size > 0 &&
              React.createElement('div', { className: 'text-sm text-gray-500' },
                'Viewing: ',
                React.createElement('span', { className: 'font-medium text-gray-900' }, 
                  `${selectedFolders.size} selected folder${selectedFolders.size === 1 ? '' : 's'}`
                )
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
            ),
            React.createElement('div', { className: 'flex items-center space-x-2 bg-blue-200 p-3 rounded border-2 border-blue-500' },
              React.createElement('span', { className: 'text-sm font-bold text-blue-800' }, 'ASPECT:'),
              React.createElement('button', {
                onClick: () => setOriginalAspectRatio(!originalAspectRatio),
                className: `relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  originalAspectRatio ? 'bg-blue-600' : 'bg-gray-300'
                }`
              },
                React.createElement('span', {
                  className: `inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    originalAspectRatio ? 'translate-x-6' : 'translate-x-1'
                  }`
                })
              ),
              React.createElement('span', { className: 'text-sm font-bold text-blue-800 w-12' }, originalAspectRatio ? 'ORIG' : 'FIT')
            ),
            React.createElement('div', { className: 'flex items-center space-x-2 bg-purple-200 p-3 rounded border-2 border-purple-500' },
              React.createElement('span', { className: 'text-sm font-bold text-purple-800' }, 'AUDIO:'),
              React.createElement('button', {
                onClick: () => setIsMuted(!isMuted),
                className: `relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  !isMuted ? 'bg-purple-600' : 'bg-gray-300'
                }`
              },
                React.createElement('span', {
                  className: `inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    !isMuted ? 'translate-x-6' : 'translate-x-1'
                  }`
                })
              ),
              React.createElement('span', { className: 'text-sm font-bold text-purple-800 w-12' }, !isMuted ? 'ON' : 'OFF')
            )
          )
        )
      )
    ),
    React.createElement('div', { className: 'flex h-screen' },
      React.createElement('div', {
        className: `transition-all duration-300 ease-in-out ${
          sidebarCollapsed ? 'w-16' : 'w-80'
        } bg-white shadow-sm border-r border-gray-200 flex-shrink-0 flex flex-col`
      },
        React.createElement('div', { className: 'flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0' },
          !sidebarCollapsed && React.createElement('h2', { className: 'text-lg font-semibold text-gray-900' }, 'Folders'),
          React.createElement('button', {
            onClick: toggleSidebar,
            className: 'p-2 rounded-lg hover:bg-gray-100 transition-colors',
            title: sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'
          }, sidebarCollapsed ? '▶' : '◀')
        ),
        !sidebarCollapsed && React.createElement('div', { className: 'flex-1 overflow-y-auto' },
          React.createElement(FolderList, {
            folders: folders,
            selectedFolder: selectedFolder?.path,
            onFolderSelect: handleFolderSelect,
            expandedFolders: expandedFolders,
            setExpandedFolders: setExpandedFolders,
            subfolders: subfolders,
            setSubfolders: setSubfolders,
            selectedFolders: selectedFolders,
            setSelectedFolders: setSelectedFolders,
            loadPhotosFromMultipleFolders: loadPhotosFromMultipleFolders
          })
        ),
        sidebarCollapsed && React.createElement('div', { className: 'flex-1 overflow-y-auto p-2' },
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
            }, folder.has_subfolders ? '📂' : '📁')
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
          (selectedFolder || selectedFolders.size > 0) ?
            React.createElement('div', null,
              React.createElement('div', { className: 'mb-6' },
                React.createElement('h2', { className: 'text-2xl font-bold text-gray-900 mb-2' }, 
                  selectedFolder ? selectedFolder.name : `${selectedFolders.size} selected folder${selectedFolders.size === 1 ? '' : 's'}`
                ),
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
                    hoveredVideo: hoveredVideo,
                    videoSpeed: videoSpeed,
                    showSpeedOverlay: showSpeedOverlay,
                    overlayTarget: overlayTarget,
                    originalAspectRatio: originalAspectRatio,
                    isMuted: isMuted
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
              muted: isMuted,
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