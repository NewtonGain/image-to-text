import * as pdfjsLib from 'pdfjs-dist';

// Configure worker source for pdfjs-dist
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export interface PdfPageResult {
  pageNumber: number;
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Renders pages of a PDF file into high-resolution image data URLs for OCR.
 * @param file The PDF File object
 * @param maxPages Maximum number of pages to render (default 10)
 * @param onProgress Optional progress callback (page, total)
 */
export async function renderPdfToImages(
  file: File,
  maxPages = 15,
  onProgress?: (current: number, total: number) => void
): Promise<PdfPageResult[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const numPages = Math.min(pdfDoc.numPages, maxPages);

  const pages: PdfPageResult[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    if (onProgress) {
      onProgress(pageNum, numPages);
    }

    const page = await pdfDoc.getPage(pageNum);
    // Render at 2.0 scale (approx 150-200 DPI) for sharp, crisp OCR text
    const viewport = page.getViewport({ scale: 2.0 });

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport,
      canvas: canvas as unknown as HTMLCanvasElement,
    }).promise;

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    pages.push({
      pageNumber: pageNum,
      dataUrl,
      width: viewport.width,
      height: viewport.height,
    });
  }

  return pages;
}
