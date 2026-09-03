/**
 * Meta Spin Studio - Pure Vanilla JavaScript Implementation
 * 100% Client-side high-precision 3:4 image conversion engine.
 * Zero server dependencies. Runs completely offline in the browser.
 */

// --- Constants & Output Presets ---
const OUTPUT_PRESETS = [
  {
    id: 'standard-3024',
    label: '3024 × 4032 (Recommended)',
    description: 'Original high-resolution 3:4 portrait (12 MP standard)',
    width: 3024,
    height: 4032,
    aspectRatio: '3:4',
  },
  {
    id: 'half-1512',
    label: '1512 × 2016 (Optimized)',
    description: 'Fast mobile upload, smaller storage footprint',
    width: 1512,
    height: 2016,
    aspectRatio: '3:4',
  },
  {
    id: 'web-1080',
    label: '1080 × 1440 (Web Standard)',
    description: 'Standard web & social viewing size',
    width: 1080,
    height: 1440,
    aspectRatio: '3:4',
  },
];

// --- Application State ---
const state = {
  theme: localStorage.getItem('meta-spin-theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  step: 'upload', // 'upload' | 'edit' | 'success'
  activeImage: null, // { name, size, width, height, dataUrl, normalizedCanvas, exifData, exifOrientation, hasGps, cameraMake, cameraModel }
  transform: {
    zoom: 1.0,
    xOffset: 0,
    yOffset: 0,
    rotation: 0,
  },
  selectedPreset: OUTPUT_PRESETS[0],
  quality: 0.95,
  removeOriginalMetadata: true,
  removeLocationData: true,
  processedResult: null, // { blob, objectUrl, filename, width, height, fileSizeBytes, quality, statusMessage }
  showGrid: true,
  isDragging: false,
  dragStart: { x: 0, y: 0 },
  startOffset: { x: 0, y: 0 },
};

let loadedImageObj = null;

// --- One-time Browser Auto-Orientation Detector ---
let browserAutoOrientsCache = null;

async function checkBrowserAutoOrientation() {
  if (browserAutoOrientsCache !== null) return browserAutoOrientsCache;
  // Minimal 2x1 JPEG with EXIF Orientation = 6 (Rotate 90 CW)
  // If the browser natively respects EXIF orientation, decoded image dimensions will be 1x2.
  const testBase64 = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAIBASIA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      browserAutoOrientsCache = (img.naturalWidth === 1 && img.naturalHeight === 2);
      resolve(browserAutoOrientsCache);
    };
    img.onerror = () => {
      browserAutoOrientsCache = false;
      resolve(false);
    };
    img.src = testBase64;
  });
}

// --- Parse EXIF Orientation Directly from Binary ArrayBuffer ---
function parseExifOrientationFromArrayBuffer(arrayBuffer) {
  try {
    const view = new DataView(arrayBuffer);
    // Check JPEG SOI marker (0xFF, 0xD8)
    if (view.getUint16(0, false) !== 0xFFD8) {
      return 1; // Not a JPEG
    }
    const len = view.byteLength;
    let offset = 2;
    while (offset < len) {
      const marker = view.getUint16(offset, false);
      if (marker === 0xFFE1) {
        // APP1 Marker (EXIF)
        const app1Len = view.getUint16(offset + 2, false);
        const exifHeader = view.getUint32(offset + 4, false);
        if (exifHeader === 0x45786966) { // "Exif\0\0"
          const tiffStart = offset + 10;
          const endianness = view.getUint16(tiffStart, false);
          const littleEndian = endianness === 0x4949; // 'II' for Intel (little endian), 'MM' for Motorola
          const ifdOffset = view.getUint32(tiffStart + 4, littleEndian);
          const numEntries = view.getUint16(tiffStart + ifdOffset, littleEndian);
          for (let i = 0; i < numEntries; i++) {
            const entryOffset = tiffStart + ifdOffset + 2 + (i * 12);
            if (entryOffset + 12 > len) break;
            const tag = view.getUint16(entryOffset, littleEndian);
            if (tag === 0x0112) { // Orientation tag
              const val = view.getUint16(entryOffset + 8, littleEndian);
              if (val >= 1 && val <= 8) return val;
            }
          }
        }
        offset += 2 + app1Len;
      } else if (marker >= 0xFFE0 && marker <= 0xFFEF) {
        // Skip other application markers
        const markerLen = view.getUint16(offset + 2, false);
        offset += 2 + markerLen;
      } else if (marker === 0xFFDA) {
        // Start of Scan
        break;
      } else {
        offset += 1;
      }
    }
  } catch (err) {
    // Non-fatal, fallback to standard orientation
  }
  return 1;
}

// --- Theme Management ---
function applyTheme(theme) {
  state.theme = theme;
  localStorage.setItem('meta-spin-theme', theme);
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  const themeIcon = document.getElementById('theme-icon-container');
  if (themeIcon) {
    themeIcon.innerHTML = theme === 'dark' 
      ? '<svg class="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>'
      : '<svg class="w-4 h-4 text-neutral-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
  }
}

// Format bytes
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

// Format date for EXIF: "YYYY:MM:DD HH:MM:SS"
function formatExifDate(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}:${pad(date.getMonth() + 1)}:${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

// Generate unique timestamped output filename
function generateOutputFilename() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const YYYY = now.getFullYear();
  const MM = pad(now.getMonth() + 1);
  const DD = pad(now.getDate());
  const HH = pad(now.getHours());
  const mm = pad(now.getMinutes());
  const SS = pad(now.getSeconds());
  return `meta-spin-photo-${YYYY}${MM}${DD}-${HH}${mm}${SS}.jpg`;
}

// Convert DataURL to Blob
function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const binaryStr = atob(parts[1]);
  const len = binaryStr.length;
  const u8arr = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    u8arr[i] = binaryStr.charCodeAt(i);
  }
  return new Blob([u8arr], { type: mime });
}

// Switch Views
function showView(viewId) {
  state.step = viewId;
  document.getElementById('view-upload').classList.toggle('hidden', viewId !== 'upload');
  document.getElementById('view-edit').classList.toggle('hidden', viewId !== 'edit');
  document.getElementById('view-success').classList.toggle('hidden', viewId !== 'success');

  const clearBtn = document.getElementById('header-clear-btn');
  if (clearBtn) {
    clearBtn.style.display = state.activeImage ? 'inline-flex' : 'none';
  }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Processing modal
function showProcessingModal(show, text = 'Preparing 3:4 portrait...') {
  let modal = document.getElementById('processing-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'processing-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs';
    modal.innerHTML = `
      <div class="w-full max-w-sm rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 shadow-2xl text-center">
        <div class="w-12 h-12 mx-auto rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center mb-3 animate-spin">
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
        </div>
        <h3 class="text-base font-bold text-neutral-900 dark:text-white mb-1">Preparing your photo</h3>
        <p id="processing-status" class="text-xs text-neutral-500 dark:text-neutral-400">Processing locally in browser...</p>
      </div>
    `;
    document.body.appendChild(modal);
  }
  const statusP = document.getElementById('processing-status');
  if (statusP) statusP.innerText = text;
  modal.style.display = show ? 'flex' : 'none';
}

// --- Normalize Image Orientation to Upright Canvas ---
async function createNormalizedImageCanvas(imgElement, orientation) {
  const autoOrients = await checkBrowserAutoOrientation();

  // If the browser already natively auto-orients, or orientation is 1, draw standard
  const srcW = imgElement.naturalWidth || imgElement.width;
  const srcH = imgElement.naturalHeight || imgElement.height;

  // Determine if manual transformation is needed
  const needsTransform = !autoOrients && orientation > 1 && orientation <= 8;

  const isSwapped = needsTransform && (orientation === 5 || orientation === 6 || orientation === 7 || orientation === 8);
  const outW = isSwapped ? srcH : srcW;
  const outH = isSwapped ? srcW : srcH;

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d', { colorSpace: 'srgb' });
  if (!ctx) return null;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (!needsTransform) {
    ctx.drawImage(imgElement, 0, 0);
  } else {
    // Explicit transformation for EXIF orientations 1 through 8
    switch (orientation) {
      case 2:
        // Horizontal flip
        ctx.translate(srcW, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(imgElement, 0, 0);
        break;
      case 3:
        // Rotate 180 deg
        ctx.translate(srcW, srcH);
        ctx.rotate(Math.PI);
        ctx.drawImage(imgElement, 0, 0);
        break;
      case 4:
        // Vertical flip
        ctx.translate(0, srcH);
        ctx.scale(1, -1);
        ctx.drawImage(imgElement, 0, 0);
        break;
      case 5:
        // Transpose (flip horizontal + rotate 270 CW)
        ctx.translate(srcH, srcW);
        ctx.rotate(0.5 * Math.PI);
        ctx.scale(1, -1);
        ctx.drawImage(imgElement, 0, 0);
        break;
      case 6:
        // Rotate 90 CW (standard portrait photo taken on phone held right-side up)
        ctx.translate(srcH, 0);
        ctx.rotate(0.5 * Math.PI);
        ctx.drawImage(imgElement, 0, 0);
        break;
      case 7:
        // Transverse (flip horizontal + rotate 90 CW)
        ctx.rotate(0.5 * Math.PI);
        ctx.scale(-1, 1);
        ctx.drawImage(imgElement, 0, 0);
        break;
      case 8:
        // Rotate 270 CW (90 CCW)
        ctx.translate(0, srcW);
        ctx.rotate(-0.5 * Math.PI);
        ctx.drawImage(imgElement, 0, 0);
        break;
      default:
        ctx.drawImage(imgElement, 0, 0);
        break;
    }
  }

  return canvas;
}

// --- Load Image File (JPG, PNG, WEBP) with Real Orientation Correction ---
async function handleImageFile(file) {
  if (!file) return;

  // Validate format
  const validMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name);
  if (!isImage) {
    alert('This file format is not supported. Please upload a JPG, PNG, or WEBP image.');
    return;
  }

  if (file.size > 30 * 1024 * 1024) {
    alert('Please upload an image smaller than 30 MB for safe browser processing.');
    return;
  }

  showProcessingModal(true, 'Reading and correcting photo orientation...');

  try {
    const arrayBuffer = await file.arrayBuffer();
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Detect EXIF orientation
    let exifOrientation = parseExifOrientationFromArrayBuffer(arrayBuffer);
    let exifData = null;
    let hasGps = false;
    let cameraMake = null;
    let cameraModel = null;

    if (typeof piexif !== 'undefined' && (file.type.includes('jpeg') || file.name.match(/\.jpe?g$/i))) {
      try {
        exifData = piexif.load(dataUrl);
        const zeroth = exifData['0th'] || {};
        const gps = exifData['GPS'] || {};
        hasGps = Object.keys(gps).length > 0;
        cameraMake = zeroth[piexif.ImageIFD.Make] ? String(zeroth[piexif.ImageIFD.Make]).trim() : null;
        cameraModel = zeroth[piexif.ImageIFD.Model] ? String(zeroth[piexif.ImageIFD.Model]).trim() : null;
        if (zeroth[piexif.ImageIFD.Orientation]) {
          exifOrientation = Number(zeroth[piexif.ImageIFD.Orientation]);
        }
      } catch (e) {
        // non-fatal
      }
    }

    // Decode image safely
    const rawImg = new Image();
    await new Promise((resolve, reject) => {
      rawImg.onload = resolve;
      rawImg.onerror = () => reject(new Error('Could not decode image binary.'));
      rawImg.src = dataUrl;
    });

    // Generate normalized upright canvas
    const normalizedCanvas = await createNormalizedImageCanvas(rawImg, exifOrientation);
    if (!normalizedCanvas) {
      throw new Error('Failed to create normalized image canvas.');
    }

    // Clean up previous image state
    if (state.activeImage && state.activeImage.objectUrl && state.activeImage.objectUrl.startsWith('blob:')) {
      URL.revokeObjectURL(state.activeImage.objectUrl);
    }

    state.activeImage = {
      name: file.name,
      size: file.size,
      width: normalizedCanvas.width,
      height: normalizedCanvas.height,
      dataUrl,
      objectUrl: dataUrl,
      normalizedCanvas,
      exifData,
      exifOrientation,
      hasGps,
      cameraMake,
      cameraModel,
    };

    state.transform = { zoom: 1.0, xOffset: 0, yOffset: 0, rotation: 0 };
    loadedImageObj = normalizedCanvas;

    // Update metadata chip in editor
    const fileNameEl = document.getElementById('editor-filename');
    const fileMetaEl = document.getElementById('editor-dimensions');
    if (fileNameEl) fileNameEl.innerText = file.name;
    if (fileMetaEl) fileMetaEl.innerText = `${normalizedCanvas.width}×${normalizedCanvas.height}`;

    const zoomRange = document.getElementById('zoom-range');
    const zoomVal = document.getElementById('zoom-value');
    if (zoomRange) zoomRange.value = '1.0';
    if (zoomVal) zoomVal.innerText = '1.00×';

    showProcessingModal(false);
    showView('edit');
    initCropCanvas();
  } catch (err) {
    console.error(err);
    showProcessingModal(false);
    alert('This image could not be loaded safely. Please check the file and try again.');
  }
}

// Generate sample portrait photo
function createSampleCanvas(horizontal = false) {
  const width = horizontal ? 4032 : 3024;
  const height = horizontal ? 3024 : 4032;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { colorSpace: 'srgb' });
  if (!ctx) return null;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#1e293b');
  grad.addColorStop(0.5, '#0f172a');
  grad.addColorStop(1, '#020617');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Decorative ambient lights
  const sunGrad = ctx.createRadialGradient(width * 0.5, height * 0.35, 50, width * 0.5, height * 0.35, 700);
  sunGrad.addColorStop(0, 'rgba(245, 158, 11, 0.7)');
  sunGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.35)');
  sunGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sunGrad;
  ctx.fillRect(0, 0, width, height);

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 4;
  for (let x = 0; x < width; x += 200) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += 200) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // Sample badge in center
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 120px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('META SPIN STUDIO', width / 2, height * 0.48);

  ctx.fillStyle = '#10b981';
  ctx.font = 'bold 64px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(`${width} × ${height} • ${horizontal ? 'Landscape Input Sample' : '3:4 Portrait Sample'}`, width / 2, height * 0.53);

  return canvas;
}

// Load sample photo
function loadSample(storyTrigger = false) {
  showProcessingModal(true, 'Loading sample photo...');

  setTimeout(async () => {
    try {
      const sampleCanvas = createSampleCanvas(false);
      const dataUrl = sampleCanvas.toDataURL('image/jpeg', 0.95);

      state.activeImage = {
        name: 'sample-portrait-photo.jpg',
        size: 850000,
        width: 3024,
        height: 4032,
        dataUrl,
        objectUrl: dataUrl,
        normalizedCanvas: sampleCanvas,
        exifData: null,
        exifOrientation: 1,
        hasGps: false,
        cameraMake: 'Studio Portrait Profile',
        cameraModel: '3:4 Aspect Framing',
      };
      state.transform = { zoom: 1.0, xOffset: 0, yOffset: 0, rotation: 0 };
      loadedImageObj = sampleCanvas;

      const fileNameEl = document.getElementById('editor-filename');
      const fileMetaEl = document.getElementById('editor-dimensions');
      if (fileNameEl) fileNameEl.innerText = 'sample-portrait-photo.jpg';
      if (fileMetaEl) fileMetaEl.innerText = '3024×4032';

      const zoomRange = document.getElementById('zoom-range');
      const zoomVal = document.getElementById('zoom-value');
      if (zoomRange) zoomRange.value = '1.0';
      if (zoomVal) zoomVal.innerText = '1.00×';

      showProcessingModal(false);
      showView('edit');
      initCropCanvas();

      if (storyTrigger) {
        setTimeout(() => {
          handleExecuteProcessing(true);
        }, 350);
      }
    } catch (err) {
      showProcessingModal(false);
      console.error(err);
    }
  }, 100);
}

// --- Interactive 3:4 Crop Canvas ---
function initCropCanvas() {
  const canvas = document.getElementById('preview-canvas');
  if (!canvas || !loadedImageObj) return;

  drawCropPreview();

  const viewport = document.getElementById('crop-viewport');
  if (!viewport || viewport.dataset.initialized) return;
  viewport.dataset.initialized = 'true';

  // Multi-pointer map for smooth 1-finger drag and 2-finger pinch-to-zoom
  const activePointers = new Map();
  let initialPinchDistance = 0;
  let initialPinchZoom = 1.0;

  viewport.addEventListener('pointerdown', (e) => {
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointers.size === 1) {
      state.isDragging = true;
      state.dragStart = { x: e.clientX, y: e.clientY };
      state.startOffset = { x: state.transform.xOffset, y: state.transform.yOffset };
    } else if (activePointers.size === 2) {
      state.isDragging = false;
      const pts = Array.from(activePointers.values());
      initialPinchDistance = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      initialPinchZoom = state.transform.zoom;
    }
    viewport.setPointerCapture(e.pointerId);
  });

  viewport.addEventListener('pointermove', (e) => {
    if (!activePointers.has(e.pointerId)) return;
    activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointers.size === 1 && state.isDragging) {
      const dx = e.clientX - state.dragStart.x;
      const dy = e.clientY - state.dragStart.y;
      state.transform.xOffset = state.startOffset.x + dx;
      state.transform.yOffset = state.startOffset.y + dy;
      drawCropPreview();
    } else if (activePointers.size === 2 && initialPinchDistance > 0) {
      const pts = Array.from(activePointers.values());
      const currentDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const pinchRatio = currentDist / initialPinchDistance;
      const newZoom = Math.min(Math.max(1.0, initialPinchZoom * pinchRatio), 4.0);
      state.transform.zoom = newZoom;
      const zoomRange = document.getElementById('zoom-range');
      const zoomVal = document.getElementById('zoom-value');
      if (zoomRange) zoomRange.value = newZoom.toFixed(2);
      if (zoomVal) zoomVal.innerText = `${newZoom.toFixed(2)}×`;
      drawCropPreview();
    }
  });

  const handlePointerEnd = (e) => {
    activePointers.delete(e.pointerId);
    if (activePointers.size < 2) {
      initialPinchDistance = 0;
    }
    if (activePointers.size === 0) {
      state.isDragging = false;
    } else if (activePointers.size === 1) {
      const remaining = Array.from(activePointers.values())[0];
      state.isDragging = true;
      state.dragStart = { x: remaining.x, y: remaining.y };
      state.startOffset = { x: state.transform.xOffset, y: state.transform.yOffset };
    }
  };

  viewport.addEventListener('pointerup', handlePointerEnd);
  viewport.addEventListener('pointercancel', handlePointerEnd);

  // Wheel zoom
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.002;
    state.transform.zoom = Math.min(Math.max(1.0, state.transform.zoom + delta), 4.0);
    const zoomRange = document.getElementById('zoom-range');
    const zoomVal = document.getElementById('zoom-value');
    if (zoomRange) zoomRange.value = state.transform.zoom.toFixed(2);
    if (zoomVal) zoomVal.innerText = `${state.transform.zoom.toFixed(2)}×`;
    drawCropPreview();
  }, { passive: false });

  // Redraw preview on container resize
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => {
      drawCropPreview();
    });
    ro.observe(viewport);
  }
}

function drawCropPreview() {
  const canvas = document.getElementById('preview-canvas');
  if (!canvas || !loadedImageObj) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = rect.width || 360;
  const h = rect.height || 480;

  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d', { colorSpace: 'srgb' });
  if (!ctx) return;

  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Neutral background
  ctx.fillStyle = '#0a0a0c';
  ctx.fillRect(0, 0, w, h);

  const srcW = loadedImageObj.width;
  const srcH = loadedImageObj.height;

  // Swap effective width/height when rotated 90 or 270 degrees
  const isRotatedQuarter = state.transform.rotation === 90 || state.transform.rotation === 270;
  const effW = isRotatedQuarter ? srcH : srcW;
  const effH = isRotatedQuarter ? srcW : srcH;

  // Mathematically exact 3:4 framing (cover mode: fills 3:4 canvas completely without distortion)
  const scaleX = w / effW;
  const scaleY = h / effH;
  const baseScale = Math.max(scaleX, scaleY);
  const finalScale = baseScale * state.transform.zoom;

  const drawW = srcW * finalScale;
  const drawH = srcH * finalScale;

  ctx.save();
  ctx.translate(w / 2 + state.transform.xOffset, h / 2 + state.transform.yOffset);
  if (state.transform.rotation !== 0) {
    ctx.rotate((state.transform.rotation * Math.PI) / 180);
  }
  ctx.drawImage(loadedImageObj, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
}

// --- Binary JPEG Validation Engine ---
async function validateJpegBlob(blob, expectedWidth, expectedHeight) {
  if (!blob || !(blob instanceof Blob)) {
    return { valid: false, error: 'Output validation failed: No file data generated.' };
  }
  if (blob.type !== 'image/jpeg') {
    return { valid: false, error: `Output validation failed: Expected image/jpeg but received ${blob.type}.` };
  }
  if (blob.size < 1000) {
    return { valid: false, error: `Output validation failed: File size too small (${blob.size} bytes).` };
  }

  // Verify JPEG binary SOI marker (0xFF, 0xD8)
  try {
    const headSlice = await blob.slice(0, 2).arrayBuffer();
    const headView = new DataView(headSlice);
    if (headView.getUint16(0, false) !== 0xFFD8) {
      return { valid: false, error: 'Output validation failed: File lacks standard JPEG SOI marker.' };
    }
  } catch (err) {
    return { valid: false, error: 'Output validation failed: Unable to parse JPEG header.' };
  }

  // Re-decode the generated JPEG binary
  const testUrl = URL.createObjectURL(blob);
  try {
    const decoded = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error('Generated JPEG binary could not be decoded by the browser.'));
      img.src = testUrl;
    });

    if (decoded.width !== expectedWidth || decoded.height !== expectedHeight) {
      return {
        valid: false,
        error: `Output dimension mismatch: Expected ${expectedWidth}×${expectedHeight} px, but decoded ${decoded.width}×${decoded.height} px.`,
      };
    }

    return { valid: true, width: decoded.width, height: decoded.height, size: blob.size };
  } catch (err) {
    return { valid: false, error: err.message || 'Validation failed: Re-decoding failed.' };
  } finally {
    URL.revokeObjectURL(testUrl);
  }
}

// --- Execute High-Resolution 3:4 Processing Pipeline ---
async function handleExecuteProcessing(triggerStory = false) {
  if (!state.activeImage || !loadedImageObj) return;

  showProcessingModal(true, 'Rendering high-resolution 3:4 portrait...');

  setTimeout(async () => {
    try {
      const targetW = state.selectedPreset.width;
      const targetH = state.selectedPreset.height;

      const previewEl = document.getElementById('preview-canvas');
      const previewRect = previewEl ? previewEl.getBoundingClientRect() : null;
      const previewW = (previewRect && previewRect.width > 0) ? previewRect.width : 360;
      const previewH = (previewRect && previewRect.height > 0) ? previewRect.height : 480;

      // Scale multiplier between preview viewport coordinates and high-res target canvas
      const scaleFactor = targetW / previewW;

      const srcW = loadedImageObj.width;
      const srcH = loadedImageObj.height;

      const isRotatedQuarter = state.transform.rotation === 90 || state.transform.rotation === 270;
      const effW = isRotatedQuarter ? srcH : srcW;
      const effH = isRotatedQuarter ? srcW : srcH;

      // Mathematically identical composition
      const targetBaseScale = Math.max(targetW / effW, targetH / effH);
      const targetFinalScale = targetBaseScale * state.transform.zoom;

      const targetDrawW = srcW * targetFinalScale;
      const targetDrawH = srcH * targetFinalScale;
      const targetXOffset = state.transform.xOffset * scaleFactor;
      const targetYOffset = state.transform.yOffset * scaleFactor;

      // Create target canvas at exact dimensions
      let exportCanvas;
      let ctx;

      if (typeof OffscreenCanvas !== 'undefined') {
        try {
          exportCanvas = new OffscreenCanvas(targetW, targetH);
          ctx = exportCanvas.getContext('2d', { colorSpace: 'srgb', willReadFrequently: false });
        } catch {
          exportCanvas = document.createElement('canvas');
          exportCanvas.width = targetW;
          exportCanvas.height = targetH;
          ctx = exportCanvas.getContext('2d', { colorSpace: 'srgb' });
        }
      } else {
        exportCanvas = document.createElement('canvas');
        exportCanvas.width = targetW;
        exportCanvas.height = targetH;
        ctx = exportCanvas.getContext('2d', { colorSpace: 'srgb' });
      }

      if (!ctx) {
        throw new Error('This image resolution is too large for this browser to process safely. Try a smaller preset.');
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Solid neutral background (no transparent edges)
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, targetW, targetH);

      // Render transformed image onto full-resolution canvas
      ctx.save();
      ctx.translate(targetW / 2 + targetXOffset, targetH / 2 + targetYOffset);
      if (state.transform.rotation !== 0) {
        ctx.rotate((state.transform.rotation * Math.PI) / 180);
      }
      ctx.drawImage(loadedImageObj, -targetDrawW / 2, -targetDrawH / 2, targetDrawW, targetDrawH);
      ctx.restore();

      showProcessingModal(true, 'Encoding JPEG & applying privacy metadata...');

      // Encode Canvas to JPEG Blob
      let rawBlob;
      if (exportCanvas instanceof OffscreenCanvas) {
        rawBlob = await exportCanvas.convertToBlob({
          type: 'image/jpeg',
          quality: state.quality,
        });
      } else {
        rawBlob = await new Promise((resolve, reject) => {
          exportCanvas.toBlob(
            (b) => (b ? resolve(b) : reject(new Error('Canvas toBlob failed.'))),
            'image/jpeg',
            state.quality
          );
        });
      }

      // Metadata & Privacy Processing with piexif
      let finalBlob = rawBlob;
      let statusMessage = '';

      if (typeof piexif !== 'undefined') {
        try {
          const rawDataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(rawBlob);
          });

          let exifObj = { '0th': {}, Exif: {}, GPS: {}, Interop: {}, '1st': {} };

          // If user chose to retain hardware info and we have source exif
          if (!state.removeOriginalMetadata && state.activeImage.exifData) {
            try {
              exifObj = JSON.parse(JSON.stringify(state.activeImage.exifData));
            } catch {
              // fallback
            }
          }

          exifObj['0th'] = exifObj['0th'] || {};
          exifObj['Exif'] = exifObj['Exif'] || {};
          exifObj['GPS'] = exifObj['GPS'] || {};
          exifObj['Interop'] = exifObj['Interop'] || {};
          exifObj['1st'] = exifObj['1st'] || {};

          // Standard baseline properties: normalized orientation is 1 (upright)
          exifObj['0th'][piexif.ImageIFD.Orientation] = 1;
          exifObj['0th'][piexif.ImageIFD.XResolution] = [72, 1];
          exifObj['0th'][piexif.ImageIFD.YResolution] = [72, 1];
          exifObj['0th'][piexif.ImageIFD.ResolutionUnit] = 2; // inches
          exifObj['0th'][piexif.ImageIFD.Software] = 'Meta Spin Studio';

          // sRGB standard color space
          exifObj['Exif'][piexif.ExifIFD.ColorSpace] = 1; // 1 = sRGB
          exifObj['Exif'][piexif.ExifIFD.PixelXDimension] = targetW;
          exifObj['Exif'][piexif.ExifIFD.PixelYDimension] = targetH;
          exifObj['Exif'][piexif.ExifIFD.ExifVersion] = '0231';

          const now = new Date();
          const nowStr = formatExifDate(now);
          if (!exifObj['0th'][piexif.ImageIFD.DateTime]) {
            exifObj['0th'][piexif.ImageIFD.DateTime] = nowStr;
          }

          // Strip Location Data (GPS)
          if (state.removeLocationData) {
            exifObj['GPS'] = {};
          }

          // Strip Hardware Serial Numbers and maker notes
          if (state.removeOriginalMetadata) {
            delete exifObj['Exif'][piexif.ExifIFD.MakerNote];
            delete exifObj['Exif'][0xa431]; // BodySerialNumber
            delete exifObj['Exif'][0xa432]; // LensSpecification
            delete exifObj['Exif'][0xa433]; // LensMake
            delete exifObj['Exif'][0xa434]; // LensModel
            delete exifObj['Exif'][0xa435]; // LensSerialNumber
            delete exifObj['0th'][0xc62f]; // CameraSerialNumber
          }

          let exifBytes;
          try {
            exifBytes = piexif.dump(exifObj);
          } catch {
            // Fallback to guaranteed minimal safe EXIF
            const safeObj = {
              '0th': {
                [piexif.ImageIFD.Orientation]: 1,
                [piexif.ImageIFD.XResolution]: [72, 1],
                [piexif.ImageIFD.YResolution]: [72, 1],
                [piexif.ImageIFD.ResolutionUnit]: 2,
                [piexif.ImageIFD.Software]: 'Meta Spin Studio',
                [piexif.ImageIFD.DateTime]: nowStr,
              },
              Exif: {
                [piexif.ExifIFD.ColorSpace]: 1,
                [piexif.ExifIFD.PixelXDimension]: targetW,
                [piexif.ExifIFD.PixelYDimension]: targetH,
                [piexif.ExifIFD.ExifVersion]: '0231',
              },
              GPS: {},
              Interop: {},
              '1st': {},
            };
            exifBytes = piexif.dump(safeObj);
          }

          const modifiedDataUrl = piexif.insert(exifBytes, rawDataUrl);
          finalBlob = dataUrlToBlob(modifiedDataUrl);

          statusMessage = state.removeLocationData
            ? 'Location data (GPS) stripped. Normalized to standard 3:4 portrait JPEG.'
            : 'Formatted to 3:4 portrait JPEG with camera metadata preserved.';
        } catch (exifErr) {
          console.warn('Metadata processing note:', exifErr);
          statusMessage = 'Processed to 3:4 portrait JPEG. Some metadata fields could not be embedded in this browser.';
          finalBlob = rawBlob;
        }
      } else {
        statusMessage = 'Formatted to standard 3:4 portrait JPEG.';
      }

      showProcessingModal(true, 'Validating output JPEG binary and dimensions...');

      // Binary JPEG Validation & Re-decoding Verification
      const validation = await validateJpegBlob(finalBlob, targetW, targetH);
      if (!validation.valid) {
        showProcessingModal(false);
        alert(`Validation check failed: ${validation.error}`);
        return;
      }

      // Revoke previous object URL to prevent memory leaks
      if (state.processedResult && state.processedResult.objectUrl) {
        URL.revokeObjectURL(state.processedResult.objectUrl);
      }

      const finalObjectUrl = URL.createObjectURL(finalBlob);
      const filename = generateOutputFilename();

      state.processedResult = {
        blob: finalBlob,
        objectUrl: finalObjectUrl,
        filename,
        width: targetW,
        height: targetH,
        fileSizeBytes: finalBlob.size,
        quality: state.quality,
        statusMessage,
      };

      // Populate Success View
      const resultImg = document.getElementById('result-image-preview');
      if (resultImg) resultImg.src = finalObjectUrl;

      const overlayRes = document.getElementById('result-overlay-resolution');
      if (overlayRes) overlayRes.innerText = `${targetW} × ${targetH}`;

      const resEl = document.getElementById('result-resolution');
      if (resEl) resEl.innerText = `${targetW} × ${targetH} px`;

      const sizeEl = document.getElementById('result-filesize');
      if (sizeEl) sizeEl.innerText = formatBytes(finalBlob.size);

      const nameEl = document.getElementById('result-filename');
      if (nameEl) nameEl.innerText = filename;

      const msgEl = document.getElementById('result-status-msg');
      if (msgEl) msgEl.innerText = statusMessage;

      showProcessingModal(false);
      showView('success');

      if (typeof confetti !== 'undefined') {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#10b981', '#6366f1', '#f59e0b', '#3b82f6'],
        });
      }

      if (triggerStory) {
        setTimeout(() => {
          handleShareToInstagramStory();
        }, 350);
      }
    } catch (err) {
      console.error(err);
      showProcessingModal(false);
      alert('Could not process photo safely. Please try a smaller resolution preset or verify your browser memory.');
    }
  }, 120);
}

// Download Processed Image
function downloadResultImage() {
  if (!state.processedResult || !state.processedResult.blob) return;
  const objectUrl = URL.createObjectURL(state.processedResult.blob);
  const a = document.createElement('a');
  a.href = objectUrl;
  a.download = state.processedResult.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
}

// Share to Instagram Story
async function handleShareToInstagramStory() {
  if (!state.processedResult || !state.processedResult.blob) return;

  const file = new File([state.processedResult.blob], state.processedResult.filename, {
    type: 'image/jpeg',
  });

  const toast = document.getElementById('share-toast');
  const toastMsg = document.getElementById('share-toast-msg');
  const guide = document.getElementById('story-guide');

  const showToast = (msg) => {
    if (toast && toastMsg) {
      toastMsg.innerText = msg;
      toast.classList.remove('hidden');
    }
  };

  // Copy to clipboard if supported
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/jpeg': state.processedResult.blob }),
      ]);
    }
  } catch {
    // non-fatal
  }

  // Native share sheet if supported
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: '3:4 Portrait Photo',
        text: 'Prepared in 3:4 portrait format with Meta Spin Studio',
      });
      showToast('Share dialog opened! Select Instagram or save to camera roll.');
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }

  // Fallback: download and deep link
  downloadResultImage();

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    window.location.href = 'instagram-stories://share';
    setTimeout(() => {
      window.location.href = 'instagram://camera';
    }, 800);
    setTimeout(() => {
      window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
    }, 1600);
    showToast('Photo saved! Opening Instagram Story camera. Swipe up to pick from camera roll.');
  } else {
    window.open('https://www.instagram.com/stories/create/', '_blank', 'noopener,noreferrer');
    showToast('Photo downloaded! Opening Instagram web story creator.');
  }

  if (guide) guide.classList.remove('hidden');
}

// --- Setup Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(state.theme);

  // Theme toggle
  document.getElementById('toggle-theme-btn')?.addEventListener('click', () => {
    applyTheme(state.theme === 'light' ? 'dark' : 'light');
  });

  // Clear Session
  document.getElementById('header-clear-btn')?.addEventListener('click', () => {
    if (confirm('Clear current photo and start over?')) {
      if (state.activeImage && state.activeImage.objectUrl && state.activeImage.objectUrl.startsWith('blob:')) {
        URL.revokeObjectURL(state.activeImage.objectUrl);
      }
      if (state.processedResult && state.processedResult.objectUrl) {
        URL.revokeObjectURL(state.processedResult.objectUrl);
      }
      state.activeImage = null;
      state.processedResult = null;
      showView('upload');
    }
  });

  // UPLOAD VIEW EVENTS
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');
  const browseBtn = document.getElementById('browse-files-btn');
  const trySampleBtn = document.getElementById('try-sample-btn');
  const heroStoryBtn = document.getElementById('hero-load-sample-story-btn');

  dropZone?.addEventListener('click', () => fileInput?.click());
  browseBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    fileInput?.click();
  });

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
  });

  dropZone?.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-neutral-900', 'dark:border-white');
  });
  dropZone?.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-neutral-900', 'dark:border-white');
  });
  dropZone?.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-neutral-900', 'dark:border-white');
    const file = e.dataTransfer.files?.[0];
    if (file) handleImageFile(file);
  });

  trySampleBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    loadSample(false);
  });
  heroStoryBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    loadSample(false);
  });

  // EDITOR VIEW EVENTS
  document.getElementById('editor-back-btn')?.addEventListener('click', () => {
    showView('upload');
  });

  const zoomRange = document.getElementById('zoom-range');
  const zoomVal = document.getElementById('zoom-value');
  zoomRange?.addEventListener('input', (e) => {
    state.transform.zoom = parseFloat(e.target.value);
    if (zoomVal) zoomVal.innerText = `${state.transform.zoom.toFixed(2)}×`;
    drawCropPreview();
  });

  document.getElementById('btn-fit')?.addEventListener('click', () => {
    state.transform.zoom = 1.0;
    state.transform.xOffset = 0;
    state.transform.yOffset = 0;
    if (zoomRange) zoomRange.value = '1.0';
    if (zoomVal) zoomVal.innerText = '1.00×';
    drawCropPreview();
  });

  document.getElementById('btn-center')?.addEventListener('click', () => {
    state.transform.xOffset = 0;
    state.transform.yOffset = 0;
    drawCropPreview();
  });

  document.getElementById('btn-rotate')?.addEventListener('click', () => {
    state.transform.rotation = (state.transform.rotation + 90) % 360;
    drawCropPreview();
  });

  document.getElementById('btn-reset')?.addEventListener('click', () => {
    state.transform = { zoom: 1.0, xOffset: 0, yOffset: 0, rotation: 0 };
    if (zoomRange) zoomRange.value = '1.0';
    if (zoomVal) zoomVal.innerText = '1.00×';
    drawCropPreview();
  });

  document.getElementById('toggle-grid-btn')?.addEventListener('click', () => {
    state.showGrid = !state.showGrid;
    const grid = document.getElementById('grid-overlay');
    if (grid) grid.style.display = state.showGrid ? 'grid' : 'none';
  });

  // Preset choices
  document.querySelectorAll('.preset-option').forEach((el) => {
    el.addEventListener('click', () => {
      const presetId = el.getAttribute('data-id');
      const found = OUTPUT_PRESETS.find((p) => p.id === presetId);
      if (found) {
        state.selectedPreset = found;
        document.querySelectorAll('.preset-option').forEach((opt) => {
          const isSelected = opt.getAttribute('data-id') === presetId;
          opt.classList.toggle('border-neutral-900', isSelected);
          opt.classList.toggle('dark:border-white', isSelected);
          opt.classList.toggle('bg-neutral-50', isSelected);
          opt.classList.toggle('dark:bg-neutral-800/80', isSelected);
          opt.classList.toggle('font-bold', isSelected);
          const check = opt.querySelector('.check-indicator');
          if (check) check.classList.toggle('hidden', !isSelected);
        });
      }
    });
  });

  // Quality range
  const qualityRange = document.getElementById('quality-range');
  const qualityVal = document.getElementById('quality-val');
  qualityRange?.addEventListener('input', (e) => {
    state.quality = parseFloat(e.target.value);
    if (qualityVal) qualityVal.innerText = `${Math.round(state.quality * 100)}%`;
  });

  // EXIF Toggles
  document.getElementById('toggle-remove-gps')?.addEventListener('change', (e) => {
    state.removeLocationData = e.target.checked;
  });
  document.getElementById('toggle-remove-orig')?.addEventListener('change', (e) => {
    state.removeOriginalMetadata = e.target.checked;
  });

  // Prepare & Instagram Story buttons
  document.getElementById('prepare-photo-btn')?.addEventListener('click', () => {
    handleExecuteProcessing(false);
  });
  document.getElementById('top-share-to-instagram-story-btn')?.addEventListener('click', () => {
    handleExecuteProcessing(true);
  });
  document.getElementById('editor-share-to-instagram-story-btn')?.addEventListener('click', () => {
    handleExecuteProcessing(true);
  });

  // SUCCESS VIEW EVENTS
  document.getElementById('download-image-btn')?.addEventListener('click', downloadResultImage);
  document.getElementById('share-to-instagram-story-btn')?.addEventListener('click', handleShareToInstagramStory);
  document.getElementById('edit-again-btn')?.addEventListener('click', () => {
    showView('edit');
  });
  document.getElementById('upload-new-btn')?.addEventListener('click', () => {
    if (state.activeImage && state.activeImage.objectUrl && state.activeImage.objectUrl.startsWith('blob:')) {
      URL.revokeObjectURL(state.activeImage.objectUrl);
    }
    if (state.processedResult && state.processedResult.objectUrl) {
      URL.revokeObjectURL(state.processedResult.objectUrl);
    }
    state.activeImage = null;
    state.processedResult = null;
    showView('upload');
  });

  // Initialize
  showView('upload');
});
