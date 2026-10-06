import React, { useState } from 'react';
import { Info } from 'lucide-react';
import { ECONOMIC_GLOSSARY, GlossaryTerm } from '../lib/glossary';

interface GlossaryTextProps {
  text: string;
  className?: string;
}

export function GlossaryText({ text, className = "" }: GlossaryTextProps) {
  const [hoveredTerm, setHoveredTerm] = useState<GlossaryTerm | null>(null);

  const termKeys = Object.keys(ECONOMIC_GLOSSARY);
  if (!text || termKeys.length === 0) return <span className={className}>{text}</span>;

  // Sort keys by length descending so longer phrases match first
  const sortedKeys = [...termKeys].sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`\\b(${sortedKeys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const matchedText = match[0];
    const key = matchedText.toLowerCase();
    const termInfo = ECONOMIC_GLOSSARY[key];

    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }

    if (termInfo) {
      parts.push(
        <span
          key={`${match.index}-${matchedText}`}
          className="relative inline-block group"
          onMouseEnter={() => setHoveredTerm(termInfo)}
          onMouseLeave={() => setHoveredTerm(null)}
          onClick={(e) => {
            e.stopPropagation();
            setHoveredTerm(hoveredTerm?.term === termInfo.term ? null : termInfo);
          }}
        >
          <span className="border-b border-dashed border-[#c91212]/80 font-bold text-slate-900 bg-amber-100/50 px-0.5 rounded cursor-help hover:bg-amber-200/80 transition-colors">
            {matchedText}
          </span>

          {/* Hover Card Tooltip */}
          <span className="hidden group-hover:block z-50 absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 w-60 p-2.5 bg-slate-900 text-white rounded-xl text-left shadow-2xl border border-slate-700 pointer-events-none transition-all">
            <span className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1">
                <Info size={11} /> {termInfo.term}
              </span>
              {termInfo.category && (
                <span className="text-[8px] bg-slate-800 text-slate-300 font-mono px-1.5 py-0.2 rounded border border-slate-700">
                  {termInfo.category}
                </span>
              )}
            </span>
            <span className="text-[11px] leading-snug font-medium text-slate-200 block">
              {termInfo.definition}
            </span>
          </span>
        </span>
      );
    } else {
      parts.push(matchedText);
    }

    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <span className={className}>{parts}</span>;
}

export default GlossaryText;
