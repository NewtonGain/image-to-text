import React from 'react';
import { X, Sparkles, ArrowRight, Receipt, PenTool, CreditCard, Sigma, Binary, FileText } from 'lucide-react';
import { SAMPLE_IMAGES, SampleImageOption } from '../utils/sampleImages';
import { ExtractionMode } from '../types';

interface SamplesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSample: (dataUrl: string, name: string, mode?: ExtractionMode) => void;
}

export const SamplesModal: React.FC<SamplesModalProps> = ({
  isOpen,
  onClose,
  onSelectSample,
}) => {
  if (!isOpen) return null;

  const getIcon = (id: string) => {
    switch (id) {
      case 'receipt':
        return <Receipt className="w-5 h-5 text-emerald-400" />;
      case 'handwriting':
        return <PenTool className="w-5 h-5 text-amber-400" />;
      case 'business_card':
        return <CreditCard className="w-5 h-5 text-sky-400" />;
      case 'math_physics':
        return <Sigma className="w-5 h-5 text-purple-400" />;
      case 'code_terminal':
        return <Binary className="w-5 h-5 text-teal-400" />;
      case 'article_book':
        return <FileText className="w-5 h-5 text-blue-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-cyan-400" />;
    }
  };

  const handleChoose = (sample: SampleImageOption) => {
    const dataUrl = sample.generate();
    onSelectSample(dataUrl, `${sample.title}.png`, sample.suggestedMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Interactive Test Samples</h3>
              <p className="text-xs text-slate-400">Select any pre-made image to test AI extraction capabilities</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grid of sample cards */}
        <div className="p-6 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SAMPLE_IMAGES.map((sample) => (
            <div
              key={sample.id}
              onClick={() => handleChoose(sample)}
              className="group p-4 rounded-xl bg-slate-950/70 hover:bg-slate-800/60 border border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-lg hover:shadow-cyan-950/30"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 group-hover:border-cyan-500/40 transition-colors">
                      {getIcon(sample.id)}
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-100 group-hover:text-cyan-300 transition-colors">
                        {sample.title}
                      </h4>
                      <span className="text-[10px] uppercase font-mono tracking-wider text-slate-500">
                        {sample.category}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-3">
                  {sample.description}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-850 flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Recommended Mode:</span>
                <span className="px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-800/40 text-cyan-300 font-medium capitalize">
                  {sample.suggestedMode}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
