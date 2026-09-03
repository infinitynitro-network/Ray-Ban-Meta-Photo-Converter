/**
 * Meta Spin Studio - Pure Vanilla JavaScript Implementation
 * 100% Client-side processing with zero server dependencies.
 * Runs directly in static HTML/JS/CSS environments including GitHub Pages.
 */

// --- Constants & Config ---
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
  activeImage: null, // { name, width, height, dataUrl, objectUrl, size, exifData, hasGps, cameraMake, cameraModel }
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

// Generate sample portrait photo
function createSampleCanvas(horizontal = false) {
  const width = horizontal ? 4032 : 3024;
  const height = horizontal ? 3024 : 4032;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Background gradient
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, '#1e293b');
  grad.addColorStop(0.5, '#0f172a');
  grad.addColorStop(1, '#020617');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Decorative lights & sun
  const sunGrad = ctx.createRadialGradient(width * 0.5, height * 0.35, 50, width * 0.5, height * 0.35, 600);
  sunGrad.addColorStop(0, 'rgba(245, 158, 11, 0.6)');
  sunGrad.addColorStop(0.5, 'rgba(236, 72, 153, 0.3)');
  sunGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sunGrad;
  ctx.fillRect(0, 0, width, height);

  // Grid lines
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
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
  ctx.fillText(`${width} × ${height} • ${horizontal ? 'Horizontal Format' : '3:4 Portrait Sample'}`, width / 2, height * 0.53);

  return canvas.toDataURL('image/jpeg', 0.95);
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

// Load Image from File
function handleImageFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    const img = new Image();
    img.onload = () => {
      let hasGps = false;
      let cameraMake = null;
      let cameraModel = null;
      let exifData = null;

      if (typeof piexif !== 'undefined') {
        try {
          if (dataUrl.startsWith('data:image/jpeg') || dataUrl.startsWith('data:image/jpg')) {
            exifData = piexif.load(dataUrl);
            const gps = exifData['GPS'] || {};
            const zero = exifData['0th'] || {};
            hasGps = Object.keys(gps).length > 0;
            cameraMake = zero[piexif.ImageIFD.Make] ? String(zero[piexif.ImageIFD.Make]).trim() : null;
            cameraModel = zero[piexif.ImageIFD.Model] ? String(zero[piexif.ImageIFD.Model]).trim() : null;
          }
        } catch {
          // ignore
        }
      }

      state.activeImage = {
        name: file.name,
        width: img.width,
        height: img.height,
        dataUrl,
        objectUrl: dataUrl,
        size: file.size,
        exifData,
        hasGps,
        cameraMake,
        cameraModel,
      };
      state.transform = { zoom: 1.0, xOffset: 0, yOffset: 0, rotation: 0 };
      
      // Update metadata chip in editor
      const fileNameEl = document.getElementById('editor-filename');
      const fileMetaEl = document.getElementById('editor-dimensions');
      if (fileNameEl) fileNameEl.innerText = file.name;
      if (fileMetaEl) fileMetaEl.innerText = `${img.width}×${img.height}`;

      showView('edit');
      initCropCanvas();
    };
    img.src = dataUrl;
  };
  reader.readAsDataURL(file);
}

// Load sample photo
function loadSample(storyTrigger = false) {
  const sampleDataUrl = createSampleCanvas(false);
  const img = new Image();
  img.onload = () => {
    state.activeImage = {
      name: 'sample-portrait-photo.jpg',
      width: 3024,
      height: 4032,
      dataUrl: sampleDataUrl,
      objectUrl: sampleDataUrl,
      size: 850000,
      hasGps: false,
      cameraMake: 'Meta Spin Studio',
      cameraModel: 'Smart Glasses 3:4 Profile',
    };
    state.transform = { zoom: 1.0, xOffset: 0, yOffset: 0, rotation: 0 };
    
    const fileNameEl = document.getElementById('editor-filename');
    const fileMetaEl = document.getElementById('editor-dimensions');
    if (fileNameEl) fileNameEl.innerText = 'sample-portrait-photo.jpg';
    if (fileMetaEl) fileMetaEl.innerText = '3024×4032';

    showView('edit');
    initCropCanvas();

    if (storyTrigger) {
      setTimeout(() => {
        handleExecuteProcessing(true);
      }, 350);
    }
  };
  img.src = sampleDataUrl;
}

// Interactive Crop Canvas
function initCropCanvas() {
  const canvas = document.getElementById('preview-canvas');
  if (!canvas || !state.activeImage) return;

  loadedImageObj = new Image();
  loadedImageObj.onload = () => {
    drawCropPreview();
  };
  loadedImageObj.src = state.activeImage.dataUrl;

  const viewport = document.getElementById('crop-viewport');
  if (!viewport || viewport.dataset.initialized) return;
  viewport.dataset.initialized = 'true';

  // Mouse / touch drag
  viewport.addEventListener('pointerdown', (e) => {
    state.isDragging = true;
    state.dragStart = { x: e.clientX, y: e.clientY };
    state.startOffset = { x: state.transform.xOffset, y: state.transform.yOffset };
    viewport.setPointerCapture(e.pointerId);
  });

  viewport.addEventListener('pointermove', (e) => {
    if (!state.isDragging) return;
    const dx = e.clientX - state.dragStart.x;
    const dy = e.clientY - state.dragStart.y;
    state.transform.xOffset = state.startOffset.x + dx;
    state.transform.yOffset = state.startOffset.y + dy;
    drawCropPreview();
  });

  const endDrag = () => {
    state.isDragging = false;
  };
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);

  // Wheel zoom
  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const delta = e.deltaY * -0.002;
    state.transform.zoom = Math.min(Math.max(1, state.transform.zoom + delta), 4);
    const zoomRange = document.getElementById('zoom-range');
    const zoomVal = document.getElementById('zoom-value');
    if (zoomRange) zoomRange.value = state.transform.zoom;
    if (zoomVal) zoomVal.innerText = `${state.transform.zoom.toFixed(2)}×`;
    drawCropPreview();
  }, { passive: false });
}

function drawCropPreview() {
  const canvas = document.getElementById('preview-canvas');
  if (!canvas || !loadedImageObj) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const w = rect.width || 360;
  const h = rect.height || 480;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(dpr, dpr);
  ctx.fillStyle = '#0a0a0c';
  ctx.fillRect(0, 0, w, h);

  const scaleX = w / loadedImageObj.width;
  const scaleY = h / loadedImageObj.height;
  const baseScale = Math.max(scaleX, scaleY);
  const finalScale = baseScale * state.transform.zoom;

  const drawW = loadedImageObj.width * finalScale;
  const drawH = loadedImageObj.height * finalScale;

  ctx.save();
  ctx.translate(w / 2 + state.transform.xOffset, h / 2 + state.transform.yOffset);
  if (state.transform.rotation !== 0) {
    ctx.rotate((state.transform.rotation * Math.PI) / 180);
  }
  ctx.drawImage(loadedImageObj, -drawW / 2, -drawH / 2, drawW, drawH);
  ctx.restore();
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

// Execute High Resolution Processing
async function handleExecuteProcessing(triggerStory = false) {
  if (!state.activeImage || !loadedImageObj) return;

  showProcessingModal(true, 'Rendering high-resolution 3:4 portrait...');

  setTimeout(async () => {
    try {
      const targetW = state.selectedPreset.width;
      const targetH = state.selectedPreset.height;

      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = targetW;
      exportCanvas.height = targetH;
      const ctx = exportCanvas.getContext('2d');

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, targetW, targetH);

      const previewEl = document.getElementById('preview-canvas');
      const previewW = previewEl ? previewEl.getBoundingClientRect().width : 360;
      const scaleFactor = targetW / previewW;

      const scaleX = previewW / loadedImageObj.width;
      const scaleY = (previewW * 4 / 3) / loadedImageObj.height;
      const baseFitScale = Math.max(scaleX, scaleY);
      const finalScale = baseFitScale * state.transform.zoom * scaleFactor;

      const finalDrawW = loadedImageObj.width * finalScale;
      const finalDrawH = loadedImageObj.height * finalScale;

      ctx.save();
      ctx.translate(targetW / 2 + state.transform.xOffset * scaleFactor, targetH / 2 + state.transform.yOffset * scaleFactor);
      if (state.transform.rotation !== 0) {
        ctx.rotate((state.transform.rotation * Math.PI) / 180);
      }
      ctx.drawImage(loadedImageObj, -finalDrawW / 2, -finalDrawH / 2, finalDrawW, finalDrawH);
      ctx.restore();

      let base64Jpeg = exportCanvas.toDataURL('image/jpeg', state.quality);

      // Apply EXIF GPS stripping
      if (typeof piexif !== 'undefined') {
        try {
          let exifObj = { '0th': {}, Exif: {}, GPS: {}, Interop: {}, '1st': {} };
          if (!state.removeOriginalMetadata && state.activeImage.exifData) {
            exifObj = JSON.parse(JSON.stringify(state.activeImage.exifData));
          }
          exifObj['0th'] = exifObj['0th'] || {};
          exifObj['Exif'] = exifObj['Exif'] || {};
          exifObj['GPS'] = exifObj['GPS'] || {};

          if (state.removeLocationData) {
            exifObj['GPS'] = {};
          }
          exifObj['0th'][piexif.ImageIFD.Orientation] = 1;

          const exifBytes = piexif.dump(exifObj);
          base64Jpeg = piexif.insert(exifBytes, base64Jpeg);
        } catch {
          // non-fatal
        }
      }

      // Convert base64 to Blob
      const arr = base64Jpeg.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const finalBlob = new Blob([u8arr], { type: mime });
      const objectUrl = URL.createObjectURL(finalBlob);

      const now = new Date();
      const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
      const filename = `meta-spin-${timestamp}.jpg`;

      state.processedResult = {
        blob: finalBlob,
        objectUrl,
        filename,
        width: targetW,
        height: targetH,
        fileSizeBytes: finalBlob.size,
        quality: state.quality,
        statusMessage: state.removeLocationData
          ? 'Location data (GPS) stripped. Normalised to standard 3:4 portrait JPEG.'
          : 'Formatted to 3:4 portrait JPEG with camera metadata preserved.',
      };

      // Populate success view elements
      const resultImg = document.getElementById('result-image-preview');
      if (resultImg) resultImg.src = objectUrl;

      document.getElementById('result-resolution').innerText = `${targetW} × ${targetH} px`;
      document.getElementById('result-filesize').innerText = formatBytes(finalBlob.size);
      document.getElementById('result-filename').innerText = filename;
      document.getElementById('result-status-msg').innerText = state.processedResult.statusMessage;

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
      alert('Could not process photo. Please choose a smaller resolution preset.');
    }
  }, 150);
}

// Download Processed Image
function downloadResultImage() {
  if (!state.processedResult) return;
  const a = document.createElement('a');
  a.href = state.processedResult.objectUrl;
  a.download = state.processedResult.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Share to Instagram Story
async function handleShareToInstagramStory() {
  if (!state.processedResult) return;

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

  // Copy to clipboard
  try {
    if (navigator.clipboard && window.ClipboardItem) {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/jpeg': state.processedResult.blob }),
      ]);
    }
  } catch {
    // ignore
  }

  // Native share sheet
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: '3:4 Portrait Photo for Instagram Story',
        text: 'Prepared for Instagram Story with Meta Spin Studio',
      });
      showToast('Share dialog opened! Tap Instagram or Instagram Stories to post.');
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

// Setup Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(state.theme);

  // Theme toggle
  document.getElementById('toggle-theme-btn')?.addEventListener('click', () => {
    applyTheme(state.theme === 'light' ? 'dark' : 'light');
  });

  // Clear Session
  document.getElementById('header-clear-btn')?.addEventListener('click', () => {
    if (confirm('Clear current photo and start over?')) {
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
    if (zoomRange) zoomRange.value = 1.0;
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
    if (zoomRange) zoomRange.value = 1.0;
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
    state.activeImage = null;
    state.processedResult = null;
    showView('upload');
  });

  // Initialize
  showView('upload');
});
