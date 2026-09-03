import React from 'react';
import { Camera, ShieldCheck } from 'lucide-react';
import { DISCLAIMER_SHORT } from '../constants';

interface FooterProps {
  onOpenPrivacy: () => void;
  onOpenDisclaimer: () => void;
  onOpenHowItWorks: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenPrivacy,
  onOpenDisclaimer,
  onOpenHowItWorks,
}) => {
  return (
    <footer id="app-footer" className="w-full border-t border-neutral-200/80 dark:border-neutral-800/80 bg-white/60 dark:bg-neutral-950/60 backdrop-blur-xs py-8 mt-16 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Brand and Tagline */}
        <div className="flex flex-col sm:flex-row items-center gap-3 text-center sm:text-left">
          <div className="w-8 h-8 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-950 flex items-center justify-center">
            <Camera className="w-4 h-4 stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <span className="font-bold text-xs uppercase tracking-wider text-neutral-900 dark:text-white">
                Meta Spin Studio
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                <ShieldCheck className="w-3 h-3" />
                Browser-Side Only
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Private photo preparation, directly in your browser.
            </p>
          </div>
        </div>

        {/* Links */}
        <div className="flex items-center gap-5 text-xs text-neutral-600 dark:text-neutral-400 font-medium">
          <button
            onClick={onOpenHowItWorks}
            className="hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            How It Works
          </button>
          <button
            onClick={onOpenPrivacy}
            className="hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            Privacy
          </button>
          <button
            onClick={onOpenDisclaimer}
            className="hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            Disclaimer
          </button>
        </div>
      </div>

      {/* Disclaimers line */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 pt-4 border-t border-neutral-100 dark:border-neutral-900 text-center">
        <p className="text-[11px] text-neutral-400 dark:text-neutral-500">
          {DISCLAIMER_SHORT}
        </p>
        <p className="text-[10px] text-neutral-400/80 dark:text-neutral-600 mt-1">
          This tool is an independent image formatting utility. Metadata changes do not guarantee compatibility with or access to any third-party platform feature.
        </p>
      </div>
    </footer>
  );
};
