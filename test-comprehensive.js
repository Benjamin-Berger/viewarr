// Comprehensive test script for lazy loading features
// Run this in the browser console when viewing a folder with videos

function testComprehensiveLazyLoading() {
  console.log('🧪 Comprehensive Lazy Loading Test...');
  
  // Test 1: Check if videos start without src
  const videos = document.querySelectorAll('video');
  console.log(`📊 Found ${videos.length} video elements`);
  
  const videosWithSrc = Array.from(videos).filter(video => video.src);
  const videosWithoutSrc = Array.from(videos).filter(video => !video.src);
  
  console.log(`✅ Initial state: ${videosWithoutSrc.length}/${videos.length} videos without src`);
  
  // Test 2: Check for thumbnails
  const thumbnails = document.querySelectorAll('img[src*="data:image/jpeg;base64"]');
  console.log(`🖼️ Found ${thumbnails.length} video thumbnails`);
  
  // Test 3: Check hover functionality
  if (videos.length > 0) {
    const firstVideo = videos[0];
    console.log('\n🖱️ Testing hover functionality...');
    
    // Simulate hover
    setTimeout(() => {
      firstVideo.dispatchEvent(new MouseEvent('mouseenter'));
      console.log('Mouse enter dispatched');
      
      setTimeout(() => {
        if (firstVideo.src) {
          console.log('✅ Video loaded after hover');
        } else {
          console.log('❌ Video not loaded after hover');
        }
        
        // Test play functionality
        if (firstVideo.readyState >= 1) {
          console.log('✅ Video ready to play');
        } else {
          console.log('❌ Video not ready to play');
        }
      }, 300);
    }, 1000);
  }
  
  // Test 4: Check aspect ratio in Pinterest mode
  const videoContainers = document.querySelectorAll('.photo-card video');
  if (videoContainers.length > 0) {
    const firstContainer = videoContainers[0];
    const style = window.getComputedStyle(firstContainer);
    console.log(`📐 Video style: width=${style.width}, height=${style.height}, object-fit=${style.objectFit}`);
  }
  
  // Test 5: Check loading indicators
  const loadingIndicators = document.querySelectorAll('.absolute.inset-0.flex.items-center.justify-center.bg-black.bg-opacity-50');
  console.log(`⏳ Loading indicators found: ${loadingIndicators.length}`);
  
  // Test 6: Performance stats
  if (window.getLazyLoadingStats) {
    const stats = window.getLazyLoadingStats();
    console.log('📊 Performance Stats:', stats);
  }
  
  return {
    totalVideos: videos.length,
    videosWithoutSrc: videosWithoutSrc.length,
    thumbnails: thumbnails.length,
    loadingIndicators: loadingIndicators.length
  };
}

// Test hover playback specifically
function testHoverPlayback() {
  console.log('\n🎬 Testing Hover Playback...');
  
  const videos = document.querySelectorAll('video');
  if (videos.length === 0) {
    console.log('❌ No videos found to test');
    return;
  }
  
  const firstVideo = videos[0];
  console.log('Testing video:', firstVideo);
  
  // Test hover
  firstVideo.dispatchEvent(new MouseEvent('mouseenter'));
  console.log('Hover event dispatched');
  
  setTimeout(() => {
    console.log('Video src:', firstVideo.src ? 'Loaded' : 'Not loaded');
    console.log('Video readyState:', firstVideo.readyState);
    console.log('Video paused:', firstVideo.paused);
    
    // Test mouse leave
    firstVideo.dispatchEvent(new MouseEvent('mouseleave'));
    console.log('Mouse leave dispatched');
    
    setTimeout(() => {
      console.log('After mouse leave - paused:', firstVideo.paused);
      console.log('After mouse leave - currentTime:', firstVideo.currentTime);
    }, 100);
  }, 250);
}

// Test thumbnail loading
function testThumbnailLoading() {
  console.log('\n🖼️ Testing Thumbnail Loading...');
  
  const thumbnails = document.querySelectorAll('img[src*="data:image/jpeg;base64"]');
  console.log(`Found ${thumbnails.length} thumbnails`);
  
  thumbnails.forEach((thumb, index) => {
    console.log(`Thumbnail ${index + 1}:`, thumb.src.substring(0, 50) + '...');
  });
}

// Auto-run comprehensive test
testComprehensiveLazyLoading();

// Export functions for manual testing
window.testComprehensiveLazyLoading = testComprehensiveLazyLoading;
window.testHoverPlayback = testHoverPlayback;
window.testThumbnailLoading = testThumbnailLoading; 