// Test script to verify queue duplicate prevention fix
// Run this in the browser console to test the fix

console.log('🧪 Testing Queue Duplicate Prevention Fix');

async function testQueueStatus() {
    try {
        const response = await fetch('http://localhost:8000/api/health');
        const health = await response.json();
        
        console.log('📊 Current Queue Status:');
        console.log('- Thumbnail queue size:', health.thumbnail_queue_size);
        console.log('- Thumbnail processing count:', health.thumbnail_processing_count);
        console.log('- Thumbnail cache size:', health.thumbnail_cache_size);
        
        return health;
    } catch (error) {
        console.error('❌ Error checking queue status:', error);
        return null;
    }
}

async function testDuplicateRequests() {
    console.log('\n🔄 Testing Duplicate Request Prevention...');
    
    try {
        // Get a list of folders to find videos
        const foldersResponse = await fetch('http://localhost:8000/api/folders');
        const folders = await foldersResponse.json();
        
        if (folders.length === 0) {
            console.log('⚠️ No folders found');
            return;
        }
        
        // Get photos from the first folder
        const firstFolder = folders[0];
        console.log('📁 Testing with folder:', firstFolder.name);
        
        const photosResponse = await fetch(`http://localhost:8000/api/photos/${encodeURIComponent(firstFolder.path)}`);
        const photos = await photosResponse.json();
        
        const videos = photos.photos.filter(photo => photo.type === 'video');
        console.log(`📹 Found ${videos.length} videos in folder`);
        
        if (videos.length === 0) {
            console.log('⚠️ No videos found in folder');
            return;
        }
        
        // Test with first video
        const testVideo = videos[0];
        console.log(`🎬 Testing duplicate requests for: ${testVideo.name}`);
        
        // Check initial queue status
        const initialStatus = await testQueueStatus();
        const initialQueueSize = initialStatus.thumbnail_queue_size;
        
        console.log(`📊 Initial queue size: ${initialQueueSize}`);
        
        // Make multiple requests for the same thumbnail
        const requests = [];
        for (let i = 0; i < 5; i++) {
            console.log(`📥 Making request ${i + 1}/5 for thumbnail...`);
            const request = fetch(`http://localhost:8000/api/thumbnail/${encodeURIComponent(testVideo.path)}`);
            requests.push(request);
        }
        
        // Wait for all requests to complete
        const responses = await Promise.all(requests);
        
        // Check final queue status
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait a bit for processing
        const finalStatus = await testQueueStatus();
        const finalQueueSize = finalStatus.thumbnail_queue_size;
        
        console.log(`📊 Final queue size: ${finalQueueSize}`);
        console.log(`📊 Queue size change: ${finalQueueSize - initialQueueSize}`);
        
        if (finalQueueSize - initialQueueSize <= 1) {
            console.log('✅ SUCCESS: Duplicate prevention is working! Only 1 item added to queue.');
        } else {
            console.log('❌ FAILURE: Duplicate prevention not working. Multiple items added to queue.');
        }
        
        // Check response statuses
        const responseStatuses = responses.map(r => r.status);
        console.log('📊 Response statuses:', responseStatuses);
        
        const responseData = await Promise.all(responses.map(r => r.json()));
        console.log('📊 Response data:', responseData.map(d => d.status || d.cached));
        
    } catch (error) {
        console.error('❌ Error testing duplicate requests:', error);
    }
}

async function testModeSwitching() {
    console.log('\n🔄 Testing Mode Switching...');
    
    try {
        // Simulate what happens when switching between grid/pinterest modes
        // by making multiple requests in quick succession
        
        const foldersResponse = await fetch('http://localhost:8000/api/folders');
        const folders = await foldersResponse.json();
        
        if (folders.length === 0) return;
        
        const photosResponse = await fetch(`http://localhost:8000/api/photos/${encodeURIComponent(folders[0].path)}`);
        const photos = await photosResponse.json();
        
        const videos = photos.photos.filter(photo => photo.type === 'video').slice(0, 3);
        
        console.log(`🎬 Testing mode switching with ${videos.length} videos...`);
        
        const initialStatus = await testQueueStatus();
        const initialQueueSize = initialStatus.thumbnail_queue_size;
        
        // Simulate rapid mode switching by making requests for multiple videos
        const allRequests = [];
        for (let round = 0; round < 3; round++) {
            console.log(`🔄 Round ${round + 1}/3: Making requests for all videos...`);
            
            for (const video of videos) {
                const request = fetch(`http://localhost:8000/api/thumbnail/${encodeURIComponent(video.path)}`);
                allRequests.push(request);
            }
            
            // Small delay to simulate mode switching
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Wait for all requests to complete
        await Promise.all(allRequests);
        
        // Check final status
        await new Promise(resolve => setTimeout(resolve, 1000));
        const finalStatus = await testQueueStatus();
        const finalQueueSize = finalStatus.thumbnail_queue_size;
        
        console.log(`📊 Initial queue size: ${initialQueueSize}`);
        console.log(`📊 Final queue size: ${finalQueueSize}`);
        console.log(`📊 Total requests made: ${allRequests.length}`);
        console.log(`📊 Items added to queue: ${finalQueueSize - initialQueueSize}`);
        
        if (finalQueueSize - initialQueueSize <= videos.length) {
            console.log('✅ SUCCESS: Mode switching duplicate prevention is working!');
        } else {
            console.log('❌ FAILURE: Mode switching is still creating duplicates.');
        }
        
    } catch (error) {
        console.error('❌ Error testing mode switching:', error);
    }
}

async function runAllTests() {
    console.log('🚀 Starting Queue Fix Tests...\n');
    
    await testQueueStatus();
    await testDuplicateRequests();
    await testModeSwitching();
    
    console.log('\n✅ All tests completed!');
}

// Run the tests
runAllTests(); 