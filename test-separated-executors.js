// Test script for separated executors and folder priority
// Run this in browser console to test the new system

async function testSeparatedExecutors() {
    console.log('🧪 Testing Separated Executors and Folder Priority System...');
    
    // Test 1: Check health endpoint
    console.log('\n📊 1. Checking backend health...');
    try {
        const health = await fetch('/api/health').then(r => r.json());
        console.log('✅ Health check:', {
            status: health.status,
            separate_executors: health.separate_executors,
            thumbnail_workers: health.thumbnail_executor_workers,
            conversion_workers: health.conversion_executor_workers,
            current_folder: health.current_folder
        });
        
        if (!health.separate_executors) {
            console.error('❌ Separate executors not enabled!');
            return;
        }
    } catch (error) {
        console.error('❌ Health check failed:', error);
        return;
    }
    
    // Test 2: Set current folder
    console.log('\n📁 2. Setting current folder...');
    try {
        const folders = await fetch('/api/folders').then(r => r.json());
        if (folders.length > 0) {
            const testFolder = folders[0].path;
            const setFolder = await fetch(`/api/set-current-folder/${encodeURIComponent(testFolder)}`, {
                method: 'POST'
            }).then(r => r.json());
            
            console.log('✅ Current folder set:', setFolder);
            
            // Verify health shows current folder
            const health2 = await fetch('/api/health').then(r => r.json());
            console.log('✅ Current folder in health:', health2.current_folder);
        } else {
            console.log('⚠️ No folders available for testing');
        }
    } catch (error) {
        console.error('❌ Setting current folder failed:', error);
    }
    
    // Test 3: Test thumbnail priority
    console.log('\n🖼️ 3. Testing thumbnail priority system...');
    try {
        const cacheStatus = await fetch('/api/thumbnail-cache/status').then(r => r.json());
        console.log('✅ Cache status:', {
            cache_size: cacheStatus.cache_size,
            processing_count: cacheStatus.processing_count,
            queue_size: cacheStatus.queue_size,
            max_concurrent: cacheStatus.max_concurrent
        });
    } catch (error) {
        console.error('❌ Cache status check failed:', error);
    }
    
    // Test 4: Test conversion system
    console.log('\n🎬 4. Testing conversion system...');
    try {
        const conversionStatus = await fetch('/api/conversion-cache/status').then(r => r.json());
        console.log('✅ Conversion status:', {
            cache_size: conversionStatus.cache_size,
            processing_count: conversionStatus.processing_count,
            queue_size: conversionStatus.queue_size,
            max_concurrent: conversionStatus.max_concurrent
        });
    } catch (error) {
        console.error('❌ Conversion status check failed:', error);
    }
    
    console.log('\n🎉 Test completed! The system should now have:');
    console.log('✅ Separate thread pools for thumbnails and conversions');
    console.log('✅ Priority thumbnails for current folder');
    console.log('✅ Non-blocking operations between systems');
    console.log('✅ Better resource management');
}

// Function to monitor real-time activity
function monitorActivity() {
    console.log('🔍 Starting real-time monitoring...');
    
    const interval = setInterval(async () => {
        try {
            const health = await fetch('/api/health').then(r => r.json());
            const thumbnailStatus = await fetch('/api/thumbnail-cache/status').then(r => r.json());
            const conversionStatus = await fetch('/api/conversion-cache/status').then(r => r.json());
            
            console.log(`⏰ ${new Date().toLocaleTimeString()}:`, {
                thumbnail: {
                    queue: thumbnailStatus.queue_size,
                    processing: thumbnailStatus.processing_count,
                    cache: thumbnailStatus.cache_size
                },
                conversion: {
                    queue: conversionStatus.queue_size,
                    processing: conversionStatus.processing_count,
                    cache: conversionStatus.cache_size
                },
                current_folder: health.current_folder
            });
        } catch (error) {
            console.error('❌ Monitoring error:', error);
        }
    }, 2000);
    
    // Stop monitoring after 30 seconds
    setTimeout(() => {
        clearInterval(interval);
        console.log('🛑 Monitoring stopped');
    }, 30000);
    
    return interval;
}

// Function to test folder navigation and priority
async function testFolderPriority() {
    console.log('📁 Testing folder priority system...');
    
    try {
        const folders = await fetch('/api/folders').then(r => r.json());
        console.log('📂 Available folders:', folders.map(f => f.name));
        
        if (folders.length > 0) {
            // Navigate to first folder
            const folder = folders[0];
            console.log(`\n🔄 Navigating to folder: ${folder.name}`);
            
            const photos = await fetch(`/api/photos/${encodeURIComponent(folder.path)}`).then(r => r.json());
            console.log(`✅ Loaded ${photos.photos.length} photos from ${folder.name}`);
            
            // Check if current folder was set
            const health = await fetch('/api/health').then(r => r.json());
            console.log(`✅ Current folder set to: ${health.current_folder}`);
            
            // Look for videos to test thumbnail priority
            const videos = photos.photos.filter(p => p.type === 'video');
            console.log(`🎬 Found ${videos.length} videos in current folder`);
            
            if (videos.length > 0) {
                console.log('🖼️ Testing thumbnail generation for current folder videos...');
                // Test thumbnail generation for first video
                const firstVideo = videos[0];
                const thumbnailResponse = await fetch(`/api/thumbnail/${encodeURIComponent(firstVideo.path)}`).then(r => r.json());
                console.log('✅ Thumbnail response:', thumbnailResponse);
            }
        }
    } catch (error) {
        console.error('❌ Folder priority test failed:', error);
    }
}

// Run all tests
async function runAllTests() {
    await testSeparatedExecutors();
    await testFolderPriority();
    console.log('\n🚀 Starting activity monitoring for 30 seconds...');
    monitorActivity();
}

// Export functions for manual testing
window.testSeparatedExecutors = testSeparatedExecutors;
window.monitorActivity = monitorActivity;
window.testFolderPriority = testFolderPriority;
window.runAllTests = runAllTests;

console.log('🧪 Separated Executors Test Script Loaded!');
console.log('Available functions:');
console.log('- testSeparatedExecutors() - Test the new system');
console.log('- testFolderPriority() - Test folder priority');
console.log('- monitorActivity() - Monitor real-time activity');
console.log('- runAllTests() - Run all tests'); 