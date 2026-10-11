import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Copy,
  Check,
  Download,
  Volume2,
  VolumeX,
  Search,
  FileText,
  Code,
  Table as TableIcon,
  Edit3,
  Printer,
  ChevronDown,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
} from 'lucide-react';
import { ExtractionResult, ExtractionMode } from '../types';
import { downloadTextFile } from '../utils/imageProcessing';

interface ExtractedTextViewerProps {
  result: ExtractionResult;
  onTextEdited: (newText: string) => void;
  onTriggerEnhance: (action: string) => void;
  isEnhancing?: boolean;
}

export const ExtractedTextViewer: React.FC<ExtractedTextViewerProps> = ({
  result,
  onTextEdited,
  onTriggerEnhance,
  isEnhancing,
}) => {
  const [activeTab, setActiveTab] = useState<'formatted' | 'raw' | 'table' | 'json'>('formatted');
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Search feature
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState<number>(0);

  // Text to speech
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Parse structured JSON if present
  const extractedJson = useMemo(() => {
    const jsonMatch = result.text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        return null;
      }
    }
    return null;
  }, [result.text]);

  // Parse Markdown Table if present
  const parsedTable = useMemo(() => {
    const lines = result.text.split('\n');
    const tableLines = lines.filter((l) => l.trim().startsWith('|') && l.trim().endsWith('|'));
    if (tableLines.length >= 2) {
      const headerLine = tableLines[0];
      const headers = headerLine
        .split('|')
        .slice(1, -1)
        .map((h) => h.trim());

      // Filter out separator lines like |---|---|
      const dataRows = tableLines.slice(1).filter((l) => !l.includes('---')).map((l) =>
        l
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim())
      );

      return { headers, rows: dataRows };
    }
    return null;
  }, [result.text]);

  // Set default tab based on content
  useEffect(() => {
    if (result.mode === 'raw') {
      setActiveTab('raw');
    } else if (result.mode === 'table' && parsedTable) {
      setActiveTab('table');
    } else if (result.mode === 'structured' && extractedJson) {
      setActiveTab('formatted');
    } else {
      setActiveTab('formatted');
    }
  }, [result.id, result.mode]);

  // Clean up speech synthesis on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // Handle Copy
  const handleCopy = (type: 'all' | 'singleline' | 'markdown' | 'tsv' | 'json') => {
    let textToCopy = result.text;

    if (type === 'singleline') {
      textToCopy = result.text.replace(/\r?\n+/g, ' ').trim();
    } else if (type === 'tsv' && parsedTable) {
      const headerRow = parsedTable.headers.join('\t');
      const rows = parsedTable.rows.map((r) => r.join('\t')).join('\n');
      textToCopy = `${headerRow}\n${rows}`;
    } else if (type === 'json' && extractedJson) {
      textToCopy = JSON.stringify(extractedJson, null, 2);
    }

    navigator.clipboard.writeText(textToCopy);
    setCopiedType(type);
    setShowCopyMenu(false);
    setTimeout(() => setCopiedType(null), 2000);
  };

  // Handle Exports
  const handleExport = (format: 'txt' | 'md' | 'json' | 'csv' | 'print') => {
    setShowExportMenu(false);
    const baseName = result.imageName?.replace(/\.[^/.]+$/, '') || 'extracted_text';

    if (format === 'txt') {
      downloadTextFile(`${baseName}.txt`, result.text, 'text/plain');
    } else if (format === 'md') {
      downloadTextFile(`${baseName}.md`, result.text, 'text/markdown');
    } else if (format === 'json') {
      const data = extractedJson || { text: result.text, stats: result.stats, mode: result.mode };
      downloadTextFile(`${baseName}.json`, JSON.stringify(data, null, 2), 'application/json');
    } else if (format === 'csv' && parsedTable) {
      const csv = [
        parsedTable.headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
        ...parsedTable.rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')),
      ].join('\n');
      downloadTextFile(`${baseName}.csv`, csv, 'text/csv');
    } else if (format === 'print') {
      window.print();
    }
  };

  // Text to speech controls
  const handleToggleSpeech = () => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      if (isPaused) {
        window.speechSynthesis.resume();
        setIsPaused(false);
      } else {
        window.speechSynthesis.pause();
        setIsPaused(true);
      }
    } else {
      window.speechSynthesis.cancel();
      // Remove codeblocks and markdown symbols for cleaner audio narration
      const speechText = result.text
        .replace(/```[\s\S]*?```/g, '')
        .replace(/[*#_~`]/g, '')
        .replace(/\|/g, ', ');

      const utterance = new SpeechSynthesisUtterance(speechText);
      utterance.rate = speechRate;

      utterance.onend = () => {
        setIsSpeaking(false);
        setIsPaused(false);
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        setIsPaused(false);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
      setIsPaused(false);
    }
  };

  const handleStopSpeech = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setIsPaused(false);
  };

  const handleChangeSpeed = (newRate: number) => {
    setSpeechRate(newRate);
    if (isSpeaking) {
      handleStopSpeech();
      setTimeout(handleToggleSpeech, 100);
    }
  };

  // Search match highlight
  const renderHighlightedText = (text: string) => {
    if (!searchQuery.trim()) return text;

    const regex = new RegExp(`(${searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-amber-400 text-slate-950 px-0.5 rounded font-medium">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Estimate reading time
  const readingTimeSeconds = Math.ceil((result.stats.wordCount / 200) * 60);

  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-2xl border border-slate-800/80 overflow-hidden shadow-xl">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-slate-900 border-b border-slate-800 text-slate-300 text-xs gap-2 flex-wrap">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('formatted')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'formatted'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Formatted</span>
          </button>

          <button
            onClick={() => setActiveTab('raw')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'raw'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editor</span>
          </button>

          {parsedTable && (
            <button
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'table'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Table</span>
            </button>
          )}

          {extractedJson && (
            <button
              onClick={() => setActiveTab('json')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-all ${
                activeTab === 'json'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
          )}
        </div>

        {/* Right Action Tools: Copy, Listen, Export */}
        <div className="flex items-center gap-1.5 flex-wrap ml-auto">
          {/* Audio Text-to-Speech Player */}
          {'speechSynthesis' in window && (
            <div className="flex items-center gap-1 bg-slate-950/80 px-2 py-1 rounded-xl border border-slate-800">
              <button
                onClick={handleToggleSpeech}
                className="flex items-center gap-1 text-slate-300 hover:text-cyan-400 transition-colors"
                title={isSpeaking ? (isPaused ? 'Resume Audio' : 'Pause Audio') : 'Listen Aloud'}
              >
                {isSpeaking ? (
                  isPaused ? (
                    <Play className="w-3.5 h-3.5 text-amber-400" />
                  ) : (
                    <Pause className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                  )
                ) : (
                  <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                )}
                <span className="text-[11px] font-medium hidden sm:inline">
                  {isSpeaking ? (isPaused ? 'Paused' : 'Playing') : 'Listen'}
                </span>
              </button>

              {isSpeaking && (
                <button
                  onClick={handleStopSpeech}
                  className="p-1 hover:text-rose-400 text-slate-400 transition-colors ml-1"
                  title="Stop Audio"
                >
                  <VolumeX className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Speed rate selector */}
              <select
                value={speechRate}
                onChange={(e) => handleChangeSpeed(parseFloat(e.target.value))}
                className="bg-transparent text-slate-400 hover:text-slate-200 text-[10px] focus:outline-hidden cursor-pointer ml-1"
                title="Playback Speed"
              >
                <option value={0.8} className="bg-slate-900">0.8x</option>
                <option value={1.0} className="bg-slate-900">1.0x</option>
                <option value={1.25} className="bg-slate-900">1.25x</option>
                <option value={1.5} className="bg-slate-900">1.5x</option>
              </select>
            </div>
          )}

          {/* Copy Button with Dropdown */}
          <div className="relative">
            <button
              onClick={() => handleCopy('all')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium text-xs shadow-md shadow-cyan-950/30 transition-all"
              title="Copy to clipboard"
            >
              {copiedType ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedType ? 'Copied!' : 'Copy'}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowCopyMenu(!showCopyMenu);
                }}
                className="hover:opacity-80 p-0.5 ml-0.5"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </button>

            {showCopyMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-1 z-30 animate-in fade-in text-xs">
                <button
                  onClick={() => handleCopy('all')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-200 flex items-center justify-between"
                >
                  <span>Copy Everything</span>
                </button>
                <button
                  onClick={() => handleCopy('singleline')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-200 flex items-center justify-between"
                >
                  <span>Copy as Single Line</span>
                </button>
                {parsedTable && (
                  <button
                    onClick={() => handleCopy('tsv')}
                    className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-200 flex items-center justify-between"
                  >
                    <span>Copy Table (for Sheets/Excel)</span>
                  </button>
                )}
                {extractedJson && (
                  <button
                    onClick={() => handleCopy('json')}
                    className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-200 flex items-center justify-between"
                  >
                    <span>Copy JSON Data</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-xs transition-colors"
              title="Download or Export"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1.5 w-44 bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl py-1 z-30 animate-in fade-in text-xs">
                <button
                  onClick={() => handleExport('txt')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Download .txt</span>
                </button>
                <button
                  onClick={() => handleExport('md')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Download .md</span>
                </button>
                {parsedTable && (
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                  >
                    <TableIcon className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download .csv</span>
                  </button>
                )}
                {extractedJson && (
                  <button
                    onClick={() => handleExport('json')}
                    className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                  >
                    <Code className="w-3.5 h-3.5 text-amber-400" />
                    <span>Download .json</span>
                  </button>
                )}
                <div className="h-px bg-slate-800 my-1" />
                <button
                  onClick={() => handleExport('print')}
                  className="w-full text-left px-3 py-2 hover:bg-slate-800 text-slate-200 flex items-center gap-2"
                >
                  <Printer className="w-3.5 h-3.5 text-purple-400" />
                  <span>Print / Save PDF</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Search Bar Subheader */}
      <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 max-w-sm bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1">
          <Search className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Search within extracted text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent text-slate-200 placeholder:text-slate-500 focus:outline-hidden text-xs w-full"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-slate-500 hover:text-slate-300 text-xs px-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Word count & Reading stats */}
        <div className="flex items-center gap-3 text-slate-400 text-[11px] shrink-0 font-mono">
          <span>{result.stats.wordCount.toLocaleString()} words</span>
          <span>•</span>
          <span>{result.stats.charCount.toLocaleString()} chars</span>
          <span>•</span>
          <span>~{readingTimeSeconds}s read</span>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 overflow-y-auto p-5 text-slate-200 text-sm leading-relaxed relative bg-slate-950/40">
        {activeTab === 'raw' && (
          <div className="flex flex-col h-full gap-2">
            <div className="text-xs text-slate-400 flex items-center justify-between">
              <span>Direct Text Editor (changes update all views & exports):</span>
              <span className="font-mono text-[10px] text-cyan-400">Live Sync</span>
            </div>
            <textarea
              value={result.text}
              onChange={(e) => onTextEdited(e.target.value)}
              className="w-full flex-1 min-h-[350px] p-4 bg-slate-900/90 border border-slate-800 rounded-xl font-mono text-xs leading-relaxed text-slate-200 focus:outline-hidden focus:border-cyan-500/60 resize-none selection:bg-cyan-500/30"
              placeholder="Extracted text goes here..."
            />
          </div>
        )}

        {activeTab === 'formatted' && (
          <div className="prose prose-invert max-w-none space-y-4">
            {/* Render lines preserving structure */}
            {result.text.split('\n\n').map((block, idx) => {
              // Code block
              if (block.trim().startsWith('```')) {
                const codeContent = block.replace(/```[a-zA-Z]*\n?/, '').replace(/```$/, '');
                return (
                  <pre
                    key={idx}
                    className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-cyan-300 overflow-x-auto"
                  >
                    <code>{codeContent}</code>
                  </pre>
                );
              }

              // Heading check
              if (block.trim().startsWith('# ')) {
                return (
                  <h1 key={idx} className="text-xl font-bold text-white border-b border-slate-800 pb-2">
                    {renderHighlightedText(block.replace('# ', ''))}
                  </h1>
                );
              }
              if (block.trim().startsWith('## ')) {
                return (
                  <h2 key={idx} className="text-lg font-semibold text-cyan-200">
                    {renderHighlightedText(block.replace('## ', ''))}
                  </h2>
                );
              }
              if (block.trim().startsWith('### ')) {
                return (
                  <h3 key={idx} className="text-base font-semibold text-slate-200">
                    {renderHighlightedText(block.replace('### ', ''))}
                  </h3>
                );
              }

              // Standard paragraph with lines
              return (
                <div key={idx} className="space-y-1">
                  {block.split('\n').map((line, lIdx) => {
                    const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
                    return (
                      <p
                        key={lIdx}
                        className={`text-slate-200 ${
                          isBullet ? 'pl-4 relative before:content-["•"] before:absolute before:left-0 before:text-cyan-400' : ''
                        }`}
                      >
                        {renderHighlightedText(isBullet ? line.replace(/^[\s•-]+/, '') : line)}
                      </p>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'table' && parsedTable && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Detected Table with {parsedTable.rows.length} rows</span>
              <button
                onClick={() => handleCopy('tsv')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-medium transition-colors"
              >
                Copy as TSV for Sheets/Excel
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg">
              <table className="w-full text-left text-xs text-slate-300 border-collapse">
                <thead className="bg-slate-900 text-slate-100 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
                  <tr>
                    {parsedTable.headers.map((h, i) => (
                      <th key={i} className="px-4 py-3 border-r border-slate-800 last:border-r-0">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 font-mono text-xs">
                  {parsedTable.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="px-4 py-2.5 border-r border-slate-800/60 last:border-r-0">
                          {renderHighlightedText(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'json' && extractedJson && (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Parsed Structured JSON Data:</span>
              <button
                onClick={() => handleCopy('json')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-medium transition-colors"
              >
                Copy JSON
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-amber-300 overflow-x-auto shadow-inner leading-relaxed">
              <code>{JSON.stringify(extractedJson, null, 2)}</code>
            </pre>
          </div>
        )}
      </div>

      {/* AI Enhancement Quick Action Bar */}
      <div className="px-4 py-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>AI Enhancements:</span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => onTriggerEnhance('summarize')}
            disabled={isEnhancing}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors disabled:opacity-50"
            title="Generate a high-level summary"
          >
            Summarize
          </button>
          <button
            onClick={() => onTriggerEnhance('bullet_points')}
            disabled={isEnhancing}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors disabled:opacity-50"
            title="Convert to structured bullet points"
          >
            Bullet Points
          </button>
          <button
            onClick={() => onTriggerEnhance('fix_grammar')}
            disabled={isEnhancing}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors disabled:opacity-50"
            title="Proofread OCR typos"
          >
            Proofread
          </button>
          <button
            onClick={() => onTriggerEnhance('extract_entities')}
            disabled={isEnhancing}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors disabled:opacity-50"
            title="Extract dates, numbers, emails, addresses"
          >
            Extract Entities
          </button>
          <button
            onClick={() => onTriggerEnhance('convert_json')}
            disabled={isEnhancing}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors disabled:opacity-50"
            title="Convert to formatted JSON schema"
          >
            Convert to JSON
          </button>
        </div>
      </div>
    </div>
  );
};
