import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, Sparkles, AlertCircle, Loader2, Instagram, Send } from 'lucide-react';
import { createSamplePhoto, loadImageFromFile, validateImageFile } from '../utils/imageLoader';
import { LoadedImageSource } from '../types';

interface UploadAreaProps {
  onImageLoaded: (imageSource: LoadedImageSource) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

export const UploadArea: React.FC<UploadAreaProps> = ({
  onImageLoaded,
  isLoading,
  setIsLoading,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        setErrorMessage(validation.error || 'This file format is not supported.');
        setIsLoading(false);
        return;
      }

      const result = await loadImageFromFile(file);
      if (result.success && result.imageSource) {
        onImageLoaded(result.imageSource);
      } else {
        setErrorMessage(result.errorMessage || 'The image could not be processed. Please try another file.');
      }
    } catch {
      setErrorMessage('The image could not be processed. Please try another file.');
    } finally {
      setIsLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await processFile(e.target.files[0]);
    }
  };

  // Clipboard paste support
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      if (!e.clipboardData) return;
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            await processFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const handleLoadSample = async (landscape = false) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const sampleFile = await createSamplePhoto(landscape);
      await processFile(sampleFile);
    } catch {
      setErrorMessage('Could not generate sample photo.');
      setIsLoading(false);
    }
  };

  return (
    <section id="upload-section" className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-12">
      {/* Hero Headline & Privacy Tag */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/80 dark:border-neutral-700/80 mb-4 shadow-2xs">
          <span>🔒</span>
          <span>Processed locally in your browser • Zero server uploads</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-white mb-3">
          Meta Spin Studio
        </h2>
        <p className="text-sm sm:text-base text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto leading-relaxed">
          Prepare your photos for compatible 3:4 portrait workflows. Crop, position, normalize color space, and strip sensitive location metadata.
        </p>
      </div>

      {/* Instagram Story Spotlight Card */}
      <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-[#f09433]/10 via-[#dc2743]/10 to-[#bc1888]/10 border border-[#dc2743]/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3 text-left">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white shadow-md shrink-0 ring-2 ring-white/50 dark:ring-neutral-800">
            <Instagram className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-neutral-900 dark:text-white">
                Share Directly to Instagram Story
              </span>
              <span className="text-[10px] font-bold bg-[#dc2743] text-white px-2 py-0.5 rounded-full">
                3:4 Portrait
              </span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
              Upload any photo, adjust framing, and tap the direct Instagram Story button to post instantly.
            </p>
          </div>
        </div>

        <button
          id="hero-load-sample-story-btn"
          onClick={() => handleLoadSample(false)}
          disabled={isLoading}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] text-white font-bold text-xs shadow-md hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
        >
          <Instagram className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>TRY SAMPLE & SHARE STORY</span>
          <Send className="w-3 h-3 opacity-90" />
        </button>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div
          id="upload-error-alert"
          className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-sm flex items-start gap-3 animate-fade-in"
          role="alert"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Unable to process file</p>
            <p className="text-xs text-red-600 dark:text-red-400 mt-0.5">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs font-medium underline hover:text-red-900 dark:hover:text-red-200 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Primary Dropzone */}
      <div
        id="upload-dropzone"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative group cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200 p-8 sm:p-14 text-center flex flex-col items-center justify-center bg-white dark:bg-neutral-900/50 shadow-sm ${
          isDragging
            ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800/40 scale-[1.01]'
            : 'border-neutral-300 dark:border-neutral-700/80 hover:border-neutral-400 dark:hover:border-neutral-600 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/80'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
          onChange={handleFileInputChange}
          className="hidden"
          id="file-upload-input"
          aria-label="Upload photo file"
        />

        {isLoading ? (
          <div className="py-8 flex flex-col items-center">
            <Loader2 className="w-10 h-10 text-neutral-900 dark:text-white animate-spin mb-3" />
            <p className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
              Reading and validating image...
            </p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
              Inspecting dimensions and EXIF metadata
            </p>
          </div>
        ) : (
          <>
            <div className="w-16 h-16 rounded-2xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-800 dark:text-neutral-200 mb-5 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-8 h-8 stroke-[1.75]" />
            </div>

            <h3 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white mb-1.5">
              Upload your photo
            </h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-4 max-w-sm">
              Drag & drop an image here or click to browse
            </p>

            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 mb-4">
              <span className="px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/60 dark:border-neutral-700/60 font-mono font-medium">
                JPG • JPEG • PNG • WEBP
              </span>
              <span className="text-neutral-400 dark:text-neutral-600">•</span>
              <span>Max 25 MB</span>
              <span className="text-neutral-400 dark:text-neutral-600">•</span>
              <span className="hidden sm:inline text-neutral-400 dark:text-neutral-500">Paste with Ctrl+V / ⌘+V</span>
            </div>

            <button
              type="button"
              id="browse-files-btn"
              className="px-5 py-2.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-medium text-xs sm:text-sm shadow-sm hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors pointer-events-none"
            >
              Select Image From Device
            </button>
          </>
        )}
      </div>

      {/* Quick Test / Sample Photos */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <span className="text-xs text-neutral-500 dark:text-neutral-400 flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          Quick test without uploading:
        </span>
        <button
          id="sample-portrait-btn"
          onClick={() => handleLoadSample(false)}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <ImageIcon className="w-3 h-3 text-neutral-400" />
          Sample Portrait (3:4)
        </button>
        <button
          id="sample-landscape-btn"
          onClick={() => handleLoadSample(true)}
          disabled={isLoading}
          className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          <ImageIcon className="w-3 h-3 text-neutral-400" />
          Sample Landscape (4:3)
        </button>
      </div>
    </section>
  );
};
