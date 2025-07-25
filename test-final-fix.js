// Final test script to verify portrait video fixes
// Run this in the browser console to test the final implementation

function testFinalFix() {
  console.log('🎯 Testing Final Portrait Video Fixes...');
  
  // Check if we're in Pinterest mode
  const isPinterestMode = document.querySelector('.photo-card img')?.style.height === 'auto';
  console.log('Pinterest mode:', isPinterestMode);
  
  // Find all video thumbnails and photo cards
  const videoThumbnails = document.querySelectorAll('img[src^="data:image/jpeg;base64"]');
  const photoCards = document.querySelectorAll('.photo-card');
  
  console.log(`Found ${videoThumbnails.length} video thumbnails and ${photoCards.length} photo cards`);
  
  let portraitCount = 0;
  let infoVisibleCount = 0;
  
  // Test each photo card
  photoCards.forEach((card, index) => {
    console.log(`\n📋 Photo Card ${index + 1}:`);
    
    const video = card.querySelector('video');
    const thumbnail = card.querySelector('img[src^="data:image/jpeg;base64"]');
    const infoSection = card.querySelector('.p-3');
    
    if (thumbnail) {
      // Check thumbnail aspect ratio
      const naturalWidth = thumbnail.naturalWidth;
      const naturalHeight = thumbnail.naturalHeight;
      const aspectRatio = naturalWidth / naturalHeight;
      const isPortrait = naturalHeight > naturalWidth;
      
      console.log(`- Thumbnail dimensions: ${naturalWidth}x${naturalHeight}`);
      console.log(`- Aspect ratio: ${aspectRatio.toFixed(3)}`);
      console.log(`- Is portrait: ${isPortrait}`);
      
      if (isPortrait) {
        portraitCount++;
      }
      
      // Check computed styles
      const computed = window.getComputedStyle(thumbnail);
      console.log(`- Computed width: ${computed.width}`);
      console.log(`- Computed height: ${computed.height}`);
      console.log(`- Object-fit: ${computed.objectFit}`);
      
      // Check positioning
      const position = computed.position;
      const top = computed.top;
      const left = computed.left;
      console.log(`- Position: ${position}, Top: ${top}, Left: ${left}`);
    }
    
    if (infoSection) {
      console.log('- Has info section');
      console.log(`- Info text: ${infoSection.textContent.trim()}`);
      
      // Check if info is visible
      const infoComputed = window.getComputedStyle(infoSection);
      console.log(`- Info display: ${infoComputed.display}`);
      console.log(`- Info visibility: ${infoComputed.visibility}`);
      console.log(`- Info opacity: ${infoComputed.opacity}`);
      console.log(`- Info height: ${infoComputed.height}`);
      console.log(`- Info background: ${infoComputed.backgroundColor}`);
      console.log(`- Info z-index: ${infoComputed.zIndex}`);
      
      if (infoComputed.display !== 'none' && infoComputed.visibility !== 'hidden' && infoComputed.opacity !== '0') {
        infoVisibleCount++;
        console.log('✅ Info section is visible');
      } else {
        console.log('❌ Info section is hidden');
      }
    } else {
      console.log('- No info section found');
    }
    
    // Check card dimensions
    const cardComputed = window.getComputedStyle(card);
    console.log(`- Card width: ${cardComputed.width}`);
    console.log(`- Card height: ${cardComputed.height}`);
    console.log(`- Card overflow: ${cardComputed.overflow}`);
  });
  
  // Summary
  console.log('\n📊 Summary:');
  console.log(`- Total portrait videos: ${portraitCount}`);
  console.log(`- Info sections visible: ${infoVisibleCount}`);
  console.log(`- Total photo cards: ${photoCards.length}`);
  
  if (isPinterestMode) {
    console.log('\n🎯 Pinterest Mode Analysis:');
    if (portraitCount > 0) {
      console.log('✅ Portrait videos detected');
    } else {
      console.log('⚠️ No portrait videos found in this view');
    }
    
    if (infoVisibleCount > 0) {
      console.log('✅ Info sections are visible');
    } else {
      console.log('❌ No info sections are visible');
    }
  }
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
    testFinalFix();
  }, 3000);
}

// Export functions for manual testing
window.testFinalFix = testFinalFix;
window.testThumbnailGeneration = testThumbnailGeneration;

// Auto-run the test
testFinalFix(); 