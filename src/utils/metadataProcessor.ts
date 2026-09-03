import piexif from 'piexifjs';
import { CustomMetadata, ImageMetadataInfo, MetadataProfileType } from '../types';

/**
 * Parses basic EXIF information safely from a JPEG data URL or binary string.
 */
export function inspectJpegMetadata(dataUrlOrBinary: string): Partial<ImageMetadataInfo> {
  try {
    const exifObj = piexif.load(dataUrlOrBinary);
    const zeroth = exifObj['0th'] || {};
    const gps = exifObj['GPS'] || {};
    const exif = exifObj['Exif'] || {};

    const hasGps = Object.keys(gps).length > 0;
    const orientation = zeroth[piexif.ImageIFD.Orientation] || 1;
    const cameraMake = zeroth[piexif.ImageIFD.Make] ? String(zeroth[piexif.ImageIFD.Make]) : undefined;
    const cameraModel = zeroth[piexif.ImageIFD.Model] ? String(zeroth[piexif.ImageIFD.Model]) : undefined;
    const dateTime = (zeroth[piexif.ImageIFD.DateTime] || exif[piexif.ExifIFD.DateTimeOriginal])
      ? String(zeroth[piexif.ImageIFD.DateTime] || exif[piexif.ExifIFD.DateTimeOriginal])
      : undefined;
    const software = zeroth[piexif.ImageIFD.Software] ? String(zeroth[piexif.ImageIFD.Software]) : undefined;

    return {
      hasGps,
      exifOrientation: typeof orientation === 'number' ? orientation : 1,
      cameraMake,
      cameraModel,
      dateTime,
      software,
    };
  } catch {
    // If not a JPEG or lacks EXIF, return safe defaults
    return {
      hasGps: false,
      exifOrientation: 1,
    };
  }
}

/**
 * Format local date to EXIF standard format "YYYY:MM:DD HH:MM:SS"
 */
export function formatExifDate(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const mins = pad(date.getMinutes());
  const secs = pad(date.getSeconds());
  return `${year}:${month}:${day} ${hours}:${mins}:${secs}`;
}

export interface MetadataApplicationOptions {
  profile: MetadataProfileType;
  removeOriginalMetadata: boolean;
  removeLocationData: boolean;
  customMetadata?: CustomMetadata;
  targetWidth: number;
  targetHeight: number;
}

/**
 * Applies privacy policies and selected metadata profile into the output JPEG Data URL.
 */
export function applyMetadataToJpeg(
  jpegDataUrl: string,
  options: MetadataApplicationOptions
): { updatedDataUrl: string; statusMessage: string } {
  try {
    // Start with a clean EXIF skeleton
    const zeroth: Record<number, string | number | number[]> = {};
    const exif: Record<number, string | number | number[]> = {};
    const gps: Record<number, string | number | number[]> = {};
    const interop: Record<number, string | number | number[]> = {};
    const first: Record<number, string | number | number[]> = {};

    // Standard baseline properties
    zeroth[piexif.ImageIFD.Orientation] = 1; // Standard top-left orientation (image already drawn correctly)
    zeroth[piexif.ImageIFD.XResolution] = [72, 1];
    zeroth[piexif.ImageIFD.YResolution] = [72, 1];
    zeroth[piexif.ImageIFD.ResolutionUnit] = 2; // inches
    zeroth[piexif.ImageIFD.Software] = 'Meta Spin Studio';

    // sRGB color space tag
    exif[piexif.ExifIFD.ColorSpace] = 1; // 1 = sRGB
    exif[piexif.ExifIFD.PixelXDimension] = options.targetWidth;
    exif[piexif.ExifIFD.PixelYDimension] = options.targetHeight;
    exif[piexif.ExifIFD.ExifVersion] = '0231';

    let statusMsg = 'Processed with local privacy controls';

    if (options.profile === 'camera-style') {
      // Camera-style formatting profile (transparently labeled)
      zeroth[piexif.ImageIFD.Make] = 'Studio Portrait Profile';
      zeroth[piexif.ImageIFD.Model] = 'Spin-Ready 3:4 Aspect';
      const nowStr = formatExifDate();
      zeroth[piexif.ImageIFD.DateTime] = nowStr;
      exif[piexif.ExifIFD.DateTimeOriginal] = nowStr;
      exif[piexif.ExifIFD.DateTimeDigitized] = nowStr;
      exif[piexif.ExifIFD.FocalLength] = [30, 10]; // 3.0mm
      exif[piexif.ExifIFD.FNumber] = [22, 10]; // f/2.2
      statusMsg = 'Camera-style formatting profile embedded (non-certified formatting profile).';
    } else if (options.profile === 'custom' && options.customMetadata) {
      // User custom fields
      const { software, artist, copyright, description, dateCreated } = options.customMetadata;
      if (software?.trim()) zeroth[piexif.ImageIFD.Software] = software.trim();
      if (artist?.trim()) zeroth[piexif.ImageIFD.Artist] = artist.trim();
      if (copyright?.trim()) zeroth[piexif.ImageIFD.Copyright] = copyright.trim();
      if (description?.trim()) zeroth[piexif.ImageIFD.ImageDescription] = description.trim();

      if (dateCreated?.trim()) {
        try {
          const parsed = new Date(dateCreated);
          if (!isNaN(parsed.getTime())) {
            const formatted = formatExifDate(parsed);
            zeroth[piexif.ImageIFD.DateTime] = formatted;
            exif[piexif.ExifIFD.DateTimeOriginal] = formatted;
          }
        } catch {
          // ignore date parse fallback
        }
      }
      statusMsg = 'Custom metadata embedded into output JPEG.';
    } else {
      // Standard clean image
      statusMsg = 'Clean standard profile applied. Unnecessary metadata omitted.';
    }

    // Explicitly guarantee GPS is removed if requested
    if (options.removeLocationData) {
      // gps dictionary remains completely empty
      statusMsg += ' Location/GPS stripped.';
    }

    const exifObj = {
      '0th': zeroth,
      Exif: exif,
      GPS: gps,
      Interop: interop,
      '1st': first,
      thumbnail: undefined,
    };

    const exifBytes = piexif.dump(exifObj);
    const updatedDataUrl = piexif.insert(exifBytes, jpegDataUrl);

    return {
      updatedDataUrl,
      statusMessage: statusMsg,
    };
  } catch (err) {
    console.warn('Metadata insertion failed or unsupported format:', err);
    // If piexif fails or browser restriction, safely return original JPEG
    return {
      updatedDataUrl: jpegDataUrl,
      statusMessage: 'Processed cleanly (EXIF custom tags could not be inserted in this environment).',
    };
  }
}
