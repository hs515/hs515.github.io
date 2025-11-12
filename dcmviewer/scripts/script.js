class DicomViewer {
    constructor() {
        this.currentImageIds = [];
        this.currentIndex = 0;
        this.element = null;
        this.isViewerInitialized = false;
        this.toolsEnabled = false;
        this.tools = {};
        this.measurements = [];
        this.annotations = [];
        this.currentTool = 'windowLevel';
        this.mouseHandlers = {
            windowLevel: null,
            pan: null,
            zoom: null
        };
        
        // Measurement state
        this.measurementCanvas = null;
        this.measurementCtx = null;
        this.currentMeasurement = null;
        this.isDrawing = false;
        
        this.init();
    }

    init() {
        // Get the element first
        this.element = document.getElementById('dicomViewer');
        
        // Check if required libraries are loaded
        if (typeof cornerstone === 'undefined') {
            console.error('Cornerstone library not loaded');
            alert('Failed to load required libraries. Please refresh the page.');
            return;
        }
        
        console.log('Cornerstone loaded, version:', cornerstone.version || 'unknown');
        
        // Initialize WADO Image Loader
        if (typeof cornerstoneWADOImageLoader !== 'undefined') {
            cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
            cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
            
            const config = {
                beforeSend: function(xhr) {
                    // Add custom headers here if needed
                },
                useWebWorkers: false, // Disable web workers for now to simplify
                decodeConfig: {
                    convertFloatPixelDataToInt: false
                }
            };
            
            cornerstoneWADOImageLoader.configure(config);
            console.log('WADO Image Loader configured');
        } else {
            console.error('WADO Image Loader not available - DICOM images will not work');
            alert('WADO Image Loader failed to load. DICOM viewing will not work.');
            return;
        }

        // Don't initialize tools yet - wait until image is displayed
        console.log('Basic initialization complete');

        this.setupEventListeners();
        this.setupTabNavigation();
    }

    setupEventListeners() {
        // File input handler
        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFiles(e.target.files);
        });

        // Directory loader (for modern browsers)
        document.getElementById('loadDirectory').addEventListener('click', () => {
            this.loadDirectory();
        });

        // Basic tool buttons
        document.getElementById('windowLevelTool').addEventListener('click', () => {
            this.setActiveTool('windowLevel');
        });

        document.getElementById('panTool').addEventListener('click', () => {
            this.setActiveTool('pan');
        });

        document.getElementById('zoomTool').addEventListener('click', () => {
            this.setActiveTool('zoom');
        });

        document.getElementById('frameSlider').addEventListener('click', () => {
            this.setActiveTool('frameSlider');
        });

        document.getElementById('resetView').addEventListener('click', () => {
            this.resetView();
        });

        // Measurement tool buttons
        document.getElementById('lengthTool').addEventListener('click', () => {
            this.setActiveTool('length');
        });

        document.getElementById('areaTool').addEventListener('click', () => {
            this.setActiveTool('area');
        });

        document.getElementById('angleTool').addEventListener('click', () => {
            this.setActiveTool('angle');
        });

        document.getElementById('pixelProbeTool').addEventListener('click', () => {
            this.setActiveTool('probe');
        });

        // Annotation tool buttons
        document.getElementById('textAnnotationTool').addEventListener('click', () => {
            this.setActiveTool('textMarker');
        });

        document.getElementById('arrowAnnotationTool').addEventListener('click', () => {
            this.setActiveTool('arrowAnnotate');
        });

        document.getElementById('freehandTool').addEventListener('click', () => {
            this.setActiveTool('freehandRoi');
        });

        // Export buttons
        document.getElementById('exportImage').addEventListener('click', () => {
            this.showExportImageDialog();
        });

        document.getElementById('exportMeasurements').addEventListener('click', () => {
            this.showExportMeasurementsDialog();
        });

        document.getElementById('printView').addEventListener('click', () => {
            this.printView();
        });

        // Clear buttons
        document.getElementById('clearAllMeasurements').addEventListener('click', () => {
            this.clearAllMeasurements();
        });

        document.getElementById('clearAllAnnotations').addEventListener('click', () => {
            this.clearAllAnnotations();
        });

        // Export dialogs
        this.setupExportDialogs();

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboard(e);
        });

        // Window resize handler
        window.addEventListener('resize', () => {
            this.resizeMeasurementCanvas();
        });
    }

    setupTabNavigation() {
        const tabButtons = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabButtons.forEach(button => {
            button.addEventListener('click', () => {
                const targetTab = button.getAttribute('data-tab');
                
                // Remove active class from all tabs and contents
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                button.classList.add('active');
                document.getElementById(targetTab).classList.add('active');
            });
        });
    }

    setupMeasurementEvents() {
        // Temporarily disabled - will re-enable when cornerstone tools are working
        console.log('Measurement events disabled for basic functionality');
    }

    onMeasurementAdded(event) {
        const measurementData = event.detail.measurementData;
        const measurement = {
            id: Date.now() + Math.random(),
            type: this.getMeasurementType(event),
            data: measurementData,
            value: this.calculateMeasurementValue(measurementData, event),
            imageIndex: this.currentIndex
        };

        this.measurements.push(measurement);
        this.updateMeasurementsList();
    }

    onMeasurementModified(event) {
        // Update existing measurement
        this.updateMeasurementsList();
    }

    onMeasurementRemoved(event) {
        // Remove measurement from list
        this.updateMeasurementsList();
    }

    getMeasurementType(event) {
        if (event.detail.toolType) {
            switch (event.detail.toolType) {
                case 'Length': return 'Length';
                case 'RectangleRoi': return 'Area';
                case 'Angle': return 'Angle';
                case 'Probe': return 'Pixel Value';
                default: return 'Measurement';
            }
        }
        return 'Measurement';
    }

    calculateMeasurementValue(data, event) {
        if (!data) return 'N/A';

        switch (event.detail.toolType) {
            case 'Length':
                if (data.length) {
                    return `${data.length.toFixed(2)} mm`;
                }
                break;
            case 'RectangleRoi':
                if (data.area) {
                    return `${data.area.toFixed(2)} mm²`;
                }
                break;
            case 'Angle':
                if (data.rAngle) {
                    return `${(data.rAngle * 180 / Math.PI).toFixed(1)}°`;
                }
                break;
            case 'Probe':
                if (data.x !== undefined && data.y !== undefined) {
                    return `Pixel: ${data.storedPixel || 'N/A'}`;
                }
                break;
        }
        return 'N/A';
    }

    updateMeasurementsList() {
        const container = document.getElementById('measurementsList');
        
        if (this.measurements.length === 0) {
            container.innerHTML = '<p>No measurements taken</p>';
            return;
        }

        container.innerHTML = '';
        
        this.measurements.forEach((measurement, index) => {
            const item = document.createElement('div');
            item.className = 'measurement-item';
            item.innerHTML = `
                <div class="measurement-info">
                    <div class="measurement-type">${measurement.type}</div>
                    <div class="measurement-value">${measurement.value}</div>
                </div>
                <button class="delete-btn" onclick="dicomViewer.deleteMeasurement(${index})">×</button>
            `;
            container.appendChild(item);
        });
    }

    deleteMeasurement(index) {
        this.measurements.splice(index, 1);
        this.updateMeasurementsList();
    }

    clearAllMeasurements() {
        if (confirm('Clear all measurements?')) {
            this.measurements = [];
            this.updateMeasurementsList();
            
            // Clear from cornerstone tools
            if (typeof cornerstoneTools !== 'undefined' && this.element) {
                cornerstoneTools.clearToolState(this.element, 'Length');
                cornerstoneTools.clearToolState(this.element, 'RectangleRoi');
                cornerstoneTools.clearToolState(this.element, 'Angle');
                cornerstoneTools.clearToolState(this.element, 'Probe');
                cornerstone.updateImage(this.element);
            }
        }
    }

    clearAllAnnotations() {
        if (confirm('Clear all annotations?')) {
            this.annotations = [];
            this.updateAnnotationsList();
            
            // Clear from cornerstone tools
            if (typeof cornerstoneTools !== 'undefined' && this.element) {
                cornerstoneTools.clearToolState(this.element, 'TextMarker');
                cornerstoneTools.clearToolState(this.element, 'ArrowAnnotate');
                cornerstoneTools.clearToolState(this.element, 'FreehandRoi');
                cornerstone.updateImage(this.element);
            }
        }
    }

    updateAnnotationsList() {
        const container = document.getElementById('annotationsList');
        
        if (this.annotations.length === 0) {
            container.innerHTML = '<p>No annotations added</p>';
            return;
        }

        container.innerHTML = '';
        
        this.annotations.forEach((annotation, index) => {
            const item = document.createElement('div');
            item.className = 'annotation-item';
            item.innerHTML = `
                <div class="measurement-info">
                    <div class="measurement-type">${annotation.type}</div>
                    <div class="measurement-value">${annotation.text || 'Annotation'}</div>
                </div>
                <button class="delete-btn" onclick="dicomViewer.deleteAnnotation(${index})">×</button>
            `;
            container.appendChild(item);
        });
    }

    deleteAnnotation(index) {
        this.annotations.splice(index, 1);
        this.updateAnnotationsList();
    }

    async loadDirectory() {
        try {
            if ('showDirectoryPicker' in window) {
                const directoryHandle = await window.showDirectoryPicker();
                await this.processDirectory(directoryHandle);
            } else {
                alert('Directory picker not supported. Please use file input instead.');
            }
        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error loading directory:', err);
                alert('Error loading directory. Please try selecting files instead.');
            }
        }
    }

    async processDirectory(directoryHandle) {
        const files = [];
        
        for await (const entry of directoryHandle.values()) {
            if (entry.kind === 'file') {
                const file = await entry.getFile();
                if (this.isDicomFile(file)) {
                    files.push(file);
                }
            }
        }
        
        if (files.length > 0) {
            this.handleFiles(files);
        } else {
            alert('No DICOM files found in the selected directory.');
        }
    }

    isDicomFile(file) {
        const validExtensions = ['.dcm', '.dicom', '.dic'];
        const fileName = file.name.toLowerCase();
        return validExtensions.some(ext => fileName.endsWith(ext)) || 
               fileName.includes('dicom') || 
               this.hasNoDots(fileName); // Some DICOM files have no extension
    }

    hasNoDots(filename) {
        return !filename.includes('.');
    }

    async handleFiles(files) {
        console.log('handleFiles called with', files.length, 'files');
        const fileArray = Array.from(files);
        const validFiles = fileArray.filter(file => this.isDicomFile(file));
        
        console.log('Valid DICOM files:', validFiles.length);
        
        if (validFiles.length === 0) {
            alert('No valid DICOM files selected.');
            return;
        }

        this.showLoading(true);
        
        try {
            console.log('Loading DICOM files...');
            const imageIds = await this.loadDicomFiles(validFiles);
            console.log('Loaded image IDs:', imageIds);
            
            this.currentImageIds = imageIds;
            this.currentFiles = validFiles; // Store files for reference
            this.updateImageList(imageIds);
            
            if (imageIds.length > 0) {
                console.log('Attempting to display first image...');
                await this.displayImage(0);
            } else {
                alert('No images could be loaded from the selected files.');
            }
        } catch (error) {
            console.error('Error loading DICOM files:', error);
            console.error('Error stack:', error.stack);
            alert('Error loading DICOM files: ' + error.message);
        } finally {
            this.showLoading(false);
        }
    }

    async loadDicomFiles(files) {
        const imageIds = [];
        
        for (const file of files) {
            try {
                const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(file);
                
                // Try to detect multi-frame DICOM files
                try {
                    const image = await cornerstone.loadImage(imageId);
                    const dataSet = image.data;
                    
                    // Check for number of frames
                    let numFrames = 1;
                    if (dataSet && dataSet.elements.x00280008) {
                        numFrames = parseInt(dataSet.string('x00280008')) || 1;
                    }
                    
                    console.log(`File ${file.name} has ${numFrames} frame(s)`);
                    
                    if (numFrames > 1) {
                        // Multi-frame DICOM - create imageIds for each frame
                        for (let frame = 0; frame < numFrames; frame++) {
                            const frameImageId = `${imageId}?frame=${frame}`;
                            imageIds.push(frameImageId);
                            console.log(`Added frame ${frame + 1}/${numFrames}: ${frameImageId}`);
                        }
                    } else {
                        // Single frame
                        imageIds.push(imageId);
                        console.log('Successfully loaded single-frame file:', file.name);
                    }
                } catch (error) {
                    // If we can't load the image, just add the basic imageId
                    console.warn('Could not detect frames, adding as single image:', error);
                    imageIds.push(imageId);
                }
                
            } catch (error) {
                console.warn(`Failed to load file ${file.name}:`, error);
            }
        }
        
        return imageIds;
    }

    fileToArrayBuffer(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    updateImageList(imageIds) {
        const imageList = document.getElementById('imageList');
        imageList.innerHTML = '';
        
        imageIds.forEach((imageId, index) => {
            const item = document.createElement('div');
            item.className = 'image-item';
            
            // Extract filename and frame info from imageId
            let displayName = `Image ${index + 1}`;
            let frameInfo = '';
            
            // Parse the imageId to get filename and frame number
            const match = imageId.match(/wadouri:(.+?)(?:\?frame=(\d+))?$/);
            if (match) {
                const fileId = match[1];
                const frameNum = match[2];
                
                // Try to get a better filename if available
                if (this.currentFiles) {
                    // This is approximate - just show file index for now
                    displayName = `Image ${index + 1}`;
                }
                
                if (frameNum !== undefined) {
                    frameInfo = `Frame ${parseInt(frameNum) + 1}`;
                    displayName += ` (${frameInfo})`;
                }
            }
            
            item.innerHTML = `
                <div class="filename">${displayName}</div>
            `;
            
            item.addEventListener('click', () => {
                this.displayImage(index);
                this.setActiveImageItem(index);
            });
            
            imageList.appendChild(item);
        });
        
        if (imageIds.length > 0) {
            this.setActiveImageItem(0);
        }
    }

    setActiveImageItem(index) {
        const items = document.querySelectorAll('.image-item');
        items.forEach((item, i) => {
            item.classList.toggle('active', i === index);
        });
    }

    async displayImage(index) {
        if (!this.currentImageIds[index]) return;
        
        try {
            this.currentIndex = index;
            const imageId = this.currentImageIds[index];
            console.log('Attempting to display image:', imageId);
            
            // Enable the element if this is the first image
            if (!this.isViewerInitialized) {
                console.log('Enabling cornerstone element...');
                cornerstone.enable(this.element);
                this.isViewerInitialized = true;
            }
            
            console.log('Loading image...');
            const image = await cornerstone.loadImage(imageId);
            console.log('Image loaded successfully:', image);
            
            // Hide placeholder
            const placeholder = this.element.querySelector('.viewer-placeholder');
            if (placeholder) {
                placeholder.style.display = 'none';
            }
            
            console.log('Displaying image...');
            cornerstone.displayImage(this.element, image);
            console.log('Image displayed successfully');
            
            // Resize measurement canvas to match
            this.resizeMeasurementCanvas();
            
            // Clear measurements for new image
            this.redrawMeasurements();
            
            // Enable W/L tool AFTER image is successfully displayed
            if (!this.toolsEnabled) {
                // Wait a bit for the display to complete
                setTimeout(() => {
                    try {
                        this.enableWindowLevelTool();
                        this.toolsEnabled = true;
                        this.showWindowLevelInstructions();
                    } catch (error) {
                        console.error('Could not enable tools (image will still display):', error);
                    }
                }, 200);
            }
            
            // Update image info
            this.updateImageInfo(image, index);
            this.updateDicomTags(imageId);
            
        } catch (error) {
            console.error('Error displaying image:', error);
            console.error('Error stack:', error.stack);
            alert('Error displaying image: ' + error.message + '\n\nCheck console for details.');
        }
    }

    enableWindowLevelTool() {
        try {
            console.log('=== Starting Window/Level Tool Setup ===');
            
            // Check if tools library is available
            if (typeof cornerstoneTools === 'undefined') {
                console.error('cornerstoneTools is not defined');
                return;
            }
            
            console.log('Setting external dependencies...');
            // Set external dependencies - MUST be done before init
            cornerstoneTools.external.cornerstone = cornerstone;
            cornerstoneTools.external.cornerstoneMath = cornerstoneMath;
            cornerstoneTools.external.Hammer = Hammer;
            
            console.log('Initializing Cornerstone Tools...');
            // Initialize cornerstone tools globally with proper config
            cornerstoneTools.init({
                mouseEnabled: true,
                touchEnabled: true,
                globalToolSyncEnabled: false,
                showSVGCursors: false
            });
            
            console.log('Adding WwwcTool to registry...');
            // Add the Wwwc (Window Width/Center) tool to the tool registry
            const WwwcTool = cornerstoneTools.WwwcTool;
            cornerstoneTools.addTool(WwwcTool);
            
            console.log('Enabling input on element...');
            // CRITICAL: Must enable the element for input before activating tools
            cornerstoneTools.setToolEnabled('Wwwc');
            
            console.log('Setting tool active with mouse button...');
            // Activate the tool with left mouse button
            cornerstoneTools.setToolActiveForElement(this.element, 'Wwwc', { 
                mouseButtonMask: 1  // Left button
            });
            
            console.log('WwwcTool activated successfully on element');
            
            // Verify tool state
            const toolState = cornerstoneTools.getToolState(this.element);
            console.log('Tool state on element:', toolState);
            
            // Add viewport overlay to show WW/WL values
            this.addViewportOverlay();
            
            // Log current viewport state
            const viewport = cornerstone.getViewport(this.element);
            console.log('Current viewport:', viewport);
            console.log('Initial WW:', viewport.voi.windowWidth);
            console.log('Initial WL:', viewport.voi.windowCenter);
            
            // Add keyboard shortcuts for testing
            document.addEventListener('keydown', (e) => {
                const viewport = cornerstone.getViewport(this.element);
                let changed = false;
                
                switch(e.key) {
                    case 'w': // Increase width
                        viewport.voi.windowWidth += 10;
                        changed = true;
                        console.log('Width increased:', viewport.voi.windowWidth);
                        break;
                    case 's': // Decrease width
                        viewport.voi.windowWidth -= 10;
                        changed = true;
                        console.log('Width decreased:', viewport.voi.windowWidth);
                        break;
                    case 'a': // Decrease level
                        viewport.voi.windowCenter -= 10;
                        changed = true;
                        console.log('Level decreased:', viewport.voi.windowCenter);
                        break;
                    case 'd': // Increase level
                        viewport.voi.windowCenter += 10;
                        changed = true;
                        console.log('Level increased:', viewport.voi.windowCenter);
                        break;
                }
                
                if (changed) {
                    cornerstone.setViewport(this.element, viewport);
                }
            });
            
            console.log('=== Window/Level Tool Setup Complete ===');
            console.log('TIP: Click and drag LEFT mouse button on the image to adjust WW/WL');
            console.log('OR use keyboard: W/S for width, A/D for level');
            
        } catch (error) {
            console.error('=== ERROR enabling W/L tool ===');
            console.error('Error:', error);
            console.error('Stack:', error.stack);
            throw error;
        }
    }

    addViewportOverlay() {
        // Create overlay element to display WW/WL
        if (!document.getElementById('viewport-overlay')) {
            const overlay = document.createElement('div');
            overlay.id = 'viewport-overlay';
            overlay.className = 'viewport-overlay';
            this.element.appendChild(overlay);
        }
        
        // Create canvas overlay for measurements
        if (!this.measurementCanvas) {
            this.measurementCanvas = document.createElement('canvas');
            this.measurementCanvas.id = 'measurement-canvas';
            this.measurementCanvas.style.position = 'absolute';
            this.measurementCanvas.style.top = '0';
            this.measurementCanvas.style.left = '0';
            this.measurementCanvas.style.pointerEvents = 'none';
            this.measurementCanvas.style.zIndex = '10';
            this.element.appendChild(this.measurementCanvas);
            this.measurementCtx = this.measurementCanvas.getContext('2d');
            
            // Resize canvas to match element
            this.resizeMeasurementCanvas();
        }

        // Listen for viewport changes to update the overlay
        this.element.addEventListener('cornerstoneimagerendered', (e) => {
            this.updateViewportOverlay(e);
            this.redrawMeasurements();
        });
        
        // Add manual mouse handling for all tools
        this.setupMouseHandlers();

        console.log('Viewport overlay added with event listeners');
        
        // Force initial update
        const viewport = cornerstone.getViewport(this.element);
        if (viewport) {
            this.updateViewportOverlay({ detail: { viewport } });
        }

        // Watch for element size changes
        if (typeof ResizeObserver !== 'undefined') {
            const resizeObserver = new ResizeObserver(() => {
                this.resizeMeasurementCanvas();
            });
            resizeObserver.observe(this.element);
        }
    }
    
    resizeMeasurementCanvas() {
        if (this.measurementCanvas && this.element) {
            this.measurementCanvas.width = this.element.clientWidth;
            this.measurementCanvas.height = this.element.clientHeight;
            this.redrawMeasurements();
        }
    }

    setupMouseHandlers() {
        let isDragging = false;
        let startX = 0;
        let startY = 0;
        let startWW = 0;
        let startWL = 0;
        let startPanX = 0;
        let startPanY = 0;
        let startScale = 0;
        let draggedPoint = null; // Track which point is being dragged
        
        const mouseDown = (e) => {
            const rect = this.element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Middle mouse button (1) for Pan/Zoom, Left (0) or Middle (1) for W/L
            const isMiddleButton = e.button === 1;
            const isLeftButton = e.button === 0;
            
            // Check if clicking near an existing measurement point to drag it
            if (['length', 'angle', 'area', 'probe'].includes(this.currentTool) && isLeftButton) {
                // Check if clicking on current measurement point
                if (this.currentMeasurement) {
                    draggedPoint = this.findNearestPoint(x, y, this.currentMeasurement);
                    if (draggedPoint !== null) {
                        this.isDrawing = true;
                        e.preventDefault();
                        return;
                    }
                }
                
                // Check if clicking on existing completed measurement point
                for (let i = this.measurements.length - 1; i >= 0; i--) {
                    if (this.measurements[i].imageIndex === this.currentIndex) {
                        const pointIndex = this.findNearestPoint(x, y, this.measurements[i]);
                        if (pointIndex !== null) {
                            this.currentMeasurement = this.measurements[i];
                            this.measurements.splice(i, 1); // Remove from completed list
                            draggedPoint = pointIndex;
                            this.isDrawing = true;
                            e.preventDefault();
                            return;
                        }
                    }
                }
                
                // No existing point clicked - create new measurement for non-angle and non-area tools
                if (this.currentTool !== 'angle' && this.currentTool !== 'area') {
                    this.isDrawing = true;
                    const imageCoords = this.canvasToImageCoords({ x, y });
                    this.currentMeasurement = {
                        tool: this.currentTool,
                        points: [{ x, y }],
                        imagePoints: [imageCoords],
                        imageIndex: this.currentIndex
                    };
                    e.preventDefault();
                    return;
                }
            }
            
            if ((this.currentTool === 'pan' || this.currentTool === 'zoom' || this.currentTool === 'frameSlider') && isMiddleButton) {
                isDragging = true;
                startX = e.pageX;
                startY = e.pageY;
                
                const viewport = cornerstone.getViewport(this.element);
                startPanX = viewport.translation.x;
                startPanY = viewport.translation.y;
                startScale = viewport.scale;
                
                console.log(`${this.currentTool} drag started`);
                e.preventDefault();
            } else if (this.currentTool === 'frameSlider' && isLeftButton) {
                // Frame slider also works with left button
                isDragging = true;
                startX = e.pageX;
                startY = e.pageY;
                
                console.log('Frame slider drag started');
                e.preventDefault();
            } else if (this.currentTool === 'windowLevel' && (isLeftButton || isMiddleButton)) {
                isDragging = true;
                startX = e.pageX;
                startY = e.pageY;
                
                const viewport = cornerstone.getViewport(this.element);
                startWW = viewport.voi.windowWidth;
                startWL = viewport.voi.windowCenter;
                
                console.log('W/L drag started - Button:', e.button);
                e.preventDefault();
            }
        };
        
        const mouseMove = (e) => {
            const rect = this.element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Handle measurement point dragging
            if (this.isDrawing && this.currentMeasurement && draggedPoint !== null) {
                this.currentMeasurement.points[draggedPoint] = { x, y };
                if (this.currentMeasurement.imagePoints) {
                    this.currentMeasurement.imagePoints[draggedPoint] = this.canvasToImageCoords({ x, y });
                }
                this.redrawMeasurements();
                e.preventDefault();
                return;
            }
            
            // Handle measurement drawing
            if (this.isDrawing && this.currentMeasurement) {
                if (this.currentMeasurement.tool === 'length') {
                    this.currentMeasurement.points[1] = { x, y };
                    if (this.currentMeasurement.imagePoints) {
                        this.currentMeasurement.imagePoints[1] = this.canvasToImageCoords({ x, y });
                    }
                }
                this.redrawMeasurements();
                e.preventDefault();
                return;
            }
            
            if (isDragging) {
                const deltaX = e.pageX - startX;
                const deltaY = e.pageY - startY;
                
                const viewport = cornerstone.getViewport(this.element);
                
                if (this.currentTool === 'windowLevel') {
                    // Horizontal movement changes width (contrast)
                    viewport.voi.windowWidth = Math.max(1, startWW + deltaX * 2);
                    
                    // Vertical movement changes level (brightness)
                    viewport.voi.windowCenter = startWL + deltaY * 2;
                    
                } else if (this.currentTool === 'pan') {
                    // Pan: move the image - divide by scale to maintain 1:1 movement
                    viewport.translation.x = startPanX + (deltaX / viewport.scale);
                    viewport.translation.y = startPanY + (deltaY / viewport.scale);
                    
                } else if (this.currentTool === 'zoom') {
                    // Zoom: vertical movement controls zoom
                    const zoomDelta = -deltaY * 0.01;
                    viewport.scale = Math.max(0.1, Math.min(10, startScale + zoomDelta));
                } else if (this.currentTool === 'frameSlider') {
                    // Frame slider: vertical movement changes frames (down = next, up = previous)
                    if (this.currentImageIds.length > 1) {
                        const sensitivity = 10; // pixels per frame
                        const frameDelta = Math.floor(deltaY / sensitivity);
                        const targetFrame = Math.max(0, Math.min(this.currentImageIds.length - 1, this.currentIndex + frameDelta));
                        
                        if (targetFrame !== this.currentIndex) {
                            this.displayImage(targetFrame);
                        }
                        e.preventDefault();
                        return; // Don't update viewport for frame slider
                    }
                }
                
                if (this.currentTool !== 'frameSlider') {
                    cornerstone.setViewport(this.element, viewport);
                }
                e.preventDefault();
            }
        };
        
        const mouseUp = (e) => {
            const rect = this.element.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            // Complete measurement dragging
            if (this.isDrawing && draggedPoint !== null) {
                this.measurements.push(this.currentMeasurement);
                this.currentMeasurement = null;
                draggedPoint = null;
                this.isDrawing = false;
                this.updateMeasurementsList();
                this.redrawMeasurements();
                e.preventDefault();
                return;
            }
            
            // Complete measurement
            if (this.isDrawing && this.currentMeasurement) {
                if (this.currentMeasurement.tool === 'length') {
                    const imageCoords = this.canvasToImageCoords({ x, y });
                    this.currentMeasurement.points[1] = { x, y };
                    this.currentMeasurement.imagePoints[1] = imageCoords;
                    this.measurements.push(this.currentMeasurement);
                    this.isDrawing = false;
                    this.currentMeasurement = null;
                    this.updateMeasurementsList();
                    this.redrawMeasurements();
                } else if (this.currentMeasurement.tool === 'probe') {
                    const imageCoords = this.canvasToImageCoords({ x, y });
                    this.currentMeasurement.points[0] = { x, y };
                    this.currentMeasurement.imagePoints[0] = imageCoords;
                    this.measurements.push(this.currentMeasurement);
                    this.isDrawing = false;
                    this.currentMeasurement = null;
                    this.updateMeasurementsList();
                    this.redrawMeasurements();
                }
                e.preventDefault();
                return;
            }
            
            if (isDragging) {
                isDragging = false;
                console.log('Drag stopped');
                e.preventDefault();
            }
        };
        
        this.element.addEventListener('mousedown', mouseDown);
        this.element.addEventListener('mousemove', mouseMove);
        this.element.addEventListener('mouseup', mouseUp);
        this.element.addEventListener('mouseleave', mouseUp);
        
        console.log('Mouse handlers installed for all tools');
    }
    
    findNearestPoint(x, y, measurement) {
        const threshold = 10; // pixels
        for (let i = 0; i < measurement.points.length; i++) {
            const p = measurement.points[i];
            const dist = Math.sqrt((p.x - x) ** 2 + (p.y - y) ** 2);
            if (dist <= threshold) {
                return i;
            }
        }
        return null;
    }
    
    redrawMeasurements() {
        if (!this.measurementCtx || !this.measurementCanvas) return;
        
        // Clear canvas
        this.measurementCtx.clearRect(0, 0, this.measurementCanvas.width, this.measurementCanvas.height);
        
        // Draw all completed measurements
        this.measurements.forEach(measurement => {
            if (measurement.imageIndex === this.currentIndex) {
                this.drawMeasurement(measurement, false);
            }
        });
        
        // Draw current measurement being drawn
        if (this.currentMeasurement) {
            this.drawMeasurement(this.currentMeasurement, true);
        }
    }
    
    // Convert canvas display coordinates to image pixel coordinates
    canvasToImageCoords(canvasPoint) {
        try {
            const pixelCoords = cornerstone.canvasToPixel(this.element, canvasPoint);
            // Round to integer pixel coordinates
            return {
                x: Math.round(pixelCoords.x),
                y: Math.round(pixelCoords.y)
            };
        } catch (e) {
            console.warn('Failed to convert canvas to image coords:', e);
            return canvasPoint;
        }
    }
    
    // Convert image pixel coordinates to canvas display coordinates
    imageToCanvasCoords(imagePoint) {
        try {
            return cornerstone.pixelToCanvas(this.element, imagePoint);
        } catch (e) {
            console.warn('Failed to convert image to canvas coords:', e);
            return imagePoint;
        }
    }
    
    drawMeasurement(measurement, isActive) {
        const ctx = this.measurementCtx;
        // Convert image coordinates to canvas coordinates for drawing
        const points = measurement.imagePoints ? 
            measurement.imagePoints.map(p => this.imageToCanvasCoords(p)) : 
            measurement.points;
        
        ctx.strokeStyle = isActive ? '#ffff00' : '#00ff00';
        ctx.fillStyle = isActive ? '#ffff00' : '#00ff00';
        ctx.lineWidth = 2;
        ctx.font = '14px Arial';
        
        if (measurement.tool === 'length' && points.length >= 2) {
            // Draw line
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            ctx.lineTo(points[1].x, points[1].y);
            ctx.stroke();
            
            // Draw handles
            points.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
                ctx.fill();
            });
            
            // Calculate and display length
            const length = this.calculateDistance(points[0], points[1]);
            const midX = (points[0].x + points[1].x) / 2;
            const midY = (points[0].y + points[1].y) / 2;
            ctx.fillText(`${length.toFixed(1)} px`, midX + 5, midY - 5);
            
        } else if (measurement.tool === 'angle' && points.length >= 2) {
            // Draw lines
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y);
            ctx.lineTo(points[1].x, points[1].y);
            if (points.length >= 3) {
                ctx.lineTo(points[2].x, points[2].y);
            }
            ctx.stroke();
            
            // Draw larger, more visible handles for dragging
            const labels = ['1st', 'Vertex', '3rd'];
            points.forEach((p, i) => {
                // Draw outer circle for better visibility
                ctx.beginPath();
                ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI);
                ctx.fillStyle = isActive ? '#ffff00' : '#00ff00';
                ctx.fill();
                
                // Draw inner circle
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, 2 * Math.PI);
                ctx.fillStyle = '#000000';
                ctx.fill();
                
                // Restore fill color for text
                ctx.fillStyle = isActive ? '#ffff00' : '#00ff00';
                
                // Draw point label
                ctx.fillText(labels[i], p.x + 10, p.y - 10);
            });
            
            // Calculate and display angle if complete
            if (points.length >= 3) {
                const angle = this.calculateAngle(points[0], points[1], points[2]);
                ctx.font = 'bold 16px Arial';
                ctx.fillText(`${angle.toFixed(1)}°`, points[1].x + 15, points[1].y + 20);
                ctx.font = '14px Arial'; // Reset font
            }
            
        } else if (measurement.tool === 'area' && points.length >= 4) {
            // Ellipse with control points
            // points[0] = center
            // points[1] = end of major axis (controls size and rotation)
            // points[2] = end of minor axis (controls ratio)
            // points[3] = rotation handle
            
            const center = points[0];
            const majorEnd = points[1];
            const minorEnd = points[2];
            
            // Calculate ellipse parameters
            const dx = majorEnd.x - center.x;
            const dy = majorEnd.y - center.y;
            const radiusX = Math.sqrt(dx * dx + dy * dy);
            const rotation = Math.atan2(dy, dx);
            
            const dx2 = minorEnd.x - center.x;
            const dy2 = minorEnd.y - center.y;
            const radiusY = Math.sqrt(dx2 * dx2 + dy2 * dy2);
            
            // Draw ellipse
            ctx.save();
            ctx.translate(center.x, center.y);
            ctx.rotate(rotation);
            ctx.beginPath();
            ctx.ellipse(0, 0, radiusX, radiusY, 0, 0, 2 * Math.PI);
            ctx.restore();
            ctx.stroke();
            
            // Draw center point
            ctx.beginPath();
            ctx.arc(center.x, center.y, 6, 0, 2 * Math.PI);
            ctx.fillStyle = isActive ? '#ffff00' : '#00ff00';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(center.x, center.y, 3, 0, 2 * Math.PI);
            ctx.fillStyle = '#000000';
            ctx.fill();
            ctx.fillStyle = isActive ? '#ffff00' : '#00ff00';
            ctx.fillText('Center', center.x + 10, center.y - 10);
            
            // Draw major axis handle
            ctx.beginPath();
            ctx.moveTo(center.x, center.y);
            ctx.lineTo(majorEnd.x, majorEnd.y);
            ctx.strokeStyle = isActive ? '#ffff00' : '#00ff00';
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.beginPath();
            ctx.arc(majorEnd.x, majorEnd.y, 6, 0, 2 * Math.PI);
            ctx.fillStyle = isActive ? '#ffff00' : '#00ff00';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(majorEnd.x, majorEnd.y, 3, 0, 2 * Math.PI);
            ctx.fillStyle = '#000000';
            ctx.fill();
            ctx.fillStyle = isActive ? '#ffff00' : '#00ff00';
            ctx.fillText('Size/Rotate', majorEnd.x + 10, majorEnd.y - 10);
            
            // Draw minor axis handle
            ctx.beginPath();
            ctx.moveTo(center.x, center.y);
            ctx.lineTo(minorEnd.x, minorEnd.y);
            ctx.strokeStyle = isActive ? '#ffff00' : '#00ff00';
            ctx.setLineDash([5, 5]);
            ctx.stroke();
            ctx.setLineDash([]);
            
            ctx.beginPath();
            ctx.arc(minorEnd.x, minorEnd.y, 6, 0, 2 * Math.PI);
            ctx.fillStyle = isActive ? '#ffff00' : '#00ff00';
            ctx.fill();
            ctx.beginPath();
            ctx.arc(minorEnd.x, minorEnd.y, 3, 0, 2 * Math.PI);
            ctx.fillStyle = '#000000';
            ctx.fill();
            ctx.fillStyle = isActive ? '#ffff00' : '#00ff00';
            ctx.fillText('Ratio', minorEnd.x + 10, minorEnd.y - 10);
            
            // Calculate pixel statistics within ellipse
            const stats = this.calculateEllipseStats(center, radiusX, radiusY, rotation);
            console.log('Drawing ellipse with stats:', stats);
            
            // Calculate and display area and statistics
            const area = Math.PI * radiusX * radiusY;
            ctx.font = 'bold 14px Arial';
            ctx.fillText(`Area: ${area.toFixed(1)} px²`, center.x + 10, center.y + 20);
            
            if (stats) {
                ctx.font = '12px Arial';
                ctx.fillText(`Mean: ${stats.mean.toFixed(1)}`, center.x + 10, center.y + 35);
                ctx.fillText(`Min: ${stats.min.toFixed(1)}`, center.x + 10, center.y + 48);
                ctx.fillText(`Max: ${stats.max.toFixed(1)}`, center.x + 10, center.y + 61);
            } else {
                ctx.font = '12px Arial';
                ctx.fillText('(No stats available)', center.x + 10, center.y + 35);
            }
            ctx.font = '14px Arial';
            
        } else if (measurement.tool === 'probe' && points.length >= 1) {
            // Draw crosshair
            const p = points[0];
            ctx.beginPath();
            ctx.moveTo(p.x - 10, p.y);
            ctx.lineTo(p.x + 10, p.y);
            ctx.moveTo(p.x, p.y - 10);
            ctx.lineTo(p.x, p.y + 10);
            ctx.stroke();
            
            // Get pixel value - convert from canvas coords to pixel coords
            try {
                const image = cornerstone.getImage(this.element);
                if (image) {
                    // Our stored coordinates are display coordinates relative to the element
                    // The Cornerstone element has a canvas, get it
                    const enabledElement = cornerstone.getEnabledElement(this.element);
                    const canvas = enabledElement.canvas;
                    
                    // cornerstone.canvasToPixel expects coordinates in the canvas coordinate system
                    // Our coordinates are already in the right system (relative to canvas/element)
                    const pixelCoords = cornerstone.canvasToPixel(this.element, p);
                    let x = Math.round(pixelCoords.x);
                    let y = Math.round(pixelCoords.y);
                    
                    console.log('Display coords:', p, 'Pixel coords:', pixelCoords, 'Rounded:', x, y);
                    console.log('Image dimensions:', image.width, 'x', image.height);
                    
                    // Clamp coordinates to valid image bounds
                    const clampedX = Math.max(0, Math.min(image.width - 1, x));
                    const clampedY = Math.max(0, Math.min(image.height - 1, y));
                    const wasClamped = (clampedX !== x || clampedY !== y);
                    x = clampedX;
                    y = clampedY;
                    
                    // Flip Y coordinate for pixel data access (image data is stored top-to-bottom)
                    const flippedY = image.height - 1 - y;
                    
                    // Read pixel value
                    const pixelData = image.getPixelData();
                    const index = flippedY * image.width + x;
                    const pixelValue = pixelData[index];
                    console.log('Index:', index, 'Value:', pixelValue, 'Clamped:', wasClamped, 'FlippedY:', flippedY);
                    
                    ctx.fillText(`Coords: (${x}, ${y})${wasClamped ? ' *' : ''}`, p.x + 15, p.y - 5);
                    ctx.fillText(`Value: ${pixelValue}`, p.x + 15, p.y + 10);
                    if (wasClamped) {
                        ctx.font = '10px Arial';
                        ctx.fillText('* clamped to edge', p.x + 15, p.y + 22);
                        ctx.font = '14px Arial';
                    }
                }
            } catch (e) {
                console.warn('Could not read pixel value:', e);
                ctx.fillText(`Value: error`, p.x + 15, p.y - 5);
            }
        }
    }
    
    calculateDistance(p1, p2) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    calculateAngle(p1, p2, p3) {
        // Calculate angle at p2 (vertex)
        const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
        const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
        
        const dot = v1.x * v2.x + v1.y * v2.y;
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
        
        const cosAngle = dot / (mag1 * mag2);
        const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
        return angle;
    }
    
    calculatePolygonArea(points) {
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        return Math.abs(area / 2);
    }
    
    calculateCentroid(points) {
        let x = 0, y = 0;
        points.forEach(p => {
            x += p.x;
            y += p.y;
        });
        return { x: x / points.length, y: y / points.length };
    }
    
    calculateEllipseStats(center, radiusX, radiusY, rotation) {
        try {
            const image = cornerstone.getImage(this.element);
            if (!image) {
                console.warn('No image available for stats calculation');
                return null;
            }
            
            const pixelData = image.getPixelData();
            if (!pixelData) {
                console.warn('No pixel data available');
                return null;
            }
            
            const width = image.width;
            const height = image.height;
            
            // Convert center from canvas coordinates to pixel coordinates
            const pixelCenter = cornerstone.canvasToPixel(this.element, center);
            
            // Get viewport to understand scaling
            const viewport = cornerstone.getViewport(this.element);
            const scale = viewport.scale;
            
            // Scale radii from canvas to image coordinates
            const pixelRadiusX = radiusX / scale;
            const pixelRadiusY = radiusY / scale;
            
            console.log('Canvas center:', center, 'Pixel center:', pixelCenter);
            console.log('Canvas radii:', radiusX, radiusY, 'Pixel radii:', pixelRadiusX, pixelRadiusY);
            console.log('Image dimensions:', width, height);
            
            let sum = 0;
            let count = 0;
            let min = Infinity;
            let max = -Infinity;
            
            // Calculate bounding box for efficiency
            const cosR = Math.cos(-rotation);
            const sinR = Math.sin(-rotation);
            
            const minX = Math.max(0, Math.floor(pixelCenter.x - pixelRadiusX - 2));
            const maxX = Math.min(width - 1, Math.ceil(pixelCenter.x + pixelRadiusX + 2));
            const minY = Math.max(0, Math.floor(pixelCenter.y - pixelRadiusY - 2));
            const maxY = Math.min(height - 1, Math.ceil(pixelCenter.y + pixelRadiusY + 2));
            
            console.log('Bounding box:', minX, maxX, minY, maxY);
            
            // Iterate through bounding box and check if each pixel is inside ellipse
            for (let y = minY; y <= maxY; y++) {
                for (let x = minX; x <= maxX; x++) {
                    // Transform point to ellipse coordinate system
                    const dx = x - pixelCenter.x;
                    const dy = y - pixelCenter.y;
                    
                    // Rotate point
                    const rx = dx * cosR - dy * sinR;
                    const ry = dx * sinR + dy * cosR;
                    
                    // Check if point is inside ellipse
                    const normalized = (rx * rx) / (pixelRadiusX * pixelRadiusX) + (ry * ry) / (pixelRadiusY * pixelRadiusY);
                    
                    if (normalized <= 1) {
                        // Flip Y coordinate for pixel data access
                        const flippedY = height - 1 - Math.floor(y);
                        const index = flippedY * width + Math.floor(x);
                        if (index >= 0 && index < pixelData.length) {
                            const value = pixelData[index];
                            sum += value;
                            count++;
                            min = Math.min(min, value);
                            max = Math.max(max, value);
                        }
                    }
                }
            }
            
            if (count === 0) {
                console.warn('No pixels found inside ellipse');
                return null;
            }
            
            const stats = {
                mean: sum / count,
                min: min,
                max: max,
                count: count
            };
            
            console.log('Ellipse stats calculated:', stats);
            
            return stats;
        } catch (e) {
            console.warn('Could not calculate ellipse statistics:', e);
            return null;
        }
    }
    
    updateMeasurementsList() {
        const measurementsList = document.getElementById('measurementsList');
        if (!measurementsList) return;
        
        measurementsList.innerHTML = '';
        
        this.measurements.forEach((measurement, index) => {
            const item = document.createElement('div');
            item.className = 'measurement-item';
            
            let text = `${index + 1}. ${measurement.tool}: `;
            
            if (measurement.tool === 'length' && measurement.points.length >= 2) {
                const length = this.calculateDistance(measurement.points[0], measurement.points[1]);
                text += `${length.toFixed(1)} px`;
            } else if (measurement.tool === 'angle' && measurement.points.length >= 3) {
                const angle = this.calculateAngle(measurement.points[0], measurement.points[1], measurement.points[2]);
                text += `${angle.toFixed(1)}°`;
            } else if (measurement.tool === 'area' && measurement.points.length >= 4) {
                // Ellipse area calculation
                const center = measurement.points[0];
                const majorEnd = measurement.points[1];
                const minorEnd = measurement.points[2];
                
                const dx = majorEnd.x - center.x;
                const dy = majorEnd.y - center.y;
                const radiusX = Math.sqrt(dx * dx + dy * dy);
                const rotation = Math.atan2(dy, dx);
                
                const dx2 = minorEnd.x - center.x;
                const dy2 = minorEnd.y - center.y;
                const radiusY = Math.sqrt(dx2 * dx2 + dy2 * dy2);
                
                const area = Math.PI * radiusX * radiusY;
                const stats = this.calculateEllipseStats(center, radiusX, radiusY, rotation);
                
                text += `${area.toFixed(1)} px²`;
                if (stats) {
                    text += ` | Mean: ${stats.mean.toFixed(1)}, Min: ${stats.min.toFixed(1)}, Max: ${stats.max.toFixed(1)}`;
                }
            } else if (measurement.tool === 'probe') {
                text += `x:${Math.round(measurement.points[0].x)}, y:${Math.round(measurement.points[0].y)}`;
            }
            
            item.textContent = text;
            
            // Add delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.textContent = '×';
            deleteBtn.className = 'delete-measurement-btn';
            deleteBtn.style.cssText = 'margin-left: 10px; color: red; cursor: pointer; border: none; background: none; font-size: 18px;';
            deleteBtn.addEventListener('click', () => {
                this.measurements.splice(index, 1);
                this.updateMeasurementsList();
                this.redrawMeasurements();
            });
            
            item.appendChild(deleteBtn);
            measurementsList.appendChild(item);
        });
    }

    updateViewportOverlay(event) {
        const viewport = event.detail.viewport;
        const overlay = document.getElementById('viewport-overlay');
        
        if (overlay && viewport) {
            const ww = Math.round(viewport.voi.windowWidth);
            const wc = Math.round(viewport.voi.windowCenter);
            
            // Format tool name for display
            const toolName = this.currentTool.charAt(0).toUpperCase() + this.currentTool.slice(1);
            
            // Build overlay content based on current tool
            let overlayContent = `
                <div class="viewport-info">
                    <div><strong>Tool:</strong> ${toolName}</div>
                    <div><strong>WW:</strong> ${ww}</div>
                    <div><strong>WL:</strong> ${wc}</div>
                    <div><strong>Zoom:</strong> ${viewport.scale.toFixed(2)}x</div>
            `;
            
            // Add pan translation if pan tool is active
            if (this.currentTool === 'pan') {
                overlayContent += `
                    <div><strong>Pan X:</strong> ${Math.round(viewport.translation.x)}</div>
                    <div><strong>Pan Y:</strong> ${Math.round(viewport.translation.y)}</div>
                `;
            }
            
            overlayContent += `</div>`;
            overlay.innerHTML = overlayContent;
        }
    }

    showWindowLevelInstructions() {
        // Create a temporary instruction overlay
        const instructions = document.createElement('div');
        instructions.className = 'wl-instructions';
        
        let instructionContent = '';
        
        // Show instructions based on current tool
        if (this.currentTool === 'windowLevel') {
            instructionContent = `
                <h3>Window/Level Controls</h3>
                <p><strong>Left or Middle Mouse Button + Drag:</strong></p>
                <ul>
                    <li>Drag <strong>Right</strong> → Increase Width (More Contrast)</li>
                    <li>Drag <strong>Left</strong> → Decrease Width (Less Contrast)</li>
                    <li>Drag <strong>Down</strong> → Increase Level (Brighter)</li>
                    <li>Drag <strong>Up</strong> → Decrease Level (Darker)</li>
                </ul>
                <p style="margin-top: 0.5rem; color: #4a9eff; font-size: 0.9rem;">
                    <strong>Keyboard Shortcuts:</strong><br>
                    W/S = Width • A/D = Level
                </p>
            `;
        } else if (this.currentTool === 'pan') {
            instructionContent = `
                <h3>Pan Controls</h3>
                <p><strong>Middle Mouse Button + Drag:</strong></p>
                <ul>
                    <li>Drag in any direction to move the image</li>
                </ul>
            `;
        } else if (this.currentTool === 'zoom') {
            instructionContent = `
                <h3>Zoom Controls</h3>
                <p><strong>Middle Mouse Button + Drag:</strong></p>
                <ul>
                    <li>Drag <strong>Down</strong> → Zoom In</li>
                    <li>Drag <strong>Up</strong> → Zoom Out</li>
                </ul>
            `;
        } else if (this.currentTool === 'frameSlider') {
            instructionContent = `
                <h3>Frame Slider</h3>
                <p><strong>Left or Middle Mouse Button + Drag:</strong></p>
                <ul>
                    <li>Drag <strong>Down</strong> → Next frames</li>
                    <li>Drag <strong>Up</strong> → Previous frames</li>
                </ul>
                <p style="margin-top: 0.5rem; color: #4a9eff; font-size: 0.9rem;">
                    Works with multi-frame DICOM files
                </p>
            `;
        } else if (this.currentTool === 'length') {
            instructionContent = `
                <h3>Length Measurement</h3>
                <p><strong>Left Mouse Button:</strong></p>
                <ul>
                    <li>Click <strong>1st point</strong> → start of line</li>
                    <li>Click <strong>2nd point</strong> → end of line</li>
                </ul>
            `;
        } else if (this.currentTool === 'angle') {
            instructionContent = `
                <h3>Angle Measurement</h3>
                <p><strong>Drag the points to adjust:</strong></p>
                <ul>
                    <li><strong>1st point</strong> → First arm of angle</li>
                    <li><strong>2nd point</strong> → Vertex (center point)</li>
                    <li><strong>3rd point</strong> → Second arm of angle</li>
                </ul>
                <p style="margin-top: 0.5rem; color: #4a9eff; font-size: 0.9rem;">
                    Click near any point to drag it to a new position
                </p>
            `;
        } else if (this.currentTool === 'area') {
            instructionContent = `
                <h3>Area Measurement (Ellipse)</h3>
                <p><strong>Drag the handles to adjust:</strong></p>
                <ul>
                    <li><strong>Center</strong> → Move the ellipse position</li>
                    <li><strong>Size/Rotate</strong> → Change size and rotation</li>
                    <li><strong>Ratio</strong> → Adjust width-to-height ratio</li>
                </ul>
                <p style="margin-top: 0.5rem; color: #4a9eff; font-size: 0.9rem;">
                    Click near any handle to drag it
                </p>
            `;
        } else if (this.currentTool === 'probe') {
            instructionContent = `
                <h3>Pixel Probe</h3>
                <p><strong>Left Mouse Button:</strong></p>
                <ul>
                    <li>Click anywhere to read pixel value</li>
                </ul>
            `;
        }
        
        instructions.innerHTML = `
            <div class="wl-instructions-content">
                ${instructionContent}
                <p style="margin-top: 0.5rem; color: #aaa; font-size: 0.85rem;">
                    Current values shown in top-left corner
                </p>
                <button class="wl-instructions-close">Got it!</button>
            </div>
        `;
        
        document.body.appendChild(instructions);
        
        // Auto-hide after 8 seconds or on button click
        const closeBtn = instructions.querySelector('.wl-instructions-close');
        const closeInstructions = () => {
            instructions.style.opacity = '0';
            setTimeout(() => instructions.remove(), 300);
        };
        
        closeBtn.addEventListener('click', closeInstructions);
        setTimeout(closeInstructions, 8000);
    }

    updateImageInfo(image, index) {
        const info = document.getElementById('imageInfo');
        const current = index + 1;
        const total = this.currentImageIds.length;
        
        info.textContent = `Image ${current}/${total} - ${image.width}x${image.height}`;
    }

    async updateDicomTags(imageId) {
        try {
            const image = await cornerstone.loadImage(imageId);
            const dataSet = image.data;
            
            if (!dataSet) {
                document.getElementById('dicomTags').innerHTML = '<p>No DICOM metadata available</p>';
                return;
            }
            
            const tagsContainer = document.getElementById('dicomTags');
            tagsContainer.innerHTML = '';
            
            // Check for frame information
            const frameMatch = imageId.match(/\?frame=(\d+)$/);
            if (frameMatch) {
                const frameNum = parseInt(frameMatch[1]) + 1;
                this.addTagToDisplay('Current Frame', frameNum.toString(), tagsContainer);
            }
            
            // Check total number of frames
            if (dataSet.elements.x00280008) {
                const numFrames = dataSet.string('x00280008');
                this.addTagToDisplay('Total Frames', numFrames, tagsContainer);
            }
            
            // Important DICOM tags to display
            const importantTags = {
                'x00100010': 'Patient Name',
                'x00100020': 'Patient ID',
                'x00100030': 'Patient Birth Date',
                'x00100040': 'Patient Sex',
                'x00080020': 'Study Date',
                'x00080030': 'Study Time',
                'x00080060': 'Modality',
                'x00181030': 'Protocol Name',
                'x00200011': 'Series Number',
                'x00200013': 'Instance Number',
                'x00280010': 'Rows',
                'x00280011': 'Columns',
                'x00281050': 'Window Center',
                'x00281051': 'Window Width'
            };
            
            Object.entries(importantTags).forEach(([tag, name]) => {
                const element = dataSet.elements[tag];
                if (element) {
                    const value = dataSet.string(tag) || 'N/A';
                    this.addTagToDisplay(name, value, tagsContainer);
                }
            });
            
            if (tagsContainer.children.length === 0) {
                tagsContainer.innerHTML = '<p>No readable DICOM tags found</p>';
            }
            
        } catch (error) {
            console.error('Error reading DICOM tags:', error);
            document.getElementById('dicomTags').innerHTML = '<p>Error reading DICOM metadata</p>';
        }
    }

    addTagToDisplay(name, value, container) {
        const tagItem = document.createElement('div');
        tagItem.className = 'tag-item';
        tagItem.innerHTML = `
            <span class="tag-name">${name}:</span>
            <span class="tag-value">${value}</span>
        `;
        container.appendChild(tagItem);
    }

    setActiveTool(tool) {
        // Update button states
        document.querySelectorAll('.tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // For now, just update the UI without cornerstone tools
        this.currentTool = tool;
        
        switch (tool) {
            case 'windowLevel':
                document.getElementById('windowLevelTool')?.classList.add('active');
                break;
            case 'pan':
                document.getElementById('panTool')?.classList.add('active');
                break;
            case 'zoom':
                document.getElementById('zoomTool')?.classList.add('active');
                break;
            case 'frameSlider':
                document.getElementById('frameSlider')?.classList.add('active');
                break;
            case 'length':
                document.getElementById('lengthTool')?.classList.add('active');
                break;
            case 'area':
                document.getElementById('areaTool')?.classList.add('active');
                break;
            case 'angle':
                document.getElementById('angleTool')?.classList.add('active');
                break;
            case 'probe':
                document.getElementById('pixelProbeTool')?.classList.add('active');
                break;
            case 'textMarker':
                document.getElementById('textAnnotationTool')?.classList.add('active');
                break;
            case 'arrowAnnotate':
                document.getElementById('arrowAnnotationTool')?.classList.add('active');
                break;
            case 'freehandRoi':
                document.getElementById('freehandTool')?.classList.add('active');
                break;
        }
        
        console.log('Tool changed to:', tool);
        
        // Create default angle when angle tool is selected
        if (tool === 'angle' && this.element && this.isViewerInitialized) {
            const centerX = this.element.clientWidth / 2;
            const centerY = this.element.clientHeight / 2;
            const armLength = 80;
            
            const points = [
                { x: centerX - armLength, y: centerY - armLength / 2 }, // First arm point
                { x: centerX, y: centerY }, // Vertex
                { x: centerX + armLength, y: centerY - armLength / 2 }  // Second arm point
            ];
            
            this.currentMeasurement = {
                tool: 'angle',
                points: points,
                imagePoints: points.map(p => this.canvasToImageCoords(p)),
                imageIndex: this.currentIndex
            };
            this.measurements.push(this.currentMeasurement);
            this.currentMeasurement = null;
            this.updateMeasurementsList();
            this.redrawMeasurements();
        }
        
        // Create default ellipse when area tool is selected
        if (tool === 'area' && this.element && this.isViewerInitialized) {
            const centerX = this.element.clientWidth / 2;
            const centerY = this.element.clientHeight / 2;
            const majorRadius = 80;
            const minorRadius = 50;
            
            const points = [
                { x: centerX, y: centerY }, // Center
                { x: centerX + majorRadius, y: centerY }, // Major axis end (controls size and rotation)
                { x: centerX, y: centerY - minorRadius }, // Minor axis end (controls ratio)
                { x: centerX + majorRadius, y: centerY } // Rotation handle (same as major for now)
            ];
            
            this.currentMeasurement = {
                tool: 'area',
                points: points,
                imagePoints: points.map(p => this.canvasToImageCoords(p)),
                imageIndex: this.currentIndex
            };
            this.measurements.push(this.currentMeasurement);
            this.currentMeasurement = null;
            this.updateMeasurementsList();
            this.redrawMeasurements();
        }
        
        // Show tool instructions for interactive tools
        if (['windowLevel', 'pan', 'zoom', 'frameSlider', 'length', 'angle', 'area', 'probe'].includes(tool)) {
            this.showWindowLevelInstructions();
        }
        
        // Update the viewport overlay to show current tool
        if (this.element && this.isViewerInitialized) {
            const viewport = cornerstone.getViewport(this.element);
            this.updateViewportOverlay({ detail: { viewport } });
        }
    }

    resetView() {
        if (this.element && this.isViewerInitialized) {
            cornerstone.fitToWindow(this.element);
            cornerstone.updateImage(this.element);
        }
    }

    handleKeyboard(e) {
        if (!this.isViewerInitialized) return;
        
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                this.previousImage();
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.nextImage();
                break;
            case 'r':
                e.preventDefault();
                this.resetView();
                break;
            case '1':
                e.preventDefault();
                this.setActiveTool('windowLevel');
                break;
            case '2':
                e.preventDefault();
                this.setActiveTool('length');
                break;
            case '3':
                e.preventDefault();
                this.setActiveTool('area');
                break;
        }
    }

    setupExportDialogs() {
        // Export Image Dialog
        document.getElementById('exportFormat').addEventListener('change', (e) => {
            const qualityGroup = document.getElementById('qualityGroup');
            qualityGroup.style.display = e.target.value === 'jpeg' ? 'block' : 'none';
        });

        document.getElementById('exportQuality').addEventListener('input', (e) => {
            document.getElementById('qualityValue').textContent = e.target.value + '%';
        });

        // Modal close handlers
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.add('hidden');
            });
        });

        // Cancel button handlers
        document.getElementById('cancelExport').addEventListener('click', () => {
            document.getElementById('exportImageDialog').classList.add('hidden');
        });

        document.getElementById('cancelMeasurementExport').addEventListener('click', () => {
            document.getElementById('exportMeasurementsDialog').classList.add('hidden');
        });

        // Confirm button handlers
        document.getElementById('confirmExport').addEventListener('click', () => {
            this.exportImage();
        });

        document.getElementById('confirmMeasurementExport').addEventListener('click', () => {
            this.exportMeasurements();
        });

        // Close modals when clicking outside
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.classList.add('hidden');
                }
            });
        });
    }

    showExportImageDialog() {
        if (!this.isViewerInitialized) {
            alert('No image loaded to export');
            return;
        }
        document.getElementById('exportImageDialog').classList.remove('hidden');
    }

    showExportMeasurementsDialog() {
        if (this.measurements.length === 0) {
            alert('No measurements to export');
            return;
        }
        document.getElementById('exportMeasurementsDialog').classList.remove('hidden');
    }

    exportImage() {
        try {
            const format = document.getElementById('exportFormat').value;
            const quality = document.getElementById('exportQuality').value / 100;
            const includeAnnotations = document.getElementById('includeAnnotations').checked;

            // Get canvas from cornerstone
            const canvas = this.element.querySelector('canvas');
            if (!canvas) {
                alert('No image canvas found');
                return;
            }

            // Create export canvas
            const exportCanvas = document.createElement('canvas');
            const ctx = exportCanvas.getContext('2d');
            exportCanvas.width = canvas.width;
            exportCanvas.height = canvas.height;

            // Draw image
            ctx.drawImage(canvas, 0, 0);

            // Convert to blob and download
            const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
            
            exportCanvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `dicom-image-${this.currentIndex + 1}.${format}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, mimeType, quality);

            document.getElementById('exportImageDialog').classList.add('hidden');
            
        } catch (error) {
            console.error('Export error:', error);
            alert('Error exporting image');
        }
    }

    exportMeasurements() {
        try {
            const format = document.getElementById('measurementExportFormat').value;
            const includePatientInfo = document.getElementById('includePatientInfo').checked;

            let data = '';
            let filename = `measurements.${format}`;

            switch (format) {
                case 'csv':
                    data = this.generateCSV(includePatientInfo);
                    break;
                case 'json':
                    data = this.generateJSON(includePatientInfo);
                    break;
                case 'txt':
                    data = this.generateTXT(includePatientInfo);
                    break;
            }

            this.downloadData(data, filename);
            document.getElementById('exportMeasurementsDialog').classList.add('hidden');

        } catch (error) {
            console.error('Export measurements error:', error);
            alert('Error exporting measurements');
        }
    }

    generateCSV(includePatientInfo) {
        let csv = 'Type,Value,Image Index';
        if (includePatientInfo) {
            csv += ',Patient Name,Study Date';
        }
        csv += '\n';

        this.measurements.forEach(measurement => {
            csv += `${measurement.type},${measurement.value},${measurement.imageIndex + 1}`;
            if (includePatientInfo) {
                csv += ',N/A,N/A'; // Would need to extract from DICOM tags
            }
            csv += '\n';
        });

        return csv;
    }

    generateJSON(includePatientInfo) {
        const data = {
            exportDate: new Date().toISOString(),
            measurements: this.measurements,
            annotations: this.annotations
        };

        if (includePatientInfo) {
            data.patientInfo = {
                name: 'N/A',
                studyDate: 'N/A'
            };
        }

        return JSON.stringify(data, null, 2);
    }

    generateTXT(includePatientInfo) {
        let txt = 'DICOM Viewer - Measurements Export\n';
        txt += '=====================================\n\n';
        
        if (includePatientInfo) {
            txt += 'Patient Information:\n';
            txt += 'Name: N/A\n';
            txt += 'Study Date: N/A\n\n';
        }

        txt += 'Measurements:\n';
        txt += '-------------\n';
        
        this.measurements.forEach((measurement, index) => {
            txt += `${index + 1}. ${measurement.type}: ${measurement.value} (Image ${measurement.imageIndex + 1})\n`;
        });

        if (this.annotations.length > 0) {
            txt += '\nAnnotations:\n';
            txt += '------------\n';
            
            this.annotations.forEach((annotation, index) => {
                txt += `${index + 1}. ${annotation.type}: ${annotation.text || 'Annotation'}\n`;
            });
        }

        return txt;
    }

    downloadData(data, filename) {
        const blob = new Blob([data], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    printView() {
        if (!this.isViewerInitialized) {
            alert('No image loaded to print');
            return;
        }

        const canvas = this.element.querySelector('canvas');
        if (!canvas) {
            alert('No image canvas found');
            return;
        }

        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <html>
                <head>
                    <title>DICOM Image Print</title>
                    <style>
                        body { margin: 0; text-align: center; }
                        canvas { max-width: 100%; max-height: 100%; }
                        .info { margin: 20px; font-family: Arial, sans-serif; }
                    </style>
                </head>
                <body>
                    <div class="info">
                        <h2>DICOM Image ${this.currentIndex + 1}</h2>
                        <p>Exported: ${new Date().toLocaleString()}</p>
                    </div>
                    <canvas id="printCanvas"></canvas>
                    <script>
                        const canvas = document.getElementById('printCanvas');
                        const ctx = canvas.getContext('2d');
                        const img = new Image();
                        img.onload = function() {
                            canvas.width = img.width;
                            canvas.height = img.height;
                            ctx.drawImage(img, 0, 0);
                            window.print();
                        };
                        img.src = '${canvas.toDataURL()}';
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    }

    nextImage() {
        if (this.currentIndex < this.currentImageIds.length - 1) {
            this.displayImage(this.currentIndex + 1);
            this.setActiveImageItem(this.currentIndex);
        }
    }

    previousImage() {
        if (this.currentIndex > 0) {
            this.displayImage(this.currentIndex - 1);
            this.setActiveImageItem(this.currentIndex);
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    showLoading(show) {
        let overlay = document.querySelector('.loading-overlay');
        
        if (show) {
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'loading-overlay';
                overlay.innerHTML = '<div class="loading-spinner"></div>';
                this.element.appendChild(overlay);
            }
            overlay.style.display = 'flex';
        } else {
            if (overlay) {
                overlay.style.display = 'none';
            }
        }
    }
}

// Initialize the DICOM viewer when the page loads
let dicomViewer;

document.addEventListener('DOMContentLoaded', () => {
    dicomViewer = new DicomViewer();
});

// Handle drag and drop
document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('dicomViewer');
    
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = 'rgba(74, 158, 255, 0.1)';
    });
    
    dropZone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = '';
    });
    
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.backgroundColor = '';
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const fileInput = document.getElementById('fileInput');
            fileInput.files = files;
            fileInput.dispatchEvent(new Event('change'));
        }
    });
});