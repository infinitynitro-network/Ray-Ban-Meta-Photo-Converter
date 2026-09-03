import { CropTransform, CustomMetadata, LoadedImageSource, MetadataProfileType, ProcessedResult } from '../types';
import { applyMetadataToJpeg } from './metadataProcessor';

export interface RenderOptions {
  imageSource: LoadedImageSource;
  transform: CropTransform;
  cropBoxWidth: number;
  cropBoxHeight: number;
  targetWidth: number;
  targetHeight: number;
  quality: number; // 0.80 - 1.00
  metadataProfile: MetadataProfileType;
  removeOriginalMetadata: boolean;
  removeLocationData: boolean;
  customMetadata?: CustomMetadata;
  onProgress?: (step: string, progress: number) => void;
}

/**
 * Converts a data URL to a Blob.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
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

/**
 * Renders the processed 3:4 portrait image onto a full-resolution Canvas,
 * normalizes color space to sRGB, encodes to JPEG, and applies EXIF privacy policies.
 */
export async function renderProcessedImage(options: RenderOptions): Promise<ProcessedResult> {
  const {
    imageSource,
    transform,
    cropBoxWidth,
    cropBoxHeight,
    targetWidth,
    targetHeight,
    quality,
    metadataProfile,
    removeOriginalMetadata,
    removeLocationData,
    customMetadata,
    onProgress,
  } = options;

  onProgress?.('Analyzing composition and dimensions...', 20);
  await new Promise((r) => setTimeout(r, 60));

  // Determine scaling
  // Base scale covers the crop frame
  const baseScale = Math.max(cropBoxWidth / imageSource.width, cropBoxHeight / imageSource.height);
  const currentScale = baseScale * transform.zoom;

  // Multiplier from screen preview crop box to target export resolution
  const resolutionMultiplier = targetWidth / cropBoxWidth;

  const exportScale = currentScale * resolutionMultiplier;
  const exportXOffset = transform.xOffset * resolutionMultiplier;
  const exportYOffset = transform.yOffset * resolutionMultiplier;

  onProgress?.('Preparing high-resolution offscreen canvas...', 45);
  await new Promise((r) => setTimeout(r, 60));

  // Create canvas for rendering at exact target dimensions (e.g., 3024 x 4032)
  let canvas: HTMLCanvasElement | OffscreenCanvas;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;

  if (typeof OffscreenCanvas !== 'undefined') {
    try {
      canvas = new OffscreenCanvas(targetWidth, targetHeight);
      ctx = canvas.getContext('2d', {
        colorSpace: 'srgb',
        willReadFrequently: false,
      }) as OffscreenCanvasRenderingContext2D | null;
    } catch {
      canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      ctx = canvas.getContext('2d', {
        colorSpace: 'srgb',
      });
    }
  } else {
    canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    ctx = canvas.getContext('2d');
  }

  if (!ctx) {
    throw new Error('Your browser could not allocate Canvas 2D memory for this resolution.');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fill sRGB white/neutral background in case image is slightly smaller or has alpha
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  onProgress?.('Rendering 3:4 portrait frame at full resolution...', 70);
  await new Promise((r) => setTimeout(r, 80));

  // Draw image transformed around center
  ctx.save();
  ctx.translate(targetWidth / 2 + exportXOffset, targetHeight / 2 + exportYOffset);

  if (transform.rotation) {
    ctx.rotate((transform.rotation * Math.PI) / 180);
  }

  const drawW = imageSource.width * exportScale;
  const drawH = imageSource.height * exportScale;

  ctx.drawImage(
    imageSource.imageElement,
    -drawW / 2,
    -drawH / 2,
    drawW,
    drawH
  );
  ctx.restore();

  onProgress?.('Normalizing sRGB & applying privacy metadata...', 90);
  await new Promise((r) => setTimeout(r, 60));

  let rawJpegDataUrl = '';

  if (canvas instanceof OffscreenCanvas) {
    const rawBlob = await canvas.convertToBlob({
      type: 'image/jpeg',
      quality,
    });
    rawJpegDataUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(rawBlob);
    });
  } else {
    rawJpegDataUrl = canvas.toDataURL('image/jpeg', quality);
  }

  // Apply EXIF privacy policy and metadata profile
  const { updatedDataUrl, statusMessage } = applyMetadataToJpeg(rawJpegDataUrl, {
    profile: metadataProfile,
    removeOriginalMetadata,
    removeLocationData,
    customMetadata,
    targetWidth,
    targetHeight,
  });

  const finalBlob = dataUrlToBlob(updatedDataUrl);
  const finalObjectUrl = URL.createObjectURL(finalBlob);

  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const filename = `meta-spin-photo-${dateStr}.jpg`;

  onProgress?.('Finalizing image...', 100);
  await new Promise((r) => setTimeout(r, 40));

  return {
    blob: finalBlob,
    objectUrl: finalObjectUrl,
    dataUrl: updatedDataUrl,
    filename,
    width: targetWidth,
    height: targetHeight,
    fileSizeBytes: finalBlob.size,
    quality,
    metadataProfileApplied: metadataProfile,
    gpsRemoved: removeLocationData,
    originalMetadataStripped: removeOriginalMetadata,
    statusMessage,
    timestamp: now.toISOString(),
  };
}
