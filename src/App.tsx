/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { ImageUploader } from './components/ImageUploader';
import { ImageCanvasEditor } from './components/ImageCanvasEditor';
import { ExtractedTextViewer } from './components/ExtractedTextViewer';
import { ExtractionControls } from './components/ExtractionControls';
import { CameraCaptureModal } from './components/CameraCaptureModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { SamplesModal } from './components/SamplesModal';
import { BatchQueueBar } from './components/BatchQueueBar';
import { ToastContainer } from './components/Toast';
import {
  ExtractionMode,
  ExtractionResult,
  ToastMessage,
  BatchImageItem,
} from './types';
import { formatBytes, downloadTextFile, smartOptimizeLargeImage } from './utils/imageProcessing';
import { renderPdfToImages } from './utils/pdfProcessor';
import { extractFilesFromZip } from './utils/zipProcessor';
import { Sparkles, Layers, Zap, Plus, FileText, CheckCircle2 } from 'lucide-react';

const STORAGE_KEY = 'scantext_history_v1';

export default function App() {
  // Main image states
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>('document.png');
  const [batchImages, setBatchImages] = useState<BatchImageItem[]>([]);
  const [activeBatchIndex, setActiveBatchIndex] = useState<number>(0);

  // Large file handling settings
  const [autoOptimize, setAutoOptimize] = useState<boolean>(true);

  // Extraction options
  const [currentMode, setCurrentMode] = useState<ExtractionMode>('markdown');
  const [targetLanguage, setTargetLanguage] = useState<string>('auto');
  const [customPrompt, setCustomPrompt] = useState<string>('');

  // Results & status
  const [extractionResult, setExtractionResult] = useState<ExtractionResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isEnhancing, setIsEnhancing] = useState<boolean>(false);
  const [isProcessingBatch, setIsProcessingBatch] = useState<boolean>(false);
  const [batchProgress, setBatchProgress] = useState<{ current: number; total: number } | null>(null);

  // Abort control for batch processing
  const stopBatchRef = useRef<boolean>(false);

  // Modals & Drawers
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isSamplesOpen, setIsSamplesOpen] = useState<boolean>(false);

  // History & Toasts
  const [history, setHistory] = useState<ExtractionResult[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Hidden inputs for adding more files / folders
  const addMoreInputRef = useRef<HTMLInputElement>(null);
  const addFolderInputRef = useRef<HTMLInputElement>(null);

  // Load history from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Failed to load history:', e);
    }
  }, []);

  // Save history to localStorage
  const saveToHistory = useCallback((newItem: ExtractionResult) => {
    setHistory((prev) => {
      const filtered = prev.filter((i) => i.id !== newItem.id);
      const updated = [newItem, ...filtered].slice(0, 30);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save history to localStorage:', e);
      }
      return updated;
    });
  }, []);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Multiple / Single images selected from uploader
  const handleImagesSelected = (items: BatchImageItem[], suggestedMode?: ExtractionMode) => {
    if (items.length === 0) return;

    setBatchImages(items);
    setActiveBatchIndex(0);

    const first = items[0];
    setActiveImage(first.dataUrl);
    setProcessedImage(first.dataUrl);
    setImageName(first.name);
    setExtractionResult(first.result || null);

    if (suggestedMode) {
      setCurrentMode(suggestedMode);
    }

    if (items.length > 1) {
      addToast('info', `Loaded batch of ${items.length} documents / pages.`);
    } else {
      const sizeNote = first.fileSizeBytes ? ` (${formatBytes(first.fileSizeBytes)})` : '';
      addToast('info', `Loaded image: ${first.name}${sizeNote}`);
    }
  };

  // Add more files or zip to existing batch
  const handleAddMoreFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: BatchImageItem[] = [];

    for (const file of Array.from(files)) {
      const isZip = file.type === 'application/zip' || /\.zip$/i.test(file.name);
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

      if (isZip) {
        addToast('info', `Unzipping ${file.name}...`);
        try {
          const zipItems = await extractFilesFromZip(file, autoOptimize);
          newItems.push(...zipItems);
        } catch (err) {
          console.error('Failed to unpack zip file:', err);
        }
      } else if (isPdf) {
        try {
          const pages = await renderPdfToImages(file, 20);
          pages.forEach((page) => {
            newItems.push({
              id: Math.random().toString(36).substring(2, 9),
              name: `${file.name.replace(/\.[^/.]+$/, '')} (Page ${page.pageNumber})`,
              dataUrl: page.dataUrl,
              mimeType: 'image/jpeg',
              fileSizeBytes: Math.round(file.size / pages.length),
              pageNumber: page.pageNumber,
              totalPages: pages.length,
            });
          });
        } catch (err) {
          console.error('PDF parsing error:', err);
        }
      } else {
        const result = await smartOptimizeLargeImage(file, !autoOptimize);
        newItems.push({
          id: Math.random().toString(36).substring(2, 9),
          name: file.name,
          dataUrl: result.dataUrl,
          mimeType: result.mimeType,
          fileSizeBytes: result.originalSize,
          optimizedSizeBytes: result.optimizedSize,
          isOptimized: result.isOptimized,
        });
      }
    }

    if (newItems.length > 0) {
      setBatchImages((prev) => [...prev, ...newItems]);
      addToast('info', `Added ${newItems.length} document(s) to the batch.`);
    }

    if (addMoreInputRef.current) addMoreInputRef.current.value = '';
    if (addFolderInputRef.current) addFolderInputRef.current.value = '';
  };

  // Switch batch item
  const handleSelectBatchItem = (index: number) => {
    const item = batchImages[index];
    if (!item) return;
    setActiveBatchIndex(index);
    setActiveImage(item.dataUrl);
    setProcessedImage(item.dataUrl);
    setImageName(item.name);
    setExtractionResult(item.result || null);
  };

  // Remove batch item
  const handleRemoveBatchItem = (index: number) => {
    setBatchImages((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (updated.length === 0) {
        setActiveImage(null);
        setProcessedImage(null);
        setExtractionResult(null);
      } else if (index === activeBatchIndex) {
        const nextIdx = Math.max(0, index - 1);
        setActiveBatchIndex(nextIdx);
        setActiveImage(updated[nextIdx].dataUrl);
        setProcessedImage(updated[nextIdx].dataUrl);
        setImageName(updated[nextIdx].name);
        setExtractionResult(updated[nextIdx].result || null);
      } else if (index < activeBatchIndex) {
        setActiveBatchIndex((curr) => curr - 1);
      }
      return updated;
    });
  };

  // Clear all batch items
  const handleClearAllBatch = () => {
    setActiveImage(null);
    setProcessedImage(null);
    setExtractionResult(null);
    setBatchImages([]);
    addToast('info', 'Batch cleared.');
  };

  // Reset active image
  const handleResetActiveImage = () => {
    if (activeImage) {
      setProcessedImage(activeImage);
      addToast('info', 'Image filters and crops reset to original.');
    }
  };

  // Clear workspace
  const handleNewUpload = () => {
    setActiveImage(null);
    setProcessedImage(null);
    setExtractionResult(null);
    setBatchImages([]);
  };

  // Perform single OCR extraction
  const handleExecuteExtract = async () => {
    if (!processedImage) {
      addToast('error', 'Please select or upload an image first.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: processedImage,
          mimeType: 'image/png',
          mode: currentMode,
          targetLanguage,
          customPrompt: customPrompt.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      const data = await response.json();
      const currentBatchItem = batchImages[activeBatchIndex];

      const newResult: ExtractionResult = {
        id: Math.random().toString(36).substring(2, 9),
        text: data.text,
        mode: currentMode,
        stats: data.stats,
        timestamp: Date.now(),
        thumbnailUrl: processedImage,
        imageName,
        targetLanguage,
        fileSizeBytes: currentBatchItem?.fileSizeBytes,
        optimizedSizeBytes: currentBatchItem?.optimizedSizeBytes,
        pageNumber: currentBatchItem?.pageNumber,
        totalPages: currentBatchItem?.totalPages,
      };

      setExtractionResult(newResult);
      saveToHistory(newResult);

      // Attach result to active batch item
      setBatchImages((prev) =>
        prev.map((b, idx) =>
          idx === activeBatchIndex ? { ...b, result: newResult, status: 'done' } : b
        )
      );

      addToast(
        'success',
        `Extracted ${data.stats.wordCount} words (${data.stats.charCount} characters)!`
      );
    } catch (err: unknown) {
      console.error('OCR Extraction error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to extract text from image.';
      addToast('error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Perform Batch Extraction on all pending images
  const handleProcessAllBatch = async () => {
    if (batchImages.length === 0 || isProcessingBatch) return;

    setIsProcessingBatch(true);
    stopBatchRef.current = false;
    const total = batchImages.length;

    for (let i = 0; i < total; i++) {
      if (stopBatchRef.current) {
        addToast('info', 'Batch extraction stopped.');
        break;
      }

      const item = batchImages[i];
      if (item.result) continue; // Already extracted

      setBatchProgress({ current: i + 1, total });
      setBatchImages((prev) =>
        prev.map((it, idx) => (idx === i ? { ...it, status: 'processing' } : it))
      );

      try {
        const response = await fetch('/api/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: item.dataUrl,
            mimeType: item.mimeType || 'image/png',
            mode: currentMode,
            targetLanguage,
            customPrompt: customPrompt.trim() || undefined,
          }),
        });

        if (!response.ok) throw new Error('Batch extraction failed for item');

        const data = await response.json();

        const res: ExtractionResult = {
          id: Math.random().toString(36).substring(2, 9),
          text: data.text,
          mode: currentMode,
          stats: data.stats,
          timestamp: Date.now(),
          thumbnailUrl: item.dataUrl,
          imageName: item.name,
          targetLanguage,
          fileSizeBytes: item.fileSizeBytes,
          pageNumber: item.pageNumber,
          totalPages: item.totalPages,
        };

        saveToHistory(res);

        setBatchImages((prev) =>
          prev.map((it, idx) => (idx === i ? { ...it, result: res, status: 'done' } : it))
        );

        // If this is currently active in view, update active extraction result
        if (i === activeBatchIndex) {
          setExtractionResult(res);
        }
      } catch (err) {
        console.error(`Error processing batch item ${i}:`, err);
        setBatchImages((prev) =>
          prev.map((it, idx) => (idx === i ? { ...it, status: 'error' } : it))
        );
      }
    }

    setIsProcessingBatch(false);
    setBatchProgress(null);
    if (!stopBatchRef.current) {
      addToast('success', `Batch processing complete for all ${total} document(s)!`);
    }
  };

  const handleStopBatch = () => {
    stopBatchRef.current = true;
  };

  // Combine and Export all batch results as single Markdown
  const handleCombineAndExport = () => {
    const completedItems = batchImages.filter((it) => it.result);
    if (completedItems.length === 0) return;

    let combinedMarkdown = `# Consolidated OCR Document Extraction\n`;
    combinedMarkdown += `*Extracted on ${new Date().toLocaleString()} • ${completedItems.length} Pages / Documents*\n\n`;
    combinedMarkdown += `---\n\n`;

    completedItems.forEach((it, idx) => {
      combinedMarkdown += `## Document ${idx + 1}: ${it.name}\n\n`;
      combinedMarkdown += `${it.result?.text}\n\n`;
      combinedMarkdown += `---\n\n`;
    });

    downloadTextFile(
      `combined_extraction_${new Date().toISOString().slice(0, 10)}.md`,
      combinedMarkdown,
      'text/markdown'
    );
    addToast('success', `Exported all ${completedItems.length} pages as combined Markdown.`);
  };

  // Trigger AI Text Enhancement
  const handleTriggerEnhance = async (action: string) => {
    if (!extractionResult) return;

    setIsEnhancing(true);
    try {
      const response = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: extractionResult.text,
          action,
          targetLanguage: targetLanguage !== 'auto' ? targetLanguage : 'English',
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || 'Enhancement failed');
      }

      const data = await response.json();
      const updatedText = `${extractionResult.text}\n\n---\n### AI ${action.replace('_', ' ').toUpperCase()} RESULT:\n${data.result}`;

      const updatedWords = updatedText.trim().split(/\s+/).length;
      const updatedChars = updatedText.length;
      const updatedLines = updatedText.split('\n').length;

      const updatedResult: ExtractionResult = {
        ...extractionResult,
        text: updatedText,
        stats: {
          wordCount: updatedWords,
          charCount: updatedChars,
          lineCount: updatedLines,
        },
      };

      setExtractionResult(updatedResult);
      saveToHistory(updatedResult);
      addToast('success', `AI Enhancement applied: ${action.replace('_', ' ')}`);
    } catch (err: unknown) {
      console.error('Enhancement error:', err);
      const msg = err instanceof Error ? err.message : 'Enhancement failed';
      addToast('error', msg);
    } finally {
      setIsEnhancing(false);
    }
  };

  // Direct text editing
  const handleTextEdited = (newText: string) => {
    if (!extractionResult) return;
    const words = newText.trim() ? newText.trim().split(/\s+/).length : 0;
    const chars = newText.length;
    const lines = newText ? newText.split('\n').length : 0;

    const updated: ExtractionResult = {
      ...extractionResult,
      text: newText,
      stats: { wordCount: words, charCount: chars, lineCount: lines },
    };
    setExtractionResult(updated);
    saveToHistory(updated);
  };

  // History restore
  const handleSelectHistoryItem = (item: ExtractionResult) => {
    if (item.thumbnailUrl) {
      setActiveImage(item.thumbnailUrl);
      setProcessedImage(item.thumbnailUrl);
    }
    setImageName(item.imageName || 'Document');
    setCurrentMode(item.mode);
    setExtractionResult(item);
    addToast('info', `Restored extraction from ${new Date(item.timestamp).toLocaleTimeString()}`);
  };

  const handleDeleteHistoryItem = (id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((i) => i.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem(STORAGE_KEY);
    addToast('info', 'History cleared.');
  };

  // Hotkey Ctrl+Enter
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        if (processedImage && !isLoading && !isProcessingBatch) {
          e.preventDefault();
          handleExecuteExtract();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [processedImage, isLoading, isProcessingBatch, currentMode, targetLanguage, customPrompt]);

  const activeBatchItem = batchImages[activeBatchIndex];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-white">
      {/* Hidden file input for adding more batch documents & ZIPs */}
      <input
        ref={addMoreInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.pdf,.zip,application/zip,application/x-zip-compressed"
        onChange={handleAddMoreFiles}
        className="hidden"
      />
      {/* Hidden file input for adding folders */}
      <input
        ref={addFolderInputRef}
        type="file"
        multiple
        // @ts-expect-error webkitdirectory is standard in modern browsers
        webkitdirectory=""
        onChange={handleAddMoreFiles}
        className="hidden"
      />

      {/* Top Navigation */}
      <Header
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenSamples={() => setIsSamplesOpen(true)}
        onNewUpload={handleNewUpload}
        hasActiveImage={!!activeImage}
        historyCount={history.length}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 flex flex-col gap-4">
        {!activeImage ? (
          /* Empty / Upload View */
          <div className="flex-1 flex flex-col justify-center py-6 sm:py-10 max-w-4xl mx-auto w-full animate-in fade-in duration-300">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Next-Gen Vision AI Optical Character Recognition</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-3">
                Extract Text From Any Picture,{' '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
                  Folder, or ZIP Archive.
                </span>
              </h2>
              <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
                Scan high-resolution 100MB photos, multi-page PDFs, <strong className="text-amber-300">.ZIP archives</strong>, and folders of 50+ documents in one click.
              </p>
            </div>

            <ImageUploader
              onImagesSelected={handleImagesSelected}
              onOpenCamera={() => setIsCameraOpen(true)}
              autoOptimize={autoOptimize}
              onToggleAutoOptimize={setAutoOptimize}
            />
          </div>
        ) : (
          /* Active Document Workspace (Split View) */
          <div className="flex flex-col gap-4 flex-1 animate-in fade-in duration-200">
            {/* Multi-File / Multi-Page Batch Queue Bar */}
            <BatchQueueBar
              items={batchImages}
              activeIndex={activeBatchIndex}
              onSelectItem={handleSelectBatchItem}
              onRemoveItem={handleRemoveBatchItem}
              onClearAll={handleClearAllBatch}
              onAddMoreFiles={() => addMoreInputRef.current?.click()}
              onAddFolder={() => addFolderInputRef.current?.click()}
              onProcessAll={handleProcessAllBatch}
              onStopBatch={handleStopBatch}
              onCombineAndExport={handleCombineAndExport}
              isProcessingBatch={isProcessingBatch}
              batchProgress={batchProgress || undefined}
            />

            {/* Active Document Info Banner with Big File stats */}
            {activeBatchItem && (
              <div className="flex items-center justify-between px-4 py-2 bg-slate-900/70 border border-slate-800 rounded-xl text-xs text-slate-300">
                <div className="flex items-center gap-2 truncate">
                  <span className="font-semibold text-white truncate">{activeBatchItem.name}</span>
                  {activeBatchItem.fileSizeBytes && (
                    <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 font-mono text-[11px]">
                      {formatBytes(activeBatchItem.fileSizeBytes)}
                    </span>
                  )}
                  {activeBatchItem.isOptimized && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-cyan-950 text-cyan-300 border border-cyan-800/60 font-medium text-[11px]"
                      title="Intelligently downscaled colossal resolution to optimal 4K for 10x faster OCR without text loss"
                    >
                      <Zap className="w-3 h-3 text-cyan-400" />
                      <span>Smart OCR Optimized</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-[11px]">
                    Item {activeBatchIndex + 1} of {batchImages.length}
                  </span>
                </div>
              </div>
            )}

            {/* Extraction Mode Bar & Run Button */}
            <ExtractionControls
              currentMode={currentMode}
              onModeChange={setCurrentMode}
              targetLanguage={targetLanguage}
              onLanguageChange={setTargetLanguage}
              customPrompt={customPrompt}
              onCustomPromptChange={setCustomPrompt}
              onExecuteExtract={handleExecuteExtract}
              isLoading={isLoading || isProcessingBatch}
            />

            {/* Main Side-by-Side Split Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-[580px]">
              {/* Left Column: Image Canvas & Filter Tools */}
              <div className="flex flex-col h-full min-h-[380px]">
                <ImageCanvasEditor
                  originalImage={activeImage}
                  processedImage={processedImage || activeImage}
                  onImageUpdated={(newImg) => setProcessedImage(newImg)}
                  onResetImage={handleResetActiveImage}
                />
              </div>

              {/* Right Column: Extracted Text or Waiting Placeholder */}
              <div className="flex flex-col h-full min-h-[380px]">
                {extractionResult ? (
                  <ExtractedTextViewer
                    result={extractionResult}
                    onTextEdited={handleTextEdited}
                    onTriggerEnhance={handleTriggerEnhance}
                    isEnhancing={isEnhancing}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center h-full p-8 rounded-2xl border border-slate-800 bg-slate-900/40 text-center text-slate-400">
                    <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4">
                      <Sparkles className="w-8 h-8 text-cyan-400 animate-pulse" />
                    </div>
                    <h3 className="text-lg font-bold text-white mb-2">Ready to Extract Text</h3>
                    <p className="text-xs text-slate-400 max-w-sm mb-6 leading-relaxed">
                      Select your desired extraction mode above and click <strong className="text-cyan-300">Extract Text</strong>, or press <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px]">Ctrl+Enter</kbd>.
                    </p>
                    <button
                      onClick={handleExecuteExtract}
                      disabled={isLoading || isProcessingBatch}
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-sm shadow-xl shadow-cyan-950/40 transition-all flex items-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Extract Text Now</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals & Drawers */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(dataUrl) =>
          handleImagesSelected([
            {
              id: Math.random().toString(36).substring(2, 9),
              name: `Camera_Capture_${Date.now()}.png`,
              dataUrl,
              mimeType: 'image/png',
              fileSizeBytes: 450 * 1024,
            },
          ])
        }
      />

      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onSelectHistoryItem={handleSelectHistoryItem}
        onDeleteItem={handleDeleteHistoryItem}
        onClearHistory={handleClearHistory}
      />

      <SamplesModal
        isOpen={isSamplesOpen}
        onClose={() => setIsSamplesOpen(false)}
        onSelectSample={(url, name, mode) =>
          handleImagesSelected([
            {
              id: Math.random().toString(36).substring(2, 9),
              name,
              dataUrl: url,
              mimeType: 'image/png',
              fileSizeBytes: 280 * 1024,
            },
          ], mode)
        }
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />
    </div>
  );
}
