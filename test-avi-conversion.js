// Test script for AVI video conversion system
// Run this in the browser console to test the conversion functionality

async function testAviConversion() {
  console.log('🧪 Testing AVI Video Conversion System...');
  
  // Test health endpoint
  console.log('\n1️⃣ Testing backend health...');
  try {
    const healthResponse = await fetch('http://localhost:8000/api/health');
    const healthData = await healthResponse.json();
    console.log('Backend health:', healthData);
    
    if (healthData.ffmpeg_available) {
      console.log('✅ FFmpeg is available for conversion');
    } else {
      console.log('❌ FFmpeg not available');
      return;
    }
  } catch (error) {
    console.log('❌ Error testing health:', error);
    return;
  }
  
  // Find AVI files on the page
  console.log('\n2️⃣ Looking for AVI files...');
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
  
  console.log(`\n3️⃣ Testing conversion for: ${videoPath}`);
  
  try {
    // Test the conversion endpoint directly
    const convertResponse = await fetch(`http://localhost:8000/api/convert/${encodeURIComponent(videoPath)}`);
    
    if (convertResponse.ok) {
      console.log('✅ Conversion endpoint is working');
      console.log('Content-Type:', convertResponse.headers.get('content-type'));
      console.log('Accept-Ranges:', convertResponse.headers.get('accept-ranges'));
      
      // Test if we can read the stream
      const reader = convertResponse.body.getReader();
      let chunkCount = 0;
      let totalBytes = 0;
      
      console.log('📊 Reading conversion stream...');
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('✅ Stream completed');
          break;
        }
        
        chunkCount++;
        totalBytes += value.length;
        
        if (chunkCount <= 5) {
          console.log(`Chunk ${chunkCount}: ${value.length} bytes`);
        } else if (chunkCount === 6) {
          console.log('... (more chunks)');
        }
        
        // Stop after 10 chunks for testing
        if (chunkCount >= 10) {
          console.log('🛑 Stopping test after 10 chunks');
          reader.cancel();
          break;
        }
      }
      
      console.log(`📊 Total: ${chunkCount} chunks, ${totalBytes} bytes`);
      
    } else {
      console.log('❌ Conversion failed:', convertResponse.status);
      const errorText = await convertResponse.text();
      console.log('Error details:', errorText);
    }
    
  } catch (error) {
    console.log('❌ Error testing conversion:', error);
  }
}

// Function to test a specific AVI file
async function testSpecificAvi(aviPath) {
  console.log(`🧪 Testing specific AVI: ${aviPath}`);
  
  try {
    const response = await fetch(`http://localhost:8000/api/convert/${encodeURIComponent(aviPath)}`);
    
    if (response.ok) {
      console.log('✅ Conversion started successfully');
      console.log('Content-Type:', response.headers.get('content-type'));
      
      // Test stream reading
      const reader = response.body.getReader();
      let chunkCount = 0;
      
      while (chunkCount < 5) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log('✅ Stream completed');
          break;
        }
        
        chunkCount++;
        console.log(`Chunk ${chunkCount}: ${value.length} bytes`);
      }
      
      reader.cancel();
      console.log('🛑 Test completed');
      
    } else {
      console.log('❌ Conversion failed:', response.status);
      const errorText = await response.text();
      console.log('Error:', errorText);
    }
    
  } catch (error) {
    console.log('❌ Error:', error);
  }
}

// Function to monitor conversion progress
async function monitorConversion(aviPath) {
  console.log(`📊 Monitoring conversion for: ${aviPath}`);
  
  try {
    const response = await fetch(`http://localhost:8000/api/convert/${encodeURIComponent(aviPath)}`);
    
    if (!response.ok) {
      console.log('❌ Conversion failed to start');
      return;
    }
    
    const reader = response.body.getReader();
    let totalBytes = 0;
    let startTime = Date.now();
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
        const elapsed = (Date.now() - startTime) / 1000;
        console.log(`✅ Conversion completed: ${totalBytes} bytes in ${elapsed.toFixed(1)}s`);
        console.log(`📊 Average speed: ${(totalBytes / elapsed / 1024 / 1024).toFixed(2)} MB/s`);
        break;
      }
      
      totalBytes += value.length;
      
      if (totalBytes % (1024 * 1024) < value.length) { // Log every MB
        const elapsed = (Date.now() - startTime) / 1000;
        const mbReceived = totalBytes / 1024 / 1024;
        console.log(`📊 ${mbReceived.toFixed(1)} MB received in ${elapsed.toFixed(1)}s`);
      }
    }
    
  } catch (error) {
    console.log('❌ Error monitoring conversion:', error);
  }
}

// Export functions
window.testAviConversion = testAviConversion;
window.testSpecificAvi = testSpecificAvi;
window.monitorConversion = monitorConversion;

console.log('🔧 AVI conversion test functions loaded:');
console.log('- testAviConversion() - Test conversion system');
console.log('- testSpecificAvi("path/to/video.avi") - Test specific AVI');
console.log('- monitorConversion("path/to/video.avi") - Monitor conversion progress'); 