import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  RotateCw,
  RotateCcw,
  Crop,
  Sliders,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Undo2,
  Check,
  X,
  Sun,
  Eye,
  Sparkles,
} from 'lucide-react';
import { ImageFilterSettings, CropRect } from '../types';
import { processImageOnCanvas } from '../utils/imageProcessing';

interface ImageCanvasEditorProps {
  originalImage: string;
  processedImage: string;
  onImageUpdated: (newProcessedImage: string) => void;
  onResetImage: () => void;
}

export const ImageCanvasEditor: React.FC<ImageCanvasEditorProps> = ({
  originalImage,
  processedImage,
  onImageUpdated,
  onResetImage,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Zoom and pan
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ImageFilterSettings>({
    brightness: 100,
    contrast: 100,
    grayscale: false,
    inverted: false,
    sharpen: false,
    rotation: 0,
  });

  // Cropping mode
  const [isCropping, setIsCropping] = useState(false);
  const [cropBox, setCropBox] = useState<{ startX: number; startY: number; currentX: number; currentY: number } | null>(null);
  const [cropPercent, setCropPercent] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [isDrawingCrop, setIsDrawingCrop] = useState(false);

  // Reset view on new image
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setIsCropping(false);
    setCropBox(null);
    setCropPercent(null);
  }, [originalImage]);

  // Handle filter changes and update parent processed image
  const applyFilterChange = async (newFilters: ImageFilterSettings) => {
    setFilters(newFilters);
    try {
      const updated = await processImageOnCanvas(originalImage, newFilters, null);
      onImageUpdated(updated);
    } catch (err) {
      console.error('Failed to apply filters:', err);
    }
  };

  const handleRotate = async (delta: number) => {
    const newRot = (filters.rotation + delta + 360) % 360;
    const newFilters = { ...filters, rotation: newRot };
    await applyFilterChange(newFilters);
  };

  const handlePresetFilter = (preset: 'normal' | 'contrast' | 'bw' | 'invert') => {
    let newFilters: ImageFilterSettings = { ...filters };
    if (preset === 'normal') {
      newFilters = { ...filters, brightness: 100, contrast: 100, grayscale: false, inverted: false };
    } else if (preset === 'contrast') {
      newFilters = { ...filters, brightness: 105, contrast: 145, grayscale: false, inverted: false };
    } else if (preset === 'bw') {
      newFilters = { ...filters, brightness: 100, contrast: 130, grayscale: true, inverted: false };
    } else if (preset === 'invert') {
      newFilters = { ...filters, brightness: 100, contrast: 120, grayscale: false, inverted: true };
    }
    applyFilterChange(newFilters);
  };

  // Zoom handlers
  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));
  const handleResetZoom = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Pan handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isCropping) {
      if (!imageRef.current) return;
      const rect = imageRef.current.getBoundingClientRect();
      const clientX = Math.max(rect.left, Math.min(rect.right, e.clientX));
      const clientY = Math.max(rect.top, Math.min(rect.bottom, e.clientY));

      setIsDrawingCrop(true);
      setCropBox({
        startX: clientX - rect.left,
        startY: clientY - rect.top,
        currentX: clientX - rect.left,
        currentY: clientY - rect.top,
      });
      return;
    }

    if (zoom > 1) {
      setIsPanning(true);
      panStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isCropping && isDrawingCrop && cropBox && imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      const currentX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const currentY = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

      setCropBox({
        ...cropBox,
        currentX,
        currentY,
      });

      // Calculate percentage coordinates
      const x1 = Math.min(cropBox.startX, currentX) / rect.width;
      const y1 = Math.min(cropBox.startY, currentY) / rect.height;
      const x2 = Math.max(cropBox.startX, currentX) / rect.width;
      const y2 = Math.max(cropBox.startY, currentY) / rect.height;
      setCropPercent({ x1, y1, x2, y2 });
      return;
    }

    if (isPanning && zoom > 1) {
      setPan({
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      });
    }
  };

  const handleMouseUp = () => {
    if (isCropping && isDrawingCrop) {
      setIsDrawingCrop(false);
    }
    setIsPanning(false);
  };

  // Apply Crop
  const handleExecuteCrop = async () => {
    if (!cropPercent || !imageRef.current) return;

    const img = imageRef.current;
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;

    const x = Math.round(cropPercent.x1 * naturalW);
    const y = Math.round(cropPercent.y1 * naturalH);
    const width = Math.round((cropPercent.x2 - cropPercent.x1) * naturalW);
    const height = Math.round((cropPercent.y2 - cropPercent.y1) * naturalH);

    if (width < 20 || height < 20) return;

    const cropRect: CropRect = { x, y, width, height };

    try {
      const croppedData = await processImageOnCanvas(processedImage, {
        brightness: 100,
        contrast: 100,
        grayscale: false,
        inverted: false,
        sharpen: false,
        rotation: 0,
      }, cropRect);

      onImageUpdated(croppedData);
      setIsCropping(false);
      setCropBox(null);
      setCropPercent(null);
    } catch (err) {
      console.error('Failed to execute crop:', err);
    }
  };

  const handleCancelCrop = () => {
    setIsCropping(false);
    setCropBox(null);
    setCropPercent(null);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl">
      {/* Top action toolbar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900 border-b border-slate-800 text-slate-300 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-medium text-slate-400 mr-1 flex items-center gap-1">
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            Image View
          </span>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Zoom controls */}
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          {zoom !== 1 && (
            <button
              onClick={handleResetZoom}
              className="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors text-[11px]"
              title="Reset Zoom"
            >
              {Math.round(zoom * 100)}%
            </button>
          )}

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Rotate controls */}
          <button
            onClick={() => handleRotate(-90)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Rotate Left 90°"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => handleRotate(90)}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title="Rotate Right 90°"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Crop Toggle */}
          <button
            onClick={() => {
              setIsCropping(!isCropping);
              setCropBox(null);
              setCropPercent(null);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors font-medium text-xs ${
              isCropping
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
            title="Crop / Select Specific Region"
          >
            <Crop className="w-3.5 h-3.5" />
            <span>{isCropping ? 'Cropping...' : 'Crop'}</span>
          </button>

          {/* Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors font-medium text-xs ${
              showFilters
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'hover:bg-slate-800 text-slate-300'
            }`}
            title="OCR Enhancement Filters"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Filters</span>
          </button>
        </div>

        {/* Reset button */}
        <button
          onClick={onResetImage}
          className="flex items-center gap-1 text-slate-400 hover:text-slate-200 transition-colors px-2 py-1 hover:bg-slate-800 rounded-lg text-xs"
          title="Reset to Original Image"
        >
          <Undo2 className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Filter drawer (if open) */}
      {showFilters && (
        <div className="px-4 py-3 bg-slate-950/70 border-b border-slate-800 flex flex-wrap items-center gap-4 text-xs animate-in slide-in-from-top-1">
          {/* Quick presets */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-medium mr-1">Presets:</span>
            <button
              onClick={() => handlePresetFilter('normal')}
              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
            >
              Normal
            </button>
            <button
              onClick={() => handlePresetFilter('contrast')}
              className="px-2.5 py-1 rounded-md bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-800/60 font-medium"
              title="Enhances faint receipts and handwriting"
            >
              High Contrast
            </button>
            <button
              onClick={() => handlePresetFilter('bw')}
              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
            >
              B&W (Grayscale)
            </button>
            <button
              onClick={() => handlePresetFilter('invert')}
              className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
              title="For white text on dark backgrounds"
            >
              Invert Colors
            </button>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden sm:block" />

          {/* Sliders */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Contrast:</span>
              <input
                type="range"
                min="50"
                max="200"
                value={filters.contrast}
                onChange={(e) =>
                  applyFilterChange({ ...filters, contrast: parseInt(e.target.value, 10) })
                }
                className="w-20 accent-cyan-400 cursor-pointer"
              />
              <span className="text-slate-500 w-8">{filters.contrast}%</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Brightness:</span>
              <input
                type="range"
                min="50"
                max="150"
                value={filters.brightness}
                onChange={(e) =>
                  applyFilterChange({ ...filters, brightness: parseInt(e.target.value, 10) })
                }
                className="w-20 accent-cyan-400 cursor-pointer"
              />
              <span className="text-slate-500 w-8">{filters.brightness}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Cropping prompt bar */}
      {isCropping && (
        <div className="px-4 py-2 bg-amber-950/40 border-b border-amber-800/60 flex items-center justify-between text-xs text-amber-200">
          <div className="flex items-center gap-1.5">
            <Crop className="w-3.5 h-3.5 text-amber-400" />
            <span>Drag a box over the region you want to extract.</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancelCrop}
              className="px-2.5 py-1 rounded-md hover:bg-white/10 text-slate-300 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel</span>
            </button>
            <button
              onClick={handleExecuteCrop}
              disabled={!cropPercent}
              className="px-3 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold disabled:opacity-40 flex items-center gap-1 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply Crop</span>
            </button>
          </div>
        </div>
      )}

      {/* Main image viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className={`relative flex-1 min-h-[350px] bg-slate-950/90 flex items-center justify-center p-4 overflow-hidden select-none ${
          isCropping ? 'cursor-crosshair' : zoom > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        }`}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isPanning || isCropping ? 'none' : 'transform 0.15s ease-out',
          }}
          className="relative max-w-full max-h-full flex items-center justify-center"
        >
          <img
            ref={imageRef}
            src={processedImage}
            alt="Source to Extract"
            draggable={false}
            className="max-h-[62vh] max-w-full object-contain rounded-lg shadow-2xl border border-slate-800"
          />

          {/* Interactive crop overlay */}
          {isCropping && cropBox && (
            <div
              style={{
                position: 'absolute',
                left: `${Math.min(cropBox.startX, cropBox.currentX)}px`,
                top: `${Math.min(cropBox.startY, cropBox.currentY)}px`,
                width: `${Math.abs(cropBox.currentX - cropBox.startX)}px`,
                height: `${Math.abs(cropBox.currentY - cropBox.startY)}px`,
              }}
              className="border-2 border-amber-400 bg-amber-400/20 pointer-events-none shadow-sm"
            >
              <div className="absolute top-1 left-1 bg-black/70 text-amber-300 text-[10px] px-1.5 py-0.5 rounded font-mono">
                {Math.round(Math.abs(cropBox.currentX - cropBox.startX))} × {Math.round(Math.abs(cropBox.currentY - cropBox.startY))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
