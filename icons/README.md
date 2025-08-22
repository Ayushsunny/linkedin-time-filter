# Extension Icons

This directory should contain the following icon files for the LinkedIn Enhanced Time Filters extension:

## Required Icons

- **icon16.png** - 16x16 pixels - Used in extension management page
- **icon32.png** - 32x32 pixels - Used in extension management page  
- **icon48.png** - 48x48 pixels - Used in extension management page and notifications
- **icon128.png** - 128x128 pixels - Used in Chrome Web Store and extension management

## Design Guidelines

### Visual Identity
- **Colors**: Use LinkedIn's brand colors (#0a66c2 blue, #ffffff white)
- **Style**: Clean, professional, recognizable
- **Elements**: Consider incorporating:
  - Clock/time icon (for time filtering theme)
  - LinkedIn "in" logo (if permitted)
  - Filter/funnel icon
  - Clean geometric design

### Technical Specifications
- **Format**: PNG with transparency
- **Background**: Transparent or white
- **Quality**: High resolution, crisp edges
- **Consistency**: All sizes should look identical when scaled

### Example Design Concepts

1. **Clock with Filter**: A clock face with funnel/filter overlay
2. **Time Segments**: Circular segments representing different time periods
3. **Search + Time**: Magnifying glass with clock hands
4. **LinkedIn Blue**: Simple geometric design in LinkedIn brand colors

## Creation Tools

- **Adobe Illustrator/Photoshop** - Professional design tools
- **Figma** - Web-based design tool (free tier available)
- **GIMP** - Free open-source image editor
- **Canva** - Simple online design tool
- **Icon generators** - Online tools for creating extension icons

## Installation

Once created, place the icon files in this directory:
```
icons/
├── icon16.png
├── icon32.png
├── icon48.png
└── icon128.png
```

The extension will automatically use these icons as specified in `manifest.json`.

## Placeholder Note

**Current Status**: Icon files are not included in this repository and icon references have been temporarily removed from manifest.json for easy testing.

For development and testing, browsers will use default extension icons. For production deployment, proper icon files must be created, added to this directory, and the icon references restored in manifest.json.

**To restore icons in manifest.json, add:**
```json
"icons": {
  "16": "icons/icon16.png",
  "32": "icons/icon32.png", 
  "48": "icons/icon48.png",
  "128": "icons/icon128.png"
}
```

## Legal Considerations

- Ensure icons don't violate LinkedIn's trademark guidelines
- Use original designs or royalty-free elements
- Consider trademark implications for store submissions
- Include proper attribution if using third-party elements 