import React, { useEffect, useState } from 'react';
import { Download, Check, RefreshCw, Upload, ShieldCheck, Sparkles, Instagram, Send, Info, ExternalLink } from 'lucide-react';
import confetti from 'canvas-confetti';
import { ProcessedResult } from '../types';
import { downloadImageFile, formatBytes } from '../utils/fileDownloader';

interface SuccessViewProps {
  processedResult: ProcessedResult;
  onEditAgain: () => void;
  onUploadNew: () => void;
  autoTriggerStory?: boolean;
}

export const SuccessView: React.FC<SuccessViewProps> = ({
  processedResult,
  onEditAgain,
  onUploadNew,
  autoTriggerStory = false,
}) => {
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [showStoryGuide, setShowStoryGuide] = useState(false);

  // Fire subtle celebratory confetti
  useEffect(() => {
    try {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#10b981', '#6366f1', '#f59e0b', '#3b82f6'],
        disableForReducedMotion: true,
      });
    } catch {
      // ignore
    }
  }, []);

  const handleDownload = () => {
    downloadImageFile(processedResult.objectUrl, processedResult.filename);
  };

  // Direct Share to Instagram Story handler
  const handleShareToInstagramStory = async () => {
    setIsSharing(true);
    setShareStatus(null);

    const file = new File([processedResult.blob], processedResult.filename, {
      type: 'image/jpeg',
    });

    // Try copying image to system clipboard (for iOS / Android paste sticker into Instagram Story)
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/jpeg': processedResult.blob }),
        ]);
      }
    } catch {
      // clipboard write might not be allowed in all contexts
    }

    // 1. Check if Web Share API with file support is available
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: '3:4 Portrait Photo for Instagram Story',
          text: 'Prepared for Instagram Story with Meta Spin Studio',
        });
        setShareStatus('Share dialog opened! Tap Instagram or Instagram Stories to post.');
        setIsSharing(false);
        return;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') {
          setIsSharing(false);
          return;
        }
      }
    }

    // 2. Direct deep link & fallback flow:
    // Auto-save photo into device's Camera Roll / Downloads
    handleDownload();

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      // Try Instagram Story Camera direct URI scheme
      const storyUri = 'instagram-stories://share';
      const cameraUri = 'instagram://camera';

      window.location.href = storyUri;

      setTimeout(() => {
        window.location.href = cameraUri;
      }, 800);

      setTimeout(() => {
        window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
      }, 1600);

      setShareStatus('Photo saved! Opening Instagram Story camera. Swipe up to pick from your camera roll.');
    } else {
      // Desktop: Open Instagram Web Story creator
      window.open('https://www.instagram.com/stories/create/', '_blank', 'noopener,noreferrer');
      setShareStatus('Photo saved to downloads! Opening Instagram web story creator.');
    }

    setShowStoryGuide(true);
    setIsSharing(false);
  };

  // Auto trigger if requested from editor
  useEffect(() => {
    if (autoTriggerStory) {
      const timer = setTimeout(() => {
        handleShareToInstagramStory();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [autoTriggerStory]);

  return (
    <section id="success-section" className="w-full max-w-4xl mx-auto px-4 py-8 sm:py-12 animate-fade-in">
      {/* Header with animated Checkmark */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center mb-4 shadow-sm border border-emerald-200/80 dark:border-emerald-800">
          <Check className="w-8 h-8 stroke-[2.5]" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
          Your photo is ready
        </h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1 max-w-md mx-auto">
          Your image has been prepared in standard 3:4 portrait resolution with stripped location metadata.
        </p>
      </div>

      {/* Main Card: Image Preview & Details */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center p-6 sm:p-8 rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-sm mb-6">
        {/* Left: 3:4 Portrait Preview Frame */}
        <div className="md:col-span-6 flex items-center justify-center">
          <div className="w-full max-w-[280px] sm:max-w-[320px] aspect-[3/4] rounded-2xl overflow-hidden bg-neutral-950 shadow-2xl relative border-2 border-neutral-200 dark:border-neutral-800 group">
            <img
              src={processedResult.objectUrl}
              alt="Final prepared 3:4 portrait"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 right-3 px-2 py-1 rounded-md bg-black/75 backdrop-blur-sm text-white text-[10px] font-mono font-bold">
              3:4 PORTRAIT
            </div>
            <div className="absolute bottom-3 left-3 right-3 p-2 rounded-lg bg-black/70 backdrop-blur-sm text-white text-[10px] flex items-center justify-between opacity-90">
              <span className="font-mono">{processedResult.width} × {processedResult.height}</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                sRGB
              </span>
            </div>
          </div>
        </div>

        {/* Right: Technical Output Specifications & Download Actions */}
        <div className="md:col-span-6 flex flex-col justify-between h-full">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/60 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Optimized 3:4 Portrait Ready</span>
            </div>

            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-2">
              Export Specification
            </h3>

            {/* Spec List */}
            <div className="space-y-2 mb-4 text-xs text-neutral-600 dark:text-neutral-300">
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Target Resolution:</span>
                  <span className="font-mono font-bold text-neutral-900 dark:text-white">
                    {processedResult.width} × {processedResult.height} px
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Aspect Ratio:</span>
                  <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">
                    3:4 Portrait (Instagram Story Compatible)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Output File Size:</span>
                  <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">
                    {formatBytes(processedResult.fileSizeBytes)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Compression:</span>
                  <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">
                    JPEG ({Math.round(processedResult.quality * 100)}%)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-500 dark:text-neutral-400">Filename:</span>
                  <span className="font-mono text-[11px] text-neutral-700 dark:text-neutral-300 truncate max-w-[180px]">
                    {processedResult.filename}
                  </span>
                </div>
              </div>

              {/* Privacy Verification Pill */}
              <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/50 text-[11px] text-emerald-800 dark:text-emerald-300">
                <p className="font-semibold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Privacy & Metadata Policy Verified
                </p>
                <p className="mt-0.5 text-emerald-700 dark:text-emerald-400">
                  {processedResult.statusMessage}
                </p>
              </div>
            </div>
          </div>

          {/* Share Status Toast */}
          {shareStatus && (
            <div className="mb-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-900 dark:text-amber-200 flex items-start justify-between gap-2 animate-fade-in">
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <span className="flex-1">{shareStatus}</span>
              <button
                onClick={() => setShareStatus(null)}
                className="text-amber-500 hover:text-amber-800 dark:hover:text-white cursor-pointer font-bold px-1"
              >
                ×
              </button>
            </div>
          )}

          {/* Story Quick Guide */}
          {showStoryGuide && (
            <div className="mb-3 p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 text-[11px] text-neutral-700 dark:text-neutral-300 space-y-1">
              <p className="font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
                <Instagram className="w-3.5 h-3.5 text-[#e1306c]" />
                How to post to Instagram Story:
              </p>
              <p>1. Open Instagram Story Camera</p>
              <p>2. Swipe up to pick your prepared 3:4 portrait from Camera Roll (or paste from clipboard)</p>
              <p>3. Add any story stickers or effects and share to your Story or Close Friends!</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2.5">
            {/* Direct Instagram Story Button with setup Instagram icon */}
            <button
              id="share-to-instagram-story-btn"
              onClick={handleShareToInstagramStory}
              disabled={isSharing}
              className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-[#f09433] via-[#e6683c] via-[#dc2743] via-[#cc2366] to-[#bc1888] text-white font-extrabold text-sm sm:text-base shadow-xl hover:shadow-2xl hover:opacity-95 active:scale-[0.99] transition-all flex items-center justify-between gap-3 cursor-pointer disabled:opacity-50 group border border-white/20"
            >
              {/* Setup Instagram icon in white-frosted rounded box */}
              <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/40 shadow-xs group-hover:scale-105 transition-transform shrink-0">
                <Instagram className="w-4.5 h-4.5 stroke-[2.3] text-white" />
              </div>

              <div className="flex flex-col items-start text-left leading-tight flex-1">
                <span className="font-extrabold tracking-wide text-sm sm:text-base">
                  SHARE TO DIRECT INSTAGRAM STORY
                </span>
                <span className="text-[11px] text-white/90 font-medium mt-0.5">
                  Direct share sheet & deep link
                </span>
              </div>

              <div className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
                <Send className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
            </button>

            {/* Standard Download Button */}
            <button
              id="download-image-btn"
              onClick={handleDownload}
              className="w-full py-3 px-5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-bold text-xs sm:text-sm shadow-md hover:bg-neutral-800 dark:hover:bg-neutral-100 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 stroke-[2.5]" />
              <span>DOWNLOAD IMAGE (JPEG)</span>
            </button>

            <div className="grid grid-cols-2 gap-2">
              <button
                id="edit-again-btn"
                onClick={onEditAgain}
                className="py-2.5 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>EDIT AGAIN</span>
              </button>
              <button
                id="upload-new-photo-btn"
                onClick={onUploadNew}
                className="py-2.5 px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>UPLOAD NEW</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
