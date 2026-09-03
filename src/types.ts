export type MetadataProfileType = 'standard-clean' | 'camera-style' | 'custom';

export interface CustomMetadata {
  software: string;
  artist: string;
  copyright: string;
  description: string;
  dateCreated: string;
}

export interface OutputResolutionPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  recommended?: boolean;
  aspectRatioLabel: string;
}

export interface ImageMetadataInfo {
  format: string;
  originalWidth: number;
  originalHeight: number;
  fileSizeBytes: number;
  hasGps: boolean;
  exifOrientation: number;
  cameraMake?: string;
  cameraModel?: string;
  dateTime?: string;
  software?: string;
}

export interface LoadedImageSource {
  file: File;
  name: string;
  objectUrl: string;
  imageElement: HTMLImageElement;
  width: number;
  height: number;
  aspectRatio: number;
  metadata: ImageMetadataInfo;
  rawArrayBuffer?: ArrayBuffer;
}

export interface CropTransform {
  zoom: number; // 1.0 to 4.0
  xOffset: number; // in pixels relative to viewport center
  yOffset: number;
  rotation: number; // 0, 90, 180, 270 degrees if rotated
}

export interface ProcessedResult {
  blob: Blob;
  objectUrl: string;
  dataUrl: string;
  filename: string;
  width: number;
  height: number;
  fileSizeBytes: number;
  quality: number;
  metadataProfileApplied: MetadataProfileType;
  gpsRemoved: boolean;
  originalMetadataStripped: boolean;
  statusMessage: string;
  timestamp: string;
}

export type AppStep = 'upload' | 'edit' | 'success';
