/**
 * Centralized SEO, Analytics & Monetization Configuration
 * Production Domain: https://rayben.zplaybox.in
 *
 * This configuration controls canonical URLs, social metadata,
 * analytics hooks, AdSense readiness, and structured data schemas.
 */

export interface SEOConfig {
  siteName: string;
  brandName: string;
  domain: string;
  canonicalUrl: string;
  defaultTitle: string;
  defaultDescription: string;
  ogImage: string;
  twitterHandle?: string;
  author: {
    name: string;
    url: string;
  };
  analytics: {
    measurementId: string;
    isEnabled: boolean;
  };
  adsense: {
    clientId: string;
    isEnabled: boolean;
  };
  googleSiteVerification: string;
  targetKeywords: string[];
}

export const SEO_CONFIG: SEOConfig = {
  siteName: 'rayBEN',
  brandName: 'rayBEN',
  domain: 'rayben.zplaybox.in',
  canonicalUrl: 'https://rayben.zplaybox.in/',
  defaultTitle: 'Ray-Ban Meta Photo Converter – Instagram Story Image Converter | rayBEN',
  defaultDescription: 'Free online Ray-Ban Meta photo converter. Convert photos to exact 3024×4032 resolution with Meta AI smart glasses EXIF metadata for Instagram Story 3D spin view. 100% private in-browser tool.',
  ogImage: 'https://rayben.zplaybox.in/assets/og-image.png',
  author: {
    name: 'rayBEN Community Project',
    url: 'https://rayben.zplaybox.in/about/',
  },
  analytics: {
    measurementId: import.meta.env.VITE_GA_MEASUREMENT_ID || '',
    isEnabled: Boolean(import.meta.env.VITE_GA_MEASUREMENT_ID && import.meta.env.VITE_GA_MEASUREMENT_ID.startsWith('G-')),
  },
  adsense: {
    clientId: import.meta.env.VITE_ADSENSE_CLIENT_ID || '',
    isEnabled: import.meta.env.VITE_ADSENSE_ENABLED === 'true' && Boolean(import.meta.env.VITE_ADSENSE_CLIENT_ID),
  },
  googleSiteVerification: import.meta.env.VITE_GOOGLE_SITE_VERIFICATION || '',
  targetKeywords: [
    'ray ban image converter',
    'ray-ban image converter',
    'ray ban meta image converter',
    'Ray-Ban Meta photo converter',
    'convert image to Ray-Ban Meta format',
    'convert photo to Ray-Ban Meta',
    'Instagram Ray-Ban photo converter',
    'Instagram Ray-Ban Meta story',
    'Instagram Ray-Ban spin effect',
    'Ray-Ban Meta 3024x4032',
    '3024x4032 image converter',
    'Meta AI EXIF photo',
    'Ray-Ban Meta EXIF',
    'Instagram 3D spin photo',
    'Instagram Story spin effect',
    'smart glasses Instagram photo'
  ]
};

/**
 * Initialize Google Analytics 4 dynamically only if a real ID is provided.
 * Never loads fake or unconfigured IDs.
 */
export function initAnalytics(): void {
  if (typeof window === 'undefined') return;
  if (!SEO_CONFIG.analytics.isEnabled) return;

  const gaId = SEO_CONFIG.analytics.measurementId;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`;
  document.head.appendChild(script);

  // Initialize dataLayer
  (window as unknown as { dataLayer: unknown[] }).dataLayer = (window as unknown as { dataLayer: unknown[] }).dataLayer || [];
  function gtag(...args: unknown[]) {
    (window as unknown as { dataLayer: unknown[] }).dataLayer.push(args);
  }
  gtag('js', new Date());
  gtag('config', gaId, {
    anonymize_ip: true,
    send_page_view: true,
  });

  (window as unknown as { gtag: typeof gtag }).gtag = gtag;
}

/**
 * Track custom events without sending any private photo data or PII.
 */
export function trackEvent(eventName: string, params: Record<string, unknown> = {}): void {
  if (typeof window !== 'undefined' && typeof (window as unknown as { gtag?: Function }).gtag === 'function') {
    (window as unknown as { gtag: Function }).gtag('event', eventName, params);
  }
}

/**
 * Initialize Google AdSense dynamically only if enabled and valid publisher ID is present.
 */
export function initAdSense(): void {
  if (typeof window === 'undefined') return;
  if (!SEO_CONFIG.adsense.isEnabled) return;

  const clientId = SEO_CONFIG.adsense.clientId;
  const script = document.createElement('script');
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
  script.crossOrigin = 'anonymous';
  document.head.appendChild(script);
}
