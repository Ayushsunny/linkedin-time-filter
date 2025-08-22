// LinkedIn Enhanced Time Filters - Options Page Script
// Handles settings, analytics, and advanced configuration

// Constants
const TIME_FILTERS = [
    { label: 'Past 10 minutes', seconds: 600, time: '10m' },
    { label: 'Past 30 minutes', seconds: 1800, time: '30m' },
    { label: 'Past 1 hour', seconds: 3600, time: '1h' },
    { label: 'Past 2 hours', seconds: 7200, time: '2h' },
    { label: 'Past 6 hours', seconds: 21600, time: '6h' },
    { label: 'Past 12 hours', seconds: 43200, time: '12h' }
];

// State
let currentSettings = {
    enabled: true,
    notificationsEnabled: false,
    highlightJobs: true,
    checkInterval: 15
};

// DOM Elements
let elements = {};

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    console.log('[LinkedIn Time Filters] Options page loading...');
    await initializeOptions();
});

async function initializeOptions() {
    try {
        console.log('[LinkedIn Time Filters] Initializing options...');
        await loadAllData();
        setupEventListeners();
        updateUI();
        console.log('[LinkedIn Time Filters] Options initialized successfully');
    } catch (error) {
        console.error('[LinkedIn Time Filters] Options initialization error:', error);
        showError('Failed to initialize options: ' + error.message);
    }
}

async function loadAllData() {
    try {
        console.log('[LinkedIn Time Filters] Loading data...');
        
        // Load settings
        const settingsData = await chrome.storage.sync.get([
            'enabled', 'notificationsEnabled', 'highlightJobs', 'checkInterval'
        ]);
        
        currentSettings = {
            ...currentSettings,
            ...settingsData
        };

        console.log('[LinkedIn Time Filters] Settings loaded:', currentSettings);

        // Load analytics
        await updateAnalytics();
        
        // Load saved searches
        await updateSavedSearches();
        
    } catch (error) {
        console.error('[LinkedIn Time Filters] Load data error:', error);
        showError('Failed to load data: ' + error.message);
    }
}

function setupEventListeners() {
    console.log('[LinkedIn Time Filters] Setting up event listeners...');
    
    // Toggle switches
    elements.extensionToggle = document.getElementById('extensionToggle');
    elements.notificationsToggle = document.getElementById('notificationsToggle');
    elements.highlightToggle = document.getElementById('highlightToggle');
    
    if (elements.extensionToggle) {
        elements.extensionToggle.addEventListener('click', () => toggleSetting('enabled'));
        console.log('[LinkedIn Time Filters] Extension toggle listener added');
    }
    
    if (elements.notificationsToggle) {
        elements.notificationsToggle.addEventListener('click', () => toggleSetting('notificationsEnabled'));
        console.log('[LinkedIn Time Filters] Notifications toggle listener added');
    }
    
    if (elements.highlightToggle) {
        elements.highlightToggle.addEventListener('click', () => toggleSetting('highlightJobs'));
        console.log('[LinkedIn Time Filters] Highlight toggle listener added');
    }

    // Form elements
    elements.checkIntervalSelect = document.getElementById('checkIntervalSelect');
    if (elements.checkIntervalSelect) {
        elements.checkIntervalSelect.addEventListener('change', async (e) => {
            const newInterval = parseInt(e.target.value);
            console.log('[LinkedIn Time Filters] Changing check interval to:', newInterval, 'minutes');
            
            currentSettings.checkInterval = newInterval;
            await saveSettings();
            
            // Send message to background to update the alarm
            try {
                await chrome.runtime.sendMessage({
                    action: 'updateCheckInterval',
                    interval: newInterval
                });
                showSuccess(`Check interval updated to ${newInterval} minutes`);
            } catch (error) {
                console.error('[LinkedIn Time Filters] Error updating interval:', error);
            }
        });
        console.log('[LinkedIn Time Filters] Check interval listener added');
    }

    // Buttons
    const testNotificationBtn = document.getElementById('testNotificationBtn');
    if (testNotificationBtn) {
        testNotificationBtn.addEventListener('click', testNotification);
        console.log('[LinkedIn Time Filters] Test notification listener added');
    }

    const exportAnalyticsBtn = document.getElementById('exportAnalyticsBtn');
    if (exportAnalyticsBtn) {
        exportAnalyticsBtn.addEventListener('click', exportAnalytics);
        console.log('[LinkedIn Time Filters] Export analytics listener added');
    }

    const clearAnalyticsBtn = document.getElementById('clearAnalyticsBtn');
    if (clearAnalyticsBtn) {
        clearAnalyticsBtn.addEventListener('click', clearAnalytics);
        console.log('[LinkedIn Time Filters] Clear analytics listener added');
    }

    const addSearchBtn = document.getElementById('addSearchBtn');
    if (addSearchBtn) {
        addSearchBtn.addEventListener('click', handleAddSearch);
        console.log('[LinkedIn Time Filters] Add search listener added');
    }
    
    console.log('[LinkedIn Time Filters] All event listeners set up');
}

async function toggleSetting(settingName) {
    try {
        console.log('[LinkedIn Time Filters] Toggling setting:', settingName);
        currentSettings[settingName] = !currentSettings[settingName];
        await saveSettings();
        updateToggleState();
        
        // Special handling for notifications
        if (settingName === 'notificationsEnabled') {
            await chrome.runtime.sendMessage({
                action: 'enableNotifications',
                enabled: currentSettings.notificationsEnabled
            });
        }
        
        showSuccess(`${settingName} ${currentSettings[settingName] ? 'enabled' : 'disabled'}`);
    } catch (error) {
        console.error('[LinkedIn Time Filters] Toggle setting error:', error);
        showError('Failed to update setting: ' + error.message);
    }
}

async function saveSettings() {
    try {
        await chrome.storage.sync.set({
            enabled: currentSettings.enabled,
            notificationsEnabled: currentSettings.notificationsEnabled,
            highlightJobs: currentSettings.highlightJobs,
            checkInterval: currentSettings.checkInterval
        });
        
        console.log('[LinkedIn Time Filters] Settings saved:', currentSettings);
    } catch (error) {
        console.error('[LinkedIn Time Filters] Save settings error:', error);
        throw error;
    }
}

function updateUI() {
    updateToggleState();
    updateCheckInterval();
}

function updateToggleState() {
    if (elements.extensionToggle) {
        elements.extensionToggle.classList.toggle('active', currentSettings.enabled);
    }
    
    if (elements.notificationsToggle) {
        elements.notificationsToggle.classList.toggle('active', currentSettings.notificationsEnabled);
    }
    
    if (elements.highlightToggle) {
        elements.highlightToggle.classList.toggle('active', currentSettings.highlightJobs);
    }
}

function updateCheckInterval() {
    if (elements.checkIntervalSelect) {
        elements.checkIntervalSelect.value = currentSettings.checkInterval;
    }
}

async function updateAnalytics() {
    try {
        const data = await chrome.storage.local.get(['analytics']);
        const analytics = data.analytics || { usage: {} };
        
        updateUsageChart(analytics.usage);
        updateRecentActivity(analytics.usage);
        
    } catch (error) {
        console.error('[LinkedIn Time Filters] Update analytics error:', error);
    }
}

function updateUsageChart(usage) {
    const chartContainer = document.getElementById('usageChart');
    const totalUsageEl = document.getElementById('totalUsage');
    const mostUsedEl = document.getElementById('mostUsed');
    
    if (!chartContainer) return;
    
    if (Object.keys(usage).length === 0) {
        chartContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">No usage data available yet</div>';
        if (totalUsageEl) totalUsageEl.textContent = '0';
        if (mostUsedEl) mostUsedEl.textContent = '-';
        return;
    }
    
    // Calculate totals
    let totalUses = 0;
    let mostUsedFilter = '';
    let maxUses = 0;
    
    const sortedUsage = Object.entries(usage)
        .map(([filterKey, data]) => {
            const filter = TIME_FILTERS.find(f => f.seconds.toString() === filterKey);
            const label = filter ? filter.label : `${filterKey}s`;
            totalUses += data.uses;
            
            if (data.uses > maxUses) {
                maxUses = data.uses;
                mostUsedFilter = label;
            }
            
            return { label, uses: data.uses, key: filterKey };
        })
        .sort((a, b) => b.uses - a.uses);
    
    // Update summary cards
    if (totalUsageEl) totalUsageEl.textContent = totalUses.toString();
    if (mostUsedEl) mostUsedEl.textContent = mostUsedFilter || '-';
    
    // Create usage list
    if (sortedUsage.length > 0) {
        const listHTML = sortedUsage.map(item => `
            <div class="usage-item">
                <span class="usage-label">${item.label}</span>
                <span class="usage-count">${item.uses} use${item.uses === 1 ? '' : 's'}</span>
            </div>
        `).join('');
        
        chartContainer.innerHTML = listHTML;
    } else {
        chartContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">No usage data available yet</div>';
    }
}

function updateRecentActivity(usage) {
    const activityContainer = document.getElementById('recentActivity');
    if (!activityContainer) return;
    
    const recent = Object.entries(usage)
        .sort((a, b) => b[1].uses - a[1].uses)
        .slice(0, 3);
    
    if (recent.length === 0) {
        activityContainer.innerHTML = 'No recent activity';
        return;
    }
    
    const activityHTML = recent.map(([filter, data]) => {
        const filterLabel = TIME_FILTERS.find(f => f.seconds.toString() === filter)?.label || filter;
        return `<div style="margin: 5px 0; padding: 8px; background: #f8f9fa; border-radius: 4px;">
            <strong>${filterLabel}</strong><br>
            <small>Used ${data.uses} times</small>
        </div>`;
    }).join('');
    
    activityContainer.innerHTML = activityHTML;
}

async function updateSavedSearches() {
    try {
        const data = await chrome.storage.local.get(['savedSearches']);
        const searches = data.savedSearches || [];
        
        const container = document.getElementById('savedSearchesList');
        if (!container) return;
        
        // Clear container first
        container.innerHTML = '';
        
        if (searches.length === 0) {
            const noSearchesP = document.createElement('p');
            noSearchesP.className = 'no-searches';
            noSearchesP.textContent = 'No saved searches yet.';
            container.appendChild(noSearchesP);
            return;
        }
        
        // Create each search item using DOM methods (not innerHTML)
        searches.forEach(search => {
            const searchItem = document.createElement('div');
            searchItem.className = 'saved-search-item';
            searchItem.setAttribute('data-search-id', search.id);
            
            // Search info section
            const searchInfo = document.createElement('div');
            searchInfo.className = 'search-info';
            
            const keywords = document.createElement('strong');
            keywords.textContent = search.keywords || 'Any keywords';
            searchInfo.appendChild(keywords);
            
            const location = document.createElement('span');
            location.className = 'search-location';
            location.textContent = search.location || 'Any location';
            searchInfo.appendChild(location);
            
            const time = document.createElement('span');
            time.className = 'search-time';
            time.textContent = search.tpr ? formatTimeFilter(search.tpr) : 'Any time';
            searchInfo.appendChild(time);
            
            searchItem.appendChild(searchInfo);
            
            // Search actions section
            const searchActions = document.createElement('div');
            searchActions.className = 'search-actions';
            
            const openBtn = document.createElement('button');
            openBtn.className = 'btn btn-secondary open-search-btn';
            openBtn.textContent = 'Open';
            openBtn.addEventListener('click', () => openSearch(search));
            
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-danger delete-search-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.addEventListener('click', () => deleteSearch(search.id));
            
            searchActions.appendChild(openBtn);
            searchActions.appendChild(deleteBtn);
            searchItem.appendChild(searchActions);
            
            container.appendChild(searchItem);
        });
        
    } catch (error) {
        console.error('[LinkedIn Time Filters] Update saved searches error:', error);
    }
}

async function handleAddSearch() {
    try {
        const keywords = document.getElementById('searchKeywords').value.trim();
        const location = document.getElementById('searchLocation').value.trim();
        const timeFilter = document.getElementById('searchTimeFilter').value;
        
        if (!keywords && !location && !timeFilter) {
            showError('Please provide at least one search criteria');
            return;
        }
        
        const search = {
            id: Date.now().toString(),
            keywords,
            location,
            tpr: timeFilter ? parseInt(timeFilter) : null,
            createdAt: new Date().toISOString()
        };
        
        const data = await chrome.storage.local.get(['savedSearches']);
        const searches = data.savedSearches || [];
        searches.push(search);
        
        await chrome.storage.local.set({ savedSearches: searches });
        
        // Clear form
        document.getElementById('searchKeywords').value = '';
        document.getElementById('searchLocation').value = '';
        document.getElementById('searchTimeFilter').value = '';
        
        await updateSavedSearches();
        showSuccess('Search saved successfully!');
        
    } catch (error) {
        console.error('[LinkedIn Time Filters] Add search error:', error);
        showError('Failed to save search: ' + error.message);
    }
}

async function openSearch(search) {
    try {
        let url = 'https://www.linkedin.com/jobs/search/?';
        const params = new URLSearchParams();
        
        if (search.keywords) {
            params.append('keywords', search.keywords);
        }
        
        if (search.location) {
            params.append('location', search.location);
        }
        
        if (search.tpr) {
            params.append('f_TPR', 'r' + search.tpr);
        }
        
        url += params.toString();
        
        await chrome.tabs.create({ url });
        showSuccess('Opening search in new tab...');
        
    } catch (error) {
        console.error('[LinkedIn Time Filters] Open search error:', error);
        showError('Failed to open search: ' + error.message);
    }
}

async function deleteSearch(searchId) {
    try {
        const data = await chrome.storage.local.get(['savedSearches']);
        let searches = data.savedSearches || [];
        searches = searches.filter(s => s.id !== searchId);
        
        await chrome.storage.local.set({ savedSearches: searches });
        await updateSavedSearches();
        
        showSuccess('Search deleted successfully!');
        
    } catch (error) {
        console.error('[LinkedIn Time Filters] Delete search error:', error);
        showError('Failed to delete search: ' + error.message);
    }
}

async function testNotification() {
    try {
        console.log('[LinkedIn Time Filters] Testing notification...');
        showLoading('Sending test notification...');
        
        // Check if notifications are supported and permission is granted
        if (!chrome.notifications) {
            throw new Error('Notifications API not available');
        }
        
        // Simple notification without optional properties that cause issues
        const notificationData = {
            type: 'basic',
            title: 'LinkedIn Time Filters',
            message: 'Test notification sent successfully! The extension is working correctly.'
        };
        
        console.log('[LinkedIn Time Filters] Creating notification:', notificationData);
        
        // Use a promise wrapper to handle the callback properly
        await new Promise((resolve, reject) => {
            chrome.notifications.create('test-notification-' + Date.now(), notificationData, (notificationId) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                } else {
                    resolve(notificationId);
                }
            });
        });
        
        showSuccess('Test notification sent successfully! Check your system notifications.');
        
    } catch (error) {
        console.error('[LinkedIn Time Filters] Test notification error:', error);
        showError('Notification test failed: ' + error.message + '. Please check your system notification permissions.');
    } finally {
        hideLoading();
    }
}

async function exportAnalytics() {
    try {
        const data = await chrome.storage.local.get(['analytics']);
        const analytics = data.analytics || {};
        
        const blob = new Blob([JSON.stringify(analytics, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = 'linkedin-time-filters-analytics.json';
        a.click();
        
        URL.revokeObjectURL(url);
        showSuccess('Analytics exported successfully!');
        
    } catch (error) {
        console.error('[LinkedIn Time Filters] Export analytics error:', error);
        showError('Failed to export analytics: ' + error.message);
    }
}

async function clearAnalytics() {
    try {
        if (confirm('Are you sure you want to clear all analytics data? This cannot be undone.')) {
            await chrome.storage.local.set({ analytics: { usage: {} } });
            await updateAnalytics();
            showSuccess('Analytics cleared successfully!');
        }
    } catch (error) {
        console.error('[LinkedIn Time Filters] Clear analytics error:', error);
        showError('Failed to clear analytics: ' + error.message);
    }
}

function formatTimeFilter(seconds) {
    const filter = TIME_FILTERS.find(f => f.seconds === seconds);
    return filter ? filter.label : `Past ${seconds} seconds`;
}

function showSuccess(message) {
    const element = document.getElementById('successMessage');
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        setTimeout(() => element.style.display = 'none', 5000);
    }
}

function showError(message) {
    const element = document.getElementById('errorMessage');
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
        setTimeout(() => element.style.display = 'none', 5000);
    }
}

function showLoading(message) {
    const element = document.getElementById('loadingMessage');
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}

function hideLoading() {
    const element = document.getElementById('loadingMessage');
    if (element) {
        element.style.display = 'none';
    }
} 