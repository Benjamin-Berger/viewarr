// Test script for the new thumbnail queue system
// Run this in the browser console to test the queue functionality

async function testQueueSystem() {
  console.log('🧪 Testing Thumbnail Queue System...');
  
  // Test health endpoint
  console.log('\n1️⃣ Testing health endpoint...');
  try {
    const healthResponse = await fetch('http://localhost:8000/api/health');
    const healthData = await healthResponse.json();
    console.log('Health status:', healthData);
    
    if (healthData.thumbnail_queue_size !== undefined) {
      console.log('✅ Queue system is active');
    } else {
      console.log('❌ Queue system not detected');
    }
  } catch (error) {
    console.log('❌ Error testing health:', error);
  }
  
  // Test cache status
  console.log('\n2️⃣ Testing cache status...');
  try {
    const cacheResponse = await fetch('http://localhost:8000/api/thumbnail-cache/status');
    const cacheData = await cacheResponse.json();
    console.log('Cache status:', cacheData);
    
    if (cacheData.queue_size !== undefined) {
      console.log('✅ Queue monitoring is active');
    } else {
      console.log('❌ Queue monitoring not detected');
    }
  } catch (error) {
    console.log('❌ Error testing cache status:', error);
  }
  
  // Test multiple thumbnail requests
  console.log('\n3️⃣ Testing multiple thumbnail requests...');
  const testVideos = [
    'sample/output.mp4',
    'sample copy/video1.mp4',
    'sample copy/video2.mp4'
  ];
  
  const promises = testVideos.map(async (videoPath, index) => {
    try {
      console.log(`Requesting thumbnail for ${videoPath}...`);
      const response = await fetch(`http://localhost:8000/api/thumbnail/${encodeURIComponent(videoPath)}`);
      const data = await response.json();
      console.log(`Response ${index + 1}:`, data);
      return data;
    } catch (error) {
      console.log(`Error requesting thumbnail ${index + 1}:`, error);
      return null;
    }
  });
  
  const results = await Promise.all(promises);
  console.log('\nAll requests completed');
  
  // Check queue status after requests
  console.log('\n4️⃣ Checking queue status after requests...');
  try {
    const finalCacheResponse = await fetch('http://localhost:8000/api/thumbnail-cache/status');
    const finalCacheData = await finalCacheResponse.json();
    console.log('Final cache status:', finalCacheData);
    
    if (finalCacheData.queue_size > 0) {
      console.log('✅ Queue is working - items are being queued');
    } else if (finalCacheData.processing_count > 0) {
      console.log('✅ Processing is working - items are being processed');
    } else {
      console.log('ℹ️ All thumbnails were cached or processed immediately');
    }
  } catch (error) {
    console.log('❌ Error checking final status:', error);
  }
}

// Function to monitor queue in real-time
async function monitorQueue() {
  console.log('📊 Monitoring thumbnail queue...');
  
  const monitor = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/thumbnail-cache/status');
      const data = await response.json();
      
      console.log(`Queue: ${data.queue_size}, Processing: ${data.processing_count}, Cache: ${data.cache_size}`);
      
      if (data.queue_size > 0 || data.processing_count > 0) {
        setTimeout(monitor, 2000); // Check every 2 seconds
      } else {
        console.log('✅ Queue is empty, monitoring stopped');
      }
    } catch (error) {
      console.log('❌ Error monitoring queue:', error);
    }
  };
  
  monitor();
}

// Function to clear cache and test fresh
async function clearCacheAndTest() {
  console.log('🧹 Clearing cache and testing fresh...');
  
  try {
    const clearResponse = await fetch('http://localhost:8000/api/thumbnail-cache/clear', {
      method: 'POST'
    });
    
    if (clearResponse.ok) {
      console.log('✅ Cache cleared');
      setTimeout(testQueueSystem, 1000); // Test after clearing
    } else {
      console.log('❌ Failed to clear cache');
    }
  } catch (error) {
    console.log('❌ Error clearing cache:', error);
  }
}

// Export functions
window.testQueueSystem = testQueueSystem;
window.monitorQueue = monitorQueue;
window.clearCacheAndTest = clearCacheAndTest;

console.log('🔧 Queue system test functions loaded:');
console.log('- testQueueSystem() - Test the queue system');
console.log('- monitorQueue() - Monitor queue in real-time');
console.log('- clearCacheAndTest() - Clear cache and test fresh'); 