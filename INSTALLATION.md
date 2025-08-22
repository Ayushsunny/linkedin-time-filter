# Quick Installation & Testing Guide

## 🚀 Immediate Installation (5 Minutes)

### Step 1: Load Extension in Chrome/Edge

1. Open Chrome or Edge browser
2. Navigate to `chrome://extensions/` (Chrome) or `edge://extensions/` (Edge)
3. Enable **Developer mode** (toggle in top-right corner)
4. Click **Load unpacked**
5. Select the `linkedin-time-filter` folder
6. Extension should appear with default browser extension icon (custom icons removed for testing)
7. **If reloading**: Click the reload button (🔄) on the extension card if you had it loaded before

### Step 2: Load Extension in Firefox

1. Open Firefox browser
2. Navigate to `about:debugging#/runtime/this-firefox`
3. Click **Load Temporary Add-on**
4. Select `manifest.json` file in the `linkedin-time-filter` folder
5. Extension loads temporarily (until Firefox restart)

### Step 3: Test Basic Functionality

1. **Verify Extension is Active**
   - Click the extension icon in browser toolbar
   - Toggle should show "Extension is enabled"

2. **Test on LinkedIn**
   - Go to [linkedin.com/jobs/search/](https://www.linkedin.com/jobs/search/)
   - Click "Date Posted" filter dropdown
   - Look for new options: "Past 10 minutes", "Past 30 minutes", etc.

3. **Test Filter Application**
   - Click any custom time filter (e.g., "Past 1 hour")
   - URL should update with `f_TPR=r3600`
   - Job results should refresh

## ✅ Quick Verification Checklist

- [ ] Extension loads without errors in browser console
- [ ] Popup opens and shows enabled status
- [ ] Custom filters appear in LinkedIn Date Posted dropdown
- [ ] Clicking filters updates URL with f_TPR parameter
- [ ] Job results refresh after filter application
- [ ] Settings persist after page refresh

## 🎯 Testing Different Features

### Core Features (2 minutes)
```
1. Visit LinkedIn jobs page
2. Toggle extension OFF in popup → filters disappear
3. Toggle extension ON → filters reappear
4. Click "Past 30 minutes" → URL shows f_TPR=r1800
5. Refresh page → filter persists
```

### Advanced Features (5 minutes)
```
1. Click extension icon → use "Quick Time Filters"
2. Right-click extension → select "Options"
3. Options page → view analytics and settings
4. Options page → add a saved search
5. Test notification → click "Test Notification" button
```

### Job Highlighting (if jobs available)
```
1. Apply a time filter (e.g., Past 2 hours)
2. Look for jobs with blue left border and "NEW" badge
3. These are jobs within your selected timeframe
```

## 🔧 Troubleshooting

### Extension Not Loading
- **Chrome/Edge**: Check Developer mode is enabled
- **Service Worker Errors**: Click the reload button (🔄) on the extension in chrome://extensions/
- **Firefox**: Try reloading from about:debugging page  
- **All browsers**: Check browser console for error messages
- **Permission Errors**: Ensure all permissions in manifest.json are supported by your browser version

### Filters Not Appearing
- Ensure you're on `linkedin.com/jobs/search/` page
- Try refreshing the page
- Check if "Date Posted" dropdown is accessible
- Verify extension is enabled in popup

### URL Not Updating
- Check browser console for JavaScript errors
- Try manual navigation to test URL: `linkedin.com/jobs/search/?f_TPR=r3600`
- Verify extension permissions in browser settings

### Storage Issues
- Clear extension data in browser settings
- Reload extension and test again
- Check browser storage limits

## 🚦 Status Indicators

### ✅ Working Correctly
- Extension popup shows "Extension is enabled"
- Console shows: `[LinkedIn Time Filters] Initialized - Enabled: true`
- Custom options appear in Date Posted dropdown
- URL updates with f_TPR parameter when filter clicked

### ❌ Needs Attention
- Extension popup shows error messages
- Console shows JavaScript errors
- No custom options in dropdown after 10+ seconds
- URL doesn't change when custom filter clicked

## 📱 Browser Console Debugging

Open Developer Tools (F12) and check Console tab for:

**Success Messages:**
```
[LinkedIn Time Filters] Initializing content script
[LinkedIn Time Filters] Initialized - Enabled: true
[LinkedIn Time Filters] Injected 6 custom filter options
```

**Error Messages:**
```
[LinkedIn Time Filters] Date Posted filter not found
[LinkedIn Time Filters] Error injecting filters: [error details]
```

## 🎉 Next Steps

Once basic functionality is working:

1. **Explore Options Page**: Right-click extension → Options
2. **Set Up Notifications**: Enable background notifications in options
3. **Create Saved Searches**: Add frequent search combinations
4. **View Analytics**: Check usage statistics and patterns
5. **Export Data**: Backup your settings and analytics

## 📞 Quick Support

**Common Issues:**
- **LinkedIn changed their UI**: Update selector strategies in contentScript.js
- **Extension disabled**: Check chrome://extensions/ for error details
- **Filters not applying**: Verify LinkedIn f_TPR parameter still works
- **Notifications not working**: Check browser notification permissions

**Development Issues:**
- Check manifest.json syntax with JSON validator
- Verify all file paths match manifest configuration
- Test with minimal LinkedIn search URL: `linkedin.com/jobs/search/`

---

**Ready to Use**: Extension should work immediately after loading in developer mode. No build process or compilation required! 