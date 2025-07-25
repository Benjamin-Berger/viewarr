// Test script to verify lazy loading implementation
// Run this in the browser console when viewing a folder with videos

function testLazyLoading() {
  console.log('🧪 Testing Lazy Loading Implementation...');
  
  // Find all video elements
  const videos = document.querySelectorAll('video');
  console.log(`Found ${videos.length} video elements`);
  
  // Check which videos have src attributes (should be none initially)
  const videosWithSrc = Array.from(videos).filter(video => video.src);
  const videosWithoutSrc = Array.from(videos).filter(video => !video.src);
  
  console.log(`📊 Initial state:`);
  console.log(`- Videos with src: ${videosWithSrc.length}`);
  console.log(`- Videos without src: ${videosWithoutSrc.length}`);
  
  if (videosWithoutSrc.length === videos.length) {
    console.log('✅ SUCCESS: All videos start without src (lazy loading working)');
  } else {
    console.log('❌ FAILURE: Some videos have src attributes initially');
  }
  
  // Test hover functionality
  if (videos.length > 0) {
    const firstVideo = videos[0];
    console.log('\n🖱️ Testing hover functionality...');
    console.log('Hover over the first video for 200ms to see it load');
    
    // Simulate hover after a delay
    setTimeout(() => {
      firstVideo.dispatchEvent(new MouseEvent('mouseenter'));
      console.log('Mouse enter event dispatched');
      
      setTimeout(() => {
        if (firstVideo.src) {
          console.log('✅ SUCCESS: Video loaded after hover');
        } else {
          console.log('❌ FAILURE: Video not loaded after hover');
        }
      }, 300);
    }, 1000);
  }
  
  // Check for loading indicators
  const loadingIndicators = document.querySelectorAll('.absolute.inset-0.flex.items-center.justify-center.bg-black.bg-opacity-50');
  console.log(`\n📱 Loading indicators found: ${loadingIndicators.length}`);
  
  return {
    totalVideos: videos.length,
    videosWithSrc: videosWithSrc.length,
    videosWithoutSrc: videosWithoutSrc.length,
    loadingIndicators: loadingIndicators.length
  };
}

// Auto-run the test
testLazyLoading();

// Export for manual testing
window.testLazyLoading = testLazyLoading; 