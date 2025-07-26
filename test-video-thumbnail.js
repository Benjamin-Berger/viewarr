// Simple test script for video thumbnail debugging
// Run this in the browser console

async function testVideoThumbnail() {
  console.log('🧪 Testing Video Thumbnail Generation...');
  
  // Get the first video on the page
  const videos = document.querySelectorAll('video');
  if (videos.length === 0) {
    console.log('❌ No videos found on the page');
    return;
  }
  
  const firstVideo = videos[0];
  const videoPath = firstVideo.src ? new URL(firstVideo.src).pathname.replace('/api/photo/', '') : null;
  
  if (!videoPath) {
    console.log('❌ Video has no src attribute');
    return;
  }
  
  console.log(`🎥 Testing video: ${videoPath}`);
  
  try {
    // Test backend health
    console.log('\n1️⃣ Testing backend health...');
    const healthResponse = await fetch('http://localhost:8000/api/health');
    const healthData = await healthResponse.json();
    console.log('Backend health:', healthData);
    
    // Test thumbnail generation
    console.log('\n2️⃣ Testing thumbnail generation...');
    const genResponse = await fetch(`http://localhost:8000/api/thumbnail/${encodeURIComponent(videoPath)}`);
    const genData = await genResponse.json();
    console.log('Generation response:', genData);
    
    if (genData.status === 'processing') {
      console.log('\n3️⃣ Polling for completion...');
      let attempts = 0;
      const pollForCompletion = async () => {
        attempts++;
        const statusResponse = await fetch(`http://localhost:8000/api/thumbnail-status/${encodeURIComponent(videoPath)}`);
        const status = await statusResponse.json();
        
        console.log(`Attempt ${attempts}: ${status.status}`);
        
        if (status.status === 'ready') {
          console.log('✅ Thumbnail generated successfully!');
          console.log('Thumbnail size:', status.thumbnail.length, 'characters');
          
          // Test the thumbnail image
          const img = new Image();
          img.onload = () => {
            console.log(`Thumbnail dimensions: ${img.naturalWidth}x${img.naturalHeight}`);
            console.log(`Aspect ratio: ${(img.naturalWidth / img.naturalHeight).toFixed(3)}`);
          };
          img.onerror = () => {
            console.log('❌ Failed to load thumbnail image');
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
    } else if (genData.thumbnail) {
      console.log('✅ Thumbnail already cached');
      console.log('Thumbnail size:', genData.thumbnail.length, 'characters');
    } else {
      console.log('❌ Failed to start thumbnail generation');
    }
    
  } catch (error) {
    console.log('❌ Error testing thumbnail:', error);
  }
}

// Function to test a specific video file
async function testSpecificVideo(videoPath) {
  console.log(`🧪 Testing specific video: ${videoPath}`);
  
  try {
    const response = await fetch(`http://localhost:8000/api/thumbnail/${encodeURIComponent(videoPath)}`);
    const data = await response.json();
    console.log('Response:', data);
    
    if (data.status === 'processing') {
      console.log('⏳ Thumbnail is being generated...');
      // Poll for completion
      let attempts = 0;
      const pollForCompletion = async () => {
        attempts++;
        const statusResponse = await fetch(`http://localhost:8000/api/thumbnail-status/${encodeURIComponent(videoPath)}`);
        const status = await statusResponse.json();
        
        console.log(`Attempt ${attempts}: ${status.status}`);
        
        if (status.status === 'ready') {
          console.log('✅ Thumbnail ready!');
          return;
        } else if (attempts >= 10) {
          console.log('❌ Timeout');
          return;
        } else {
          setTimeout(pollForCompletion, 1000);
        }
      };
      
      setTimeout(pollForCompletion, 1000);
    }
  } catch (error) {
    console.log('❌ Error:', error);
  }
}

// Export functions
window.testVideoThumbnail = testVideoThumbnail;
window.testSpecificVideo = testSpecificVideo;

console.log('🔧 Test functions loaded:');
console.log('- testVideoThumbnail() - Test the first video on the page');
console.log('- testSpecificVideo("path/to/video.mp4") - Test a specific video'); 