import React from 'react';
import { History, X, Trash2, ArrowUpRight, Clock, FileText, Download } from 'lucide-react';
import { ExtractionResult } from '../types';
import { downloadTextFile } from '../utils/imageProcessing';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: ExtractionResult[];
  onSelectHistoryItem: (item: ExtractionResult) => void;
  onDeleteItem: (id: string) => void;
  onClearHistory: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  onSelectHistoryItem,
  onDeleteItem,
  onClearHistory,
}) => {
  if (!isOpen) return null;

  const handleExportAll = () => {
    downloadTextFile(
      `scantext_history_${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(history, null, 2),
      'application/json'
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-base">
            <History className="w-5 h-5 text-cyan-400" />
            <span>Extraction History</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
              {history.length}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-slate-500">
              <Clock className="w-10 h-10 mb-2 opacity-40" />
              <p className="text-sm font-medium text-slate-400">No extractions saved yet</p>
              <p className="text-xs mt-1 max-w-xs leading-relaxed">
                Whenever you extract text from an image, it will be automatically saved here locally.
              </p>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                onClick={() => {
                  onSelectHistoryItem(item);
                  onClose();
                }}
                className="group relative flex flex-col p-3.5 rounded-2xl bg-slate-950/70 hover:bg-slate-800/60 border border-slate-800 hover:border-cyan-500/40 transition-all cursor-pointer shadow-sm"
              >
                <div className="flex items-start gap-3">
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt="Thumbnail"
                      className="w-14 h-14 object-cover rounded-xl border border-slate-700/60 shrink-0 bg-slate-900"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl border border-slate-800 bg-slate-900 flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6 text-slate-500" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-semibold text-slate-200 truncate group-hover:text-cyan-300 transition-colors">
                        {item.imageName || 'Document Extraction'}
                      </h4>
                      <span className="text-[10px] text-slate-500 shrink-0">
                        {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 font-mono">
                      {item.text.slice(0, 120)}
                    </p>

                    <div className="flex items-center justify-between mt-2 text-[10px] text-slate-500">
                      <span className="capitalize px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-cyan-400/90 font-medium">
                        {item.mode}
                      </span>
                      <span>{item.stats.wordCount} words</span>
                    </div>
                  </div>
                </div>

                {/* Delete button on hover */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteItem(item.id);
                  }}
                  className="absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-950/50 hover:text-rose-400 text-slate-500 transition-all"
                  title="Delete from history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer actions */}
        {history.length > 0 && (
          <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-2">
            <button
              onClick={handleExportAll}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors px-3 py-2 rounded-xl hover:bg-slate-800"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export All (JSON)</span>
            </button>
            <button
              onClick={onClearHistory}
              className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition-colors px-3 py-2 rounded-xl hover:bg-rose-950/30"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
