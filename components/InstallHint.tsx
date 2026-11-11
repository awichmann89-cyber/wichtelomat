'use client';
import { useEffect, useState } from 'react';

const KEY = 'wo_install_hint_dismissed';

/** Dezenter Hinweis auf iPhone/iPad: „Zum Home-Bildschirm“ – nur im Safari-Browser, nicht in der installierten App. */
export function InstallHint() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      const ua = navigator.userAgent;
      const ios = /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone;
      if (ios && !standalone && !localStorage.getItem(KEY)) setShow(true);
    } catch {
      /* ignorieren */
    }
  }, []);
  if (!show) return null;
  return (
    <div className="install-hint">
      <img src="/icons/icon.svg" alt="" width={36} height={36} />
      <p>
        <strong>Als App aufs iPhone:</strong> Tippe unten auf <span className="share-glyph" aria-label="Teilen">⬆︎</span> und dann auf
        „Zum Home-Bildschirm“.
      </p>
      <button
        type="button"
        className="install-close"
        aria-label="Hinweis schließen"
        onClick={() => {
          try {
            localStorage.setItem(KEY, '1');
          } catch {
            /* ignorieren */
          }
          setShow(false);
        }}
      >
        ×
      </button>
    </div>
  );
}
