import React, { useState } from 'react';
import { Shield, Sparkles, Check, ChevronDown, Trash2, ArrowRight, Lock, Instagram, Send, Download } from 'lucide-react';
import { OUTPUT_PRESETS } from '../constants';
import { CustomMetadata, MetadataProfileType, OutputResolutionPreset } from '../types';

interface SettingsPanelProps {
  selectedPreset: OutputResolutionPreset;
  onSelectPreset: (preset: OutputResolutionPreset) => void;
  quality: number;
  onQualityChange: (quality: number) => void;
  removeOriginalMetadata: boolean;
  onToggleRemoveOriginalMetadata: (val: boolean) => void;
  removeLocationData: boolean;
  onToggleRemoveLocationData: (val: boolean) => void;
  metadataProfile: MetadataProfileType;
  onSelectMetadataProfile: (profile: MetadataProfileType) => void;
  customMetadata: CustomMetadata;
  onCustomMetadataChange: (meta: CustomMetadata) => void;
  onClearCustomMetadata: () => void;
  onPreparePhoto: () => void;
  onPrepareAndShareToStory?: () => void;
  isProcessing: boolean;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  selectedPreset,
  onSelectPreset,
  quality,
  onQualityChange,
  removeOriginalMetadata,
  onToggleRemoveOriginalMetadata,
  removeLocationData,
  onToggleRemoveLocationData,
  metadataProfile,
  onSelectMetadataProfile,
  customMetadata,
  onCustomMetadataChange,
  onClearCustomMetadata,
  onPreparePhoto,
  onPrepareAndShareToStory,
  isProcessing,
}) => {
  const [showAdvancedResolutions, setShowAdvancedResolutions] = useState(false);

  const getQualityLabel = (q: number) => {
    if (q >= 0.98) return 'Maximum Quality (Studio Archive)';
    if (q >= 0.93) return 'High Quality (Recommended)';
    if (q >= 0.88) return 'Balanced (Web & Mobile)';
    return 'Standard Quality (Compressed)';
  };

  return (
    <div id="conversion-settings-panel" className="flex flex-col gap-5 w-full">
      {/* 1. OUTPUT FORMAT & RESOLUTION CARD */}
      <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-2xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-4 flex items-center justify-between">
          <span>Output Format & Size</span>
          <span className="font-mono text-[11px] font-semibold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded">
            3:4 Portrait Ratio
          </span>
        </h3>

        {/* Format Selector */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
            Format
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className="py-2 px-3 rounded-xl border-2 border-neutral-900 dark:border-white bg-neutral-900 text-white dark:bg-white dark:text-neutral-950 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs"
            >
              <Check className="w-3.5 h-3.5" />
              JPEG (Standard)
            </button>
            <div className="py-2 px-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/40 text-neutral-400 dark:text-neutral-500 text-xs flex items-center justify-center cursor-not-allowed">
              PNG (3:4 lossy)
            </div>
          </div>
          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-1.5">
            JPEG is the standard format for 3:4 portrait workflows and EXIF metadata handling.
          </p>
        </div>

        {/* Output Resolution Preset */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
            Target Resolution
          </label>

          {/* Recommended Preset Highlight */}
          <div className="space-y-2">
            {OUTPUT_PRESETS.filter((p) => p.recommended).map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onSelectPreset(preset)}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                  selectedPreset.id === preset.id
                    ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800/80 shadow-2xs'
                    : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-neutral-900 dark:text-white">
                      {preset.name}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-neutral-900 text-white dark:bg-white dark:text-neutral-950">
                      RECOMMENDED
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {preset.aspectRatioLabel}
                  </p>
                </div>
                {selectedPreset.id === preset.id && (
                  <Check className="w-4 h-4 text-neutral-900 dark:text-white shrink-0" />
                )}
              </button>
            ))}

            {/* Advanced resolutions toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvancedResolutions(!showAdvancedResolutions)}
                className="w-full py-1.5 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 flex items-center justify-center gap-1 cursor-pointer transition-colors"
              >
                <span>Advanced Resolutions</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 transition-transform ${
                    showAdvancedResolutions ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {showAdvancedResolutions && (
                <div className="mt-2 space-y-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                  {OUTPUT_PRESETS.filter((p) => !p.recommended).map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => onSelectPreset(preset)}
                      className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                        selectedPreset.id === preset.id
                          ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800'
                          : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                      }`}
                    >
                      <div>
                        <span className="text-xs font-semibold text-neutral-900 dark:text-white">
                          {preset.name}
                        </span>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                          {preset.aspectRatioLabel}
                        </p>
                      </div>
                      {selectedPreset.id === preset.id && (
                        <Check className="w-3.5 h-3.5 text-neutral-900 dark:text-white shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quality Slider */}
        <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/80">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <label className="font-semibold text-neutral-700 dark:text-neutral-300">
              Compression Quality
            </label>
            <span className="font-mono font-medium text-neutral-800 dark:text-neutral-200">
              {Math.round(quality * 100)}%
            </span>
          </div>

          <input
            id="quality-slider"
            type="range"
            min="0.80"
            max="1.00"
            step="0.01"
            value={quality}
            onChange={(e) => onQualityChange(parseFloat(e.target.value))}
            aria-label="Compression quality"
            className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-neutral-900 dark:accent-white"
          />

          <div className="flex justify-between items-center text-[11px] text-neutral-500 dark:text-neutral-400 mt-1">
            <span>80%</span>
            <span className="font-medium text-neutral-700 dark:text-neutral-300">
              {getQualityLabel(quality)}
            </span>
            <span>100%</span>
          </div>
        </div>
      </div>

      {/* 2. PRIVACY & METADATA SETTINGS CARD */}
      <div className="p-5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-2xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-4 flex items-center gap-1.5">
          <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Privacy & Metadata</span>
        </h3>

        {/* Toggle: REMOVE ORIGINAL METADATA */}
        <div className="flex items-start justify-between py-2.5 border-b border-neutral-100 dark:border-neutral-800/80">
          <div className="pr-4">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
              Remove Original Metadata
            </span>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
              Removes unnecessary metadata from the original file.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={removeOriginalMetadata}
            onClick={() => onToggleRemoveOriginalMetadata(!removeOriginalMetadata)}
            className={`w-11 h-6 shrink-0 rounded-full transition-colors relative cursor-pointer ${
              removeOriginalMetadata
                ? 'bg-neutral-900 dark:bg-white'
                : 'bg-neutral-300 dark:bg-neutral-700'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${
                removeOriginalMetadata
                  ? 'translate-x-5 bg-white dark:bg-neutral-900'
                  : 'translate-x-0 bg-white'
              }`}
            />
          </button>
        </div>

        {/* Toggle: REMOVE LOCATION DATA */}
        <div className="flex items-start justify-between py-2.5 border-b border-neutral-100 dark:border-neutral-800/80">
          <div className="pr-4">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-800 dark:text-neutral-200">
              Remove Location Data
            </span>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
              Removes GPS and location-related metadata from the exported image.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={removeLocationData}
            onClick={() => onToggleRemoveLocationData(!removeLocationData)}
            className={`w-11 h-6 shrink-0 rounded-full transition-colors relative cursor-pointer ${
              removeLocationData
                ? 'bg-emerald-600 dark:bg-emerald-500'
                : 'bg-neutral-300 dark:bg-neutral-700'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full transition-transform ${
                removeLocationData ? 'translate-x-5 bg-white' : 'translate-x-0 bg-white'
              }`}
            />
          </button>
        </div>

        {/* METADATA PROFILE SECTION */}
        <div className="pt-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 mb-2">
            Metadata Profile
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onSelectMetadataProfile('standard-clean')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                metadataProfile === 'standard-clean'
                  ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800/80 shadow-2xs'
                  : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
              }`}
            >
              <span className="text-xs font-bold block text-neutral-900 dark:text-white">
                Standard Clean
              </span>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block mt-0.5">
                Minimal EXIF, no GPS
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSelectMetadataProfile('camera-style')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                metadataProfile === 'camera-style'
                  ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800/80 shadow-2xs'
                  : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
              }`}
            >
              <span className="text-xs font-bold block text-neutral-900 dark:text-white">
                Camera-Style
              </span>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block mt-0.5">
                Portrait EXIF profile
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSelectMetadataProfile('custom')}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                metadataProfile === 'custom'
                  ? 'border-neutral-900 dark:border-white bg-neutral-50 dark:bg-neutral-800/80 shadow-2xs'
                  : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
              }`}
            >
              <span className="text-xs font-bold block text-neutral-900 dark:text-white">
                Custom Profile
              </span>
              <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block mt-0.5">
                User-defined fields
              </span>
            </button>
          </div>

          {/* Profile explanations & disclaimer badges */}
          {metadataProfile === 'camera-style' && (
            <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200 text-xs">
              <p className="font-semibold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                Formatting profile — does not certify the image was captured with this device.
              </p>
              <p className="text-[11px] text-amber-800 dark:text-amber-300/90 mt-1 leading-relaxed">
                Applies standard 3:4 portrait lens and aspect ratio metadata tags. No false authenticity or device origins are claimed.
              </p>
            </div>
          )}

          {metadataProfile === 'standard-clean' && (
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-2">
              Exports a pristine sRGB JPEG with stripped private identifiers and zero location tags.
            </p>
          )}

          {/* CUSTOM METADATA EDITABLE FIELDS */}
          {metadataProfile === 'custom' && (
            <div className="mt-3 p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200 dark:border-neutral-700/80 space-y-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  Custom EXIF Tags
                </span>
                <button
                  type="button"
                  onClick={onClearCustomMetadata}
                  className="text-[11px] text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear Custom Data
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400 mb-0.5">
                  Software Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Meta Spin Studio"
                  value={customMetadata.software}
                  onChange={(e) =>
                    onCustomMetadataChange({ ...customMetadata, software: e.target.value })
                  }
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400 mb-0.5">
                    Artist / Creator
                  </label>
                  <input
                    type="text"
                    placeholder="Optional author"
                    value={customMetadata.artist}
                    onChange={(e) =>
                      onCustomMetadataChange({ ...customMetadata, artist: e.target.value })
                    }
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400 mb-0.5">
                    Copyright
                  </label>
                  <input
                    type="text"
                    placeholder="© 2026"
                    value={customMetadata.copyright}
                    onChange={(e) =>
                      onCustomMetadataChange({ ...customMetadata, copyright: e.target.value })
                    }
                    className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-600 dark:text-neutral-400 mb-0.5">
                  Image Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Portrait photo prepared for 3:4 aspect"
                  value={customMetadata.description}
                  onChange={(e) =>
                    onCustomMetadataChange({ ...customMetadata, description: e.target.value })
                  }
                  className="w-full text-xs px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
                />
              </div>

              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 pt-1">
                Custom metadata is embedded only if supported by the selected export format.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 3. PRIMARY ACTIONS: SHARE TO DIRECT INSTAGRAM STORY & PREPARE (Sticky on mobile) */}
      <div className="pt-2 sticky bottom-4 z-30 sm:static space-y-2.5">
        {/* SHARE TO DIRECT INSTAGRAM STORY BUTTON with Instagram setup icon */}
        <button
          id="editor-share-to-instagram-story-btn"
          type="button"
          onClick={onPrepareAndShareToStory || onPreparePhoto}
          disabled={isProcessing}
          className="w-full py-4 px-5 rounded-2xl bg-gradient-to-r from-[#f09433] via-[#e6683c] via-[#dc2743] via-[#cc2366] to-[#bc1888] text-white font-bold shadow-xl hover:opacity-95 hover:shadow-2xl active:scale-[0.99] transition-all flex items-center justify-between gap-3 cursor-pointer disabled:opacity-50 group border border-white/20"
        >
          {/* Instagram Setup Icon */}
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center border border-white/40 shadow-sm group-hover:scale-105 transition-transform shrink-0">
            <Instagram className="w-5 h-5 stroke-[2.3] text-white" />
          </div>

          <div className="flex flex-col items-start text-left leading-tight flex-1">
            <span className="font-extrabold tracking-wide text-sm sm:text-base">
              SHARE TO DIRECT INSTAGRAM STORY
            </span>
            <span className="text-[11px] text-white/90 font-medium mt-0.5">
              Formats 3:4 portrait & opens Instagram Story
            </span>
          </div>

          <div className="w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
            <Send className="w-4 h-4 stroke-[2.5]" />
          </div>
        </button>

        {/* PREPARE & DOWNLOAD FILE BUTTON */}
        <button
          id="prepare-photo-btn"
          onClick={onPreparePhoto}
          disabled={isProcessing}
          className="w-full py-3 px-5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 font-bold text-xs sm:text-sm shadow-md hover:bg-neutral-800 dark:hover:bg-neutral-100 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>PREPARE & DOWNLOAD JPEG</span>
        </button>

        <p className="text-center text-[11px] text-neutral-500 dark:text-neutral-400 mt-2 flex items-center justify-center gap-1">
          <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span>Local client-side processing • {selectedPreset.width} × {selectedPreset.height} px sRGB</span>
        </p>
      </div>
    </div>
  );
};
