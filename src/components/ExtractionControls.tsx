import React, { useState } from 'react';
import {
  FileText,
  AlignLeft,
  Table as TableIcon,
  Layers,
  PenTool,
  Sigma,
  Globe,
  SlidersHorizontal,
  ChevronDown,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { ExtractionMode } from '../types';

interface ExtractionControlsProps {
  currentMode: ExtractionMode;
  onModeChange: (mode: ExtractionMode) => void;
  targetLanguage: string;
  onLanguageChange: (lang: string) => void;
  customPrompt: string;
  onCustomPromptChange: (prompt: string) => void;
  onExecuteExtract: () => void;
  isLoading: boolean;
}

const MODES: { id: ExtractionMode; title: string; desc: string; icon: React.ElementType }[] = [
  {
    id: 'markdown',
    title: 'Formatted Markdown',
    desc: 'Headers, bullet lists, bold text & codeblocks',
    icon: FileText,
  },
  {
    id: 'raw',
    title: 'Clean Raw Text',
    desc: 'Exact line-by-line reproduction without styling',
    icon: AlignLeft,
  },
  {
    id: 'table',
    title: 'Table / TSV',
    desc: 'Spreadsheets, columns, and Excel/Sheets data',
    icon: TableIcon,
  },
  {
    id: 'structured',
    title: 'Structured & JSON',
    desc: 'Receipts, invoices, forms & key-value entities',
    icon: Layers,
  },
  {
    id: 'handwriting',
    title: 'Handwriting & Notes',
    desc: 'Deciphers cursive notes and whiteboard sketches',
    icon: PenTool,
  },
  {
    id: 'math',
    title: 'Math & LaTeX',
    desc: 'Formulas, equations, calculus and matrices',
    icon: Sigma,
  },
];

const LANGUAGES = [
  { label: 'Keep Original Language', value: 'auto' },
  { label: 'English', value: 'English' },
  { label: 'Spanish (Español)', value: 'Spanish' },
  { label: 'French (Français)', value: 'French' },
  { label: 'German (Deutsch)', value: 'German' },
  { label: 'Italian (Italiano)', value: 'Italian' },
  { label: 'Portuguese (Português)', value: 'Portuguese' },
  { label: 'Japanese (日本語)', value: 'Japanese' },
  { label: 'Chinese (Simplified) (简体中文)', value: 'Simplified Chinese' },
  { label: 'Chinese (Traditional) (繁體中文)', value: 'Traditional Chinese' },
  { label: 'Korean (한국어)', value: 'Korean' },
  { label: 'Arabic (العربية)', value: 'Arabic' },
  { label: 'Hindi (हिन्दी)', value: 'Hindi' },
  { label: 'Russian (Русский)', value: 'Russian' },
  { label: 'Dutch (Nederlands)', value: 'Dutch' },
  { label: 'Polish (Polski)', value: 'Polish' },
  { label: 'Turkish (Türkçe)', value: 'Turkish' },
  { label: 'Vietnamese (Tiếng Việt)', value: 'Vietnamese' },
];

export const ExtractionControls: React.FC<ExtractionControlsProps> = ({
  currentMode,
  onModeChange,
  targetLanguage,
  onLanguageChange,
  customPrompt,
  onCustomPromptChange,
  onExecuteExtract,
  isLoading,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className="flex flex-col gap-3 p-4 bg-slate-900/80 rounded-2xl border border-slate-800 shadow-xl">
      {/* Mode selection row */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-slate-300">Extraction Mode:</label>
          <span className="text-[11px] text-cyan-400 font-medium">
            {MODES.find((m) => m.id === currentMode)?.desc}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {MODES.map((mode) => {
            const Icon = mode.icon;
            const isSelected = currentMode === mode.id;

            return (
              <button
                key={mode.id}
                onClick={() => onModeChange(mode.id)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition-all ${
                  isSelected
                    ? 'bg-cyan-500/15 border-cyan-500/80 text-cyan-300 shadow-md shadow-cyan-950/40'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                title={mode.desc}
              >
                <Icon className={`w-4 h-4 mb-1.5 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
                <span className="text-xs font-semibold tracking-tight">{mode.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Secondary Bar: Language & Advanced instructions */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 shrink-0">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>Output Language:</span>
          </div>

          <div className="relative flex-1 max-w-xs">
            <select
              value={targetLanguage}
              onChange={(e) => onLanguageChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-hidden focus:border-cyan-500/50 appearance-none pr-8 cursor-pointer"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value} className="bg-slate-900">
                  {lang.label}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-xl border transition-colors ${
              showAdvanced || customPrompt.trim()
                ? 'bg-slate-800 border-slate-700 text-cyan-300'
                : 'border-slate-850 text-slate-400 hover:text-slate-300'
            }`}
            title="Custom extraction prompt"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>{customPrompt.trim() ? 'Custom Prompt active' : 'Custom Prompt'}</span>
          </button>
        </div>

        {/* Big Extract Action Button */}
        <button
          onClick={onExecuteExtract}
          disabled={isLoading}
          className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:via-blue-500 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-cyan-950/50 hover:shadow-cyan-900/60 transition-all disabled:opacity-50 min-w-[170px]"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Analyzing Pixels...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-cyan-200" />
              <span>Extract Text</span>
            </>
          )}
        </button>
      </div>

      {/* Advanced Custom Instruction Input */}
      {showAdvanced && (
        <div className="pt-2 animate-in slide-in-from-top-1">
          <input
            type="text"
            placeholder="e.g., Only transcribe column 3, or Extract the receipt total and item names only..."
            value={customPrompt}
            onChange={(e) => onCustomPromptChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-cyan-500/50 font-sans"
          />
        </div>
      )}
    </div>
  );
};
