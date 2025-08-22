// LinkedIn Enhanced Time Filters - Popup Script
// Handles popup UI interactions and communication with content script

(function() {
    'use strict';
    
    // Time filter configurations matching content script
    const TIME_FILTERS = [
        { label: '10 minutes', seconds: 600, value: 'r600' },
        { label: '30 minutes', seconds: 1800, value: 'r1800' },  
        { label: '1 hour', seconds: 3600, value: 'r3600' },
        { label: '2 hours', seconds: 7200, value: 'r7200' },
        { label: '6 hours', seconds: 21600, value: 'r21600' },
        { label: '12 hours', seconds: 43200, value: 'r43200' }
    ];
    
    // DOM elements
    let elements = {};
    let currentState = {
        enabled: false,
        lastTPR: null,
        onLinkedInPage: false,
        analytics: {}
    };
    
    // Helper function to format time filter
    function formatTimeFilter(seconds) {
        const filter = TIME_FILTERS.find(f => f.seconds === seconds);
        return filter ? filter.label : `${seconds / 60} minutes`;
    }
    
    // Initialize popup
    document.addEventListener('DOMContentLoaded', async () => {
        initializeElements();
        await loadState();
        setupEventListeners();
        await checkLinkedInPage();
        updateUI();
        hideLoading();
    });
    
    function initializeElements() {
        elements = {
            loading: document.getElementById('loading'),
            error: document.getElementById('error'),
            toggleSection: document.getElementById('toggleSection'),
            toggleSwitch: document.getElementById('toggleSwitch'),
            statusText: document.getElementById('statusText'),
            quickFilters: document.getElementById('quickFilters'),
            lastFilter: document.getElementById('lastFilter'),
            lastFilterText: document.getElementById('lastFilterText'),
            applyLastBtn: document.getElementById('applyLastBtn'),
            stats: document.getElementById('stats'),
            totalUsage: document.getElementById('totalUsage'),
            mostUsed: document.getElementById('mostUsed')
        };
    }
    
    async function loadState() {
        try {
            // Load from chrome.storage
            const data = await new Promise(resolve => {
                chrome.storage.sync.get(['enabled', 'lastTPR'], resolve);
            });
            
            const analyticsData = await new Promise(resolve => {
                chrome.storage.local.get(['analytics'], resolve);
            });
            
            currentState.enabled = data.enabled !== false; // Default to true
            currentState.lastTPR = data.lastTPR || null;
            currentState.analytics = analyticsData.analytics || { usage: {} };
            
        } catch (error) {
            showError('Failed to load extension settings');
            console.error('Error loading state:', error);
        }
    }
    
    async function saveState() {
        try {
            await new Promise(resolve => {
                chrome.storage.sync.set({
                    enabled: currentState.enabled,
                    lastTPR: currentState.lastTPR
                }, resolve);
            });
        } catch (error) {
            showError('Failed to save settings');
            console.error('Error saving state:', error);
        }
    }
    
    function setupEventListeners() {
        // Toggle switch
        elements.toggleSwitch.addEventListener('click', handleToggle);
        
        // Quick filter buttons
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const seconds = parseInt(btn.dataset.seconds);
                const label = btn.dataset.label;
                handleQuickFilter(seconds);
            });
        });
        
        // Apply last filter button
        elements.applyLastBtn.addEventListener('click', handleApplyLast);
        
        // Advanced settings button
        const advancedSettingsBtn = document.getElementById('advancedSettingsBtn');
        if (advancedSettingsBtn) {
            advancedSettingsBtn.addEventListener('click', () => {
                chrome.runtime.openOptionsPage();
            });
        }
    }
    
    async function handleToggle() {
        currentState.enabled = !currentState.enabled;
        
        // Update storage
        await saveState();
        
        // Communicate with content script
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url.includes('linkedin.com/jobs')) {
                await chrome.tabs.sendMessage(tab.id, { 
                    action: 'toggle', 
                    enabled: currentState.enabled 
                });
            }
        } catch (error) {
            console.log('Could not communicate with content script:', error);
        }
        
        updateUI();
    }
    
    function handleQuickFilter(seconds) {
        try {
            console.log('[LinkedIn Time Filters] Quick filter applying directly:', seconds, 'seconds');
            
            // Apply the filter immediately
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && tabs[0].url.includes('linkedin.com/jobs')) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'applyTimeFilter',
                        seconds: seconds
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error('[LinkedIn Time Filters] Message error:', chrome.runtime.lastError);
                            showError('Content script not responding. Please refresh the LinkedIn page.');
                            return;
                        }
                        
                        if (response && response.success) {
                            // Store the applied filter
                            chrome.storage.sync.set({ lastTPR: seconds });
                            currentState.lastTPR = seconds;
                            
                            // Update analytics
                            updateAnalytics(`r${seconds}`);
                            
                            // Visual feedback - highlight the selected filter button
                            document.querySelectorAll('.filter-btn').forEach(btn => {
                                btn.classList.remove('active');
                            });
                            
                            const selectedBtn = document.querySelector(`[data-seconds="${seconds}"]`);
                            if (selectedBtn) {
                                selectedBtn.classList.add('active');
                            }
                            
                            // Show success and close popup
                            const filterLabel = formatTimeFilter(seconds);
                            showSuccess(`Applied ${filterLabel} filter successfully!`);
                            
                            setTimeout(() => window.close(), 1200);
                            
                        } else {
                            showError(response?.error || 'Failed to apply filter. Please try again.');
                        }
                    });
                } else {
                    showError('Please navigate to LinkedIn jobs page first');
                }
            });
            
        } catch (error) {
            console.error('[LinkedIn Time Filters] Quick filter error:', error);
            showError('Failed to apply filter: ' + error.message);
        }
    }

    // Apply last used filter only
    function handleApplyLast() {
        try {
            const lastTPR = currentState.lastTPR;
            
            if (!lastTPR) {
                showError('No previous filter to apply');
                return;
            }
            
            console.log('[LinkedIn Time Filters] Applying last filter:', lastTPR, 'seconds');
            
            // Send message to content script to apply the filter
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs[0] && tabs[0].url.includes('linkedin.com/jobs')) {
                    chrome.tabs.sendMessage(tabs[0].id, {
                        action: 'applyTimeFilter',
                        seconds: lastTPR
                    }, (response) => {
                        if (chrome.runtime.lastError) {
                            console.error('[LinkedIn Time Filters] Message error:', chrome.runtime.lastError);
                            showError('Content script not responding. Please refresh the LinkedIn page.');
                            return;
                        }
                        
                        if (response && response.success) {
                            // Update analytics
                            updateAnalytics(`r${lastTPR}`);
                            
                            // Show success
                            const filterLabel = formatTimeFilter(lastTPR);
                            showSuccess(`Applied ${filterLabel} filter successfully!`);
                            
                            setTimeout(() => window.close(), 1200);
                            
                        } else {
                            showError(response?.error || 'Failed to apply filter. Please try again.');
                        }
                    });
                    
                } else {
                    showError('Please navigate to LinkedIn jobs page first');
                }
            });
            
        } catch (error) {
            console.error('[LinkedIn Time Filters] Apply last filter error:', error);
            showError('Failed to apply filter: ' + error.message);
        }
    }
    
    async function updateAnalytics(filterValue) {
        if (!currentState.analytics.usage[filterValue]) {
            currentState.analytics.usage[filterValue] = { uses: 0, lastUsed: Date.now() };
        }
        
        currentState.analytics.usage[filterValue].uses++;
        currentState.analytics.usage[filterValue].lastUsed = Date.now();
        
        try {
            await new Promise(resolve => {
                chrome.storage.local.set({ analytics: currentState.analytics }, resolve);
            });
        } catch (error) {
            console.error('Error updating analytics:', error);
        }
    }
    
    async function checkLinkedInPage() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            currentState.onLinkedInPage = tab && tab.url.includes('linkedin.com/jobs');
            
            if (currentState.onLinkedInPage) {
                // Try to get status from content script
                try {
                    const response = await chrome.tabs.sendMessage(tab.id, { action: 'getStatus' });
                    if (response) {
                        currentState.enabled = response.enabled;
                        currentState.lastTPR = response.currentFilter;
                    }
                } catch (error) {
                    console.log('Content script not responding:', error);
                }
            }
        } catch (error) {
            console.error('Error checking LinkedIn page:', error);
            currentState.onLinkedInPage = false;
        }
    }
    
    function updateUI() {
        // Toggle switch
        if (currentState.enabled) {
            elements.toggleSwitch.classList.add('active');
            elements.statusText.textContent = 'Extension is enabled';
            elements.statusText.classList.add('enabled');
        } else {
            elements.toggleSwitch.classList.remove('active');
            elements.statusText.textContent = 'Extension is disabled';
            elements.statusText.classList.remove('enabled');
        }
        
        // Quick filters
        const filterButtons = document.querySelectorAll('.filter-btn');
        filterButtons.forEach(btn => {
            const seconds = parseInt(btn.dataset.seconds);
            
            if (!currentState.enabled || !currentState.onLinkedInPage) {
                btn.classList.add('disabled');
                btn.classList.remove('active');
            } else {
                btn.classList.remove('disabled');
                
                if (currentState.lastTPR === seconds) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            }
        });
        
        // Last filter
        if (currentState.lastTPR) {
            const filter = TIME_FILTERS.find(f => f.seconds === currentState.lastTPR);
            elements.lastFilterText.textContent = filter ? `Past ${filter.label}` : `Past ${currentState.lastTPR / 60} minutes`;
            
            if (currentState.enabled && currentState.onLinkedInPage) {
                elements.applyLastBtn.classList.remove('disabled');
                elements.applyLastBtn.textContent = 'Apply Last Filter';
            } else {
                elements.applyLastBtn.classList.add('disabled');
                elements.applyLastBtn.textContent = currentState.onLinkedInPage ? 'Extension Disabled' : 'Visit LinkedIn Jobs';
            }
        } else {
            elements.lastFilterText.textContent = 'No filter used yet';
            elements.applyLastBtn.classList.add('disabled');
            elements.applyLastBtn.textContent = 'No Last Filter';
        }
        
        // Statistics
        updateStatistics();
        
        // Show/hide sections based on LinkedIn page
        if (!currentState.onLinkedInPage) {
            elements.quickFilters.style.opacity = '0.6';
            elements.lastFilter.style.opacity = '0.6';
        } else {
            elements.quickFilters.style.opacity = '1';
            elements.lastFilter.style.opacity = '1';
        }
    }
    
    function updateStatistics() {
        const usage = currentState.analytics.usage || {};
        const entries = Object.entries(usage);
        
        // Calculate total usage
        const totalUses = entries.reduce((sum, [_, data]) => sum + data.uses, 0);
        elements.totalUsage.textContent = totalUses.toString();
        
        // Find most used filter
        if (entries.length > 0) {
            const mostUsedEntry = entries.reduce((max, current) => 
                current[1].uses > max[1].uses ? current : max
            );
            
            const filterValue = mostUsedEntry[0];
            const seconds = parseInt(filterValue.replace('r', ''));
            
            if (isNaN(seconds)) {
                elements.mostUsed.textContent = '-';
            } else {
                const filter = TIME_FILTERS.find(f => f.seconds === seconds);
                
                if (filter) {
                    // Extract just the number/unit for compact display
                    if (seconds < 3600) {
                        elements.mostUsed.textContent = `${seconds / 60}m`;
                    } else {
                        elements.mostUsed.textContent = `${seconds / 3600}h`;
                    }
                } else {
                    // Fallback calculation
                    if (seconds < 3600) {
                        elements.mostUsed.textContent = `${Math.round(seconds / 60)}m`;
                    } else {
                        elements.mostUsed.textContent = `${Math.round(seconds / 3600)}h`;
                    }
                }
            }
        } else {
            elements.mostUsed.textContent = '-';
        }
    }
    
    function showError(message) {
        elements.error.textContent = message;
        elements.error.classList.add('show');
        setTimeout(() => {
            elements.error.classList.remove('show');
        }, 5000);
    }
    
    function showSuccess(message) {
        // Create success element if it doesn't exist
        let successElement = document.getElementById('success');
        if (!successElement) {
            successElement = document.createElement('div');
            successElement.id = 'success';
            successElement.className = 'success-message';
            successElement.style.cssText = `
                position: fixed;
                top: 10px;
                left: 50%;
                transform: translateX(-50%);
                background: linear-gradient(135deg, #28a745, #20c997);
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
                font-weight: 500;
                z-index: 1000;
                display: none;
                animation: slideDown 0.3s ease;
            `;
            document.body.appendChild(successElement);
        }
        
        successElement.textContent = message;
        successElement.style.display = 'block';
        setTimeout(() => {
            successElement.style.display = 'none';
        }, 3000);
    }
    
    function hideLoading() {
        elements.loading.classList.remove('show');
        elements.toggleSection.style.display = 'block';
        elements.quickFilters.style.display = 'block';
        elements.lastFilter.style.display = 'block';
        elements.stats.style.display = 'block';
    }
    
    // Show loading initially
    elements?.loading?.classList.add('show');
    
})(); 