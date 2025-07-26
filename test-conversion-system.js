// Test script for the new non-blocking AVI conversion system
// Run this in the browser console to test the conversion functionality

async function testConversionSystem() {
  console.log('🧪 Testing Non-blocking AVI Conversion System...');
  
  // Test health endpoint
  console.log('\n1️⃣ Testing backend health...');
  try {
    const healthResponse = await fetch('http://localhost:8000/api/health');
    const healthData = await healthResponse.json();
    console.log('Backend health:', healthData);
    
    if (healthData.conversion_queue_size !== undefined) {
      console.log('✅ Conversion queue system is active');
    } else {
      console.log('❌ Conversion queue system not detected');
    }
  } catch (error) {
    console.log('❌ Error testing health:', error);
  }
  
  // Test conversion cache status
  console.log('\n2️⃣ Testing conversion cache status...');
  try {
    const cacheResponse = await fetch('http://localhost:8000/api/conversion-cache/status');
    const cacheData = await cacheResponse.json();
    console.log('Conversion cache status:', cacheData);
    
    if (cacheData.queue_size !== undefined) {
      console.log('✅ Conversion queue monitoring is active');
    } else {
      console.log('❌ Conversion queue monitoring not detected');
    }
  } catch (error) {
    console.log('❌ Error testing cache status:', error);
  }
  
  // Find AVI files on the page
  console.log('\n3️⃣ Looking for AVI files...');
  const videos = document.querySelectorAll('video');
  const aviVideos = Array.from(videos).filter(video => {
    const src = video.src || '';
    return src.includes('.avi') || src.includes('.AVI');
  });
  
  console.log(`Found ${aviVideos.length} AVI videos on the page`);
  
  if (aviVideos.length === 0) {
    console.log('ℹ️ No AVI videos found on current page');
    console.log('Navigate to a folder with AVI files to test conversion');
    return;
  }
  
  // Test conversion for the first AVI video
  const firstAvi = aviVideos[0];
  const videoPath = new URL(firstAvi.src).pathname.replace('/api/photo/', '');
  
  console.log(`\n4️⃣ Testing conversion for: ${videoPath}`);
  
  try {
    // Test the conversion endpoint
    const convertResponse = await fetch(`http://localhost:8000/api/convert/${encodeURIComponent(videoPath)}`);
    
    if (convertResponse.ok) {
      const convertData = await convertResponse.json();
      console.log('Conversion response:', convertData);
      
      if (convertData.status === 'queued' || convertData.status === 'processing') {
        console.log('✅ Conversion queued/processing successfully');
        
        // Poll for completion
        let attempts = 0;
        const pollForCompletion = async () => {
          attempts++;
          const statusResponse = await fetch(`http://localhost:8000/api/conversion-status/${encodeURIComponent(videoPath)}`);
          const status = await statusResponse.json();
          
          console.log(`Attempt ${attempts}: ${status.status}`);
          
          if (status.status === 'ready') {
            console.log('✅ Conversion completed successfully!');
            return;
          } else if (attempts >= 10) {
            console.log('❌ Timeout waiting for conversion');
            return;
          } else {
            setTimeout(pollForCompletion, 2000);
          }
        };
        
        setTimeout(pollForCompletion, 2000);
      } else if (convertData.status === 'ready') {
        console.log('✅ Conversion already cached');
      }
    } else {
      console.log('❌ Conversion failed:', convertResponse.status);
      const errorText = await convertResponse.text();
      console.log('Error details:', errorText);
    }
    
  } catch (error) {
    console.log('❌ Error testing conversion:', error);
  }
}

// Function to test multiple AVI conversions
async function testMultipleConversions() {
  console.log('🧪 Testing Multiple AVI Conversions...');
  
  // Find all AVI videos
  const videos = document.querySelectorAll('video');
  const aviVideos = Array.from(videos).filter(video => {
    const src = video.src || '';
    return src.includes('.avi') || src.includes('.AVI');
  });
  
  console.log(`Found ${aviVideos.length} AVI videos`);
  
  if (aviVideos.length === 0) {
    console.log('ℹ️ No AVI videos found');
    return;
  }
  
  // Test first 3 AVI videos
  const testVideos = aviVideos.slice(0, 3);
  
  for (let i = 0; i < testVideos.length; i++) {
    const video = testVideos[i];
    const videoPath = new URL(video.src).pathname.replace('/api/photo/', '');
    
    console.log(`\nTesting conversion ${i + 1}/${testVideos.length}: ${videoPath}`);
    
    try {
      const response = await fetch(`http://localhost:8000/api/convert/${encodeURIComponent(videoPath)}`);
      const data = await response.json();
      
      console.log(`Response: ${data.status}`);
      
      if (data.status === 'queued') {
        console.log('✅ Queued successfully');
      } else if (data.status === 'processing') {
        console.log('✅ Already processing');
      } else if (data.status === 'ready') {
        console.log('✅ Already cached');
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error}`);
    }
  }
  
  // Check queue status
  console.log('\n📊 Checking queue status...');
  try {
    const cacheResponse = await fetch('http://localhost:8000/api/conversion-cache/status');
    const cacheData = await cacheResponse.json();
    console.log('Queue status:', cacheData);
  } catch (error) {
    console.log('❌ Error checking queue status:', error);
  }
}

// Function to monitor conversion progress
async function monitorConversionProgress() {
  console.log('📊 Monitoring Conversion Progress...');
  
  const monitor = async () => {
    try {
      const healthResponse = await fetch('http://localhost:8000/api/health');
      const healthData = await healthResponse.json();
      
      const cacheResponse = await fetch('http://localhost:8000/api/conversion-cache/status');
      const cacheData = await cacheResponse.json();
      
      console.log(`Queue: ${cacheData.queue_size}, Processing: ${cacheData.processing_count}, Cache: ${cacheData.cache_size}`);
      
      if (cacheData.queue_size > 0 || cacheData.processing_count > 0) {
        setTimeout(monitor, 2000); // Check every 2 seconds
      } else {
        console.log('✅ All conversions completed, monitoring stopped');
      }
    } catch (error) {
      console.log('❌ Error monitoring conversion:', error);
    }
  };
  
  monitor();
}

// Export functions
window.testConversionSystem = testConversionSystem;
window.testMultipleConversions = testMultipleConversions;
window.monitorConversionProgress = monitorConversionProgress;

console.log('🔧 Conversion system test functions loaded:');
console.log('- testConversionSystem() - Test the conversion system');
console.log('- testMultipleConversions() - Test multiple AVI conversions');
console.log('- monitorConversionProgress() - Monitor conversion progress'); 