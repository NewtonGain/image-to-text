import { ImageFilterSettings, CropRect } from '../types';

/**
 * Loads an image from a Data URL and returns an HTMLImageElement promise.
 */
export function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = dataUrl;
  });
}

/**
 * Reads a File object into a base64 Data URL.
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Applies rotation, filters, and optional crop to an image, returning a new data URL.
 */
export async function processImageOnCanvas(
  sourceDataUrl: string,
  filters: ImageFilterSettings,
  crop?: CropRect | null
): Promise<string> {
  const img = await loadImage(sourceDataUrl);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get 2d canvas context');

  const rot = (filters.rotation % 360 + 360) % 360;
  const isRotated90or270 = rot === 90 || rot === 270;

  // If crop is provided, we crop to that specific area
  if (crop && crop.width > 10 && crop.height > 10) {
    canvas.width = crop.width;
    canvas.height = crop.height;

    // Apply CSS-like filters on canvas context
    ctx.filter = buildCssFilterString(filters);

    ctx.drawImage(
      img,
      crop.x,
      crop.y,
      crop.width,
      crop.height,
      0,
      0,
      crop.width,
      crop.height
    );

    return canvas.toDataURL('image/png');
  }

  // Full image with rotation and filters
  if (isRotated90or270) {
    canvas.width = img.height;
    canvas.height = img.width;
  } else {
    canvas.width = img.width;
    canvas.height = img.height;
  }

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((rot * Math.PI) / 180);

  // Apply filters
  ctx.filter = buildCssFilterString(filters);

  ctx.drawImage(img, -img.width / 2, -img.height / 2);
  ctx.restore();

  return canvas.toDataURL('image/png');
}

function buildCssFilterString(filters: ImageFilterSettings): string {
  const parts: string[] = [];

  if (filters.brightness !== 100) {
    parts.push(`brightness(${filters.brightness}%)`);
  }
  if (filters.contrast !== 100) {
    parts.push(`contrast(${filters.contrast}%)`);
  }
  if (filters.grayscale) {
    parts.push('grayscale(100%)');
  }
  if (filters.inverted) {
    parts.push('invert(100%)');
  }

  return parts.length > 0 ? parts.join(' ') : 'none';
}

/**
 * Formats a byte size into human readable string (e.g., 24.8 MB, 840 KB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Optimizes huge image files (e.g. 10MB-100MB camera photos or high-res 600 DPI scans)
 * for OCR transmission, preserving pristine typography while speeding up processing 10x.
 */
export async function smartOptimizeLargeImage(
  file: File,
  forceOriginal = false
): Promise<{
  dataUrl: string;
  originalSize: number;
  optimizedSize: number;
  isOptimized: boolean;
  mimeType: string;
}> {
  const originalSize = file.size;

  // If user requests raw original or file is already small (< 3.5MB), read as-is
  if (forceOriginal || originalSize < 3.5 * 1024 * 1024) {
    const rawDataUrl = await readFileAsDataUrl(file);
    return {
      dataUrl: rawDataUrl,
      originalSize,
      optimizedSize: originalSize,
      isOptimized: false,
      mimeType: file.type || 'image/png',
    };
  }

  // Large file detected: load image into canvas and intelligently downscale colossal dimensions (e.g. 8000x6000 down to max 3840)
  const rawDataUrl = await readFileAsDataUrl(file);
  const img = await loadImage(rawDataUrl);

  const maxDimension = 3600; // 3.6K resolution is ultra crisp for OCR
  let targetW = img.naturalWidth || img.width;
  let targetH = img.naturalHeight || img.height;

  let needsResize = false;
  if (targetW > maxDimension || targetH > maxDimension) {
    needsResize = true;
    if (targetW > targetH) {
      targetH = Math.round((targetH * maxDimension) / targetW);
      targetW = maxDimension;
    } else {
      targetW = Math.round((targetW * maxDimension) / targetH);
      targetH = maxDimension;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return {
      dataUrl: rawDataUrl,
      originalSize,
      optimizedSize: originalSize,
      isOptimized: false,
      mimeType: file.type || 'image/png',
    };
  }

  // Draw with bicubic smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, targetW, targetH);

  // Compress to crisp JPEG with 0.92 quality (perfect for text contrast)
  const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.92);

  // Approximate byte size of base64
  const head = 'data:image/jpeg;base64,';
  const base64Len = optimizedDataUrl.length - head.length;
  const optimizedSize = Math.round((base64Len * 3) / 4);

  return {
    dataUrl: optimizedDataUrl,
    originalSize,
    optimizedSize,
    isOptimized: true,
    mimeType: 'image/jpeg',
  };
}

/**
 * Downloads text as a file.
 */
export function downloadTextFile(filename: string, content: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
