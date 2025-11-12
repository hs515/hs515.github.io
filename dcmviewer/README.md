# DICOM Medical Image Viewer

A modern, web-based DICOM viewer built with JavaScript and Cornerstone.js library for medical imaging display and manipulation.

## Features

- **Multiple File Support**: Load multiple DICOM files at once
- **Directory Loading**: Select entire directories containing DICOM files (modern browsers)
- **Interactive Tools**: 
  - Window/Level adjustment for contrast and brightness
  - Pan and zoom functionality
  - Reset view to fit window
- **📏 Measurement Tools**:
  - **Length Measurement**: Measure distances between points
  - **Area Measurement**: Calculate rectangular region areas
  - **Angle Measurement**: Measure angles between lines
  - **Pixel Probe**: Get pixel values at specific coordinates
  - **Measurement Results Panel**: View all measurements with values and units
- **📝 Annotation Tools**:
  - **Text Annotations**: Add custom text labels
  - **Arrow Annotations**: Point to specific features
  - **Freehand Drawing**: Draw custom shapes and markings
  - **Annotation Management**: View and delete annotations
- **💾 Export Functionality**:
  - **Image Export**: Save as PNG (lossless) or JPEG (compressed)
  - **Measurement Export**: Export measurement data as CSV, JSON, or TXT
  - **Print Support**: Print images with measurements and annotations
  - **Quality Settings**: Adjustable compression for JPEG exports
- **Image Navigation**: Browse through loaded images with keyboard arrows or clicking
- **DICOM Metadata Display**: View important DICOM tags and patient information
- **Drag & Drop**: Simply drag DICOM files onto the viewer
- **Responsive Design**: Works on desktop and mobile devices

## Usage

### Loading Images

1. **File Selection**: Click "Select DICOM Files" to choose individual DICOM files
2. **Directory Loading**: Click "Load Directory" to select an entire folder (modern browsers only)
3. **Drag & Drop**: Drag DICOM files directly onto the black viewer area

### Navigation

- **Mouse**: Click on images in the sidebar to view them
- **Keyboard**: Use left/right arrow keys to navigate between images
- **Reset**: Press 'R' key or click "Reset" button to fit image to window
- **Tabs**: Switch between DICOM Info, Measurements, and Annotations panels

### Using Measurement Tools

1. **Length Measurement**: 
   - Select the 📏 tool
   - Click start point, then end point
   - Length will be displayed in mm

2. **Area Measurement**:
   - Select the 📐 tool
   - Click and drag to create rectangle
   - Area will be calculated in mm²

3. **Angle Measurement**:
   - Select the ∠ tool
   - Click three points to form an angle
   - Angle will be shown in degrees

4. **Pixel Probe**:
   - Select the 🔍 tool
   - Click anywhere to see pixel values

### Using Annotation Tools

1. **Text Annotations**:
   - Select the 📝 tool
   - Click where you want to add text
   - Type your annotation

2. **Arrow Annotations**:
   - Select the → tool
   - Click and drag to create arrows

3. **Freehand Drawing**:
   - Select the ✏️ tool
   - Click and drag to draw

### Exporting Data

1. **Export Image**:
   - Click 💾 button
   - Choose PNG or JPEG format
   - Select quality (for JPEG)
   - Include/exclude annotations

2. **Export Measurements**:
   - Click 📊 button
   - Choose CSV, JSON, or TXT format
   - Include/exclude patient information

3. **Print**:
   - Click 🖨️ button
   - Preview and print current image

### Tools

- **W/L (Window/Level)**: Adjust image contrast and brightness by dragging
- **Pan**: Move the image around when zoomed in
- **Zoom**: Zoom in/out on the image
- **Reset**: Restore original view and fit to window

#### Measurement Tools

- **📏 Length Tool**: Click and drag to measure distances between two points
- **📐 Area Tool**: Draw rectangles to measure area regions
- **∠ Angle Tool**: Click three points to measure angles
- **🔍 Pixel Probe**: Click to get pixel values and coordinates

#### Annotation Tools

- **📝 Text Annotation**: Add custom text labels to images
- **→ Arrow Annotation**: Draw arrows pointing to specific features
- **✏️ Freehand Drawing**: Draw custom shapes and markings

#### Export Options

- **💾 Export Image**: Save the current view as PNG or JPEG
- **📊 Export Measurements**: Save measurement data as CSV, JSON, or TXT
- **🖨️ Print**: Print the current image with annotations

### Keyboard Shortcuts

- **Left/Right Arrows**: Navigate between images
- **R**: Reset view to fit window
- **1**: Activate Window/Level tool
- **2**: Activate Length measurement tool
- **3**: Activate Area measurement tool

## Supported Formats

- `.dcm` files
- `.dicom` files  
- `.dic` files
- Files without extensions (common for DICOM)

## Browser Compatibility

- **Modern Browsers**: Chrome, Firefox, Safari, Edge (latest versions)
- **Directory Picker**: Chrome 86+, Edge 86+ (for directory loading feature)
- **File API**: All modern browsers support file selection and drag & drop

## Technical Details

### Libraries Used

- **Cornerstone.js**: Core medical imaging display
- **DICOM Parser**: DICOM file format parsing
- **Cornerstone Web Image Loader**: Web-based image loading
- **Cornerstone WADO Image Loader**: DICOM image loading
- **Cornerstone Tools**: Interactive medical imaging tools

### Architecture

The viewer is built as a single-page application with:

- **HTML**: Clean semantic structure with modern UI
- **CSS**: Dark theme optimized for medical imaging
- **JavaScript**: ES6+ class-based architecture with async/await

## Installation

1. Clone or download the files
2. Open `index.html` in a modern web browser
3. No build process or server required - runs entirely in the browser

## Local Development

To run locally:

```bash
# Option 1: Simple HTTP server with Python
python -m http.server 8000

# Option 2: Simple HTTP server with Node.js
npx http-server

# Option 3: Live Server (VS Code extension)
# Right-click index.html and select "Open with Live Server"
```

Then open `http://localhost:8000` in your browser.

## Security Notes

- All processing happens locally in your browser
- No images or data are uploaded to any server
- DICOM files remain on your local machine
- Uses modern File API for secure file access

## Sample DICOM Files

For testing, you can download sample DICOM files from:

- [DICOM Library](https://www.dicomlibrary.com/dicom/free-dicom-image-library/)
- [OsiriX DICOM Sample Images](https://osirix-viewer.com/resources/dicom-image-library/)
- [Cancer Imaging Archive](https://www.cancerimagingarchive.net/)

## Troubleshooting

### Common Issues

1. **"No DICOM files found"**: Ensure files have proper DICOM format and extensions
2. **Images not loading**: Check browser console for error messages
3. **Directory picker not working**: Use file selection instead on unsupported browsers
4. **Performance issues**: Try loading fewer images at once for large datasets

### Browser Requirements

- JavaScript enabled
- Modern browser with File API support
- For directory loading: Chrome 86+ or Edge 86+

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is open source and available under the [MIT License](LICENSE).