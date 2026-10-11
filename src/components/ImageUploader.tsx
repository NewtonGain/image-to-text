import React, { useRef, useState, useEffect } from 'react';
import {
  UploadCloud,
  Camera,
  Clipboard,
  Sparkles,
  FileImage,
  ArrowRight,
  Receipt,
  FileText,
  Binary,
  PenTool,
  Sigma,
  CreditCard,
  Zap,
  Layers,
  FileCheck,
  CheckCircle2,
  Loader2,
  FolderOpen,
  Archive,
} from 'lucide-react';
import { SAMPLE_IMAGES, SampleImageOption } from '../utils/sampleImages';
import { readFileAsDataUrl, smartOptimizeLargeImage } from '../utils/imageProcessing';
import { renderPdfToImages } from '../utils/pdfProcessor';
import { extractFilesFromZip } from '../utils/zipProcessor';
import { ExtractionMode, BatchImageItem } from '../types';

interface ImageUploaderProps {
  onImagesSelected: (items: BatchImageItem[], suggestedMode?: ExtractionMode) => void;
  onOpenCamera: () => void;
  autoOptimize: boolean;
  onToggleAutoOptimize: (val: boolean) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImagesSelected,
  onOpenCamera,
  autoOptimize,
  onToggleAutoOptimize,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>('');

  // Global paste handler
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            const optimized = await smartOptimizeLargeImage(file, !autoOptimize);
            const batchItem: BatchImageItem = {
              id: Math.random().toString(36).substring(2, 9),
              name: `Pasted_Image_${new Date().toISOString().slice(11, 19)}.png`,
              dataUrl: optimized.dataUrl,
              mimeType: optimized.mimeType,
              fileSizeBytes: optimized.originalSize,
              optimizedSizeBytes: optimized.optimizedSize,
              isOptimized: optimized.isOptimized,
            };
            onImagesSelected([batchItem]);
            return;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onImagesSelected, autoOptimize]);

  const processFileList = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsProcessingFiles(true);
    setProcessingStatus(`Analyzing ${fileArray.length} file(s)...`);

    const newBatchItems: BatchImageItem[] = [];

    for (let fIdx = 0; fIdx < fileArray.length; fIdx++) {
      const file = fileArray[fIdx];
      const isZip = file.type === 'application/zip' || /\.zip$/i.test(file.name);
      const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);

      if (isZip) {
        // ZIP Archive extraction
        setProcessingStatus(`Unzipping ${file.name}...`);
        try {
          const zipItems = await extractFilesFromZip(file, autoOptimize, (p) => {
            setProcessingStatus(`Unzipping ${file.name}: Extracting file ${p.current} of ${p.total} (${p.fileName})...`);
          });
          newBatchItems.push(...zipItems);
        } catch (err) {
          console.error('Failed to unpack zip file:', err);
        }
      } else if (isPdf) {
        // Multi-page PDF extraction
        setProcessingStatus(`Rendering PDF ${file.name} pages (${fIdx + 1}/${fileArray.length})...`);
        try {
          const pages = await renderPdfToImages(file, 20, (cur, tot) => {
            setProcessingStatus(`Rendering PDF: Page ${cur} of ${tot}...`);
          });

          pages.forEach((page) => {
            newBatchItems.push({
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
          console.error('Failed to parse PDF:', err);
        }
      } else if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|tiff|svg)$/i.test(file.name)) {
        // High-volume batch images
        setProcessingStatus(`Optimizing image ${fIdx + 1} of ${fileArray.length} (${file.name})...`);
        const result = await smartOptimizeLargeImage(file, !autoOptimize);
        newBatchItems.push({
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

    setIsProcessingFiles(false);
    setProcessingStatus('');

    if (newBatchItems.length > 0) {
      onImagesSelected(newBatchItems);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      await processFileList(e.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (folderInputRef.current) folderInputRef.current.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      await processFileList(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handlePasteButtonClick = async () => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        const imageType = item.types.find((type) => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const file = blob as File;
          const result = await smartOptimizeLargeImage(file, !autoOptimize);
          onImagesSelected([
            {
              id: Math.random().toString(36).substring(2, 9),
              name: 'Clipboard_Screenshot.png',
              dataUrl: result.dataUrl,
              mimeType: result.mimeType,
              fileSizeBytes: result.originalSize,
              optimizedSizeBytes: result.optimizedSize,
              isOptimized: result.isOptimized,
            },
          ]);
          return;
        }
      }
    } catch (err) {
      console.warn('Clipboard read failed:', err);
    }
  };

  const handleSampleClick = (sample: SampleImageOption) => {
    const dataUrl = sample.generate();
    onImagesSelected(
      [
        {
          id: Math.random().toString(36).substring(2, 9),
          name: `${sample.title}.png`,
          dataUrl,
          mimeType: 'image/png',
          fileSizeBytes: 240 * 1024,
        },
      ],
      sample.suggestedMode
    );
  };

  const getSampleIcon = (id: string) => {
    switch (id) {
      case 'receipt':
        return <Receipt className="w-4 h-4 text-emerald-400" />;
      case 'handwriting':
        return <PenTool className="w-4 h-4 text-amber-400" />;
      case 'business_card':
        return <CreditCard className="w-4 h-4 text-sky-400" />;
      case 'math_physics':
        return <Sigma className="w-4 h-4 text-purple-400" />;
      case 'code_terminal':
        return <Binary className="w-4 h-4 text-teal-400" />;
      case 'article_book':
        return <FileText className="w-4 h-4 text-blue-400" />;
      default:
        return <FileImage className="w-4 h-4 text-cyan-400" />;
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,application/pdf,.pdf,.zip,application/zip,application/x-zip-compressed"
        onChange={handleFileChange}
        className="hidden"
      />
      {/* Folder picker input */}
      <input
        ref={folderInputRef}
        type="file"
        multiple
        // @ts-expect-error webkitdirectory is standard in modern browsers
        webkitdirectory=""
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Main Drag & Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative group rounded-3xl border-2 border-dashed transition-all p-8 md:p-12 flex flex-col items-center justify-center text-center cursor-pointer overflow-hidden ${
          isDragging
            ? 'border-cyan-400 bg-cyan-950/30 scale-[1.01] shadow-2xl shadow-cyan-950/50'
            : 'border-slate-700/80 hover:border-cyan-500/60 bg-gradient-to-b from-slate-900/90 to-slate-900/50 hover:bg-slate-800/40'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03] pointer-events-none" />

        {/* Glow halo */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-500/20 transition-all" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/20 transition-all" />

        {/* Central Icon */}
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center mb-5 group-hover:scale-110 group-hover:border-cyan-400 transition-all shadow-xl">
          {isProcessingFiles ? (
            <Loader2 className="w-10 h-10 text-cyan-400 animate-spin" />
          ) : (
            <UploadCloud className="w-10 h-10 text-cyan-400 group-hover:text-cyan-300 transition-colors" />
          )}
        </div>

        {isProcessingFiles ? (
          <div className="mb-4 text-center max-w-md">
            <h3 className="text-xl font-bold text-white mb-2">
              Unpacking & Optimizing Files...
            </h3>
            <p className="text-sm text-cyan-300 font-mono animate-pulse">
              {processingStatus}
            </p>
          </div>
        ) : (
          <>
            <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
              Drop images, <span className="text-amber-400 font-bold">ZIP archives</span>, or documents here, or{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-400 underline decoration-cyan-400/40 underline-offset-4">
                browse files
              </span>
            </h3>
            <p className="text-slate-400 text-sm max-w-xl mb-6 leading-relaxed">
              Upload dozens of photos at once, entire folders, multi-page PDFs, or <strong className="text-amber-300">.ZIP archives</strong> containing your scans. Automatically unzips and queues all documents.
            </p>
          </>
        )}

        {/* Action Button Row */}
        <div
          className="flex flex-wrap items-center justify-center gap-3 mb-6"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-sm shadow-lg shadow-cyan-950/40 hover:shadow-cyan-900/60 transition-all"
          >
            <FileImage className="w-4 h-4" />
            <span>Select Files / ZIP</span>
          </button>

          <button
            onClick={() => folderInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 hover:text-white font-medium text-sm transition-all"
            title="Upload an entire folder of photos"
          >
            <FolderOpen className="w-4 h-4 text-amber-400" />
            <span>Upload Folder</span>
          </button>

          <button
            onClick={onOpenCamera}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 hover:text-white font-medium text-sm transition-all"
            title="Snap a photo using camera"
          >
            <Camera className="w-4 h-4 text-cyan-400" />
            <span>Use Camera</span>
          </button>

          <button
            onClick={handlePasteButtonClick}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 hover:text-white font-medium text-sm transition-all"
            title="Paste from clipboard"
          >
            <Clipboard className="w-4 h-4 text-cyan-400" />
            <span>Paste Screenshot</span>
          </button>
        </div>

        {/* Big File & Optimization Toggle */}
        <div
          className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => onToggleAutoOptimize(!autoOptimize)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all font-medium ${
              autoOptimize
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-cyan-400" />
            <span>Auto-Optimize Big Files (10x Faster)</span>
          </button>

          <span className="text-slate-600">|</span>

          <button
            onClick={() => onToggleAutoOptimize(!autoOptimize)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl transition-all font-medium ${
              !autoOptimize
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Raw Full-Res (Up to 150MB)</span>
          </button>
        </div>

        {/* Format Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-6 max-w-2xl text-[11px] text-slate-400 pointer-events-none">
          <div className="flex items-center gap-1.5 justify-center py-1 px-2 rounded-lg bg-slate-800/30 border border-slate-800">
            <Archive className="w-3 h-3 text-amber-400 shrink-0" />
            <span>.ZIP Archives (Unpacks in browser)</span>
          </div>
          <div className="flex items-center gap-1.5 justify-center py-1 px-2 rounded-lg bg-slate-800/30 border border-slate-800">
            <FolderOpen className="w-3 h-3 text-cyan-400 shrink-0" />
            <span>Full Folder Uploads</span>
          </div>
          <div className="flex items-center gap-1.5 justify-center py-1 px-2 rounded-lg bg-slate-800/30 border border-slate-800">
            <Layers className="w-3 h-3 text-blue-400 shrink-0" />
            <span>Multi-Page PDFs</span>
          </div>
          <div className="flex items-center gap-1.5 justify-center py-1 px-2 rounded-lg bg-slate-800/30 border border-slate-800">
            <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>Bulk 50+ Files at once</span>
          </div>
        </div>
      </div>

      {/* Instant Demo Samples Section */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Try Instant Test Samples</span>
          </div>
          <span className="text-xs text-slate-500">Click any card to load & test OCR immediately</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SAMPLE_IMAGES.map((sample) => (
            <button
              key={sample.id}
              onClick={() => handleSampleClick(sample)}
              className="group flex flex-col text-left p-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-850 border border-slate-800 hover:border-cyan-500/50 transition-all hover:shadow-lg hover:shadow-cyan-950/20"
            >
              <div className="flex items-center justify-between w-full mb-1.5">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-slate-800 border border-slate-700/60 group-hover:border-cyan-500/40 transition-colors">
                    {getSampleIcon(sample.id)}
                  </div>
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                    {sample.title}
                  </span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
              </div>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {sample.description}
              </p>
              <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-500">
                <span className="uppercase tracking-wider font-mono text-[10px] text-slate-400">
                  {sample.category}
                </span>
                <span className="text-cyan-400/90 font-medium capitalize">
                  Mode: {sample.suggestedMode}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
