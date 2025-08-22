// LinkedIn Enhanced Time Filters - Content Script
// Main functionality for injecting time filters and handling interactions

(function() {
    'use strict';
    
    // Time filter configurations with precise calculations
    const TIME_FILTERS = [
        { label: '10 minutes', seconds: 600, value: 'r600' },        // 10 × 60 = 600
        { label: '30 minutes', seconds: 1800, value: 'r1800' },     // 30 × 60 = 1800  
        { label: '1 hour', seconds: 3600, value: 'r3600' },         // 60 × 60 = 3600
        { label: '2 hours', seconds: 7200, value: 'r7200' },        // 2 × 3600 = 7200
        { label: '6 hours', seconds: 21600, value: 'r21600' },      // 6 × 3600 = 21600
        { label: '12 hours', seconds: 43200, value: 'r43200' }      // 12 × 3600 = 43200
    ];
    
    let isEnabled = true;
    let currentFilter = null;
    let selectedFilter = null; // Track selected but not applied filter
    let observer = null;
    let injectedOptions = [];
    let applyButton = null;
    
    // Extension state management
    async function loadSettings() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['enabled', 'lastTPR'], (data) => {
                isEnabled = data.enabled !== false; // Default to true
                currentFilter = data.lastTPR || null;
                resolve(data);
            });
        });
    }
    
    async function saveSettings(settings) {
        return new Promise((resolve) => {
            chrome.storage.sync.set(settings, resolve);
        });
    }
    
    // URL manipulation for LinkedIn search filters
    function setTPROnUrl(seconds) {
        const url = new URL(window.location.href);
        url.searchParams.set('f_TPR', 'r' + seconds);
        
        // Use history.pushState to avoid page reload, then trigger LinkedIn's update
        history.pushState(null, '', url.toString());
        
        // Trigger LinkedIn's internal routing/filtering
        window.dispatchEvent(new PopStateEvent('popstate'));
        
        // Alternative: Force page navigation if SPA routing doesn't work
        // window.location.href = url.toString();
    }
    
    function removeTPRFromUrl() {
        const url = new URL(window.location.href);
        url.searchParams.delete('f_TPR');
        history.pushState(null, '', url.toString());
        window.dispatchEvent(new PopStateEvent('popstate'));
    }
    
    // DOM manipulation and injection
    function waitForElement(selector, timeout = 10000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            function check() {
                const element = document.querySelector(selector);
                if (element) {
                    resolve(element);
                } else if (Date.now() - startTime > timeout) {
                    reject(new Error(`Element ${selector} not found within ${timeout}ms`));
                } else {
                    setTimeout(check, 100);
                }
            }
            check();
        });
    }
    
    async function findDatePostedFilter() {
        // Multiple strategies to find the Date Posted filter
        const selectors = [
            '[data-tracking-control-name="public_jobs_f_TPR"]',
            '[data-control-name="filter_f_TPR"]',
            'fieldset[data-test-filter="Date Posted"]',
            'fieldset[data-test-filter="f_TPR"]',
            '.jobs-search-dropdown--is-date-posted',
            'button[aria-label*="Date posted"]'
        ];
        
        // Try stable selectors first
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) return element;
        }
        
        // Fallback: search by text content
        const filterElements = document.querySelectorAll('fieldset, button, div[role="button"]');
        for (const element of filterElements) {
            const text = element.textContent?.toLowerCase() || '';
            if (text.includes('date posted') || text.includes('past 24 hours') || text.includes('past week')) {
                return element;
            }
        }
        
        return null;
    }
    
    async function findFilterDropdown(filterButton) {
        // Look for the dropdown menu that appears when filter is clicked
        const dropdownSelectors = [
            '.jobs-search-dropdown__dropdown-list',
            '.artdeco-dropdown__content-inner',
            '[role="menu"]',
            '.scaffold-finite-scroll'
        ];
        
        for (const selector of dropdownSelectors) {
            const dropdown = document.querySelector(selector);
            if (dropdown && dropdown.offsetParent) { // visible
                return dropdown;
            }
        }
        
        return null;
    }
    
    function createCustomFilterOption(filter) {
        // Create option that matches LinkedIn's styling
        const option = document.createElement('li');
        option.className = 'jobs-search-dropdown__option';
        option.setAttribute('role', 'menuitemcheckbox');
        option.setAttribute('data-custom-filter', filter.value);
        
        const label = document.createElement('label');
        label.className = 'jobs-search-dropdown__option-label';
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.className = 'jobs-search-dropdown__option-input';
        input.value = filter.value;
        
        const span = document.createElement('span');
        span.className = 'jobs-search-dropdown__option-label-text';
        span.textContent = `Past ${filter.label}`;
        
        // Add custom styling class
        option.classList.add('ltf-custom-option');
        
        label.appendChild(input);
        label.appendChild(span);
        option.appendChild(label);
        
        // Click handler - directly apply the filter
        option.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleFilterClick(filter.seconds);
        });
        
        return option;
    }
    
    // Add this function to actually highlight jobs when TPR is applied
    function highlightJobsInTimeRange(seconds) {
        try {
            console.log('[LinkedIn Time Filters] Highlighting jobs within', seconds, 'seconds');
            
            // Find all job cards on the page
            const jobCards = document.querySelectorAll([
                '.job-search-card',
                '.jobs-search-results__list-item',
                '[data-job-id]',
                '.job-card-container'
            ].join(', '));
            
            console.log('[LinkedIn Time Filters] Found', jobCards.length, 'job cards');
            
            jobCards.forEach((card, index) => {
                // Remove existing highlights
                card.classList.remove('ltf-highlighted-job');
                const existingBadge = card.querySelector('.ltf-new-badge');
                if (existingBadge) {
                    existingBadge.remove();
                }
                
                // Find time element - LinkedIn uses various selectors
                const timeSelectors = [
                    'time',
                    '[data-test-job-posting-date]',
                    '.job-search-card__listdate',
                    '.jobs-unified-top-card__posted-date',
                    '.job-card-container__metadata-item time',
                    'span[aria-label*="ago"]',
                    'span[aria-label*="Posted"]'
                ];
                
                let timeElement = null;
                for (const selector of timeSelectors) {
                    timeElement = card.querySelector(selector);
                    if (timeElement) break;
                }
                
                if (timeElement) {
                    const timeText = timeElement.textContent || timeElement.getAttribute('aria-label') || '';
                    const jobSeconds = parseRelativeTime(timeText);
                    
                    console.log(`[LinkedIn Time Filters] Job ${index + 1}: "${timeText}" = ${jobSeconds} seconds`);
                    
                    if (jobSeconds !== null && jobSeconds <= seconds) {
                        // Highlight this job
                        card.classList.add('ltf-highlighted-job');
                        
                        // Add NEW badge
                        const badge = document.createElement('div');
                        badge.className = 'ltf-new-badge';
                        badge.textContent = 'NEW';
                        
                        // Position the badge
                        card.style.position = 'relative';
                        card.appendChild(badge);
                        
                        console.log(`[LinkedIn Time Filters] Highlighted job ${index + 1} (${timeText})`);
                        
                        // Force VERY visible highlighting
                        card.style.setProperty('border', '4px solid #ff0000 !important', 'important');
                        card.style.setProperty('background-color', 'rgba(255, 0, 0, 0.1) !important', 'important');
                        card.style.setProperty('box-shadow', '0 0 20px rgba(255, 0, 0, 0.8) !important', 'important');
                        card.style.setProperty('transform', 'scale(1.02) !important', 'important');
                    }
                } else {
                    console.log(`[LinkedIn Time Filters] No time element found for job ${index + 1}`);
                }
            });
            
            // Update analytics
            updateAnalytics(`r${seconds}`);
            
        } catch (error) {
            console.error('[LinkedIn Time Filters] Error highlighting jobs:', error);
        }
    }

    // Handle filter selection (not applying it yet)
    function handleFilterSelection(seconds) {
        try {
            console.log('[LinkedIn Time Filters] Filter selected:', seconds, 'seconds');
            
            selectedFilter = seconds;
            
            // Update visual selection
            updateFilterSelection();
            
            // Show/update apply button
            showApplyButton();
            
        } catch (error) {
            console.error('[LinkedIn Time Filters] Error handling filter selection:', error);
        }
    }

    // Apply the selected filter directly
    function handleFilterClick(seconds) {
        try {
            console.log('[LinkedIn Time Filters] Filter applied:', seconds, 'seconds');
            
            // Update URL with f_TPR parameter
            setTPROnUrl(seconds);
            
            // Store the applied filter
            saveSettings({ lastTPR: seconds });
            currentFilter = seconds;
            
            // Update analytics
            updateAnalytics(`r${seconds}`);
            
            // Highlight jobs after a short delay to let the page update
            setTimeout(() => {
                highlightJobsInTimeRange(seconds);
            }, 500);
            
            console.log('[LinkedIn Time Filters] Filter applied successfully');
            
        } catch (error) {
            console.error('[LinkedIn Time Filters] Error handling filter application:', error);
        }
    }
    
    function updateFilterSelection() {
        // Update visual state of filter options
        injectedOptions.forEach(option => {
            const isSelected = option.getAttribute('data-custom-filter') === ('r' + selectedFilter);
            option.classList.toggle('ltf-selected', isSelected);
        });
    }
    
    function showApplyButton() {
        if (!applyButton) {
            createApplyButton();
        }
        
        if (applyButton) {
            applyButton.style.display = 'block';
            applyButton.textContent = `Apply ${getFilterLabel(selectedFilter)} filter`;
        }
    }
    
    function hideApplyButton() {
        if (applyButton) {
            applyButton.style.display = 'none';
        }
    }
    
    function createApplyButton() {
        const buttonContainer = document.querySelector('.jobs-search-dropdown__dropdown-list')?.parentElement;
        if (!buttonContainer) return;
        
        applyButton = document.createElement('button');
        applyButton.className = 'ltf-apply-button';
        applyButton.style.cssText = `
            width: 100%;
            padding: 12px 16px;
            margin: 10px;
            background: linear-gradient(135deg, #0073b1, #005a8b);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s ease;
            display: none;
        `;
        
        applyButton.addEventListener('click', () => {
            if (selectedFilter) {
                handleFilterClick(selectedFilter);
            }
        });
        
        applyButton.addEventListener('mouseenter', () => {
            applyButton.style.transform = 'translateY(-2px)';
            applyButton.style.boxShadow = '0 4px 12px rgba(0, 115, 177, 0.3)';
        });
        
        applyButton.addEventListener('mouseleave', () => {
            applyButton.style.transform = 'translateY(0)';
            applyButton.style.boxShadow = 'none';
        });
        
        buttonContainer.appendChild(applyButton);
    }
    
    function getFilterLabel(seconds) {
        const filter = TIME_FILTERS.find(f => f.seconds === seconds);
        return filter ? filter.label : `${seconds} seconds`;
    }
    
    async function injectCustomFilters() {
        if (!isEnabled) return;
        
        try {
            const filterElement = await findDatePostedFilter();
            if (!filterElement) {
                console.log('[LinkedIn Time Filters] Date Posted filter not found');
                return;
            }
            
            // Try to trigger dropdown to be visible
            if (filterElement.tagName === 'BUTTON' || filterElement.role === 'button') {
                filterElement.click();
                await new Promise(resolve => setTimeout(resolve, 500)); // Wait for dropdown
            }
            
            const dropdown = await findFilterDropdown(filterElement);
            if (!dropdown) {
                console.log('[LinkedIn Time Filters] Filter dropdown not found');
                return;
            }
            
            // Remove any previously injected options
            removeInjectedOptions();
            
            // Find insertion point (after existing options)
            const existingOptions = dropdown.querySelectorAll('li[role="menuitemcheckbox"], .jobs-search-dropdown__option');
            const insertionPoint = existingOptions[existingOptions.length - 1];
            
            if (!insertionPoint) {
                console.log('[LinkedIn Time Filters] No existing options found for insertion point');
                return;
            }
            
            // Inject custom options
            TIME_FILTERS.forEach(filter => {
                const option = createCustomFilterOption(filter);
                insertionPoint.parentNode.insertBefore(option, insertionPoint.nextSibling);
                injectedOptions.push(option);
            });
            
            console.log(`[LinkedIn Time Filters] Injected ${TIME_FILTERS.length} custom filter options`);
            
        } catch (error) {
            console.error('[LinkedIn Time Filters] Error injecting filters:', error);
        }
    }
    
    function removeInjectedOptions() {
        injectedOptions.forEach(option => {
            if (option.parentNode) {
                option.parentNode.removeChild(option);
            }
        });
        injectedOptions = [];
        
        // Clean up apply button
        if (applyButton && applyButton.parentNode) {
            applyButton.parentNode.removeChild(applyButton);
            applyButton = null;
        }
        
        // Reset selected filter
        selectedFilter = null;
    }
    
    // Job highlighting functionality
    function highlightNewJobs(selectedSeconds) {
        try {
            const jobCards = document.querySelectorAll('[data-job-id], .job-card-container, .job-search-card');
            
            jobCards.forEach(card => {
                // Remove existing highlights
                card.classList.remove('ltf-highlighted-job');
                
                // Find timestamp element
                const timeElement = card.querySelector('[class*="time"], [class*="posted"], [class*="ago"]');
                if (timeElement) {
                    const timeText = timeElement.textContent.trim();
                    const jobSeconds = parseRelativeTime(timeText);
                    
                    if (jobSeconds && jobSeconds <= selectedSeconds) {
                        card.classList.add('ltf-highlighted-job');
                        
                        // Add "NEW" badge if not already present
                        if (!card.querySelector('.ltf-new-badge')) {
                            const badge = document.createElement('span');
                            badge.className = 'ltf-new-badge';
                            badge.textContent = 'NEW';
                            badge.style.cssText = `
                                position: absolute;
                                top: 8px;
                                right: 8px;
                                background: #0073b1;
                                color: white;
                                padding: 2px 6px;
                                border-radius: 10px;
                                font-size: 10px;
                                font-weight: bold;
                                z-index: 10;
                            `;
                            card.style.position = 'relative';
                            card.appendChild(badge);
                        }
                    }
                }
            });
            
            console.log('[LinkedIn Time Filters] Job highlighting completed for', selectedSeconds, 'seconds');
        } catch (error) {
            console.error('[LinkedIn Time Filters] Job highlighting error:', error);
        }
    }
    
    function parseRelativeTime(timeText) {
        const now = Date.now();
        const text = timeText.toLowerCase();
        
        // Parse patterns like "5 minutes ago", "2 hours ago", "1 day ago"
        const patterns = [
            { regex: /(\d+)\s*minute[s]?\s*ago/, multiplier: 60 * 1000 },
            { regex: /(\d+)\s*hour[s]?\s*ago/, multiplier: 60 * 60 * 1000 },
            { regex: /(\d+)\s*day[s]?\s*ago/, multiplier: 24 * 60 * 60 * 1000 },
            { regex: /(\d+)\s*week[s]?\s*ago/, multiplier: 7 * 24 * 60 * 60 * 1000 },
            { regex: /(\d+)\s*month[s]?\s*ago/, multiplier: 30 * 24 * 60 * 60 * 1000 }
        ];
        
        for (const pattern of patterns) {
            const match = text.match(pattern.regex);
            if (match) {
                const amount = parseInt(match[1]);
                return now - (amount * pattern.multiplier);
            }
        }
        
        return null;
    }
    
    // Analytics
    async function updateAnalytics(filterKey) {
        try {
            const data = await new Promise(resolve => {
                chrome.storage.local.get(['analytics'], resolve);
            });
            
            const analytics = data.analytics || { usage: {} };
            
            if (!analytics.usage[filterKey]) {
                analytics.usage[filterKey] = { uses: 0, lastUsed: Date.now() };
            }
            
            analytics.usage[filterKey].uses++;
            analytics.usage[filterKey].lastUsed = Date.now();
            
            await new Promise(resolve => {
                chrome.storage.local.set({ analytics }, resolve);
            });
            
            console.log('[LinkedIn Time Filters] Analytics updated:', filterKey, analytics.usage[filterKey]);
        } catch (error) {
            console.error('[LinkedIn Time Filters] Analytics update error:', error);
        }
    }
    
    // MutationObserver for dynamic content
    function setupMutationObserver() {
        if (observer) {
            observer.disconnect();
        }
        
        observer = new MutationObserver((mutations) => {
            let shouldReinject = false;
            
            mutations.forEach(mutation => {
                if (mutation.addedNodes.length > 0) {
                    // Check if LinkedIn added new filter UI
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.matches && (
                                node.matches('.jobs-search-dropdown__dropdown-list') ||
                                node.matches('.artdeco-dropdown__content-inner') ||
                                node.querySelector('.jobs-search-dropdown__dropdown-list')
                            )) {
                                shouldReinject = true;
                            }
                        }
                    });
                }
            });
            
            if (shouldReinject && isEnabled) {
                setTimeout(() => injectCustomFilters(), 100);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // Message handling from popup/background
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        switch (message.action) {
            case 'toggle':
                isEnabled = message.enabled;
                if (!isEnabled) {
                    removeInjectedOptions();
                    // Remove highlights
                    document.querySelectorAll('.ltf-highlighted-job').forEach(el => {
                        el.classList.remove('ltf-highlighted-job');
                    });
                } else {
                    setTimeout(() => injectCustomFilters(), 100);
                }
                sendResponse({ success: true });
                break;
                
            case 'applyLastFilter':
                if (currentFilter && isEnabled) {
                    setTPROnUrl(currentFilter);
                    setTimeout(() => highlightNewJobs(currentFilter), 1000);
                }
                sendResponse({ success: true });
                break;
                
            case 'getStatus':
                sendResponse({ 
                    enabled: isEnabled, 
                    currentFilter: currentFilter,
                    url: window.location.href
                });
                break;
                
            case 'applyTimeFilter':
                if (isEnabled && message.seconds) {
                    console.log('[LinkedIn Time Filters] Applying filter from popup:', message.seconds);
                    handleFilterClick(message.seconds);
                    sendResponse({ success: true });
                } else {
                    sendResponse({ success: false, error: 'Extension disabled or invalid filter' });
                }
                break;
        }
    });
    
    // Initialize
    async function init() {
        console.log('[LinkedIn Time Filters] Initializing content script');
        
        await loadSettings();
        
        if (isEnabled) {
            // Wait for page to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    setTimeout(injectCustomFilters, 1000);
                });
            } else {
                setTimeout(injectCustomFilters, 1000);
            }
            
            setupMutationObserver();
            
            // Apply current filter highlighting if any
            if (currentFilter) {
                setTimeout(() => highlightNewJobs(currentFilter), 2000);
            }
        }
        
        console.log(`[LinkedIn Time Filters] Initialized - Enabled: ${isEnabled}`);
    }
    
    // Start the extension
    init();
    
})(); 