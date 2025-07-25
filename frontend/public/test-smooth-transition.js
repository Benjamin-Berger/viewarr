// Test script for smooth video transitions
// Run this in the browser console to test the new transition behavior

function testSmoothTransition() {
  console.log('🎬 Testing Smooth Video Transitions...');
  
  // Find all video elements
  const videos = document.querySelectorAll('video');
  const thumbnails = document.querySelectorAll('img[src*="data:image/jpeg;base64"]');
  
  console.log(`Found ${videos.length} videos and ${thumbnails.length} thumbnails`);
  
  // Check if we're in Pinterest mode
  const isPinterestMode = document.querySelector('.photo-card')?.style.display !== 'block';
  console.log(`Pinterest mode: ${isPinterestMode}`);
  
  // Test hover behavior on first video
  if (videos.length > 0) {
    const firstVideo = videos[0];
    const videoContainer = firstVideo.closest('.photo-card');
    
    if (videoContainer) {
      console.log('🎯 Testing hover transition on first video...');
      
      // Simulate hover
      const mouseEnterEvent = new MouseEvent('mouseenter', {
        bubbles: true,
        cancelable: true
      });
      
      videoContainer.dispatchEvent(mouseEnterEvent);
      
      // Check states after a delay
      setTimeout(() => {
        const video = videoContainer.querySelector('video');
        const thumbnail = videoContainer.querySelector('img[src*="data:image/jpeg;base64"]');
        const loadingIndicator = videoContainer.querySelector('.text-white.text-sm');
        
        console.log('📊 Transition State:');
        console.log(`- Video display: ${video?.style.display}`);
        console.log(`- Thumbnail visible: ${thumbnail && thumbnail.style.display !== 'none'}`);
        console.log(`- Loading indicator: ${loadingIndicator ? 'visible' : 'hidden'}`);
        console.log(`- Video ready: ${video?.readyState >= 2 ? 'yes' : 'no'}`);
        
        // Test mouse leave
        const mouseLeaveEvent = new MouseEvent('mouseleave', {
          bubbles: true,
          cancelable: true
        });
        
        videoContainer.dispatchEvent(mouseLeaveEvent);
        
        setTimeout(() => {
          console.log('✅ Transition test completed');
        }, 1000);
        
      }, 500);
    }
  }
}

function checkPortraitVideos() {
  console.log('📱 Checking Portrait Video Behavior...');
  
  const videos = document.querySelectorAll('video');
  let portraitCount = 0;
  
  videos.forEach((video, index) => {
    if (video.videoWidth && video.videoHeight) {
      const aspectRatio = video.videoWidth / video.videoHeight;
      const isPortrait = aspectRatio < 1;
      
      if (isPortrait) {
        portraitCount++;
        console.log(`Portrait video ${index + 1}: ${video.videoWidth}x${video.videoHeight} (ratio: ${aspectRatio.toFixed(2)})`);
      }
    }
  });
  
  console.log(`Found ${portraitCount} portrait videos`);
}

// Make functions available globally
window.testSmoothTransition = testSmoothTransition;
window.checkPortraitVideos = checkPortraitVideos;

console.log('🎬 Smooth Transition Test Script Loaded!');
console.log('Run testSmoothTransition() to test the new transition behavior');
console.log('Run checkPortraitVideos() to check portrait video detection'); 