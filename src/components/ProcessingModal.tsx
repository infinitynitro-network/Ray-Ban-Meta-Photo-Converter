import React from 'react';
import { Loader2, ShieldCheck, Sparkles } from 'lucide-react';

interface ProcessingModalProps {
  isOpen: boolean;
  stepMessage: string;
  progressPercent: number;
}

export const ProcessingModal: React.FC<ProcessingModalProps> = ({
  isOpen,
  stepMessage,
  progressPercent,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="processing-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="processing-modal-title"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 shadow-2xl text-center">
        {/* Animated Icon */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center mb-4 shadow-lg">
          <Loader2 className="w-7 h-7 animate-spin" />
        </div>

        <h3
          id="processing-modal-title"
          className="text-base font-bold text-neutral-900 dark:text-white mb-1"
        >
          Preparing your photo
        </h3>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-5">
          {stepMessage || 'Optimizing composition...'}
        </p>

        {/* Progress Bar */}
        <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden mb-3">
          <div
            className="bg-neutral-900 dark:bg-white h-full rounded-full transition-all duration-150 ease-out"
            style={{ width: `${Math.max(8, progressPercent)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400 font-mono">
          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-sans font-medium">
            <ShieldCheck className="w-3 h-3" />
            Client-Side Processing
          </span>
          <span>{Math.round(progressPercent)}%</span>
        </div>

        <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-[10px] text-neutral-400 dark:text-neutral-500 flex items-center justify-center gap-1">
          <Sparkles className="w-3 h-3" />
          <span>Encoding 3:4 portrait resolution in sRGB</span>
        </div>
      </div>
    </div>
  );
};
