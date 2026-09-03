import { OutputResolutionPreset } from './types';

export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB
export const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
export const SUPPORTED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

export const OUTPUT_PRESETS: OutputResolutionPreset[] = [
  {
    id: '3024x4032',
    name: '3024 × 4032 px',
    width: 3024,
    height: 4032,
    recommended: true,
    aspectRatioLabel: '3:4 Portrait (Ultra High Definition)',
  },
  {
    id: '1512x2016',
    name: '1512 × 2016 px',
    width: 1512,
    height: 2016,
    recommended: false,
    aspectRatioLabel: '3:4 Portrait (Medium Resolution)',
  },
  {
    id: '1080x1440',
    name: '1080 × 1440 px',
    width: 1080,
    height: 1440,
    recommended: false,
    aspectRatioLabel: '3:4 Portrait (Standard Mobile)',
  },
];

export const DISCLAIMER_SHORT =
  'Not affiliated with, endorsed by, or sponsored by Meta, Instagram, or Ray-Ban.';

export const DISCLAIMER_FULL =
  'This tool is an independent image formatting utility. It is not affiliated with, endorsed by, sponsored by, or officially connected to Meta, Instagram, Ray-Ban, or any other third-party platform. Metadata changes and 3:4 formatting do not guarantee access to, compatibility with, or activation of any third-party feature.';

export const PRIVACY_PROMISE =
  'Your image stays on your device. All decoding, 3:4 portrait positioning, canvas rendering, EXIF privacy stripping, and JPEG encoding take place purely inside your browser using client-side Web APIs. Nothing is ever sent to or stored on a remote server.';
