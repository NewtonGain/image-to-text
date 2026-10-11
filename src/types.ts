export type ExtractionMode = 
  | 'markdown' 
  | 'raw' 
  | 'table' 
  | 'structured' 
  | 'handwriting' 
  | 'math';

export interface ExtractionStats {
  wordCount: number;
  charCount: number;
  lineCount: number;
}

export interface ExtractionResult {
  id: string;
  text: string;
  mode: ExtractionMode;
  stats: ExtractionStats;
  timestamp: number;
  thumbnailUrl?: string;
  imageName?: string;
  targetLanguage?: string;
  fileSizeBytes?: number;
  originalFileSizeFormatted?: string;
  optimizedSizeBytes?: number;
  pageNumber?: number;
  totalPages?: number;
}

export interface ImageFilterSettings {
  brightness: number; // 50 to 150 (100 = default)
  contrast: number;   // 50 to 200 (100 = default)
  grayscale: boolean;
  inverted: boolean;
  sharpen: boolean;
  rotation: number;   // 0, 90, 180, 270
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface BatchImageItem {
  id: string;
  name: string;
  dataUrl: string;
  mimeType: string;
  fileSizeBytes?: number;
  fileSizeFormatted?: string;
  optimizedSizeBytes?: number;
  isOptimized?: boolean;
  pageNumber?: number;
  totalPages?: number;
  result?: ExtractionResult;
  status?: 'idle' | 'processing' | 'done' | 'error';
  error?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
