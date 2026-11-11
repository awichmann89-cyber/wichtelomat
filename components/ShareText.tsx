'use client';
import { useState } from 'react';

export function ShareText({ text, title }: { text: string; title: string }) {
  const [value, setValue] = useState(text);
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;

  return (
    <div>
      <textarea className="input" rows={6} value={value} onChange={(e) => setValue(e.target.value)} aria-label="Einladungstext" />
      <div className="row mt-s">
        {canShare && (
          <button type="button" className="btn btn-green" onClick={() => navigator.share({ title, text: value }).catch(() => {})}>
            Teilen
          </button>
        )}
        <button
          type="button"
          className="btn btn-soft"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(value);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } catch {
              /* ignorieren */
            }
          }}
        >
          {copied ? 'Kopiert ✓' : 'Kopieren'}
        </button>
      </div>
    </div>
  );
}
