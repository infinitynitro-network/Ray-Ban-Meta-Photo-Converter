import { MAX_FILE_SIZE_BYTES, SUPPORTED_EXTENSIONS, SUPPORTED_MIME_TYPES } from '../constants';
import { ImageMetadataInfo, LoadedImageSource } from '../types';
import { inspectJpegMetadata } from './metadataProcessor';

export interface LoadImageResult {
  success: boolean;
  imageSource?: LoadedImageSource;
  errorMessage?: string;
}

/**
 * Validates file type and size.
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'Please upload an image smaller than 25 MB.',
    };
  }

  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  const hasValidExt = SUPPORTED_EXTENSIONS.includes(extension);
  const hasValidMime = SUPPORTED_MIME_TYPES.includes(file.type.toLowerCase()) || file.type.startsWith('image/');

  if (!hasValidExt && !hasValidMime) {
    return {
      valid: false,
      error: 'This file format is not supported. Please upload a JPG, PNG, or WEBP.',
    };
  }

  return { valid: true };
}

/**
 * Reads a File into a LoadedImageSource with metadata inspection.
 */
export async function loadImageFromFile(file: File): Promise<LoadImageResult> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    return {
      success: false,
      errorMessage: validation.error || 'Invalid image file.',
    };
  }

  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onerror = () => {
      resolve({
        success: false,
        errorMessage: 'The image could not be processed. Please try another file.',
      });
    };

    reader.onload = () => {
      const dataUrl = reader.result as string;

      // Extract basic EXIF if JPEG
      let exifInfo: Partial<ImageMetadataInfo> = {
        hasGps: false,
        exifOrientation: 1,
      };

      if (file.type.includes('jpeg') || file.name.match(/\.jpe?g$/i)) {
        exifInfo = inspectJpegMetadata(dataUrl);
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onerror = () => {
        resolve({
          success: false,
          errorMessage: 'The image could not be loaded. Please ensure the file is not corrupted.',
        });
      };

      img.onload = () => {
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;

        if (width <= 0 || height <= 0) {
          resolve({
            success: false,
            errorMessage: 'Image dimensions could not be read.',
          });
          return;
        }

        const metadata: ImageMetadataInfo = {
          format: file.type.replace('image/', '').toUpperCase() || 'JPEG',
          originalWidth: width,
          originalHeight: height,
          fileSizeBytes: file.size,
          hasGps: exifInfo.hasGps ?? false,
          exifOrientation: exifInfo.exifOrientation ?? 1,
          cameraMake: exifInfo.cameraMake,
          cameraModel: exifInfo.cameraModel,
          dateTime: exifInfo.dateTime,
          software: exifInfo.software,
        };

        const imageSource: LoadedImageSource = {
          file,
          name: file.name,
          objectUrl: dataUrl,
          imageElement: img,
          width,
          height,
          aspectRatio: width / height,
          metadata,
        };

        resolve({
          success: true,
          imageSource,
        });
      };

      img.src = dataUrl;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Creates a high quality demo portrait/landscape image for test/sample purposes.
 */
export async function createSamplePhoto(landscape = false): Promise<File> {
  const canvas = document.createElement('canvas');
  const w = landscape ? 1920 : 1440;
  const h = landscape ? 1440 : 1920;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Draw an aesthetic modern creator aesthetic scene (minimalist sunset & architectural curves)
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#1a1b26');
  grad.addColorStop(0.3, '#2a203f');
  grad.addColorStop(0.65, '#e06c75');
  grad.addColorStop(1, '#e5c07b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  // Soft sun circle
  const sunGrad = ctx.createRadialGradient(w * 0.5, h * 0.4, 40, w * 0.5, h * 0.4, 280);
  sunGrad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
  sunGrad.addColorStop(0.4, 'rgba(255, 215, 160, 0.6)');
  sunGrad.addColorStop(1, 'rgba(255, 180, 100, 0)');
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(w * 0.5, h * 0.4, 280, 0, Math.PI * 2);
  ctx.fill();

  // Geometric architectural silhouettes
  ctx.fillStyle = '#0f1017';
  ctx.beginPath();
  ctx.moveTo(w * 0.1, h);
  ctx.lineTo(w * 0.1, h * 0.6);
  ctx.lineTo(w * 0.4, h * 0.5);
  ctx.lineTo(w * 0.4, h);
  ctx.fill();

  ctx.fillStyle = '#171822';
  ctx.beginPath();
  ctx.moveTo(w * 0.35, h);
  ctx.lineTo(w * 0.35, h * 0.55);
  ctx.lineTo(w * 0.75, h * 0.45);
  ctx.lineTo(w * 0.75, h);
  ctx.fill();

  ctx.fillStyle = '#212230';
  ctx.beginPath();
  ctx.moveTo(w * 0.65, h);
  ctx.lineTo(w * 0.65, h * 0.65);
  ctx.lineTo(w * 0.95, h * 0.58);
  ctx.lineTo(w * 0.95, h);
  ctx.fill();

  // Subtle grid / aesthetic texture
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 2;
  for (let y = 100; y < h; y += 120) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }

  // Label text
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('META SPIN STUDIO DEMO', 80, 120);
  ctx.font = '24px sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.fillText(`${w} × ${h} Sample Image`, 80, 160);

  const blob = await new Promise<Blob>((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.95));
  return new File([blob], landscape ? 'sample-landscape.jpg' : 'sample-portrait.jpg', {
    type: 'image/jpeg',
  });
}
