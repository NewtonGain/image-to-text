/**
 * Generates realistic sample images client-side using HTML5 Canvas.
 * Allows instant testing of OCR with various document types.
 */

export interface SampleImageOption {
  id: string;
  title: string;
  category: string;
  description: string;
  suggestedMode: 'markdown' | 'raw' | 'table' | 'structured' | 'handwriting' | 'math';
  generate: () => string; // returns data URL
}

function createReceiptImage(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 800;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Thermal paper texture
  ctx.fillStyle = '#faf8f5';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Slight noise / paper texture
  ctx.fillStyle = 'rgba(0,0,0,0.02)';
  for (let i = 0; i < 500; i++) {
    ctx.fillRect(Math.random() * 600, Math.random() * 800, 2, 2);
  }

  // Receipt content
  ctx.fillStyle = '#1e293b';
  ctx.textAlign = 'center';
  ctx.font = 'bold 26px "Courier New", Courier, monospace';
  ctx.fillText('BLUE BOTTLE COFFEE & CO.', 300, 60);

  ctx.font = '14px "Courier New", Courier, monospace';
  ctx.fillText('315 University Ave, Palo Alto, CA 94301', 300, 85);
  ctx.fillText('Tel: (650) 555-0199  •  Store #412', 300, 105);
  ctx.fillText('Cashier: Maya S.   •   Terminal: POS-03', 300, 125);
  ctx.fillText('------------------------------------------------', 300, 145);

  ctx.textAlign = 'left';
  ctx.font = '13px "Courier New", Courier, monospace';
  ctx.fillText('DATE: 2026-10-11          TIME: 09:42 AM', 60, 170);
  ctx.fillText('ORDER: #A-48291          TRANS: SALE', 60, 190);
  ctx.fillText('------------------------------------------------', 60, 210);

  const items = [
    { qty: '1', desc: 'Espresso Single Origin', price: '$4.75' },
    { qty: '2', desc: 'Oat Milk Flat White 12oz', price: '$12.50' },
    { qty: '1', desc: 'Almond Croissant (Warm)', price: '$5.25' },
    { qty: '1', desc: 'Avocado Sourdough Toast', price: '$11.00' },
    { qty: '1', desc: 'Sparkling Mineral Water', price: '$3.50' },
  ];

  ctx.font = 'bold 14px "Courier New", Courier, monospace';
  ctx.fillText('QTY  ITEM DESCRIPTION                  PRICE', 60, 240);
  ctx.fillText('------------------------------------------------', 60, 255);

  let y = 280;
  ctx.font = '14px "Courier New", Courier, monospace';
  items.forEach(it => {
    ctx.fillText(`${it.qty.padEnd(4)} ${it.desc.padEnd(28)} ${it.price}`, 60, y);
    y += 30;
  });

  ctx.fillText('------------------------------------------------', 60, y);
  y += 30;

  ctx.textAlign = 'right';
  ctx.fillText('Subtotal:      $37.00', 540, y);
  y += 25;
  ctx.fillText('CA State Tax (9.13%):       $3.38', 540, y);
  y += 25;
  ctx.fillText('Tip (18%):       $6.66', 540, y);
  y += 35;
  ctx.font = 'bold 18px "Courier New", Courier, monospace';
  ctx.fillText('TOTAL AMOUNT:      $47.04', 540, y);
  y += 35;

  ctx.font = '13px "Courier New", Courier, monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Paid via Apple Pay (Visa ending in 8842)', 300, y);
  y += 20;
  ctx.fillText('AUTH CODE: 981249 • REF: 0092819', 300, y);
  y += 40;

  // Barcode mock
  ctx.fillStyle = '#111';
  for (let b = 100; b < 500; b += Math.random() > 0.4 ? 6 : 10) {
    ctx.fillRect(b, y, Math.random() > 0.5 ? 4 : 2, 45);
  }
  y += 65;

  ctx.font = 'italic 14px "Courier New", Courier, monospace';
  ctx.fillText('Thank you for visiting Blue Bottle!', 300, y);
  y += 20;
  ctx.fillText('Wi-Fi: BlueBottle_Guest  Key: freshcoffee2026', 300, y);

  return canvas.toDataURL('image/png');
}

function createHandwritingImage(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 750;
  canvas.height = 950;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Yellow legal pad background
  ctx.fillStyle = '#fef9c3';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Red left margin line
  ctx.strokeStyle = '#f87171';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(90, 0);
  ctx.lineTo(90, canvas.height);
  ctx.stroke();

  // Blue ruled lines
  ctx.strokeStyle = '#93c5fd';
  ctx.lineWidth = 1;
  for (let y = 90; y < canvas.height; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // Handwritten notes style
  ctx.fillStyle = '#1e3a8a'; // Blue ink
  ctx.font = 'bold 26px "Brush Script MT", "Comic Sans MS", cursive, sans-serif';
  ctx.fillText('Project Apollo - Sprint 14 Planning Notes', 110, 80);

  ctx.font = '22px "Comic Sans MS", cursive, sans-serif';
  ctx.fillStyle = '#0f172a';

  const notes = [
    '• Finalize API schema with backend team by Wednesday 2 PM',
    '• Need to address latency issue in image OCR pipeline (<800ms target)',
    '• Review security audits for user data privacy compliance',
    '• Key Deliverables for Q4 Release:',
    '   1. Multilingual translation support (15+ languages)',
    '   2. Batch image drag-and-drop processing',
    '   3. Automatic table and spreadsheet extraction',
    '• Action Items & Assignees:',
    '   - Maya: Deploy Cloud Run microservices to production cluster',
    '   - Daniel: Coordinate with client on UI feedback and sign-off',
    '   - Sarah: Prepare slide deck for board meeting on Oct 24th',
    '• Budget Approved: $45,000 for server infrastructure & GPU scale',
    '• Remember to order catering for Friday demo session!'
  ];

  let currentY = 130;
  notes.forEach(note => {
    ctx.fillText(note, 105, currentY);
    currentY += 40;
  });

  // Stamp / handwritten star
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 3;
  ctx.strokeRect(480, 520, 240, 60);
  ctx.fillStyle = '#dc2626';
  ctx.font = 'bold 20px "Comic Sans MS", cursive, sans-serif';
  ctx.fillText('★ HIGH PRIORITY ★', 510, 558);

  return canvas.toDataURL('image/png');
}

function createBusinessCardImage(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 700;
  canvas.height = 420;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Modern dark card styling
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Gradient accent banner
  const grad = ctx.createLinearGradient(0, 0, 700, 0);
  grad.addColorStop(0, '#38bdf8');
  grad.addColorStop(0.5, '#818cf8');
  grad.addColorStop(1, '#c084fc');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 700, 8);

  // Brand logo mark
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(70, 70, 26, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('NX', 70, 77);

  // Company Name
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText('NEXUS INTELLIGENCE LABS', 115, 68);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('Next-Generation Machine Perception & AI Systems', 115, 90);

  // Person Details
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px system-ui, sans-serif';
  ctx.fillText('Dr. Elena Rostova, Ph.D.', 60, 180);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillText('Vice President of Computer Vision & Deep Learning', 60, 210);

  // Divider
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 240);
  ctx.lineTo(640, 240);
  ctx.stroke();

  // Contact Info
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '15px system-ui, sans-serif';
  ctx.fillText('✉  elena.rostova@nexus-labs.ai', 60, 280);
  ctx.fillText('☎  +1 (415) 890-4421', 60, 315);
  ctx.fillText('🌐  www.nexus-intelligence-labs.io', 60, 350);

  ctx.fillText('📍  100 Montgomery St, Suite 2400', 380, 280);
  ctx.fillText('    San Francisco, CA 94104', 380, 305);
  ctx.fillText('🆔  ORCID: 0000-0002-1824-9921', 380, 350);

  return canvas.toDataURL('image/png');
}

function createMathPhysicsImage(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 650;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Green chalkboard style
  ctx.fillStyle = '#1e382b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Chalkboard border
  ctx.strokeStyle = '#854d0e';
  ctx.lineWidth = 14;
  ctx.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);

  // White chalk text
  ctx.fillStyle = '#f1f5f9';
  ctx.font = 'bold 26px "Cambria Math", "Times New Roman", serif';
  ctx.fillText('Physics & Calculus Lecture: Fundamental Equations', 50, 65);

  ctx.font = 'italic 22px "Cambria Math", "Times New Roman", serif';
  
  const equations = [
    '1. Newton’s Second Law & Momentum:',
    '   F = m · a = dp / dt',
    '',
    '2. Maxwell-Faraday Induction Equation:',
    '   ∇ × E = -∂B / ∂t',
    '',
    '3. Time-Dependent Schrödinger Equation:',
    '   iℏ ∂Ψ(r,t)/∂t = [- (ℏ² / 2m) ∇² + V(r,t)] Ψ(r,t)',
    '',
    '4. Definite Gaussian Integral:',
    '   ∫_{-∞}^{+∞} e^{-x²} dx = √π',
    '',
    '5. Einstein’s Mass-Energy Equivalence:',
    '   E² = (p · c)² + (m₀ · c²)²  ⟹  E = m · c²',
    '',
    'Note: Conservation of total angular momentum holds for isolated systems: dL/dt = 0'
  ];

  let y = 115;
  equations.forEach(eq => {
    ctx.fillText(eq, 50, y);
    y += 38;
  });

  return canvas.toDataURL('image/png');
}

function createCodeTerminalImage(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 760;
  canvas.height = 560;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Window background
  ctx.fillStyle = '#090d16';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Window header bar
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, canvas.width, 38);

  // Window buttons
  ctx.fillStyle = '#ef4444';
  ctx.beginPath(); ctx.arc(20, 19, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#eab308';
  ctx.beginPath(); ctx.arc(40, 19, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#22c55e';
  ctx.beginPath(); ctx.arc(60, 19, 6, 0, Math.PI * 2); ctx.fill();

  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px monospace';
  ctx.fillText('zsh — server.ts: worker-ocr-service (80x24)', 220, 24);

  // Code lines
  const lines = [
    { text: '$ npm run deploy:production', color: '#38bdf8' },
    { text: '[09:42:01] Building production bundles with esbuild...', color: '#94a3b8' },
    { text: '✓ 142 modules transformed in 218ms', color: '#22c55e' },
    { text: '', color: '' },
    { text: 'export async function extractTextFromBuffer(buffer: Buffer) {', color: '#c084fc' },
    { text: '  const response = await ai.models.generateContent({', color: '#e2e8f0' },
    { text: '    model: "gemini-3.8-flash",', color: '#34d399' },
    { text: '    contents: [', color: '#e2e8f0' },
    { text: '      { inlineData: { mimeType: "image/png", data: buffer.toString("base64") } },', color: '#fbbf24' },
    { text: '      { text: "Transcribe all visible characters with highest accuracy." }', color: '#fbbf24' },
    { text: '    ],', color: '#e2e8f0' },
    { text: '  });', color: '#e2e8f0' },
    { text: '  return {', color: '#c084fc' },
    { text: '    status: 200,', color: '#38bdf8' },
    { text: '    extractedText: response.text,', color: '#e2e8f0' },
    { text: '    processedAt: new Date().toISOString(),', color: '#38bdf8' },
    { text: '  };', color: '#c084fc' },
    { text: '}', color: '#c084fc' },
    { text: '', color: '' },
    { text: 'SUCCESS: Service listening at https://api.production.internal:8080/v1/ocr', color: '#22c55e' }
  ];

  ctx.font = '14px "Fira Code", monospace';
  let y = 70;
  lines.forEach(l => {
    if (l.text) {
      ctx.fillStyle = l.color || '#e2e8f0';
      ctx.fillText(l.text, 30, y);
    }
    y += 24;
  });

  return canvas.toDataURL('image/png');
}

function createArticleExcerptImage(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 720;
  canvas.height = 760;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Clean paper
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'left';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.fillText('SCIENCE & DISCOVERY JOURNAL • VOL. 48 • ISSUE 12', 60, 60);

  ctx.font = 'bold 30px Georgia, serif';
  ctx.fillText('The Evolution of Multimodal Artificial Intelligence', 60, 110);

  ctx.font = 'italic 16px Georgia, serif';
  ctx.fillStyle = '#475569';
  ctx.fillText('By Dr. Marcus Sterling • Published October 2026', 60, 145);

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 165);
  ctx.lineTo(660, 165);
  ctx.stroke();

  ctx.fillStyle = '#1e293b';
  ctx.font = '15px/1.6 Georgia, serif';

  const paragraphs = [
    'For decades, computer vision and natural language processing developed along parallel yet distinct pathways. Traditional OCR engines depended heavily on edge detection, morphological filtering, and constrained dictionary lookups. While effective for crisp, scanned book pages, they routinely struggled with skewed camera photos, natural lighting variations, and handwritten cursive.',
    'The advent of unified multimodal transformer architectures marked a decisive turning point. By processing pixels and semantic tokens within the same contextual latent space, modern vision models do not merely recognize geometric glyphs; they comprehend visual layout, linguistic syntax, and context.',
    'Key Advantages Observed in Benchmark Tests:',
    '1. Contextual Disambiguation: Distinguishing "0" (zero) from "O" (capital letter) based on semantic sentence structure.',
    '2. Dynamic Layout Understanding: Seamlessly parsing multi-column newspapers, receipts, and complex scientific tables without prior templates.',
    '3. Cross-Language Transliteration: Reading multilingual street signage, invoices, and menus simultaneously across dozens of writing systems.'
  ];

  let y = 205;
  paragraphs.forEach(p => {
    // Basic word wrap
    const words = p.split(' ');
    let line = '';
    for (const w of words) {
      const testLine = line + w + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > 590) {
        ctx.fillText(line, 60, y);
        line = w + ' ';
        y += 24;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 60, y);
    y += 34;
  });

  return canvas.toDataURL('image/png');
}

export const SAMPLE_IMAGES: SampleImageOption[] = [
  {
    id: 'receipt',
    title: 'Cafe & Restaurant Receipt',
    category: 'Finance / Receipts',
    description: 'Itemized totals, dates, cashier, POS terminal, tax and tip calculations.',
    suggestedMode: 'structured',
    generate: createReceiptImage,
  },
  {
    id: 'handwriting',
    title: 'Handwritten Meeting Notes',
    category: 'Handwriting / Notes',
    description: 'Yellow legal pad with cursive bullet points, tasks, assignees, and stars.',
    suggestedMode: 'handwriting',
    generate: createHandwritingImage,
  },
  {
    id: 'business_card',
    title: 'Executive Business Card',
    category: 'Contacts / Cards',
    description: 'Name, title, company, email, direct phone, and office address.',
    suggestedMode: 'structured',
    generate: createBusinessCardImage,
  },
  {
    id: 'math_physics',
    title: 'Math & Physics Formulas',
    category: 'Science / Math',
    description: 'Calculus integrals, Schrödinger equation, Maxwell laws on chalkboard.',
    suggestedMode: 'math',
    generate: createMathPhysicsImage,
  },
  {
    id: 'code_terminal',
    title: 'Terminal Log & Code Snippet',
    category: 'Tech / Monospace',
    description: 'Syntax-highlighted TypeScript code and CLI terminal deployment output.',
    suggestedMode: 'markdown',
    generate: createCodeTerminalImage,
  },
  {
    id: 'article_book',
    title: 'Journal Article & Book Page',
    category: 'Documents / Articles',
    description: 'Publication header, multi-paragraph article with numbered findings.',
    suggestedMode: 'markdown',
    generate: createArticleExcerptImage,
  },
];
