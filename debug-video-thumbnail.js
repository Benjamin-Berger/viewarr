// Debug script for video thumbnail loading issues
// Run this in the browser console to diagnose thumbnail problems

async function debugVideoThumbnail() {
  console.log('🔍 Debugging Video Thumbnail Loading...');
  
  // Get all video elements
  const videos = document.querySelectorAll('video');
  const thumbnails = document.querySelectorAll('img[src^="data:image/jpeg;base64"]');
  
  console.log(`📊 Found ${videos.length} videos and ${thumbnails.length} thumbnails`);
  
  // Check each video for thumbnail issues
  videos.forEach((video, index) => {
    const card = video.closest('.photo-card');
    const thumbnail = card?.querySelector('img[src^="data:image/jpeg;base64"]');
    const videoPath = video.src ? new URL(video.src).pathname.replace('/api/photo/', '') : 'No src loaded';
    
    console.log(`\n🎥 Video ${index + 1}:`);
    console.log(`- Path: ${videoPath}`);
    console.log(`- Has thumbnail: ${!!thumbnail}`);
    console.log(`- Video loaded: ${!!video.src}`);
    console.log(`- Video ready state: ${video.readyState}`);
    
    if (thumbnail) {
      console.log(`- Thumbnail src length: ${thumbnail.src.length}`);
      console.log(`- Thumbnail natural dimensions: ${thumbnail.naturalWidth}x${thumbnail.naturalHeight}`);
    } else {
      console.log(`- ❌ No thumbnail found`);
    }
  });
  
  // Test backend thumbnail generation
  console.log('\n🔧 Testing Backend Thumbnail Generation...');
  
  // Get the first video path for testing
  const firstVideo = videos[0];
  if (firstVideo && firstVideo.src) {
    const videoPath = new URL(firstVideo.src).pathname.replace('/api/photo/', '');
    console.log(`Testing thumbnail generation for: ${videoPath}`);
    
    try {
      // Test thumbnail status endpoint
      const statusResponse = await fetch(`http://localhost:8000/api/thumbnail-status/${encodeURIComponent(videoPath)}`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        console.log('Thumbnail status:', statusData);
        
        if (statusData.status === 'ready') {
          console.log('✅ Thumbnail is ready');
          console.log('Thumbnail size:', statusData.thumbnail.length, 'characters');
          
          // Test thumbnail image
          const img = new Image();
          img.onload = () => {
            console.log(`Thumbnail dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
            console.log(`Aspect ratio: ${(img.naturalWidth / img.naturalHeight).toFixed(3)}`);
          };
          img.onerror = () => {
            console.log('❌ Failed to load thumbnail image');
          };
          img.src = statusData.thumbnail;
        } else if (statusData.status === 'processing') {
          console.log('⏳ Thumbnail is being processed');
        } else {
          console.log('❌ Thumbnail not started');
        }
      } else {
        console.log('❌ Failed to get thumbnail status:', statusResponse.status);
      }
      
      // Test thumbnail generation endpoint
      const genResponse = await fetch(`http://localhost:8000/api/thumbnail/${encodeURIComponent(videoPath)}`);
      if (genResponse.ok) {
        const genData = await genResponse.json();
        console.log('Thumbnail generation response:', genData);
      } else {
        console.log('❌ Failed to generate thumbnail:', genResponse.status);
      }
      
    } catch (error) {
      console.log('❌ Error testing backend:', error);
    }
  }
  
  // Check for specific video issues
  console.log('\n🎯 Checking for Specific Issues...');
  
  // Check if any videos have no thumbnails
  const videosWithoutThumbnails = Array.from(videos).filter(video => {
    const card = video.closest('.photo-card');
    const thumbnail = card?.querySelector('img[src^="data:image/jpeg;base64"]');
    return !thumbnail;
  });
  
  if (videosWithoutThumbnails.length > 0) {
    console.log(`❌ Found ${videosWithoutThumbnails.length} videos without thumbnails:`);
    videosWithoutThumbnails.forEach((video, index) => {
      const videoPath = video.src ? new URL(video.src).pathname.replace('/api/photo/', '') : 'No src loaded';
      console.log(`  ${index + 1}. ${videoPath}`);
    });
  } else {
    console.log('✅ All videos have thumbnails');
  }
  
  // Check for failed thumbnail loads
  const failedThumbnails = Array.from(thumbnails).filter(thumb => {
    return thumb.naturalWidth === 0 || thumb.naturalHeight === 0;
  });
  
  if (failedThumbnails.length > 0) {
    console.log(`❌ Found ${failedThumbnails.length} failed thumbnails:`);
    failedThumbnails.forEach((thumb, index) => {
      console.log(`  ${index + 1}. ${thumb.src.substring(0, 50)}...`);
    });
  } else {
    console.log('✅ All thumbnails loaded successfully');
  }
  
  // Check backend cache status
  console.log('\n📦 Checking Backend Cache Status...');
  try {
    const cacheResponse = await fetch('http://localhost:8000/api/thumbnail-cache/status');
    if (cacheResponse.ok) {
      const cacheData = await cacheResponse.json();
      console.log('Cache status:', cacheData);
    } else {
      console.log('❌ Failed to get cache status');
    }
  } catch (error) {
    console.log('❌ Error checking cache status:', error);
  }
}

// Function to test a specific video file
async function testSpecificVideo(videoPath) {
  console.log(`🧪 Testing specific video: ${videoPath}`);
  
  try {
    // Test thumbnail generation
    const response = await fetch(`http://localhost:8000/api/thumbnail/${encodeURIComponent(videoPath)}`);
    if (response.ok) {
      const data = await response.json();
      console.log('Generation response:', data);
      
      if (data.status === 'processing') {
        // Poll for completion
        let attempts = 0;
        const pollForCompletion = async () => {
          attempts++;
          const statusResponse = await fetch(`http://localhost:8000/api/thumbnail-status/${encodeURIComponent(videoPath)}`);
          const status = await statusResponse.json();
          
          console.log(`Attempt ${attempts}: ${status.status}`);
          
          if (status.status === 'ready') {
            console.log('✅ Thumbnail generated successfully!');
            console.log('Thumbnail size:', status.thumbnail.length, 'characters');
            
            // Test the thumbnail image
            const img = new Image();
            img.onload = () => {
              console.log(`Thumbnail dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
              console.log(`Aspect ratio: ${(img.naturalWidth / img.naturalHeight).toFixed(3)}`);
            };
            img.onerror = () => {
              console.log('❌ Failed to load thumbnail image');
            };
            img.src = status.thumbnail;
            
            return;
          } else if (attempts >= 10) {
            console.log('❌ Timeout waiting for thumbnail');
            return;
          } else {
            setTimeout(pollForCompletion, 1000);
          }
        };
        
        setTimeout(pollForCompletion, 1000);
      }
    } else {
      console.log('❌ Failed to start thumbnail generation:', response.status);
    }
  } catch (error) {
    console.log('❌ Error testing video:', error);
  }
}

// Function to clear thumbnail cache and retry
async function clearCacheAndRetry() {
  console.log('🧹 Clearing thumbnail cache...');
  
  try {
    const response = await fetch('http://localhost:8000/api/thumbnail-cache/clear', {
      method: 'POST'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Cache cleared:', data);
      console.log('🔄 Refreshing page to retry thumbnail generation...');
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else {
      console.log('❌ Failed to clear cache');
    }
  } catch (error) {
    console.log('❌ Error clearing cache:', error);
  }
}

// Export functions for manual testing
window.debugVideoThumbnail = debugVideoThumbnail;
window.testSpecificVideo = testSpecificVideo;
window.clearCacheAndRetry = clearCacheAndRetry;

console.log('🔧 Video thumbnail debugging functions loaded:');
console.log('- debugVideoThumbnail() - Run comprehensive diagnostics');
console.log('- testSpecificVideo("path/to/video.mp4") - Test specific video');
console.log('- clearCacheAndRetry() - Clear cache and refresh page'); 