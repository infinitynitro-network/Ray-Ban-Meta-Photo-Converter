/**
 * Ray-Ban Meta Spin View Converter
 * Pure Vanilla JavaScript - 100% Client-Side Engine
 * Re-encodes photos to 3024 x 4032 (3:4) and injects Meta AI smart-glasses EXIF.
 */

// Application State
const appState = {
  currentBlob: null,
  currentObjectUrl: null,
  currentFilename: 'ray-ban-meta-spin-photo.jpg',
};

// ==========================================================================
// Top Bar Scroll Shadow & Navigation
// ==========================================================================
function initHeaderScroll() {
  const header = document.querySelector('.top-header');
  if (!header) return;

  const handleScroll = () => {
    if (window.scrollY > 4) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();
}

// ==========================================================================
// Mobile Slide-in Drawer Controller
// ==========================================================================
function initMobileDrawer() {
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const drawer = document.getElementById('mobile-drawer');
  const scrim = document.getElementById('drawer-scrim');
  const closeBtn = document.getElementById('drawer-close-btn');
  const drawerLinks = document.querySelectorAll('.drawer-nav-link, .drawer-cta a');

  function openDrawer() {
    drawer?.classList.add('open');
    scrim?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawer?.classList.remove('open');
    scrim?.classList.remove('open');
    document.body.style.overflow = '';
  }

  hamburgerBtn?.addEventListener('click', openDrawer);
  closeBtn?.addEventListener('click', closeDrawer);
  scrim?.addEventListener('click', closeDrawer);

  drawerLinks.forEach((link) => {
    link.addEventListener('click', closeDrawer);
  });

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer?.classList.contains('open')) {
      closeDrawer();
    }
  });
}

// ==========================================================================
// Binary EXIF Orientation Parser
// Reads JPEG APP1 segment directly to determine true orientation (tags 1..8)
// ==========================================================================
function getOrientationFromBuffer(arrayBuffer) {
  try {
    const view = new DataView(arrayBuffer);
    // Check JPEG SOI (0xFF, 0xD8)
    if (view.getUint16(0, false) !== 0xFFD8) {
      return 1; // Not standard JPEG or raw stream
    }

    const length = view.byteLength;
    let offset = 2;

    while (offset < length) {
      const marker = view.getUint16(offset, false);

      // APP1 marker (0xFFE1)
      if (marker === 0xFFE1) {
        const markerLength = view.getUint16(offset + 2, false);
        // Look for "Exif\0\0" (0x45, 0x78, 0x69, 0x66, 0x00, 0x00)
        if (view.getUint32(offset + 4, false) === 0x45786966 && view.getUint16(offset + 8, false) === 0x0000) {
          const tiffStart = offset + 10;
          const endianness = view.getUint16(tiffStart, false);
          // 0x4949 = 'II' (Intel, Little Endian), 0x4D4D = 'MM' (Motorola, Big Endian)
          const isLittle = endianness === 0x4949;

          const ifdOffset = view.getUint32(tiffStart + 4, isLittle);
          const numEntries = view.getUint16(tiffStart + ifdOffset, isLittle);

          for (let i = 0; i < numEntries; i++) {
            const entryOffset = tiffStart + ifdOffset + 2 + (i * 12);
            if (entryOffset + 12 > length) break;
            const tag = view.getUint16(entryOffset, isLittle);
            if (tag === 0x0112) { // Orientation tag
              const orientation = view.getUint16(entryOffset + 8, isLittle);
              if (orientation >= 1 && orientation <= 8) {
                return orientation;
              }
            }
          }
        }
        offset += 2 + markerLength;
      } else if ((marker & 0xFF00) === 0xFF00) {
        if (marker === 0xFFDA || marker === 0xFFD9) break; // SOS or EOI
        const markerLength = view.getUint16(offset + 2, false);
        offset += 2 + markerLength;
      } else {
        offset += 1;
      }
    }
  } catch (e) {
    console.warn('Could not parse binary EXIF orientation:', e);
  }
  return 1;
}

// ==========================================================================
// Orientation-Normalized Upright Canvas
// Pre-rotates source image so rotated phone shots stand upright before cropping
// ==========================================================================
function createUprightCanvas(img, orientation) {
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;
  const canvas = document.createElement('canvas');

  // Orientations 5, 6, 7, 8 swap width & height
  if (orientation >= 5 && orientation <= 8) {
    canvas.width = h;
    canvas.height = w;
  } else {
    canvas.width = w;
    canvas.height = h;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) return img;

  switch (orientation) {
    case 2: // Horizontal flip
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
      break;
    case 3: // 180° rotate
      ctx.translate(w, h);
      ctx.rotate(Math.PI);
      break;
    case 4: // Vertical flip
      ctx.translate(0, h);
      ctx.scale(1, -1);
      break;
    case 5: // Transpose
      ctx.rotate(0.5 * Math.PI);
      ctx.scale(1, -1);
      break;
    case 6: // 90° rotate CW
      ctx.translate(h, 0);
      ctx.rotate(0.5 * Math.PI);
      break;
    case 7: // Transverse
      ctx.rotate(0.5 * Math.PI);
      ctx.translate(w, -h);
      ctx.scale(-1, 1);
      break;
    case 8: // 270° rotate CW (90° CCW)
      ctx.translate(0, w);
      ctx.rotate(-0.5 * Math.PI);
      break;
    default:
      break;
  }

  ctx.drawImage(img, 0, 0);
  return canvas;
}

// ==========================================================================
// Date Formatter for EXIF ("YYYY:MM:DD HH:MM:SS")
// ==========================================================================
function getExifDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}:${pad(d.getMonth() + 1)}:${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ==========================================================================
// Data URL to Blob Converter
// ==========================================================================
function dataURLtoBlob(dataurl) {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// ==========================================================================
// Ray-Ban Meta Conversion & EXIF Injection Engine
// ==========================================================================
async function processImageFile(file) {
  if (!file) return;

  // Validate format
  const isValid = file.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name);
  if (!isValid) {
    alert('Please upload a valid JPEG, PNG, or WEBP photo.');
    return;
  }

  const uploadCard = document.getElementById('upload-card');
  const processingCard = document.getElementById('processing-card');
  const resultCard = document.getElementById('result-card');

  // UI state transition to processing
  uploadCard.classList.add('hidden');
  resultCard.classList.add('hidden');
  processingCard.classList.remove('hidden');

  try {
    // 1. Read binary for EXIF Orientation
    const arrayBuffer = await file.arrayBuffer();
    const orientation = getOrientationFromBuffer(arrayBuffer);

    // 2. Decode raw image
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('Failed to decode image data.'));
      img.src = dataUrl;
    });

    // 3. Pre-rotate upright if needed
    const uprightSource = createUprightCanvas(img, orientation);
    const srcW = uprightSource.width;
    const srcH = uprightSource.height;

    // 4. Target 3024 × 4032 (3:4 portrait) cover-crop calculation
    const targetW = 3024;
    const targetH = 4032;
    const targetAspect = targetW / targetH; // 0.75
    const srcAspect = srcW / srcH;

    let cropX = 0;
    let cropY = 0;
    let cropW = srcW;
    let cropH = srcH;

    if (srcAspect > targetAspect) {
      // Source is wider than 3:4 -> fit height, center-crop width overflow
      cropW = srcH * targetAspect;
      cropX = (srcW - cropW) / 2;
    } else {
      // Source is taller than 3:4 -> fit width, center-crop height overflow
      cropH = srcW / targetAspect;
      cropY = (srcH - cropH) / 2;
    }

    // 5. Draw onto off-screen 3024 × 4032 canvas
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = targetW;
    exportCanvas.height = targetH;
    const ctx = exportCanvas.getContext('2d', { colorSpace: 'srgb' });

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Neutral base fill
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, targetW, targetH);

    // Draw center-cropped portion with cover-crop fill
    ctx.drawImage(uprightSource, cropX, cropY, cropW, cropH, 0, 0, targetW, targetH);

    // 6. Export to standard JPEG Blob (quality 0.92)
    const rawJpegBlob = await new Promise((resolve, reject) => {
      exportCanvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas JPEG encoding failed.'));
      }, 'image/jpeg', 0.92);
    });

    // 7. Inject Ray-Ban Meta Smart Glasses EXIF Signature
    const rawDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(rawJpegBlob);
    });

    let finalBlob = rawJpegBlob;

    if (typeof piexif !== 'undefined') {
      const now = new Date();
      const dtStr = getExifDate(now);

      // Build pristine Ray-Ban Meta smart-glasses EXIF dictionary
      const zeroth = {};
      const exif = {};
      const gps = {}; // Explicitly empty: NO GPS data
      const interop = {};
      const first = {};

      // 0th IFD: Hardware signature
      zeroth[piexif.ImageIFD.Make] = "Meta AI";
      zeroth[piexif.ImageIFD.Model] = "Ray-Ban Meta Smart Glasses 2";
      zeroth[piexif.ImageIFD.Orientation] = 1; // Standard upright
      zeroth[piexif.ImageIFD.XResolution] = [72, 1];
      zeroth[piexif.ImageIFD.YResolution] = [72, 1];
      zeroth[piexif.ImageIFD.ResolutionUnit] = 2; // Inches
      zeroth[piexif.ImageIFD.DateTime] = dtStr;

      // Exif IFD: Exact Ray-Ban sensor specs & sRGB colorspace (0xA001 = 1)
      exif[piexif.ExifIFD.ColorSpace] = 1; // 1 = sRGB
      exif[piexif.ExifIFD.PixelXDimension] = 3024;
      exif[piexif.ExifIFD.PixelYDimension] = 4032;
      exif[piexif.ExifIFD.ExifVersion] = "0231";
      exif[piexif.ExifIFD.DateTimeOriginal] = dtStr;
      exif[piexif.ExifIFD.DateTimeDigitized] = dtStr;

      // Notice: No Software tag, No GPS, No Serial Numbers, No CameraOwnerName
      const exifDict = {
        "0th": zeroth,
        "Exif": exif,
        "GPS": gps,
        "Interop": interop,
        "1st": first
      };

      try {
        const exifBytes = piexif.dump(exifDict);
        const injectedDataUrl = piexif.insert(exifBytes, rawDataUrl);
        finalBlob = dataURLtoBlob(injectedDataUrl);
      } catch (exifError) {
        console.warn('EXIF injection fallback:', exifError);
        finalBlob = rawJpegBlob;
      }
    }

    // 8. Update Result Panel
    if (appState.currentObjectUrl) {
      URL.revokeObjectURL(appState.currentObjectUrl);
    }
    appState.currentBlob = finalBlob;
    appState.currentObjectUrl = URL.createObjectURL(finalBlob);

    const nowPad = (n) => String(n).padStart(2, '0');
    const d = new Date();
    appState.currentFilename = `ray-ban-meta-${d.getFullYear()}${nowPad(d.getMonth() + 1)}${nowPad(d.getDate())}-${nowPad(d.getHours())}${nowPad(d.getMinutes())}${nowPad(d.getSeconds())}.jpg`;

    const previewImg = document.getElementById('result-preview-img');
    const downloadLink = document.getElementById('download-btn');

    if (previewImg) {
      previewImg.src = appState.currentObjectUrl;
    }
    if (downloadLink) {
      downloadLink.href = appState.currentObjectUrl;
      downloadLink.download = appState.currentFilename;
    }

    // UI state transition to Result
    processingCard.classList.add('hidden');
    resultCard.classList.remove('hidden');

    // Scroll smoothly to result
    resultCard.scrollIntoView({ behavior: 'smooth', block: 'start' });

  } catch (err) {
    console.error('Error during image conversion:', err);
    alert('Could not convert image. Please check the file and try again.');
    processingCard.classList.add('hidden');
    uploadCard.classList.remove('hidden');
  }
}

// ==========================================================================
// Share Image Handler
// Feature-detects navigator.canShare with files; falls back gracefully
// ==========================================================================
async function handleShareImage() {
  if (!appState.currentBlob) return;

  const file = new File([appState.currentBlob], appState.currentFilename, { type: 'image/jpeg' });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        files: [file],
        title: 'Ray-Ban Meta Spin Photo',
        text: '3:4 Portrait photo formatted for Instagram Story 3D Spin View',
      });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return; // User dismissed share sheet
      console.warn('Share API error:', err);
    }
  }

  // Fallback: Trigger download if sharing isn't supported on current platform
  const downloadLink = document.getElementById('download-btn');
  if (downloadLink) {
    downloadLink.click();
    alert('Photo saved to your downloads! Open Instagram Story and pick it from your camera roll to activate 3D Spin View.');
  }
}

// ==========================================================================
// Reset / Convert Another Handler
// ==========================================================================
function resetConverter() {
  const uploadCard = document.getElementById('upload-card');
  const resultCard = document.getElementById('result-card');
  const processingCard = document.getElementById('processing-card');

  // Reset inputs
  const inputLib = document.getElementById('file-input-library');
  const inputCam = document.getElementById('file-input-camera');
  if (inputLib) inputLib.value = '';
  if (inputCam) inputCam.value = '';

  resultCard.classList.add('hidden');
  processingCard.classList.add('hidden');
  uploadCard.classList.remove('hidden');

  uploadCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ==========================================================================
// Sample Photo Generator for Instant Testing
// ==========================================================================
function loadSamplePhoto() {
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = 1920;
  sampleCanvas.height = 1080;
  const ctx = sampleCanvas.getContext('2d');

  // Aesthetic sample graphic matching brand
  const grad = ctx.createLinearGradient(0, 0, 1920, 1080);
  grad.addColorStop(0, '#171717');
  grad.addColorStop(0.5, '#7F0000');
  grad.addColorStop(1, '#FB0000');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1920, 1080);

  // Decorative rings
  ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.beginPath();
  ctx.arc(960, 540, 360, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.beginPath();
  ctx.arc(960, 540, 240, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 80px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Ray-Ban Meta Spin View', 960, 520);

  ctx.font = '600 36px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  ctx.fillStyle = '#F8F9FA';
  ctx.fillText('16:9 Landscape Sample → Converts to 3024 × 4032 (3:4)', 960, 585);

  sampleCanvas.toBlob((blob) => {
    if (blob) {
      const sampleFile = new File([blob], 'sample-landscape.jpg', { type: 'image/jpeg' });
      processImageFile(sampleFile);
    }
  }, 'image/jpeg', 0.95);
}

// ==========================================================================
// Initialize Event Listeners on DOMContentLoaded
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Top Bar Scroll & Mobile Drawer
  initHeaderScroll();
  initMobileDrawer();

  // 2. Input Handlers
  const inputLibrary = document.getElementById('file-input-library');
  const inputCamera = document.getElementById('file-input-camera');
  const dropZone = document.getElementById('drop-zone');

  const btnLibrary = document.getElementById('btn-action-library');
  const btnCamera = document.getElementById('btn-action-camera');
  const btnPaste = document.getElementById('btn-action-paste');
  const btnSample = document.getElementById('btn-load-sample');

  btnLibrary?.addEventListener('click', () => inputLibrary?.click());
  btnCamera?.addEventListener('click', () => inputCamera?.click());
  dropZone?.addEventListener('click', () => inputLibrary?.click());
  btnSample?.addEventListener('click', loadSamplePhoto);

  inputLibrary?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  });

  inputCamera?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  });

  // 3. Drag & Drop Handlers
  ['dragenter', 'dragover'].forEach((eventName) => {
    dropZone?.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add('drag-active');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    dropZone?.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove('drag-active');
    });
  });

  dropZone?.addEventListener('drop', (e) => {
    const file = e.dataTransfer?.files?.[0];
    if (file) processImageFile(file);
  });

  // Keyboard accessibility for drop-zone
  dropZone?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputLibrary?.click();
    }
  });

  // 4. Clipboard Paste Handlers
  document.addEventListener('paste', (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          processImageFile(file);
          break;
        }
      }
    }
  });

  btnPaste?.addEventListener('click', async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.read) {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          const imageType = item.types.find((type) => type.startsWith('image/'));
          if (imageType) {
            const blob = await item.getType(imageType);
            const file = new File([blob], 'pasted-photo.png', { type: imageType });
            processImageFile(file);
            return;
          }
        }
      }
      alert('Press Ctrl+V (or Cmd+V on Mac) anywhere on this page to paste your copied image.');
    } catch {
      alert('Press Ctrl+V (or Cmd+V on Mac) anywhere on this page to paste your copied image.');
    }
  });

  // 5. Result Actions
  document.getElementById('share-btn')?.addEventListener('click', handleShareImage);
  document.getElementById('reset-btn')?.addEventListener('click', resetConverter);
});
