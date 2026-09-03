/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { UploadArea } from './components/UploadArea';
import { CropEditor } from './components/CropEditor';
import { SettingsPanel } from './components/SettingsPanel';
import { ComparisonView } from './components/ComparisonView';
import { ProcessingModal } from './components/ProcessingModal';
import { SuccessView } from './components/SuccessView';
import { HowItWorks } from './components/HowItWorks';
import { Footer } from './components/Footer';
import { ClearSessionModal, PrivacyModal, DisclaimerModal } from './components/Modals';
import { OUTPUT_PRESETS } from './constants';
import {
  AppStep,
  CropTransform,
  CustomMetadata,
  LoadedImageSource,
  MetadataProfileType,
  OutputResolutionPreset,
  ProcessedResult,
} from './types';
import { renderProcessedImage } from './utils/canvasRenderer';
import { applyTheme, getInitialTheme, ThemeMode } from './utils/storageManager';
import { AlertCircle, RotateCcw, Instagram, Send } from 'lucide-react';

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<ThemeMode>('light');

  useEffect(() => {
    const initial = getInitialTheme();
    setTheme(initial);
    applyTheme(initial);
  }, []);

  const handleToggleTheme = () => {
    const next: ThemeMode = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    applyTheme(next);
  };

  // Workflow state
  const [step, setStep] = useState<AppStep>('upload');
  const [isLoadingImage, setIsLoadingImage] = useState(false);
  const [activeImage, setActiveImage] = useState<LoadedImageSource | null>(null);
  const [autoTriggerStory, setAutoTriggerStory] = useState(false);

  // Transform & crop state
  const [transform, setTransform] = useState<CropTransform>({
    zoom: 1.0,
    xOffset: 0,
    yOffset: 0,
    rotation: 0,
  });
  const [cropBoxDimensions, setCropBoxDimensions] = useState({ width: 360, height: 480 });

  // Conversion options
  const [selectedPreset, setSelectedPreset] = useState<OutputResolutionPreset>(OUTPUT_PRESETS[0]);
  const [quality, setQuality] = useState<number>(0.95);
  const [removeOriginalMetadata, setRemoveOriginalMetadata] = useState<boolean>(true);
  const [removeLocationData, setRemoveLocationData] = useState<boolean>(true);
  const [metadataProfile, setMetadataProfile] = useState<MetadataProfileType>('standard-clean');
  const [customMetadata, setCustomMetadata] = useState<CustomMetadata>({
    software: 'Meta Spin Studio',
    artist: '',
    copyright: '',
    description: '',
    dateCreated: '',
  });

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStep, setProcessingStep] = useState('');
  const [processingError, setProcessingError] = useState<string | null>(null);
  const [processedResult, setProcessedResult] = useState<ProcessedResult | null>(null);

  // Modals
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showDisclaimerModal, setShowDisclaimerModal] = useState(false);

  // Handle uploaded image
  const handleImageLoaded = (imgSource: LoadedImageSource) => {
    // Revoke previous object URLs if replacing
    if (activeImage && activeImage.objectUrl.startsWith('blob:')) {
      URL.revokeObjectURL(activeImage.objectUrl);
    }
    if (processedResult && processedResult.objectUrl.startsWith('blob:')) {
      URL.revokeObjectURL(processedResult.objectUrl);
    }

    setActiveImage(imgSource);
    setProcessedResult(null);
    setProcessingError(null);
    setAutoTriggerStory(false);
    setTransform({ zoom: 1.0, xOffset: 0, yOffset: 0, rotation: 0 });
    setStep('edit');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Clear session / reset
  const handleClearSession = useCallback(() => {
    if (activeImage && activeImage.objectUrl.startsWith('blob:')) {
      URL.revokeObjectURL(activeImage.objectUrl);
    }
    if (processedResult && processedResult.objectUrl.startsWith('blob:')) {
      URL.revokeObjectURL(processedResult.objectUrl);
    }

    setActiveImage(null);
    setProcessedResult(null);
    setProcessingError(null);
    setAutoTriggerStory(false);
    setTransform({ zoom: 1.0, xOffset: 0, yOffset: 0, rotation: 0 });
    setShowClearConfirm(false);
    setStep('upload');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeImage, processedResult]);

  // Execute processing
  const handlePreparePhoto = async (triggerStory = false) => {
    if (!activeImage) return;

    setAutoTriggerStory(triggerStory);
    setIsProcessing(true);
    setProcessingProgress(10);
    setProcessingStep('Validating image and crop parameters...');
    setProcessingError(null);

    try {
      const result = await renderProcessedImage({
        imageSource: activeImage,
        transform,
        cropBoxWidth: cropBoxDimensions.width,
        cropBoxHeight: cropBoxDimensions.height,
        targetWidth: selectedPreset.width,
        targetHeight: selectedPreset.height,
        quality,
        metadataProfile,
        removeOriginalMetadata,
        removeLocationData,
        customMetadata: metadataProfile === 'custom' ? customMetadata : undefined,
        onProgress: (stepName, percent) => {
          setProcessingStep(stepName);
          setProcessingProgress(percent);
        },
      });

      setProcessedResult(result);
      setStep('success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: unknown) {
      console.error('Image processing failed:', err);
      const msg = err instanceof Error ? err.message : 'Unknown rendering failure.';
      if (msg.includes('memory') || msg.includes('allocate')) {
        setProcessingError('Your browser ran out of memory while processing this image at high resolution. Try selecting a smaller preset like 1512×2016.');
      } else {
        setProcessingError('The image could not be processed. Please verify your photo file and try again.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrepareAndShareToStory = () => {
    handlePreparePhoto(true);
  };

  const handleClearCustomData = () => {
    setCustomMetadata({
      software: '',
      artist: '',
      copyright: '',
      description: '',
      dateCreated: '',
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fbfbfd] dark:bg-[#0a0a0c] text-neutral-900 dark:text-neutral-100 transition-colors">
      {/* Top Header */}
      <Header
        theme={theme}
        onToggleTheme={handleToggleTheme}
        hasActiveImage={!!activeImage}
        onClearSessionClick={() => setShowClearConfirm(true)}
        onOpenPrivacy={() => setShowPrivacyModal(true)}
        onOpenDisclaimer={() => setShowDisclaimerModal(true)}
        onOpenHowItWorks={() => {
          const el = document.getElementById('how-it-works-section');
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
          } else {
            setShowPrivacyModal(true);
          }
        }}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Processing Error Notice */}
        {processingError && (
          <div
            id="processing-error-banner"
            className="mb-6 p-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/60 text-red-800 dark:text-red-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <div>
                <p className="font-bold text-sm">Processing Error</p>
                <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">{processingError}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center">
              <button
                onClick={handlePreparePhoto}
                className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 transition-colors cursor-pointer"
              >
                TRY AGAIN
              </button>
              <button
                onClick={handleClearSession}
                className="px-3 py-1.5 rounded-lg border border-red-300 dark:border-red-800 text-red-700 dark:text-red-300 text-xs font-semibold hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors cursor-pointer"
              >
                START OVER
              </button>
            </div>
          </div>
        )}

        {/* STEP 1: UPLOAD AREA */}
        {step === 'upload' && (
          <>
            <UploadArea
              onImageLoaded={handleImageLoaded}
              isLoading={isLoadingImage}
              setIsLoading={setIsLoadingImage}
            />
            <HowItWorks />
          </>
        )}

        {/* STEP 2: IMAGE EDITOR & SETTINGS */}
        {step === 'edit' && activeImage && (
          <div className="animate-fade-in">
            {/* Top Spotlight Banner: Direct Share to Instagram Story */}
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-[#f09433]/15 via-[#dc2743]/15 to-[#bc1888]/15 border-2 border-[#dc2743]/40 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-md animate-fade-in">
              <div className="flex items-center gap-3.5 text-left">
                {/* Instagram setup icon */}
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] flex items-center justify-center text-white shadow-md shrink-0 ring-2 ring-white/60 dark:ring-neutral-800">
                  <Instagram className="w-6 h-6 stroke-[2.3]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-extrabold text-neutral-900 dark:text-white">
                      Share Directly to Instagram Story
                    </h3>
                    <span className="text-[10px] font-bold bg-[#dc2743] text-white px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                      3:4 Story Format
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 mt-0.5">
                    Position your photo, then tap to prepare and post directly to your Instagram Story.
                  </p>
                </div>
              </div>

              <button
                id="top-share-to-instagram-story-btn"
                onClick={handlePrepareAndShareToStory}
                disabled={isProcessing}
                className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#f09433] via-[#e6683c] via-[#dc2743] via-[#cc2366] to-[#bc1888] text-white font-extrabold text-sm sm:text-base shadow-lg hover:shadow-xl hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-2.5 shrink-0 cursor-pointer disabled:opacity-50 group border border-white/20"
              >
                <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center border border-white/30">
                  <Instagram className="w-4 h-4 stroke-[2.4] text-white" />
                </div>
                <span>SHARE TO DIRECT INSTAGRAM STORY</span>
                <Send className="w-3.5 h-3.5 opacity-90 stroke-[2.5]" />
              </button>
            </div>

            {/* Navigation back and active file metadata chip */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 pb-3 border-b border-neutral-200/80 dark:border-neutral-800/80">
              <div className="flex items-center gap-2">
                <button
                  id="editor-back-btn"
                  onClick={() => setShowClearConfirm(true)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white cursor-pointer px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Choose Another Photo</span>
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                <span className="truncate max-w-[160px] sm:max-w-xs font-sans text-neutral-800 dark:text-neutral-200 font-medium">
                  {activeImage.name}
                </span>
                <span>•</span>
                <span>{activeImage.width}×{activeImage.height}</span>
              </div>
            </div>

            {/* Editor Layout: Left Preview / Crop, Right Settings */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Side: Interactive 3:4 Crop Editor */}
              <div className="lg:col-span-7 flex flex-col items-center">
                <CropEditor
                  imageSource={activeImage}
                  transform={transform}
                  onTransformChange={setTransform}
                  onCropBoxMeasured={setCropBoxDimensions}
                />
              </div>

              {/* Right Side: Conversion Settings Panel */}
              <div className="lg:col-span-5">
                <SettingsPanel
                  selectedPreset={selectedPreset}
                  onSelectPreset={setSelectedPreset}
                  quality={quality}
                  onQualityChange={setQuality}
                  removeOriginalMetadata={removeOriginalMetadata}
                  onToggleRemoveOriginalMetadata={setRemoveOriginalMetadata}
                  removeLocationData={removeLocationData}
                  onToggleRemoveLocationData={setRemoveLocationData}
                  metadataProfile={metadataProfile}
                  onSelectMetadataProfile={setMetadataProfile}
                  customMetadata={customMetadata}
                  onCustomMetadataChange={setCustomMetadata}
                  onClearCustomMetadata={handleClearCustomData}
                  onPreparePhoto={() => handlePreparePhoto(false)}
                  onPrepareAndShareToStory={handlePrepareAndShareToStory}
                  isProcessing={isProcessing}
                />
              </div>
            </div>

            {/* Before / After Inspection Section */}
            <ComparisonView
              imageSource={activeImage}
              selectedPreset={selectedPreset}
              metadataProfile={metadataProfile}
              removeLocationData={removeLocationData}
              removeOriginalMetadata={removeOriginalMetadata}
            />
          </div>
        )}

        {/* STEP 3: SUCCESS & DOWNLOAD */}
        {step === 'success' && processedResult && (
          <SuccessView
            processedResult={processedResult}
            autoTriggerStory={autoTriggerStory}
            onEditAgain={() => {
              setStep('edit');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onUploadNew={handleClearSession}
          />
        )}
      </main>

      {/* Footer */}
      <Footer
        onOpenPrivacy={() => setShowPrivacyModal(true)}
        onOpenDisclaimer={() => setShowDisclaimerModal(true)}
        onOpenHowItWorks={() => {
          if (step !== 'upload') {
            setShowPrivacyModal(true);
          } else {
            const el = document.getElementById('how-it-works-section');
            el?.scrollIntoView({ behavior: 'smooth' });
          }
        }}
      />

      {/* Processing Animation Modal */}
      <ProcessingModal
        isOpen={isProcessing}
        stepMessage={processingStep}
        progressPercent={processingProgress}
      />

      {/* Clear Session Confirmation Modal */}
      <ClearSessionModal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        onConfirmClear={handleClearSession}
      />

      {/* Privacy Policy Modal */}
      <PrivacyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />

      {/* Disclaimer Modal */}
      <DisclaimerModal
        isOpen={showDisclaimerModal}
        onClose={() => setShowDisclaimerModal(false)}
      />
    </div>
  );
}
