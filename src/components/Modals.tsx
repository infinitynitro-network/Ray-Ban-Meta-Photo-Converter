import React from 'react';
import { X, ShieldCheck, AlertTriangle, RotateCcw } from 'lucide-react';
import { DISCLAIMER_FULL, PRIVACY_PROMISE } from '../constants';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const BaseModal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 mb-4">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export const ClearSessionModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirmClear: () => void;
}> = ({ isOpen, onClose, onConfirmClear }) => {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Clear Session">
      <div className="text-center py-2">
        <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center mb-3">
          <RotateCcw className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-bold text-neutral-900 dark:text-white mb-1">
          Clear this photo and start over?
        </h4>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs mx-auto mb-6">
          This will revoke all temporary image URLs, clear browser canvas memory, and reset your adjustments.
        </p>

        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-4 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirmClear}
            className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
          >
            Clear Photo
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export const PrivacyModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Privacy & Local Processing">
      <div className="space-y-4 text-xs text-neutral-600 dark:text-neutral-300">
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5">
          <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          <div>
            <p className="font-bold text-sm">YOUR IMAGE STAYS WITH YOU</p>
            <p className="text-xs mt-0.5">{PRIVACY_PROMISE}</p>
          </div>
        </div>

        <div>
          <h5 className="font-bold text-neutral-900 dark:text-white mb-1">Client-Side Execution</h5>
          <p className="leading-relaxed">
            All image decoding, panning, zooming, 3:4 canvas rendering, color space normalization, and EXIF processing are executed solely within your browser tab via HTML5 Canvas and client-side JavaScript APIs.
          </p>
        </div>

        <div>
          <h5 className="font-bold text-neutral-900 dark:text-white mb-1">No Remote Servers or Databases</h5>
          <p className="leading-relaxed">
            There is no backend server receiving image payloads, no cloud storage bucket, no cookies or tracking scripts, and no user accounts. When you close or refresh your tab, all in-memory data is instantly released.
          </p>
        </div>

        <div>
          <h5 className="font-bold text-neutral-900 dark:text-white mb-1">Location Data Stripping</h5>
          <p className="leading-relaxed">
            GPS longitude, latitude, altitude, and timestamps recorded by mobile cameras are expunged from the exported JPEG when the "Remove Location Data" toggle is enabled.
          </p>
        </div>
      </div>
    </BaseModal>
  );
};

export const DisclaimerModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Product Disclaimer">
      <div className="space-y-4 text-xs text-neutral-600 dark:text-neutral-300">
        <div className="p-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 flex items-start gap-2.5">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
          <div>
            <p className="font-bold text-sm">Non-Affiliation Notice</p>
            <p className="text-xs mt-0.5">{DISCLAIMER_FULL}</p>
          </div>
        </div>

        <div>
          <h5 className="font-bold text-neutral-900 dark:text-white mb-1">Independent Formatting Utility</h5>
          <p className="leading-relaxed">
            This tool is designed strictly as a photo framing and metadata preparation utility. It does not promise, unlock, or guarantee any specific proprietary feature, effect, filter, or behavior on Instagram, Facebook, Meta Quest, Ray-Ban Meta, or any other platform.
          </p>
        </div>

        <div>
          <h5 className="font-bold text-neutral-900 dark:text-white mb-1">Metadata Authenticity</h5>
          <p className="leading-relaxed">
            The optional camera-style metadata profile is a technical formatting profile intended for aspect ratio compatibility. It does not certify, authenticate, or misrepresent that the photograph was physically taken by any hardware smart glasses or specialized equipment.
          </p>
        </div>
      </div>
    </BaseModal>
  );
};
