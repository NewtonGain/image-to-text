import JSZip from 'jszip';
import { BatchImageItem, ExtractionResult } from '../types';
import { smartOptimizeLargeImage } from './imageProcessing';
import { renderPdfToImages } from './pdfProcessor';

const VALID_IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|gif|bmp|tiff|svg)$/i;

export interface ZipExtractionProgress {
  current: number;
  total: number;
  fileName: string;
}

/**
 * Extracts all images and PDFs from a ZIP file and converts them to BatchImageItems.
 */
export async function extractFilesFromZip(
  zipFile: File,
  autoOptimize = true,
  onProgress?: (progress: ZipExtractionProgress) => void
): Promise<BatchImageItem[]> {
  const zip = await JSZip.loadAsync(zipFile);
  const items: BatchImageItem[] = [];

  // Filter entries to avoid directories and Mac metadata
  const entries: { path: string; file: JSZip.JSZipObject }[] = [];
  zip.forEach((relativePath, file) => {
    if (file.dir) return;
    if (relativePath.includes('__MACOSX') || relativePath.includes('.DS_Store')) return;
    const isImage = VALID_IMAGE_EXTENSIONS.test(relativePath);
    const isPdf = /\.pdf$/i.test(relativePath);
    if (isImage || isPdf) {
      entries.push({ path: relativePath, file });
    }
  });

  const total = entries.length;

  for (let i = 0; i < total; i++) {
    const { path: relativePath, file: entry } = entries[i];
    const fileName = relativePath.split('/').pop() || relativePath;

    if (onProgress) {
      onProgress({ current: i + 1, total, fileName });
    }

    try {
      const blob = await entry.async('blob');

      if (/\.pdf$/i.test(relativePath)) {
        // PDF inside zip
        const pdfFile = new File([blob], fileName, { type: 'application/pdf' });
        const pages = await renderPdfToImages(pdfFile, 10);
        pages.forEach((page) => {
          items.push({
            id: Math.random().toString(36).substring(2, 9),
            name: `${fileName.replace(/\.[^/.]+$/, '')} (Page ${page.pageNumber})`,
            dataUrl: page.dataUrl,
            mimeType: 'image/jpeg',
            fileSizeBytes: Math.round(blob.size / pages.length),
            pageNumber: page.pageNumber,
            totalPages: pages.length,
          });
        });
      } else {
        // Image inside zip
        const imageFile = new File([blob], fileName, { type: blob.type || 'image/png' });
        const result = await smartOptimizeLargeImage(imageFile, !autoOptimize);

        items.push({
          id: Math.random().toString(36).substring(2, 9),
          name: fileName,
          dataUrl: result.dataUrl,
          mimeType: result.mimeType,
          fileSizeBytes: result.originalSize,
          optimizedSizeBytes: result.optimizedSize,
          isOptimized: result.isOptimized,
        });
      }
    } catch (err) {
      console.warn(`Could not extract ${relativePath} from zip:`, err);
    }
  }

  return items;
}

/**
 * Creates a downloadable ZIP file containing all extracted text documents.
 */
export async function downloadExtractionsAsZip(
  results: ExtractionResult[],
  zipFilename = 'scantext_all_extractions.zip'
): Promise<void> {
  const zip = new JSZip();

  // Master summary markdown
  let summary = `# Bulk OCR Extractions Summary\n`;
  summary += `Generated: ${new Date().toLocaleString()}\n`;
  summary += `Total Documents Processed: ${results.length}\n\n`;
  summary += `---\n\n`;

  results.forEach((item, index) => {
    const baseName = item.imageName?.replace(/\.[^/.]+$/, '') || `document_${index + 1}`;
    const txtName = `${baseName}.txt`;
    const mdName = `${baseName}.md`;

    // Add individual .txt and .md files
    zip.file(`txt/${txtName}`, item.text);
    zip.file(`markdown/${mdName}`, item.text);

    summary += `### [${index + 1}] ${item.imageName || 'Document'}\n`;
    summary += `- Words: ${item.stats.wordCount} | Characters: ${item.stats.charCount} | Mode: ${item.mode}\n\n`;
    summary += `${item.text}\n\n---\n\n`;
  });

  zip.file('SUMMARY.md', summary);

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = zipFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
