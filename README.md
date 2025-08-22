# LinkedIn Enhanced Time Filters

A powerful WebExtension that adds granular time filtering options to LinkedIn's job search, supporting Chrome, Firefox, and Edge browsers.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Browser Support](https://img.shields.io/badge/browsers-Chrome%20|%20Firefox%20|%20Edge-orange)

## ✨ Features

### Core Features (Required)
- **Granular Time Filters**: Add precise time options (10m, 30m, 1h, 2h, 6h, 12h) to LinkedIn's Date Posted dropdown
- **Seamless Integration**: Custom options appear identical to LinkedIn's native filters  
- **URL-based Filtering**: Uses LinkedIn's f_TPR parameter (e.g., f_TPR=r600 for 10 minutes)
- **Toggle Control**: Simple popup to enable/disable the extension
- **Persistent Settings**: State maintained across browser sessions and navigation
- **Dynamic Injection**: MutationObserver handles LinkedIn's dynamic content updates

### Advanced Features (Optional)
- **📊 Local Analytics**: Track filter usage with detailed statistics and charts
- **🔔 Background Notifications**: Get alerted when new jobs match your saved searches
- **✨ Visual Highlights**: Jobs within selected timeframe are visually enhanced
- **💾 Saved Searches**: Quick access to frequently used search combinations
- **📈 Usage Dashboard**: Comprehensive options page with analytics and settings

## 🚀 Installation

### For Development & Testing

1. **Download the Extension**
   ```bash
   git clone <repository-url>
   cd linkedin-time-filter
   ```

2. **Load in Chrome/Edge**
   - Open `chrome://extensions/` (or `edge://extensions/`)
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `linkedin-time-filter` folder
   - Note: Extension will use default browser icon (custom icons temporarily removed for easy testing)

3. **Load in Firefox**
   - Open `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select the `manifest.json` file

### For Production Use

**Chrome Web Store**: (Coming soon)  
**Firefox Add-ons**: (Coming soon)  
**Edge Add-ons**: (Coming soon)

## 🎯 Usage

1. **Enable the Extension**
   - Click the extension icon in your browser toolbar
   - Toggle the extension ON

2. **Visit LinkedIn Jobs**
   - Go to [linkedin.com/jobs/search/](https://www.linkedin.com/jobs/search/)
   - Click on the "Date Posted" filter dropdown

3. **Use Enhanced Filters**
   - You'll see new options: Past 10 minutes, 30 minutes, 1 hour, 2 hours, 6 hours, 12 hours
   - Click any option to apply the filter instantly
   - Results update just like native LinkedIn filters

4. **Manage Settings**
   - Access advanced features via the options page
   - Set up notifications for saved searches
   - View usage analytics and export data

## 🏗️ Architecture

### File Structure
```
linkedin-time-filter/
├── manifest.json              # Extension configuration
├── src/
│   ├── content/
│   │   └── contentScript.js   # DOM injection & filter logic
│   ├── background/
│   │   └── background.js      # Service worker & notifications
│   ├── popup/
│   │   ├── popup.html         # Extension popup interface
│   │   └── popup.js           # Popup functionality
│   ├── options/
│   │   ├── options.html       # Settings & analytics page
│   │   └── options.js         # Options page logic
│   └── css/
│       └── injected.css       # Styling for injected elements
├── icons/                     # Extension icons (16, 32, 48, 128px)
└── README.md                  # This file
```

### Technical Implementation

**Time Filter Calculations:**
- 10 minutes = 10 × 60 = 600 seconds → `f_TPR=r600`
- 30 minutes = 30 × 60 = 1800 seconds → `f_TPR=r1800`
- 1 hour = 60 × 60 = 3600 seconds → `f_TPR=r3600`
- 2 hours = 2 × 3600 = 7200 seconds → `f_TPR=r7200`
- 6 hours = 6 × 3600 = 21600 seconds → `f_TPR=r21600`
- 12 hours = 12 × 3600 = 43200 seconds → `f_TPR=r43200`

**DOM Injection Strategy:**
- Multiple selector strategies for LinkedIn's evolving DOM
- Resilient text-based fallback detection
- MutationObserver for dynamic content handling
- Clean removal when extension is disabled

**Cross-browser Compatibility:**
- Manifest V3 for Chrome/Edge
- WebExtension API compatibility for Firefox
- Graceful feature degradation

## ⚙️ Configuration

### Storage Schema

**Sync Storage (User Settings):**
```json
{
  "enabled": true,
  "lastTPR": 3600,
  "notificationsEnabled": false,
  "highlightEnabled": true,
  "autoApply": false,
  "contextMenu": true
}
```

**Local Storage (Analytics & Data):**
```json
{
  "analytics": {
    "usage": {
      "r600": { "uses": 5, "lastUsed": 1640995200000 },
      "r3600": { "uses": 12, "lastUsed": 1640995200000 }
    }
  },
  "savedSearches": [
    {
      "id": "1640995200000",
      "keywords": "software engineer",
      "location": "San Francisco",
      "tpr": 3600,
      "name": "SF Software Jobs"
    }
  ]
}
```

## 🧪 Testing

### Manual Testing Checklist

**Core Functionality:**
- [ ] Extension loads without errors
- [ ] Toggle enables/disables injection
- [ ] Custom filters appear in Date Posted dropdown
- [ ] Clicking filters updates URL with correct f_TPR values
- [ ] Results refresh properly after filter application
- [ ] Settings persist across browser restarts

**Cross-browser Testing:**
- [ ] Chrome (latest)
- [ ] Firefox (latest) 
- [ ] Edge (latest)

**LinkedIn Navigation:**
- [ ] Filters work on job search page
- [ ] MutationObserver re-injects after navigation
- [ ] No memory leaks from observers
- [ ] Clean removal when disabled

### Development Testing

```bash
# Load the extension in developer mode
# Open LinkedIn job search page
# Open browser console and look for:
console.log('[LinkedIn Time Filters] Initialized')

# Test filter injection
# Click Date Posted dropdown
# Verify custom options appear

# Test URL updates  
# Click custom filter option
# Check URL contains f_TPR=r[seconds]
```

## 🔧 Development

### Prerequisites
- Modern web browser (Chrome/Firefox/Edge)
- Basic understanding of WebExtensions API
- LinkedIn account for testing

### Setup Development Environment

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd linkedin-time-filter
   ```

2. **Make Changes**
   - Edit files in `src/` directory
   - Update version in `manifest.json` for releases

3. **Test Changes**
   - Reload extension in browser
   - Test on LinkedIn job search pages
   - Check browser console for errors

4. **Debug Common Issues**
   - Content script not loading: Check manifest permissions
   - Filters not appearing: Verify LinkedIn DOM selectors
   - Storage not working: Check chrome.storage permissions

### Building for Production

1. **Prepare Release**
   - Update version in `manifest.json`
   - Test on all target browsers
   - Create proper icon files (16, 32, 48, 128px)

2. **Package Extension**
   ```bash
   # Chrome/Edge: Zip the entire folder
   zip -r linkedin-time-filter-v1.0.0.zip linkedin-time-filter/
   
   # Firefox: Create XPI if needed
   ```

## 🚨 Known Limitations & Risks

### Technical Limitations

1. **LinkedIn DOM Changes**
   - Risk: LinkedIn may change class names or structure
   - Mitigation: Resilient selectors with fallbacks

2. **Background Notifications**
   - Risk: CORS prevents direct LinkedIn page fetching
   - Limitation: Requires user to visit LinkedIn for job count updates

3. **Browser Store Policies**
   - Risk: Store policies may restrict certain behaviors
   - Mitigation: Clear privacy policy, minimal permissions

### Privacy & Security

- **No Data Collection**: All analytics stored locally
- **No External Requests**: Extension works entirely offline
- **Minimal Permissions**: Only LinkedIn access and storage
- **Open Source**: Code available for audit

## 📝 Privacy Policy

This extension:
- ✅ Stores all data locally on your device
- ✅ Never transmits personal information
- ✅ Only accesses linkedin.com pages
- ✅ Uses minimal browser permissions
- ❌ Does not track user behavior externally
- ❌ Does not collect personal data
- ❌ Does not share data with third parties

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

### Contribution Guidelines

- Follow existing code style
- Test on multiple browsers
- Update README if needed
- Keep changes focused and atomic

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

- **Issues**: Report bugs via GitHub Issues
- **Documentation**: Check this README
- **Development**: See Development section above

## 📚 Resources

- [Chrome Extensions Documentation](https://developer.chrome.com/docs/extensions/)
- [Firefox WebExtensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
- [LinkedIn f_TPR Parameter Reference](https://www.linkedin.com/help/)

---

**Version**: 1.0.0  
**Last Updated**: December 2024  
**Compatibility**: Chrome 88+, Firefox 78+, Edge 88+ 