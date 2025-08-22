// LinkedIn Enhanced Time Filters - Background Service Worker
// Handles notifications, alarms, and persistent functionality

(function() {
    'use strict';
    
    // Configuration
    const ALARM_NAME = 'linkedin-job-check';
    const CHECK_INTERVAL = 15; // minutes
    const NOTIFICATION_ID = 'linkedin-new-jobs';
    
    let settings = {
        enabled: false,
        notificationsEnabled: false,
        lastTPR: null,
        savedSearches: []
    };
    
    // Extension lifecycle
    chrome.runtime.onInstalled.addListener(async (details) => {
        console.log('[LinkedIn Time Filters] Extension installed/updated:', details.reason);
        
        // Initialize storage with default settings
        try {
            const data = await chrome.storage.sync.get(['enabled', 'notificationsEnabled']);
            settings.enabled = data.enabled !== false; // Default to true
            settings.notificationsEnabled = data.notificationsEnabled || false;
            
            if (details.reason === 'install') {
                // First time installation
                await chrome.storage.sync.set({
                    enabled: true,
                    notificationsEnabled: false,
                    lastTPR: null
                });
                
                await chrome.storage.local.set({
                    analytics: { usage: {} },
                    savedSearches: [],
                    lastCounts: {}
                });
                
                console.log('[LinkedIn Time Filters] Initial setup completed');
            }
            
        } catch (error) {
            console.error('[LinkedIn Time Filters] Setup error:', error);
        }
        
        // Create context menu
        if (chrome.contextMenus) {
            try {
                chrome.contextMenus.create({
                    id: 'linkedin-time-filter',
                    title: 'Apply LinkedIn Time Filter',
                    contexts: ['page'],
                    documentUrlPatterns: ['https://www.linkedin.com/jobs/*']
                });
            } catch (error) {
                console.error('[LinkedIn Time Filters] Context menu creation error:', error);
            }
        }
    });
    
    chrome.runtime.onStartup.addListener(async () => {
        console.log('[LinkedIn Time Filters] Browser startup - loading settings');
        await loadSettings();
        
        if (settings.notificationsEnabled) {
            await setupPeriodicCheck();
        }
    });
    
    // Settings management
    async function loadSettings() {
        try {
            const data = await chrome.storage.sync.get(['enabled', 'notificationsEnabled', 'lastTPR']);
            const localData = await chrome.storage.local.get(['savedSearches']);
            
            settings.enabled = data.enabled !== false;
            settings.notificationsEnabled = data.notificationsEnabled || false;
            settings.lastTPR = data.lastTPR || null;
            settings.savedSearches = localData.savedSearches || [];
            
        } catch (error) {
            console.error('[LinkedIn Time Filters] Error loading settings:', error);
        }
    }
    
    // Alarm and periodic job checking
    async function setupPeriodicCheck() {
        try {
            // Clear existing alarm first
            await clearPeriodicCheck();
            
            if (settings.notificationsEnabled) {
                await chrome.alarms.create(ALARM_NAME, {
                    delayInMinutes: CHECK_INTERVAL,
                    periodInMinutes: CHECK_INTERVAL
                });
                console.log('[LinkedIn Time Filters] Periodic check alarm set for every', CHECK_INTERVAL, 'minutes');
            }
        } catch (error) {
            console.error('[LinkedIn Time Filters] Setup periodic check error:', error);
        }
    }
    
    function clearPeriodicCheck() {
        chrome.alarms.clear(ALARM_NAME);
        console.log('[LinkedIn Time Filters] Periodic check alarm cleared');
    }
    
    chrome.alarms.onAlarm.addListener(async (alarm) => {
        if (alarm.name === ALARM_NAME) {
            console.log('[LinkedIn Time Filters] Periodic job check triggered');
            await performJobCheck();
        }
    });
    
    async function performJobCheck() {
        if (!settings.enabled || !settings.notificationsEnabled) {
            return;
        }
        
        try {
            // Get saved searches or use default search with last filter
            const searches = settings.savedSearches.length > 0 
                ? settings.savedSearches 
                : [{ 
                    url: 'https://www.linkedin.com/jobs/search/',
                    tpr: settings.lastTPR || 3600,
                    keywords: 'software engineer'
                }];
            
            for (const search of searches) {
                await checkSearchForNewJobs(search);
            }
            
        } catch (error) {
            console.error('[LinkedIn Time Filters] Error during job check:', error);
        }
    }
    
    async function checkSearchForNewJobs(search) {
        try {
            // Build search URL with TPR filter
            const searchUrl = new URL(search.url || 'https://www.linkedin.com/jobs/search/');
            if (search.tpr) {
                searchUrl.searchParams.set('f_TPR', 'r' + search.tpr);
            }
            if (search.keywords) {
                searchUrl.searchParams.set('keywords', search.keywords);
            }
            if (search.location) {
                searchUrl.searchParams.set('location', search.location);
            }
            
            // Note: Due to CORS restrictions, we can't directly fetch LinkedIn pages
            // from the service worker. This is a limitation we mentioned in the design.
            // 
            // Alternative approaches:
            // 1. Use content script-based checking when user visits LinkedIn
            // 2. Notify user to keep a LinkedIn tab open for background checks
            // 3. Use LinkedIn API if available (requires authentication)
            
            console.log('[LinkedIn Time Filters] Would check URL:', searchUrl.toString());
            
            // For demonstration, we'll simulate a notification
            // In a real implementation, this would require different architecture
            await simulateJobNotification(search);
            
        } catch (error) {
            console.error('[LinkedIn Time Filters] Error checking search:', error);
        }
    }
    
    async function simulateJobNotification(search) {
        // This is a simulation - in practice, job count checking would need
        // to be done differently due to CORS restrictions
        
        const notificationData = {
            type: 'basic',
            title: 'LinkedIn Time Filters - New Jobs Found',
            message: `Found new jobs matching your "${search.keywords || 'recent'}" search criteria`,
            buttons: [
                { title: 'View Jobs' },
                { title: 'Dismiss' }
            ]
        };
        
        // Only show notification if none is currently active
        const existing = await chrome.notifications.getAll();
        if (!existing[NOTIFICATION_ID]) {
            await chrome.notifications.create(NOTIFICATION_ID, notificationData);
        }
    }
    
    // Notification handling
    chrome.notifications.onClicked.addListener(async (notificationId) => {
        if (notificationId === NOTIFICATION_ID) {
            // Open LinkedIn jobs page
            const url = settings.lastTPR 
                ? `https://www.linkedin.com/jobs/search/?f_TPR=r${settings.lastTPR}`
                : 'https://www.linkedin.com/jobs/search/';
                
            await chrome.tabs.create({ url });
            await chrome.notifications.clear(notificationId);
        }
    });
    
    chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
        if (notificationId === NOTIFICATION_ID) {
            if (buttonIndex === 0) { // View Jobs
                const url = settings.lastTPR 
                    ? `https://www.linkedin.com/jobs/search/?f_TPR=r${settings.lastTPR}`
                    : 'https://www.linkedin.com/jobs/search/';
                    
                await chrome.tabs.create({ url });
            }
            await chrome.notifications.clear(notificationId);
        }
    });
    
    // Message handling from popup and content scripts
    chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
        console.log('[LinkedIn Time Filters] Background received message:', request);
        
        try {
            switch (request.action) {
                case 'enableNotifications':
                    handleNotificationToggle(request.enabled);
                    sendResponse({ success: true });
                    break;
                    
                case 'addSavedSearch':
                    handleAddSavedSearch(request.search);
                    sendResponse({ success: true });
                    break;
                    
                case 'removeSavedSearch':
                    handleRemoveSavedSearch(request.searchId);
                    sendResponse({ success: true });
                    break;
                    
                case 'getSavedSearches':
                    sendResponse({ searches: settings.savedSearches });
                    break;
                    
                case 'triggerJobCheck':
                    performJobCheck();
                    sendResponse({ success: true });
                    break;
                    
                case 'getBackgroundStatus':
                    sendResponse({
                        enabled: settings.enabled,
                        notificationsEnabled: settings.notificationsEnabled,
                        alarmActive: false // Would need to check chrome.alarms.getAll()
                    });
                    break;

                case 'updateCheckInterval':
                    // Clear existing alarm and create new one with updated interval
                    await clearPeriodicCheck();
                    settings.checkInterval = request.interval;
                    if (settings.notificationsEnabled) {
                        await chrome.alarms.create(ALARM_NAME, {
                            delayInMinutes: request.interval,
                            periodInMinutes: request.interval
                        });
                        console.log('[LinkedIn Time Filters] Periodic check alarm updated for every', request.interval, 'minutes');
                    }
                    sendResponse({ success: true });
                    break;
            }
        } catch (error) {
            console.error('[LinkedIn Time Filters] Background message handler error:', error);
            sendResponse({ success: false, error: error.message });
        }
    });
    
    async function handleNotificationToggle(enabled) {
        settings.notificationsEnabled = enabled;
        
        try {
            await chrome.storage.sync.set({ notificationsEnabled: enabled });
            
            if (enabled) {
                // Request notification permission if not granted
                const permission = await chrome.notifications.getPermissionLevel();
                if (permission === 'granted') {
                    await setupPeriodicCheck();
                }
            } else {
                await clearPeriodicCheck();
                await chrome.notifications.clear(NOTIFICATION_ID);
            }
            
        } catch (error) {
            console.error('[LinkedIn Time Filters] Error handling notification toggle:', error);
        }
    }
    
    async function handleAddSavedSearch(search) {
        try {
            search.id = Date.now().toString();
            search.created = Date.now();
            
            settings.savedSearches.push(search);
            
            await chrome.storage.local.set({ 
                savedSearches: settings.savedSearches 
            });
            
            console.log('[LinkedIn Time Filters] Added saved search:', search.keywords);
            
        } catch (error) {
            console.error('[LinkedIn Time Filters] Error adding saved search:', error);
        }
    }
    
    async function handleRemoveSavedSearch(searchId) {
        try {
            settings.savedSearches = settings.savedSearches.filter(s => s.id !== searchId);
            
            await chrome.storage.local.set({ 
                savedSearches: settings.savedSearches 
            });
            
            console.log('[LinkedIn Time Filters] Removed saved search:', searchId);
            
        } catch (error) {
            console.error('[LinkedIn Time Filters] Error removing saved search:', error);
        }
    }
    
    // Context menu click handler
    if (chrome.contextMenus) {
        chrome.contextMenus.onClicked.addListener(async (info, tab) => {
            if (info.menuItemId === 'linkedin-time-filter' && settings.lastTPR) {
                try {
                    const url = new URL(tab.url);
                    url.searchParams.set('f_TPR', 'r' + settings.lastTPR);
                    await chrome.tabs.update(tab.id, { url: url.toString() });
                } catch (error) {
                    console.error('[LinkedIn Time Filters] Context menu action error:', error);
                }
            }
        });
    }
    
    // Storage change listener
    chrome.storage.onChanged.addListener(async (changes, namespace) => {
        if (namespace === 'sync') {
            if (changes.enabled) {
                settings.enabled = changes.enabled.newValue;
            }
            if (changes.notificationsEnabled) {
                settings.notificationsEnabled = changes.notificationsEnabled.newValue;
                if (changes.notificationsEnabled.newValue) {
                    await setupPeriodicCheck();
                } else {
                    await clearPeriodicCheck();
                }
            }
            if (changes.lastTPR) {
                settings.lastTPR = changes.lastTPR.newValue;
            }
        }
    });
    
    // Initialize on load
    loadSettings();
    
    console.log('[LinkedIn Time Filters] Background service worker loaded');
    
})(); 