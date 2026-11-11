'use client';
import { useState, type ReactNode } from 'react';

/** Name erst nach Antippen zeigen – gegen neugierige Blicke über die Schulter. */
export function RevealName({ name, children }: { name: string; children?: ReactNode }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="reveal">
      <div className="reveal-kicker">Du beschenkst</div>
      {shown ? (
        <div className="reveal-name pop">{name}</div>
      ) : (
        <button type="button" className="reveal-tap" onClick={() => setShown(true)}>
          <span className="reveal-dots" aria-hidden>
            ✶ ✶ ✶
          </span>
          <span>Antippen zum Aufdecken</span>
        </button>
      )}
      {shown && children}
    </div>
  );
}
