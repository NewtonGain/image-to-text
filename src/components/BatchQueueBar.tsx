import React, { useState, useMemo } from 'react';
import {
  Layers,
  Play,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Download,
  Plus,
  Trash2,
  FileText,
  Zap,
  Search,
  Archive,
  Square,
  CheckSquare,
  StopCircle,
} from 'lucide-react';
import { BatchImageItem, ExtractionResult } from '../types';
import { formatBytes } from '../utils/imageProcessing';
import { downloadExtractionsAsZip } from '../utils/zipProcessor';

interface BatchQueueBarProps {
  items: BatchImageItem[];
  activeIndex: number;
  onSelectItem: (index: number) => void;
  onRemoveItem: (index: number) => void;
  onClearAll: () => void;
  onAddMoreFiles: () => void;
  onAddFolder: () => void;
  onProcessAll: () => void;
  onStopBatch: () => void;
  onCombineAndExport: () => void;
  isProcessingBatch: boolean;
  batchProgress?: { current: number; total: number };
}

export const BatchQueueBar: React.FC<BatchQueueBarProps> = ({
  items,
  activeIndex,
  onSelectItem,
  onRemoveItem,
  onClearAll,
  onAddMoreFiles,
  onAddFolder,
  onProcessAll,
  onStopBatch,
  onCombineAndExport,
  isProcessingBatch,
  batchProgress,
}) => {
  if (items.length <= 1) return null;

  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [isExportingZip, setIsExportingZip] = useState(false);

  const completedItems = useMemo(
    () => items.filter((i) => i.result).map((i) => i.result as ExtractionResult),
    [items]
  );
  const totalCount = items.length;
  const completedCount = completedItems.length;
  const allCompleted = completedCount === totalCount;

  // Filter items for display
  const filteredItems = useMemo(() => {
    return items
      .map((item, originalIndex) => ({ item, originalIndex }))
      .filter(({ item }) => {
        const matchesQuery = item.name.toLowerCase().includes(searchFilter.toLowerCase());
        if (!matchesQuery) return false;
        if (statusFilter === 'pending') return !item.result;
        if (statusFilter === 'completed') return !!item.result;
        return true;
      });
  }, [items, searchFilter, statusFilter]);

  const totalBytes = items.reduce((acc, it) => acc + (it.fileSizeBytes || 0), 0);

  const handleDownloadAllAsZip = async () => {
    if (completedItems.length === 0) return;
    setIsExportingZip(true);
    try {
      await downloadExtractionsAsZip(
        completedItems,
        `scantext_batch_${completedItems.length}_documents.zip`
      );
    } catch (err) {
      console.error('Failed to create download zip:', err);
    } finally {
      setIsExportingZip(false);
    }
  };

  return (
    <div className="flex flex-col gap-2.5 p-3.5 bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl">
      {/* Top action row */}
      <div className="flex items-center justify-between gap-3 text-xs flex-wrap">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 text-sm">
                Multi-File Batch Queue ({items.length} files)
              </span>
              {totalBytes > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono text-[11px]">
                  {formatBytes(totalBytes)}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              {completedCount} extracted • {totalCount - completedCount} pending
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap ml-auto">
          {isProcessingBatch ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-cyan-950/80 border border-cyan-800/60 text-cyan-300 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>
                  Extracting {batchProgress?.current || 1} of {batchProgress?.total || totalCount}...
                </span>
              </div>
              <button
                onClick={onStopBatch}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800/60 text-rose-300 font-medium text-xs transition-colors"
                title="Stop batch extraction"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span>Stop</span>
              </button>
            </div>
          ) : (
            <>
              {!allCompleted && (
                <button
                  onClick={onProcessAll}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold shadow-md shadow-cyan-950/40 transition-all text-xs"
                >
                  <Play className="w-3 h-3 fill-current" />
                  <span>Extract All ({totalCount - completedCount} remaining)</span>
                </button>
              )}

              {completedCount > 0 && (
                <>
                  <button
                    onClick={handleDownloadAllAsZip}
                    disabled={isExportingZip}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-medium transition-colors text-xs"
                    title="Download all extracted text as a ZIP archive of individual files"
                  >
                    {isExportingZip ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Archive className="w-3 h-3 text-amber-400" />
                    )}
                    <span>Download All as ZIP</span>
                  </button>

                  <button
                    onClick={onCombineAndExport}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-750 transition-colors text-xs"
                    title="Combine all extracted text into a single Markdown document"
                  >
                    <Download className="w-3 h-3 text-cyan-400" />
                    <span>Combined Doc</span>
                  </button>
                </>
              )}

              <div className="flex items-center gap-1">
                <button
                  onClick={onAddMoreFiles}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors text-xs"
                  title="Add files or ZIP"
                >
                  <Plus className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Add Files</span>
                </button>

                <button
                  onClick={onAddFolder}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors text-xs"
                  title="Upload entire folder"
                >
                  <span>+ Folder</span>
                </button>
              </div>

              <button
                onClick={onClearAll}
                className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                title="Clear all batch items"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar (if processing) */}
      {isProcessingBatch && batchProgress && (
        <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 h-full transition-all duration-300"
            style={{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }}
          />
        </div>
      )}

      {/* Filter and search toolbar */}
      <div className="flex items-center justify-between gap-2 text-xs pt-1 border-t border-slate-800/60">
        <div className="flex items-center gap-1 bg-slate-950/60 rounded-xl p-0.5 border border-slate-800">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-slate-800 text-cyan-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All ({totalCount})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              statusFilter === 'pending'
                ? 'bg-slate-800 text-cyan-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pending ({totalCount - completedCount})
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
              statusFilter === 'completed'
                ? 'bg-slate-800 text-cyan-300'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Completed ({completedCount})
          </button>
        </div>

        {/* Quick Search */}
        {totalCount > 4 && (
          <div className="flex items-center gap-1.5 bg-slate-950/80 px-2 py-1 rounded-xl border border-slate-800 max-w-xs flex-1">
            <Search className="w-3 h-3 text-slate-500 shrink-0" />
            <input
              type="text"
              placeholder="Filter by name..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="bg-transparent text-slate-200 placeholder:text-slate-500 focus:outline-hidden text-xs w-full"
            />
            {searchFilter && (
              <button
                onClick={() => setSearchFilter('')}
                className="text-slate-500 hover:text-slate-300 text-[10px]"
              >
                ✕
              </button>
            )}
          </div>
        )}
      </div>

      {/* Horizontal thumbnail carousel */}
      <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-thin">
        {filteredItems.map(({ item, originalIndex }) => {
          const isActive = originalIndex === activeIndex;
          const isDone = !!item.result;
          const isCurrent = item.status === 'processing';
          const isError = item.status === 'error';

          return (
            <div
              key={item.id}
              onClick={() => onSelectItem(originalIndex)}
              className={`group relative flex items-center gap-2 p-2 rounded-xl border transition-all cursor-pointer shrink-0 min-w-[190px] max-w-[240px] select-none ${
                isActive
                  ? 'bg-slate-800 border-cyan-500/80 shadow-md shadow-cyan-950/30'
                  : 'bg-slate-950/70 hover:bg-slate-850 border-slate-800 text-slate-400'
              }`}
            >
              {/* Thumbnail */}
              <div className="relative w-11 h-11 rounded-lg overflow-hidden border border-slate-800 shrink-0 bg-slate-900 flex items-center justify-center">
                <img
                  src={item.dataUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />

                {/* Status indicator badge */}
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  {isCurrent ? (
                    <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                  ) : isDone ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : isError ? (
                    <AlertCircle className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-slate-300 opacity-70" />
                  )}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-semibold text-slate-200 truncate">
                    {item.pageNumber ? `Page ${item.pageNumber}` : item.name}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveItem(originalIndex);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-400 text-slate-500 transition-opacity"
                    title="Remove from batch"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>

                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-400">
                  {item.fileSizeBytes ? (
                    <span>{formatBytes(item.fileSizeBytes)}</span>
                  ) : (
                    <span>Ready</span>
                  )}
                  {item.isOptimized && (
                    <span className="flex items-center text-cyan-400 font-medium" title="Smart OCR Compression applied">
                      <Zap className="w-2.5 h-2.5 mr-0.5" />
                      Opt
                    </span>
                  )}
                  {isDone && (
                    <span className="text-emerald-400 ml-auto font-medium">Done</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
