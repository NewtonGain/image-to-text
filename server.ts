import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ extended: true, limit: '150mb' }));

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// Helper to initialize Gemini SDK
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in the server environment.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Clean base64 input helper
function cleanBase64Data(raw: string, defaultMime = 'image/png'): { data: string; mimeType: string } {
  let mimeType = defaultMime;
  let data = raw.trim();

  const match = data.match(/^data:([a-zA-Z0-9/+.-]+);base64,(.+)$/);
  if (match) {
    mimeType = match[1];
    data = match[2];
  }

  // Remove any remaining whitespace or newlines
  data = data.replace(/[\r\n\s]/g, '');

  return { data, mimeType };
}

// Main OCR extraction endpoint
app.post('/api/extract', async (req: Request, res: Response) => {
  try {
    const { image, mimeType: userMime, mode = 'markdown', targetLanguage, customPrompt } = req.body;

    if (!image || typeof image !== 'string') {
      res.status(400).json({ error: 'Image data (base64 string) is required.' });
      return;
    }

    const ai = getGeminiClient();
    const cleaned = cleanBase64Data(image, userMime || 'image/png');

    let modePrompt = '';
    switch (mode) {
      case 'raw':
        modePrompt = `
Extract all visible text from this image with 100% exact fidelity.
- Preserve the exact layout, indentation, line breaks, punctuation, capitalization, and numbers.
- Do NOT fix typos, do NOT translate, and do NOT add Markdown headings or quotes.
- Do NOT write introductory phrases (e.g. "Here is the extracted text:"). Output ONLY the extracted text itself.
`;
        break;
      case 'markdown':
        modePrompt = `
Extract all visible text from this image and format it into clean, rich Markdown.
- Use appropriate headers (#, ##, ###) for document headings.
- Format lists with bullet points (-) or numbered items (1., 2.).
- Use bold (**text**) for emphasized or bold text in the image.
- Format tabular data into Markdown tables (| Header | ... |).
- Use code blocks (\`\`\`...\`\`\`) for code, monospace text, or command-line logs.
- Preserve all numbers, prices, dates, and names accurately.
- Output ONLY the extracted content in Markdown. Do not include chat commentary.
`;
        break;
      case 'table':
        modePrompt = `
Extract all tabular data, columns, receipts, or data lists from this image.
- Structure all tabular contents into clean Markdown tables with headers and rows.
- If there is text outside the tables (e.g., title, footer, notes), include them clearly before or after the table.
- Preserve column alignment, monetary values, and decimal precision accurately.
- Provide a clean TSV (Tab Separated Values) block under a "### TSV / Spreadsheet Format" header so the user can easily paste into Excel/Google Sheets.
`;
        break;
      case 'structured':
        modePrompt = `
Extract and structure all information from this image.
Analyze whether this is a receipt, invoice, business card, form, menu, ID card, document, or label.
1. Provide a clean summary of the key entities (e.g., Merchant/Organization, Date, Time, Invoice/Receipt #, Total, Tax, Subtotal, Address, Phone, Email, Line Items, Key-Value pairs).
2. Followed by a clean JSON codeblock (\`\`\`json ... \`\`\`) containing all parsed structured fields.
3. Followed by the complete transcribed text.
`;
        break;
      case 'handwriting':
        modePrompt = `
Extract handwritten text, cursive script, whiteboard notes, or annotations from this image.
- Transcribe handwritten words with maximum deciphering accuracy.
- If a word or number is partially cut off or completely illegible, transcribe your best guess followed by [?] (e.g., "meeting[?]").
- Maintain paragraph groupings, bullet structures, and margin notes.
- Output clean, readable text representing what was written.
`;
        break;
      case 'math':
        modePrompt = `
Extract mathematical, scientific, or chemical formulas, equations, and technical text from this image.
- For all equations, provide both readable text notation and standard LaTeX notation using $...$ for inline formulas and $$...$$ for block display formulas.
- Clearly extract variable definitions, steps, theorems, or problem statements present in the image.
- Preserve exponents, subscripts, matrices, fractions, square roots, integrals, and Greek letters accurately.
`;
        break;
      default:
        modePrompt = `Extract all visible text from the image accurately in clean Markdown.`;
    }

    let languagePrompt = '';
    if (targetLanguage && targetLanguage !== 'auto' && targetLanguage.toLowerCase() !== 'keep original') {
      languagePrompt = `\nImportant: Translate the extracted text accurately into ${targetLanguage}. Keep original names, brand names, and numbers intact.`;
    }

    let userInstructionPrompt = '';
    if (customPrompt && typeof customPrompt === 'string' && customPrompt.trim()) {
      userInstructionPrompt = `\nSpecial User Instruction: ${customPrompt.trim()}`;
    }

    const fullPrompt = `
You are an expert Optical Character Recognition (OCR) and document intelligence system.
Analyze this image thoroughly:
${modePrompt}
${languagePrompt}
${userInstructionPrompt}

Provide the extracted output. Be extremely accurate, especially with numbers, phone numbers, email addresses, serial codes, currencies, and technical symbols.
`;

    const imagePart = {
      inlineData: {
        mimeType: cleaned.mimeType,
        data: cleaned.data,
      },
    };

    const textPart = {
      text: fullPrompt,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: { parts: [imagePart, textPart] },
    });

    const extractedText = response.text || '';

    // Quick stats
    const words = extractedText.trim() ? extractedText.trim().split(/\s+/).length : 0;
    const characters = extractedText.length;
    const lines = extractedText ? extractedText.split('\n').length : 0;

    res.json({
      text: extractedText,
      mode,
      stats: {
        wordCount: words,
        charCount: characters,
        lineCount: lines,
      },
      timestamp: Date.now(),
    });
  } catch (err: unknown) {
    console.error('Error in /api/extract:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown OCR error occurred';
    res.status(500).json({ error: errorMessage });
  }
});

// Text enhancement endpoint (summarize, proofread, translate, format, extract entities)
app.post('/api/enhance', async (req: Request, res: Response) => {
  try {
    const { text, action, targetLanguage, customInstruction } = req.body;

    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: 'Text is required for enhancement.' });
      return;
    }

    const ai = getGeminiClient();

    let instruction = '';
    switch (action) {
      case 'summarize':
        instruction = 'Provide a concise, high-level summary of the following text, highlighting key takeaways:';
        break;
      case 'bullet_points':
        instruction = 'Convert and structure the following text into clear, organized bullet points with bold sub-headers where logical:';
        break;
      case 'fix_grammar':
        instruction = 'Proofread and fix any typos, spelling errors, or OCR noise in the following text while preserving original meaning and tone:';
        break;
      case 'translate':
        instruction = `Translate the following text accurately into ${targetLanguage || 'English'}:`;
        break;
      case 'extract_entities':
        instruction = 'Extract and categorize all key entities (dates, numbers, prices, names, organizations, email addresses, phone numbers, URLs, locations) from the following text into a clean organized list:';
        break;
      case 'convert_json':
        instruction = 'Convert the key information from the following text into valid, formatted JSON format (return only the JSON object inside a ```json``` block):';
        break;
      case 'custom':
        instruction = customInstruction || 'Process the following text:';
        break;
      default:
        instruction = 'Clean up and improve readability of the following text:';
    }

    const prompt = `${instruction}\n\n---\n${text}\n---`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
    });

    res.json({
      result: response.text || '',
      action,
    });
  } catch (err: unknown) {
    console.error('Error in /api/enhance:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown enhancement error';
    res.status(500).json({ error: errorMessage });
  }
});

// Start server and handle Vite middleware
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
