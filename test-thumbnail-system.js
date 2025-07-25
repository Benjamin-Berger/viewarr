// Test script for the new thumbnail system
// Run this in the browser console to test the improved thumbnail generation

async function testThumbnailSystem() {
  console.log('🧪 Testing New Thumbnail System...');
  
  // Test 1: Check cache status
  console.log('\n📊 Cache Status:');
  try {
    const statusResponse = await fetch('http://localhost:8000/api/thumbnail-cache/status');
    const status = await statusResponse.json();
    console.log('Cache size:', status.cache_size);
    console.log('Processing count:', status.processing_count);
    console.log('Cache keys:', status.cache_keys);
  } catch (error) {
    console.log('Error checking cache status:', error);
  }
  
  // Test 2: Clear cache
  console.log('\n🗑️ Clearing Cache:');
  try {
    const clearResponse = await fetch('http://localhost:8000/api/thumbnail-cache/clear', {
      method: 'POST'
    });
    const clearResult = await clearResponse.json();
    console.log('Cache cleared:', clearResult);
  } catch (error) {
    console.log('Error clearing cache:', error);
  }
  
  // Test 3: Test thumbnail generation with 5-second fallback
  console.log('\n🎬 Testing Thumbnail Generation:');
  try {
    const thumbnailResponse = await fetch('http://localhost:8000/api/thumbnail/sample/output.mp4');
    const thumbnailResult = await thumbnailResponse.json();
    console.log('Initial response:', thumbnailResult);
    
    if (thumbnailResult.status === 'processing') {
      console.log('Thumbnail is being generated...');
      
      // Poll for completion
      let attempts = 0;
      const maxAttempts = 10;
      
      const pollForCompletion = async () => {
        attempts++;
        const statusResponse = await fetch('http://localhost:8000/api/thumbnail-status/sample/output.mp4');
        const status = await statusResponse.json();
        
        console.log(`Attempt ${attempts}: ${status.status}`);
        
        if (status.status === 'ready') {
          console.log('✅ Thumbnail generated successfully!');
          console.log('Thumbnail size:', status.thumbnail.length, 'characters');
          return;
        } else if (attempts >= maxAttempts) {
          console.log('❌ Timeout waiting for thumbnail');
          return;
        } else {
          setTimeout(pollForCompletion, 1000);
        }
      };
      
      setTimeout(pollForCompletion, 1000);
    }
  } catch (error) {
    console.log('Error testing thumbnail generation:', error);
  }
  
  // Test 4: Check final cache status
  setTimeout(async () => {
    console.log('\n📊 Final Cache Status:');
    try {
      const finalStatusResponse = await fetch('http://localhost:8000/api/thumbnail-cache/status');
      const finalStatus = await finalStatusResponse.json();
      console.log('Final cache size:', finalStatus.cache_size);
      console.log('Final processing count:', finalStatus.processing_count);
    } catch (error) {
      console.log('Error checking final cache status:', error);
    }
  }, 5000);
}

// Test thumbnail generation for multiple videos
async function testMultipleThumbnails() {
  console.log('\n🎬 Testing Multiple Thumbnail Generation:');
  
  const testVideos = [
    'sample/output.mp4',
    'sample/output_small_fast.mp4',
    'sample/out.mp4'
  ];
  
  for (const video of testVideos) {
    try {
      console.log(`\nTesting: ${video}`);
      const response = await fetch(`http://localhost:8000/api/thumbnail/${encodeURIComponent(video)}`);
      const result = await response.json();
      console.log(`Status: ${result.status}`);
    } catch (error) {
      console.log(`Error with ${video}:`, error);
    }
  }
}

// Monitor cache in real-time
function monitorCache() {
  console.log('\n📊 Starting Cache Monitor (updates every 2 seconds):');
  
  const monitor = setInterval(async () => {
    try {
      const response = await fetch('http://localhost:8000/api/thumbnail-cache/status');
      const status = await response.json();
      console.log(`[${new Date().toLocaleTimeString()}] Cache: ${status.cache_size}, Processing: ${status.processing_count}`);
    } catch (error) {
      console.log('Error monitoring cache:', error);
    }
  }, 2000);
  
  // Stop monitoring after 30 seconds
  setTimeout(() => {
    clearInterval(monitor);
    console.log('Cache monitoring stopped');
  }, 30000);
}

// Export functions for manual testing
window.testThumbnailSystem = testThumbnailSystem;
window.testMultipleThumbnails = testMultipleThumbnails;
window.monitorCache = monitorCache;

// Auto-run the main test
testThumbnailSystem(); 