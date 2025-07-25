// Test script to verify thumbnail aspect ratio fix
// Run this in the browser console to test the aspect ratio fix

function testThumbnailAspectRatio() {
  console.log('🧪 Testing Thumbnail Aspect Ratio Fix...');
  
  // Find all video thumbnails in the current view
  const videoThumbnails = document.querySelectorAll('img[src^="data:image/jpeg;base64"]');
  console.log(`Found ${videoThumbnails.length} video thumbnails`);
  
  // Check if we're in original aspect ratio mode
  const isOriginalAspectRatio = document.querySelector('.photo-card img')?.style.height === 'auto';
  console.log('Original aspect ratio mode:', isOriginalAspectRatio);
  
  // Test each thumbnail
  videoThumbnails.forEach((thumbnail, index) => {
    const computedStyle = window.getComputedStyle(thumbnail);
    const width = computedStyle.width;
    const height = computedStyle.height;
    const objectFit = computedStyle.objectFit;
    
    console.log(`\nThumbnail ${index + 1}:`);
    console.log(`- Width: ${width}`);
    console.log(`- Height: ${height}`);
    console.log(`- Object-fit: ${objectFit}`);
    
    if (isOriginalAspectRatio) {
      // In original aspect ratio mode, height should be 'auto'
      if (height === 'auto') {
        console.log('✅ Correct: Height is auto (respects original aspect ratio)');
      } else {
        console.log('❌ Issue: Height is not auto');
      }
      
      // Object-fit should be 'contain' for thumbnails
      if (objectFit === 'contain') {
        console.log('✅ Correct: Object-fit is contain (preserves aspect ratio)');
      } else {
        console.log('❌ Issue: Object-fit is not contain');
      }
    } else {
      // In grid mode, should have fixed height
      if (height !== 'auto') {
        console.log('✅ Correct: Height is fixed (grid mode)');
      } else {
        console.log('❌ Issue: Height should be fixed in grid mode');
      }
    }
  });
  
  // Test video elements too
  const videoElements = document.querySelectorAll('video');
  console.log(`\nFound ${videoElements.length} video elements`);
  
  videoElements.forEach((video, index) => {
    const computedStyle = window.getComputedStyle(video);
    const width = computedStyle.width;
    const height = computedStyle.height;
    
    console.log(`\nVideo ${index + 1}:`);
    console.log(`- Width: ${width}`);
    console.log(`- Height: ${height}`);
    
    if (isOriginalAspectRatio) {
      if (height === 'auto') {
        console.log('✅ Correct: Video height is auto (respects original aspect ratio)');
      } else {
        console.log('❌ Issue: Video height is not auto');
      }
    }
  });
}

// Test thumbnail generation and aspect ratio
async function testThumbnailGenerationAndAspectRatio() {
  console.log('\n🎬 Testing Thumbnail Generation with Aspect Ratio...');
  
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
  
  // Wait a moment for any existing thumbnails to load
  setTimeout(() => {
    testThumbnailAspectRatio();
  }, 2000);
}

// Test switching between modes
function testModeSwitching() {
  console.log('\n🔄 Testing Mode Switching...');
  
  // Find the aspect ratio toggle button
  const toggleButton = document.querySelector('button[onclick*="originalAspectRatio"]') || 
                      document.querySelector('input[type="checkbox"][checked]') ||
                      document.querySelector('select option[selected]');
  
  if (toggleButton) {
    console.log('Found aspect ratio toggle:', toggleButton);
    console.log('Current state:', toggleButton.checked || toggleButton.selected);
  } else {
    console.log('Could not find aspect ratio toggle button');
  }
}

// Export functions for manual testing
window.testThumbnailAspectRatio = testThumbnailAspectRatio;
window.testThumbnailGenerationAndAspectRatio = testThumbnailGenerationAndAspectRatio;
window.testModeSwitching = testModeSwitching;

// Auto-run the test
testThumbnailAspectRatio(); 