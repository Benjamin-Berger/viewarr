// Test script for portrait video thumbnails and info display
// Run this in the browser console to test portrait video issues

function testPortraitVideos() {
  console.log('🧪 Testing Portrait Video Issues...');
  
  // Find all video thumbnails
  const videoThumbnails = document.querySelectorAll('img[src^="data:image/jpeg;base64"]');
  const videoElements = document.querySelectorAll('video');
  
  console.log(`Found ${videoThumbnails.length} video thumbnails and ${videoElements.length} video elements`);
  
  // Check if we're in Pinterest mode
  const isPinterestMode = document.querySelector('.photo-card img')?.style.height === 'auto';
  console.log('Pinterest mode (original aspect ratio):', isPinterestMode);
  
  // Test each video thumbnail
  videoThumbnails.forEach((thumbnail, index) => {
    const computedStyle = window.getComputedStyle(thumbnail);
    const width = computedStyle.width;
    const height = computedStyle.height;
    const objectFit = computedStyle.objectFit;
    
    console.log(`\nThumbnail ${index + 1}:`);
    console.log(`- Width: ${width}`);
    console.log(`- Height: ${height}`);
    console.log(`- Object-fit: ${objectFit}`);
    
    // Check if this is likely a portrait video (height > width)
    const widthNum = parseFloat(width);
    const heightNum = parseFloat(height);
    const isPortrait = heightNum > widthNum;
    
    console.log(`- Portrait video: ${isPortrait}`);
    
    if (isPinterestMode) {
      if (height === 'auto') {
        console.log('✅ Correct: Height is auto (respects original aspect ratio)');
      } else {
        console.log('❌ Issue: Height is not auto');
      }
      
      if (objectFit === 'contain' || objectFit === '') {
        console.log('✅ Correct: Object-fit preserves aspect ratio');
      } else {
        console.log('❌ Issue: Object-fit may distort aspect ratio');
      }
    }
  });
  
  // Test info display
  console.log('\n📋 Testing Info Display:');
  
  const photoCards = document.querySelectorAll('.photo-card');
  console.log(`Found ${photoCards.length} photo cards`);
  
  photoCards.forEach((card, index) => {
    const infoOverlay = card.querySelector('.absolute.bottom-0');
    const infoBelow = card.querySelector('.p-3');
    
    console.log(`\nPhoto card ${index + 1}:`);
    
    if (isPinterestMode) {
      if (infoBelow) {
        console.log('✅ Correct: Info below card found in Pinterest mode');
        console.log(`- Info text: ${infoBelow.textContent.trim()}`);
      } else {
        console.log('❌ Issue: No info below card found in Pinterest mode');
      }
      
      if (infoOverlay) {
        console.log('⚠️ Warning: Info overlay found (should be below card in Pinterest mode)');
      }
    } else {
      if (infoBelow) {
        console.log('✅ Correct: Info below card found in grid mode');
      } else {
        console.log('❌ Issue: No info below card found in grid mode');
      }
    }
  });
}

// Test thumbnail generation for portrait videos
async function testPortraitThumbnailGeneration() {
  console.log('\n🎬 Testing Portrait Video Thumbnail Generation...');
  
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
    testPortraitVideos();
  }, 3000);
}

// Test aspect ratio preservation
function testAspectRatioPreservation() {
  console.log('\n📐 Testing Aspect Ratio Preservation...');
  
  const videoThumbnails = document.querySelectorAll('img[src^="data:image/jpeg;base64"]');
  
  videoThumbnails.forEach((thumbnail, index) => {
    const naturalWidth = thumbnail.naturalWidth;
    const naturalHeight = thumbnail.naturalHeight;
    const aspectRatio = naturalWidth / naturalHeight;
    
    console.log(`\nThumbnail ${index + 1}:`);
    console.log(`- Natural dimensions: ${naturalWidth}x${naturalHeight}`);
    console.log(`- Aspect ratio: ${aspectRatio.toFixed(3)}`);
    
    if (aspectRatio < 1) {
      console.log('📱 Portrait video detected');
    } else if (aspectRatio > 1) {
      console.log('🖥️ Landscape video detected');
    } else {
      console.log('⬜ Square video detected');
    }
  });
}

// Export functions for manual testing
window.testPortraitVideos = testPortraitVideos;
window.testPortraitThumbnailGeneration = testPortraitThumbnailGeneration;
window.testAspectRatioPreservation = testAspectRatioPreservation;

// Auto-run the test
testPortraitVideos(); 