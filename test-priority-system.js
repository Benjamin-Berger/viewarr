// Test script for priority queue system
// Run this in browser console to test folder priority

async function testPrioritySystem() {
    console.log('🧪 Testing Priority Queue System...');
    
    // Test 1: Check initial state
    console.log('\n📊 1. Checking initial state...');
    try {
        const health = await fetch('/api/health').then(r => r.json());
        console.log('✅ Initial health:', {
            current_folder: health.current_folder,
            thumbnail_queue_size: health.thumbnail_queue_size,
            thumbnail_processing_count: health.thumbnail_processing_count
        });
    } catch (error) {
        console.error('❌ Health check failed:', error);
        return;
    }
    
    // Test 2: Get available folders
    console.log('\n📁 2. Getting available folders...');
    try {
        const folders = await fetch('/api/folders').then(r => r.json());
        console.log('✅ Available folders:', folders.map(f => f.name));
        
        if (folders.length < 2) {
            console.log('⚠️ Need at least 2 folders to test priority. Found:', folders.length);
            return;
        }
        
        const folder1 = folders[0];
        const folder2 = folders[1];
        
        // Test 3: Navigate to first folder
        console.log(`\n🔄 3. Navigating to folder 1: ${folder1.name}`);
        const photos1 = await fetch(`/api/photos/${encodeURIComponent(folder1.path)}`).then(r => r.json());
        console.log(`✅ Loaded ${photos1.photos.length} photos from ${folder1.name}`);
        
        // Check current folder
        const health1 = await fetch('/api/health').then(r => r.json());
        console.log(`✅ Current folder set to: ${health1.current_folder}`);
        
        // Test 4: Navigate to second folder
        console.log(`\n🔄 4. Navigating to folder 2: ${folder2.name}`);
        const photos2 = await fetch(`/api/photos/${encodeURIComponent(folder2.path)}`).then(r => r.json());
        console.log(`✅ Loaded ${photos2.photos.length} photos from ${folder2.name}`);
        
        // Check current folder changed
        const health2 = await fetch('/api/health').then(r => r.json());
        console.log(`✅ Current folder changed to: ${health2.current_folder}`);
        
        // Test 5: Test thumbnail priority
        console.log('\n🖼️ 5. Testing thumbnail priority...');
        const videos1 = photos1.photos.filter(p => p.type === 'video');
        const videos2 = photos2.photos.filter(p => p.type === 'video');
        
        console.log(`📊 Videos in folder 1: ${videos1.length}, Videos in folder 2: ${videos2.length}`);
        
        if (videos1.length > 0 && videos2.length > 0) {
            // Request thumbnails for both folders
            console.log('🔄 Requesting thumbnails for both folders...');
            
            // Request thumbnail from folder 1 (should be low priority now)
            const thumbnail1 = await fetch(`/api/thumbnail/${encodeURIComponent(videos1[0].path)}`).then(r => r.json());
            console.log('✅ Folder 1 thumbnail response:', thumbnail1);
            
            // Request thumbnail from folder 2 (should be high priority)
            const thumbnail2 = await fetch(`/api/thumbnail/${encodeURIComponent(videos2[0].path)}`).then(r => r.json());
            console.log('✅ Folder 2 thumbnail response:', thumbnail2);
            
            // Check queue status
            const cacheStatus = await fetch('/api/thumbnail-cache/status').then(r => r.json());
            console.log('✅ Cache status after requests:', {
                queue_size: cacheStatus.queue_size,
                processing_count: cacheStatus.processing_count,
                cache_size: cacheStatus.cache_size
            });
        }
        
    } catch (error) {
        console.error('❌ Priority test failed:', error);
    }
}

// Function to monitor priority in real-time
function monitorPriority() {
    console.log('🔍 Starting priority monitoring...');
    
    const interval = setInterval(async () => {
        try {
            const health = await fetch('/api/health').then(r => r.json());
            const cacheStatus = await fetch('/api/thumbnail-cache/status').then(r => r.json());
            
            console.log(`⏰ ${new Date().toLocaleTimeString()}:`, {
                current_folder: health.current_folder,
                queue_size: cacheStatus.queue_size,
                processing_count: cacheStatus.processing_count,
                cache_size: cacheStatus.cache_size
            });
        } catch (error) {
            console.error('❌ Monitoring error:', error);
        }
    }, 2000);
    
    // Stop monitoring after 30 seconds
    setTimeout(() => {
        clearInterval(interval);
        console.log('🛑 Priority monitoring stopped');
    }, 30000);
    
    return interval;
}

// Function to test folder switching
async function testFolderSwitching() {
    console.log('🔄 Testing folder switching...');
    
    try {
        const folders = await fetch('/api/folders').then(r => r.json());
        console.log('📂 Available folders:', folders.map(f => f.name));
        
        if (folders.length < 2) {
            console.log('⚠️ Need at least 2 folders to test switching');
            return;
        }
        
        // Switch between folders rapidly
        for (let i = 0; i < 3; i++) {
            const folder = folders[i % folders.length];
            console.log(`\n🔄 Switching to folder: ${folder.name}`);
            
            const photos = await fetch(`/api/photos/${encodeURIComponent(folder.path)}`).then(r => r.json());
            console.log(`✅ Loaded ${photos.photos.length} photos from ${folder.name}`);
            
            // Check current folder
            const health = await fetch('/api/health').then(r => r.json());
            console.log(`✅ Current folder: ${health.current_folder}`);
            
            // Wait a bit
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        console.log('\n✅ Folder switching test completed!');
        
    } catch (error) {
        console.error('❌ Folder switching test failed:', error);
    }
}

// Function to test queue clearing
async function testQueueClearing() {
    console.log('🧹 Testing queue clearing...');
    
    try {
        const folders = await fetch('/api/folders').then(r => r.json());
        
        if (folders.length < 2) {
            console.log('⚠️ Need at least 2 folders to test queue clearing');
            return;
        }
        
        const folder1 = folders[0];
        const folder2 = folders[1];
        
        // Navigate to first folder
        console.log(`\n🔄 Navigating to ${folder1.name}...`);
        await fetch(`/api/photos/${encodeURIComponent(folder1.path)}`);
        
        // Check queue size
        const status1 = await fetch('/api/thumbnail-cache/status').then(r => r.json());
        console.log(`✅ Queue size after folder 1: ${status1.queue_size}`);
        
        // Navigate to second folder
        console.log(`\n🔄 Navigating to ${folder2.name}...`);
        await fetch(`/api/photos/${encodeURIComponent(folder2.path)}`);
        
        // Check queue size (should be cleared)
        const status2 = await fetch('/api/thumbnail-cache/status').then(r => r.json());
        console.log(`✅ Queue size after folder 2: ${status2.queue_size}`);
        
        if (status2.queue_size === 0) {
            console.log('✅ Queue was properly cleared when switching folders!');
        } else {
            console.log('⚠️ Queue was not cleared when switching folders');
        }
        
    } catch (error) {
        console.error('❌ Queue clearing test failed:', error);
    }
}

// Run all tests
async function runPriorityTests() {
    await testPrioritySystem();
    await testFolderSwitching();
    await testQueueClearing();
    console.log('\n🚀 Starting priority monitoring for 30 seconds...');
    monitorPriority();
}

// Export functions for manual testing
window.testPrioritySystem = testPrioritySystem;
window.monitorPriority = monitorPriority;
window.testFolderSwitching = testFolderSwitching;
window.testQueueClearing = testQueueClearing;
window.runPriorityTests = runPriorityTests;

console.log('🧪 Priority Queue Test Script Loaded!');
console.log('Available functions:');
console.log('- testPrioritySystem() - Test the priority system');
console.log('- testFolderSwitching() - Test folder switching');
console.log('- testQueueClearing() - Test queue clearing');
console.log('- monitorPriority() - Monitor priority in real-time');
console.log('- runPriorityTests() - Run all priority tests'); 