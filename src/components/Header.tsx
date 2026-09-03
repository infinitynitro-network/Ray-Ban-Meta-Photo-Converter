import React from 'react';
import { Camera, ShieldCheck, Sun, Moon, RotateCcw, Instagram } from 'lucide-react';
import { ThemeMode } from '../utils/storageManager';

interface HeaderProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
  hasActiveImage: boolean;
  onClearSessionClick: () => void;
  onOpenPrivacy: () => void;
  onOpenDisclaimer: () => void;
  onOpenHowItWorks: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  onToggleTheme,
  hasActiveImage,
  onClearSessionClick,
  onOpenPrivacy,
  onOpenDisclaimer,
  onOpenHowItWorks,
}) => {
  return (
    <header
      id="app-header"
      className="sticky top-0 z-40 w-full border-b border-neutral-200/80 dark:border-neutral-800/80 bg-[#fbfbfd]/80 dark:bg-[#0a0a0c]/80 backdrop-blur-md transition-colors"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Title */}
        <div className="flex items-center gap-3">
          <div
            id="brand-logo-icon"
            className="w-10 h-10 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-950 flex items-center justify-center shadow-sm"
          >
            <Camera className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-neutral-900 dark:text-white uppercase leading-none">
                Meta Spin Studio
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                <ShieldCheck className="w-3 h-3" />
                Local & Private
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold bg-gradient-to-r from-[#f09433] via-[#dc2743] to-[#bc1888] text-white px-2 py-0.5 rounded-full shadow-2xs">
                <Instagram className="w-3 h-3 stroke-[2.5]" />
                <span className="hidden xs:inline">Instagram Story 3:4</span>
                <span className="xs:hidden">Story 3:4</span>
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 hidden sm:block mt-0.5">
              3:4 Portrait & Metadata Preparation
            </p>
          </div>
        </div>

        {/* Action Controls & Navigation */}
        <div className="flex items-center gap-2 sm:gap-3">
          <nav className="hidden md:flex items-center gap-4 text-xs font-medium text-neutral-600 dark:text-neutral-400 mr-2">
            <button
              id="nav-how-it-works-btn"
              onClick={onOpenHowItWorks}
              className="hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer py-1"
            >
              How It Works
            </button>
            <button
              id="nav-privacy-btn"
              onClick={onOpenPrivacy}
              className="hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer py-1"
            >
              Privacy
            </button>
            <button
              id="nav-disclaimer-btn"
              onClick={onOpenDisclaimer}
              className="hover:text-neutral-900 dark:hover:text-white transition-colors cursor-pointer py-1"
            >
              Disclaimer
            </button>
          </nav>

          {/* Clear Session Button (visible when photo is loaded) */}
          {hasActiveImage && (
            <button
              id="header-clear-session-btn"
              onClick={onClearSessionClick}
              title="Clear current photo and start over"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/40 border border-red-200/60 dark:border-red-800/50 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Clear Session</span>
            </button>
          )}

          {/* Theme Toggle */}
          <button
            id="theme-toggle-btn"
            onClick={onToggleTheme}
            aria-label="Toggle visual theme"
            className="w-9 h-9 rounded-lg border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/80 transition-colors cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
