type SP = Record<string, string | string[] | undefined>;

const n = (v: string | string[] | undefined) => Number(Array.isArray(v) ? v[0] : v) || 0;

/** Kurze Rückmeldungen nach Aktionen (?m=…) */
export function Flash({ sp }: { sp: SP }) {
  const m = Array.isArray(sp.m) ? sp.m[0] : sp.m;
  if (!m) return null;
  const s = n(sp.s);
  const f = n(sp.f);
  const map: Record<string, [string, 'ok' | 'warn' | 'error']> = {
    created: ['Deine Gruppe ist angelegt! Wir haben dir deinen Admin-Link und das Passwort per Mail geschickt. Jetzt Mitwichtel eintragen.', 'ok'],
    'created-nomail': ['Gruppe angelegt – aber die Admin-Mail konnte nicht verschickt werden. Prüfe die Mail-Einstellungen.', 'warn'],
    drawn: [
      f ? `Ausgelost! ${s} Mails verschickt, ${f} fehlgeschlagen – siehe Liste unten.` : `Ausgelost! ${s} Mails sind unterwegs.`,
      f ? 'warn' : 'ok',
    ],
    'draw-error': [String(Array.isArray(sp.e) ? sp.e[0] : sp.e ?? 'Auslosung fehlgeschlagen.'), 'error'],
    resent: [f ? 'Die Mail konnte nicht verschickt werden.' : 'Mail wurde erneut verschickt.', f ? 'error' : 'ok'],
    reminded: [s ? `Erinnerung an ${s} ${s === 1 ? 'Person' : 'Personen'} verschickt.` : 'Niemand musste erinnert werden.', 'ok'],
    reset: ['Auslosung zurückgesetzt. Ändere die Teilnehmenden und lose neu aus.', 'warn'],
    revealed: ['Auflösung veröffentlicht – alle können jetzt sehen, wer wessen Wichtel war.', 'ok'],
    saved: ['Gespeichert.', 'ok'],
    deleted: ['Die Gruppe wurde gelöscht.', 'ok'],
    'gift-done': ['Notiert! Dein Wichtelkind sieht jetzt nur, dass du fertig bist – nicht was es ist.', 'ok'],
    'gift-undone': ['Okay, die Wunschliste ist wieder offen.', 'ok'],
  };
  const entry = map[m];
  if (!entry) return null;
  return (
    <div className={`notice ${entry[1]}`} role="status">
      {entry[0]}
    </div>
  );
}
