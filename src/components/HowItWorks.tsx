import React from 'react';
import { Upload, Crop, Sparkles } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      number: '01',
      title: 'Upload',
      desc: 'Choose a JPG, PNG, or WEBP image from your device or paste directly from your clipboard.',
      icon: Upload,
    },
    {
      number: '02',
      title: 'Adjust',
      desc: 'Position, pan, and zoom your photo into the standard 3:4 portrait frame with real-time guides.',
      icon: Crop,
    },
    {
      number: '03',
      title: 'Prepare',
      desc: 'Export a privacy-conscious JPEG at 3024×4032 resolution with stripped location metadata.',
      icon: Sparkles,
    },
  ];

  return (
    <section id="how-it-works-section" className="w-full max-w-5xl mx-auto px-4 py-12 sm:py-16">
      <div className="text-center mb-10">
        <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 mb-2">
          Simple 3-Step Workflow
        </h3>
        <h4 className="text-2xl sm:text-3xl font-extrabold text-neutral-900 dark:text-white tracking-tight">
          How It Works
        </h4>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.number}
              className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-2xs relative group hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-900 dark:text-white">
                  <Icon className="w-5 h-5 stroke-[2]" />
                </div>
                <span className="font-mono text-2xl font-bold text-neutral-300 dark:text-neutral-700">
                  {step.number}
                </span>
              </div>
              <h5 className="text-base font-bold text-neutral-900 dark:text-white mb-2">
                {step.title}
              </h5>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                {step.desc}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
};
