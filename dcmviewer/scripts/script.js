class DicomViewer {
    constructor() {
        this.currentImageIds = [];
        this.currentIndex = 0;
        this.element = null;
        this.isViewerInitialized = false;
        this.tools = {};
        this.measurements = [];
        this.annotations = [];
        this.currentTool = 'windowLevel';
        
        this.init();
    }

    init() {
        // Initialize Cornerstone
        cornerstone.enable(document.getElementById('dicomViewer'));
        this.element = document.getElementById('dicomViewer');
        
        // Initialize WADO Image Loader
        if (typeof cornerstoneWADOImageLoader !== 'undefined') {
            cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
            cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
            cornerstoneWADOImageLoader.configure({
                useWebWorkers: true,
                decodeConfig: {
                    convertFloatPixelDataToInt: false
                }
            });
        }

        // Initialize Cornerstone Tools if available
        if (typeof cornerstoneTools !== 'undefined') {
            cornerstoneTools.external.cornerstone = cornerstone;
            cornerstoneTools.init();
            
            // Add basic tools
            cornerstoneTools.addTool(cornerstoneTools.WwwcTool);
            cornerstoneTools.addTool(cornerstoneTools.PanTool);
            cornerstoneTools.addTool(cornerstoneTools.ZoomTool);
            
            // Add measurement tools
            cornerstoneTools.addTool(cornerstoneTools.LengthTool);
            cornerstoneTools.addTool(cornerstoneTools.RectangleRoiTool);
            cornerstoneTools.addTool(cornerstoneTools.AngleTool);
            cornerstoneTools.addTool(cornerstoneTools.ProbeTool);
            
            // Add annotation tools
            cornerstoneTools.addTool(cornerstoneTools.TextMarkerTool);
            cornerstoneTools.addTool(cornerstoneTools.ArrowAnnotateTool);
            cornerstoneTools.addTool(cornerstoneTools.FreehandRoiTool);
            
            // Set initial tool
            cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 1 });
            
            // Setup measurement event listeners
            this.setupMeasurementEvents();
        }

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
        if (typeof cornerstoneTools === 'undefined') return;

        // Listen for measurement events
        this.element.addEventListener('cornerstonetoolsmeasurementadded', (e) => {
            this.onMeasurementAdded(e);
        });

        this.element.addEventListener('cornerstonetoolsmeasurementmodified', (e) => {
            this.onMeasurementModified(e);
        });

        this.element.addEventListener('cornerstonetoolsmeasurementremoved', (e) => {
            this.onMeasurementRemoved(e);
        });
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
        const fileArray = Array.from(files);
        const validFiles = fileArray.filter(file => this.isDicomFile(file));
        
        if (validFiles.length === 0) {
            alert('No valid DICOM files selected.');
            return;
        }

        this.showLoading(true);
        
        try {
            const imageIds = await this.loadDicomFiles(validFiles);
            this.currentImageIds = imageIds;
            this.updateImageList(validFiles);
            
            if (imageIds.length > 0) {
                await this.displayImage(0);
            }
        } catch (error) {
            console.error('Error loading DICOM files:', error);
            alert('Error loading DICOM files. Please check the console for details.');
        } finally {
            this.showLoading(false);
        }
    }

    async loadDicomFiles(files) {
        const imageIds = [];
        
        for (const file of files) {
            try {
                const arrayBuffer = await this.fileToArrayBuffer(file);
                const imageId = cornerstoneWADOImageLoader.wadouri.fileManager.add(file);
                imageIds.push(imageId);
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

    updateImageList(files) {
        const imageList = document.getElementById('imageList');
        imageList.innerHTML = '';
        
        files.forEach((file, index) => {
            const item = document.createElement('div');
            item.className = 'image-item';
            item.innerHTML = `
                <div class="filename">${file.name}</div>
                <div class="details">Size: ${this.formatFileSize(file.size)}</div>
            `;
            
            item.addEventListener('click', () => {
                this.displayImage(index);
                this.setActiveImageItem(index);
            });
            
            imageList.appendChild(item);
        });
        
        if (files.length > 0) {
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
            
            const image = await cornerstone.loadImage(imageId);
            
            // Hide placeholder
            const placeholder = this.element.querySelector('.viewer-placeholder');
            if (placeholder) {
                placeholder.style.display = 'none';
            }
            
            cornerstone.displayImage(this.element, image);
            
            // Enable viewport if not already done
            if (!this.isViewerInitialized) {
                cornerstone.enable(this.element);
                this.isViewerInitialized = true;
            }
            
            // Update image info
            this.updateImageInfo(image, index);
            this.updateDicomTags(imageId);
            
        } catch (error) {
            console.error('Error displaying image:', error);
            alert('Error displaying image. Please check the console for details.');
        }
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
        
        if (typeof cornerstoneTools !== 'undefined' && this.element) {
            // Disable all tools first
            cornerstoneTools.setToolPassive('Wwwc');
            cornerstoneTools.setToolPassive('Pan');
            cornerstoneTools.setToolPassive('Zoom');
            cornerstoneTools.setToolPassive('Length');
            cornerstoneTools.setToolPassive('RectangleRoi');
            cornerstoneTools.setToolPassive('Angle');
            cornerstoneTools.setToolPassive('Probe');
            cornerstoneTools.setToolPassive('TextMarker');
            cornerstoneTools.setToolPassive('ArrowAnnotate');
            cornerstoneTools.setToolPassive('FreehandRoi');
            
            this.currentTool = tool;
            
            switch (tool) {
                case 'windowLevel':
                    cornerstoneTools.setToolActive('Wwwc', { mouseButtonMask: 1 });
                    document.getElementById('windowLevelTool').classList.add('active');
                    break;
                case 'pan':
                    cornerstoneTools.setToolActive('Pan', { mouseButtonMask: 1 });
                    document.getElementById('panTool').classList.add('active');
                    break;
                case 'zoom':
                    cornerstoneTools.setToolActive('Zoom', { mouseButtonMask: 1 });
                    document.getElementById('zoomTool').classList.add('active');
                    break;
                case 'length':
                    cornerstoneTools.setToolActive('Length', { mouseButtonMask: 1 });
                    document.getElementById('lengthTool').classList.add('active');
                    break;
                case 'area':
                    cornerstoneTools.setToolActive('RectangleRoi', { mouseButtonMask: 1 });
                    document.getElementById('areaTool').classList.add('active');
                    break;
                case 'angle':
                    cornerstoneTools.setToolActive('Angle', { mouseButtonMask: 1 });
                    document.getElementById('angleTool').classList.add('active');
                    break;
                case 'probe':
                    cornerstoneTools.setToolActive('Probe', { mouseButtonMask: 1 });
                    document.getElementById('pixelProbeTool').classList.add('active');
                    break;
                case 'textMarker':
                    cornerstoneTools.setToolActive('TextMarker', { mouseButtonMask: 1 });
                    document.getElementById('textAnnotationTool').classList.add('active');
                    break;
                case 'arrowAnnotate':
                    cornerstoneTools.setToolActive('ArrowAnnotate', { mouseButtonMask: 1 });
                    document.getElementById('arrowAnnotationTool').classList.add('active');
                    break;
                case 'freehandRoi':
                    cornerstoneTools.setToolActive('FreehandRoi', { mouseButtonMask: 1 });
                    document.getElementById('freehandTool').classList.add('active');
                    break;
            }
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