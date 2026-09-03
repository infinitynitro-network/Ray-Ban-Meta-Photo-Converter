import React, { useState } from 'react';
import { ShieldCheck, Sliders, Layers, FileImage, Info } from 'lucide-react';
import { LoadedImageSource, OutputResolutionPreset, MetadataProfileType } from '../types';
import { formatBytes } from '../utils/fileDownloader';

interface ComparisonViewProps {
  imageSource: LoadedImageSource;
  selectedPreset: OutputResolutionPreset;
  metadataProfile: MetadataProfileType;
  removeLocationData: boolean;
  removeOriginalMetadata: boolean;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  imageSource,
  selectedPreset,
  metadataProfile,
  removeLocationData,
  removeOriginalMetadata,
}) => {
  const [activeTab, setActiveTab] = useState<'split' | 'original' | 'prepared'>('split');
  const [sliderPosition, setSliderPosition] = useState(50);

  const getProfileLabel = () => {
    if (metadataProfile === 'camera-style') return 'Camera-Style (Formatting profile)';
    if (metadataProfile === 'custom') return 'Custom User EXIF';
    return 'Standard Clean (No metadata)';
  };

  return (
    <div className="w-full mt-8 p-5 sm:p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-2xs">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-neutral-100 dark:border-neutral-800">
        <div>
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
            <span>Workflow Inspection: Original vs. Prepared</span>
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Compare source image attributes with the prepared 3:4 target format.
          </p>
        </div>

        {/* Segmented Control */}
        <div className="inline-flex p-1 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('original')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'original'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Original
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('split')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'split'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Split View
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('prepared')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'prepared'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Prepared
          </button>
        </div>
      </div>

      {/* Interactive Visual Split / Preview Stage */}
      <div className="relative w-full h-64 sm:h-80 rounded-xl overflow-hidden bg-neutral-950 flex items-center justify-center mb-6 select-none">
        {activeTab === 'original' && (
          <div className="w-full h-full flex items-center justify-center p-4">
            <img
              src={imageSource.objectUrl}
              alt="Original preview"
              className="max-h-full max-w-full object-contain rounded-md shadow-lg"
            />
            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-sm text-white text-[11px] font-bold">
              ORIGINAL SOURCE
            </span>
          </div>
        )}

        {activeTab === 'prepared' && (
          <div className="w-full h-full flex items-center justify-center p-4">
            <div className="h-full aspect-[3/4] relative overflow-hidden rounded-md border-2 border-white/40 shadow-2xl bg-neutral-900 flex items-center justify-center">
              <img
                src={imageSource.objectUrl}
                alt="Prepared preview framing"
                className="w-full h-full object-cover"
              />
            </div>
            <span className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/75 backdrop-blur-sm text-emerald-400 text-[11px] font-bold">
              PREPARED 3:4 PORTRAIT
            </span>
          </div>
        )}

        {activeTab === 'split' && (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            {/* Background Original */}
            <div className="absolute inset-0 flex items-center justify-center p-4">
              <img
                src={imageSource.objectUrl}
                alt="Original background"
                className="max-h-full max-w-full object-contain opacity-50 filter blur-[1px]"
              />
            </div>

            {/* Framed 3:4 Crop comparison */}
            <div className="relative h-full aspect-[3/4] overflow-hidden rounded-md border-2 border-white/60 shadow-2xl bg-black">
              {/* Prepared Layer */}
              <img
                src={imageSource.objectUrl}
                alt="Prepared 3:4 crop layer"
                className="w-full h-full object-cover"
              />

              {/* Slider overlay */}
              <div
                className="absolute inset-0 bg-neutral-900/60 pointer-events-none"
                style={{
                  clipPath: `inset(0 ${100 - sliderPosition}% 0 0)`,
                }}
              >
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-[11px] font-mono text-white/90 bg-black/60 px-2 py-0.5 rounded">
                    Framed 3:4 Area
                  </span>
                </div>
              </div>

              {/* Slider Divider Line */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white text-neutral-900 flex items-center justify-center text-[10px] font-bold shadow-md">
                  ⇄
                </div>
              </div>
            </div>

            {/* Range Slider for Interaction */}
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={(e) => setSliderPosition(Number(e.target.value))}
              className="absolute inset-0 opacity-0 cursor-ew-resize w-full h-full z-20"
              aria-label="Drag split comparison slider"
            />

            <div className="absolute bottom-3 left-4 right-4 flex justify-between pointer-events-none">
              <span className="px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-medium backdrop-blur-xs">
                Original Aspect
              </span>
              <span className="px-2 py-0.5 rounded bg-black/70 text-emerald-300 text-[10px] font-medium backdrop-blur-xs">
                3:4 Portrait Output
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Information Cards: ORIGINAL vs PREPARED */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Original Specs Card */}
        <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/70">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
              <FileImage className="w-3.5 h-3.5 text-neutral-500" />
              ORIGINAL SOURCE
            </span>
            <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 bg-neutral-200/60 dark:bg-neutral-700/60 px-2 py-0.5 rounded">
              {imageSource.metadata.format}
            </span>
          </div>

          <ul className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-300">
            <li className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400">Dimensions:</span>
              <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">
                {imageSource.width} × {imageSource.height} px
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400">Aspect Ratio:</span>
              <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">
                {imageSource.aspectRatio.toFixed(2)}:1 ({imageSource.aspectRatio <= 1 ? 'Portrait' : 'Landscape'})
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400">File Size:</span>
              <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">
                {formatBytes(imageSource.metadata.fileSizeBytes)}
              </span>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-neutral-500 dark:text-neutral-400">Original GPS:</span>
              <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded ${
                imageSource.metadata.hasGps
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  : 'text-neutral-500 dark:text-neutral-400'
              }`}>
                {imageSource.metadata.hasGps ? 'Present in file' : 'None detected'}
              </span>
            </li>
          </ul>
        </div>

        {/* Prepared Specs Card */}
        <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/70">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              PREPARED TARGET
            </span>
            <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
              JPEG • 3:4
            </span>
          </div>

          <ul className="space-y-1.5 text-xs text-neutral-600 dark:text-neutral-300">
            <li className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400">Target Resolution:</span>
              <span className="font-mono font-bold text-neutral-900 dark:text-white">
                {selectedPreset.width} × {selectedPreset.height} px
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400">Aspect Ratio:</span>
              <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">
                3:4 Portrait (0.75)
              </span>
            </li>
            <li className="flex justify-between">
              <span className="text-neutral-500 dark:text-neutral-400">Metadata Profile:</span>
              <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate max-w-[180px]">
                {getProfileLabel()}
              </span>
            </li>
            <li className="flex justify-between items-center">
              <span className="text-neutral-500 dark:text-neutral-400">Privacy Status:</span>
              <span className="text-[11px] font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                {removeLocationData ? 'GPS location stripped' : 'GPS preserved'}
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Transparent Disclaimer Notice */}
      <div className="mt-4 p-2.5 rounded-lg bg-neutral-100/70 dark:bg-neutral-800/40 text-[11px] text-neutral-500 dark:text-neutral-400 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-neutral-400" />
        <span>
          Note: This tool formats dimensions and metadata locally. Compatibility with third-party social media apps, effects, and features may vary.
        </span>
      </div>
    </div>
  );
};
