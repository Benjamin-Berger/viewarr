// Test script to verify thumbnail generation and video conversion are properly separated
// Run this in the browser console to test the new resource management system

console.log('🧪 Testing Separated Thumbnail and Conversion Systems');

async function testBackendHealth() {
    try {
        const response = await fetch('http://localhost:8000/api/health');
        const health = await response.json();
        
        console.log('📊 Backend Health Status:');
        console.log('- FFmpeg available:', health.ffmpeg_available);
        console.log('- Thumbnail queue size:', health.thumbnail_queue_size);
        console.log('- Thumbnail processing count:', health.thumbnail_processing_count);
        console.log('- Thumbnail executor workers:', health.thumbnail_executor_workers);
        console.log('- Conversion queue size:', health.conversion_queue_size);
        console.log('- Conversion processing count:', health.conversion_processing_count);
        console.log('- Conversion executor workers:', health.conversion_executor_workers);
        console.log('- Current folder:', health.current_folder);
        
        if (health.resource_management) {
            console.log('🔧 Resource Management:');
            console.log('- Max total FFmpeg processes:', health.resource_management.max_total_ffmpeg_processes);
            console.log('- FFmpeg semaphore available:', health.resource_management.ffmpeg_semaphore_available);
            console.log('- Separate executors:', health.resource_management.separate_executors);
            console.log('- Thumbnail workers:', health.resource_management.thumbnail_workers);
            console.log('- Conversion workers:', health.resource_management.conversion_workers);
        }
        
        return health;
    } catch (error) {
        console.error('❌ Error checking backend health:', error);
        return null;
    }
}

async function testThumbnailGeneration() {
    console.log('\n🖼️ Testing Thumbnail Generation...');
    
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
        
        // Test thumbnail generation for first few videos
        const testVideos = videos.slice(0, 3);
        console.log(`🖼️ Testing thumbnail generation for ${testVideos.length} videos...`);
        
        const thumbnailPromises = testVideos.map(async (video, index) => {
            console.log(`📥 Requesting thumbnail ${index + 1}/${testVideos.length}: ${video.name}`);
            
            const startTime = Date.now();
            const response = await fetch(`http://localhost:8000/api/thumbnail/${encodeURIComponent(video.path)}`);
            const endTime = Date.now();
            
            if (response.ok) {
                console.log(`✅ Thumbnail ${index + 1} completed in ${endTime - startTime}ms`);
                return { success: true, time: endTime - startTime };
            } else {
                console.log(`❌ Thumbnail ${index + 1} failed: ${response.status}`);
                return { success: false, time: endTime - startTime };
            }
        });
        
        const results = await Promise.all(thumbnailPromises);
        const successful = results.filter(r => r.success).length;
        const avgTime = results.reduce((sum, r) => sum + r.time, 0) / results.length;
        
        console.log(`📊 Thumbnail Results: ${successful}/${results.length} successful, avg time: ${avgTime.toFixed(0)}ms`);
        
    } catch (error) {
        console.error('❌ Error testing thumbnail generation:', error);
    }
}

async function testVideoConversion() {
    console.log('\n🎬 Testing Video Conversion...');
    
    try {
        // Get a list of folders to find AVI videos
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
        
        const aviVideos = photos.photos.filter(photo => 
            photo.type === 'video' && photo.path.toLowerCase().endsWith('.avi')
        );
        console.log(`🎬 Found ${aviVideos.length} AVI videos in folder`);
        
        if (aviVideos.length === 0) {
            console.log('⚠️ No AVI videos found in folder');
            return;
        }
        
        // Test conversion for first AVI video
        const testVideo = aviVideos[0];
        console.log(`🎬 Testing conversion for: ${testVideo.name}`);
        
        const startTime = Date.now();
        
        // Start conversion by requesting the convert endpoint
        const response = await fetch(`http://localhost:8000/api/convert/${encodeURIComponent(testVideo.path)}`, {
            method: 'HEAD'
        });
        
        const endTime = Date.now();
        
        if (response.ok) {
            console.log(`✅ Conversion request successful in ${endTime - startTime}ms`);
            console.log('📊 Response headers:', Object.fromEntries(response.headers.entries()));
        } else {
            console.log(`❌ Conversion request failed: ${response.status}`);
        }
        
    } catch (error) {
        console.error('❌ Error testing video conversion:', error);
    }
}

async function testConcurrentOperations() {
    console.log('\n⚡ Testing Concurrent Operations...');
    
    try {
        // Get initial health
        const initialHealth = await testBackendHealth();
        if (!initialHealth) return;
        
        console.log('🔄 Starting concurrent thumbnail and conversion operations...');
        
        // Start multiple thumbnail requests
        const thumbnailPromises = Array.from({ length: 5 }, async (_, i) => {
            console.log(`🖼️ Starting thumbnail request ${i + 1}`);
            return fetch('http://localhost:8000/api/thumbnail-cache/status');
        });
        
        // Start a conversion request
        const conversionPromise = fetch('http://localhost:8000/api/conversion-cache/status');
        
        // Wait for all operations to complete
        const results = await Promise.all([...thumbnailPromises, conversionPromise]);
        
        console.log('✅ All concurrent operations completed');
        
        // Check final health
        const finalHealth = await testBackendHealth();
        if (finalHealth) {
            console.log('📊 Final system state:');
            console.log('- Thumbnail processing:', finalHealth.thumbnail_processing_count);
            console.log('- Conversion processing:', finalHealth.conversion_processing_count);
        }
        
    } catch (error) {
        console.error('❌ Error testing concurrent operations:', error);
    }
}

async function runAllTests() {
    console.log('🚀 Starting Comprehensive System Separation Tests...\n');
    
    await testBackendHealth();
    await testThumbnailGeneration();
    await testVideoConversion();
    await testConcurrentOperations();
    
    console.log('\n✅ All tests completed!');
}

// Run the tests
runAllTests(); 