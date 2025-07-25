// Comprehensive debug script for portrait video issues
// Run this in the browser console to identify the exact problems

function debugPortraitIssues() {
  console.log('🔍 Debugging Portrait Video Issues...');
  
  // Check if we're in Pinterest mode
  const isPinterestMode = document.querySelector('.photo-card img')?.style.height === 'auto';
  console.log('Pinterest mode:', isPinterestMode);
  
  // Find all video elements and thumbnails
  const videoElements = document.querySelectorAll('video');
  const videoThumbnails = document.querySelectorAll('img[src^="data:image/jpeg;base64"]');
  const photoCards = document.querySelectorAll('.photo-card');
  
  console.log(`Found ${videoElements.length} videos, ${videoThumbnails.length} thumbnails, ${photoCards.length} photo cards`);
  
  // Debug each photo card
  photoCards.forEach((card, index) => {
    console.log(`\n📋 Photo Card ${index + 1}:`);
    
    // Check if it's a video
    const video = card.querySelector('video');
    const thumbnail = card.querySelector('img[src^="data:image/jpeg;base64"]');
    const infoSection = card.querySelector('.p-3');
    
    if (video) {
      console.log('- Type: Video');
      console.log(`- Video src: ${video.src ? 'Loaded' : 'Not loaded'}`);
      console.log(`- Video style: ${video.style.cssText}`);
      
      // Check computed styles
      const videoComputed = window.getComputedStyle(video);
      console.log(`- Computed width: ${videoComputed.width}`);
      console.log(`- Computed height: ${videoComputed.height}`);
      console.log(`- Object-fit: ${videoComputed.objectFit}`);
    }
    
    if (thumbnail) {
      console.log('- Has thumbnail');
      console.log(`- Thumbnail src: ${thumbnail.src.substring(0, 50)}...`);
      console.log(`- Thumbnail style: ${thumbnail.style.cssText}`);
      
      // Check computed styles
      const thumbComputed = window.getComputedStyle(thumbnail);
      console.log(`- Computed width: ${thumbComputed.width}`);
      console.log(`- Computed height: ${thumbComputed.height}`);
      console.log(`- Object-fit: ${thumbComputed.objectFit}`);
      
      // Check natural dimensions
      console.log(`- Natural width: ${thumbnail.naturalWidth}`);
      console.log(`- Natural height: ${thumbnail.naturalHeight}`);
      console.log(`- Aspect ratio: ${(thumbnail.naturalWidth / thumbnail.naturalHeight).toFixed(3)}`);
      
      // Determine if it's portrait
      const isPortrait = thumbnail.naturalHeight > thumbnail.naturalWidth;
      console.log(`- Is portrait: ${isPortrait}`);
    }
    
    if (infoSection) {
      console.log('- Has info section');
      console.log(`- Info text: ${infoSection.textContent.trim()}`);
      console.log(`- Info style: ${infoSection.style.cssText}`);
      
      // Check if info is visible
      const infoComputed = window.getComputedStyle(infoSection);
      console.log(`- Info display: ${infoComputed.display}`);
      console.log(`- Info visibility: ${infoComputed.visibility}`);
      console.log(`- Info opacity: ${infoComputed.opacity}`);
      console.log(`- Info height: ${infoComputed.height}`);
      console.log(`- Info overflow: ${infoComputed.overflow}`);
    } else {
      console.log('- No info section found');
    }
    
    // Check card dimensions
    const cardComputed = window.getComputedStyle(card);
    console.log(`- Card width: ${cardComputed.width}`);
    console.log(`- Card height: ${cardComputed.height}`);
    console.log(`- Card overflow: ${cardComputed.overflow}`);
  });
  
  // Check for any CSS issues
  console.log('\n🎨 CSS Analysis:');
  
  // Check if any cards have height: 0 or overflow: hidden
  photoCards.forEach((card, index) => {
    const computed = window.getComputedStyle(card);
    if (computed.height === '0px' || computed.overflow === 'hidden') {
      console.log(`⚠️ Card ${index + 1} has potential CSS issue:`);
      console.log(`  - Height: ${computed.height}`);
      console.log(`  - Overflow: ${computed.overflow}`);
    }
  });
}

// Test thumbnail generation specifically
async function testThumbnailGeneration() {
  console.log('\n🎬 Testing Thumbnail Generation...');
  
  // Clear cache first
  try {
    const clearResponse = await fetch('http://localhost:8000/api/thumbnail-cache/clear', {
      method: 'POST'
    });
    const clearResult = await clearResponse.json();
    console.log('Cache cleared:', clearResult);
  } catch (error) {
    console.log('Error clearing cache:', error);
  }
  
  // Wait for thumbnails to regenerate
  setTimeout(() => {
    debugPortraitIssues();
  }, 3000);
}

// Check backend thumbnail generation
async function checkBackendThumbnail() {
  console.log('\n🔧 Checking Backend Thumbnail Generation...');
  
  try {
    // Test with a known video file
    const testVideo = 'sample/output.mp4'; // Adjust this path as needed
    
    const response = await fetch(`http://localhost:8000/api/thumbnail/${encodeURIComponent(testVideo)}`);
    const result = await response.json();
    console.log('Thumbnail generation result:', result);
    
    if (result.status === 'processing') {
      // Poll for completion
      let attempts = 0;
      const pollForCompletion = async () => {
        attempts++;
        const statusResponse = await fetch(`http://localhost:8000/api/thumbnail-status/${encodeURIComponent(testVideo)}`);
        const status = await statusResponse.json();
        
        console.log(`Attempt ${attempts}: ${status.status}`);
        
        if (status.status === 'ready') {
          console.log('✅ Thumbnail generated successfully!');
          console.log('Thumbnail size:', status.thumbnail.length, 'characters');
          
          // Create a temporary image to check dimensions
          const img = new Image();
          img.onload = () => {
            console.log(`Thumbnail dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
            console.log(`Aspect ratio: ${(img.naturalWidth / img.naturalHeight).toFixed(3)}`);
            console.log(`Is portrait: ${img.naturalHeight > img.naturalWidth}`);
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
  } catch (error) {
    console.log('Error checking backend thumbnail:', error);
  }
}

// Export functions for manual testing
window.debugPortraitIssues = debugPortraitIssues;
window.testThumbnailGeneration = testThumbnailGeneration;
window.checkBackendThumbnail = checkBackendThumbnail;

// Auto-run the debug
debugPortraitIssues(); 