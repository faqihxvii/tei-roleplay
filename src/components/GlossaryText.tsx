import React from 'react';
import { ECONOMIC_GLOSSARY } from '../lib/glossary';

interface GlossaryTextProps {
  text: string;
  className?: string;
}

export function GlossaryText({ text, className = "" }: GlossaryTextProps) {

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
        <abbr
          key={`${match.index}-${matchedText}`}
          title={`${termInfo.term}: ${termInfo.definition}`}
          className="border-b border-dashed border-[#c91212]/80 font-bold text-slate-900 bg-amber-100/50 px-0.5 rounded no-underline cursor-help hover:bg-amber-200/80 transition-colors"
        >
          {matchedText}
        </abbr>
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
