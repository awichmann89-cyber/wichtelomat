'use client';
import { useState } from 'react';
import { StatefulForm } from '@/components/StatefulForm';
import { SubmitButton } from '@/components/SubmitButton';
import type { FormState } from '@/lib/form';

const WORDS = ['zimtstern', 'lebkuchen', 'rentier', 'schneeflocke', 'tannenzweig', 'spekulatius', 'zuckerstange', 'mistelzweig', 'pfeffernuss', 'schlittenfahrt', 'vanillekipferl', 'glitzerkugel'];

export function CreateForm({ action, needsCode }: { action: (s: FormState, fd: FormData) => Promise<FormState>; needsCode: boolean }) {
  const [pw, setPw] = useState('');
  const suggest = () => setPw(`${WORDS[Math.floor(Math.random() * WORDS.length)]}${Math.floor(10 + Math.random() * 90)}`);

  return (
    <StatefulForm action={action} resetOnSuccess={false} className="stack">
      <div className="card">
        <h2>Eure Gruppe</h2>
        <label className="field mt-m">
          <span className="label">Name der Wichtelgruppe</span>
          <input className="input" name="name" required maxLength={80} placeholder="z. B. Familie Müller 2026" />
        </label>
      </div>

      <div className="card">
        <h2>Du bist die Orga</h2>
        <p className="small muted mt-s">Du verwaltest die Gruppe und startest die Auslosung.</p>
        <label className="field mt-m">
          <span className="label">Dein Name</span>
          <input className="input" name="adminName" required maxLength={60} autoComplete="given-name" placeholder="Vorname" />
        </label>
        <label className="field">
          <span className="label">Deine E-Mail-Adresse</span>
          <input
            className="input"
            name="adminEmail"
            type="email"
            required
            autoComplete="email"
            autoCapitalize="off"
            inputMode="email"
            placeholder="du@beispiel.de"
          />
        </label>
        <label className="check">
          <input type="checkbox" name="plays" defaultChecked />
          <span>
            Ich mache selbst mit
            <small>Aus, wenn du nur organisierst und nicht mitwichtelst.</small>
          </span>
        </label>
      </div>

      <div className="card">
        <h2>Gruppenpasswort</h2>
        <p className="small muted mt-s">
          Alle brauchen es einmalig, wenn sie ihren Link aus der Mail öffnen. So reicht eine weitergeleitete Mail allein nicht. Sag es am
          besten mündlich oder im Gruppenchat – Groß-/Kleinschreibung ist egal.
        </p>
        <div className="field mt-m">
          <label className="label" htmlFor="pw">
            Passwort
          </label>
          <div className="row-tight">
            <input
              id="pw"
              className="input"
              style={{ flex: 1, minWidth: 0 }}
              name="password"
              required
              minLength={4}
              maxLength={60}
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="mind. 4 Zeichen"
            />
            <button type="button" className="btn btn-soft" onClick={suggest}>
              Vorschlag
            </button>
          </div>
        </div>
        <label className="field">
          <span className="label">
            Hinweis zum Passwort <span className="opt">(optional)</span>
          </span>
          <input className="input" name="passwordHint" maxLength={120} placeholder="z. B. Omas Lieblingsplätzchen + Jahr" />
          <span className="hint">Wird auf der Anmeldeseite angezeigt, falls es jemand vergisst.</span>
        </label>
      </div>

      <details className="card">
        <summary>Budget, Datum &amp; Ort (optional)</summary>
        <label className="field">
          <span className="label">Budget</span>
          <input className="input" name="budget" maxLength={40} placeholder="z. B. max. 25 €" />
        </label>
        <label className="field">
          <span className="label">Datum der Bescherung</span>
          <input className="input" name="eventDate" type="date" />
          <span className="hint">Für Countdown und Kalendereintrag. Die Gruppe wird ein paar Wochen danach automatisch gelöscht.</span>
        </label>
        <label className="field">
          <span className="label">Ort</span>
          <input className="input" name="eventLocation" maxLength={120} placeholder="z. B. bei Oma, Wohnzimmer" />
        </label>
        <label className="field">
          <span className="label">Nachricht an alle</span>
          <textarea className="input" name="message" maxLength={1000} rows={3} placeholder="Steht in jeder Auslosungs-Mail. z. B. „Bitte nichts Selbstgebackenes, Tante Inge backt schon!“" />
        </label>
      </details>

      {needsCode && (
        <div className="card">
          <label className="field">
            <span className="label">Erstell-Code</span>
            <input className="input" name="createCode" required autoComplete="off" autoCapitalize="off" />
            <span className="hint">Diese Instanz ist geschützt. Den Code bekommst du vom Betreiber.</span>
          </label>
        </div>
      )}

      <SubmitButton className="btn btn-primary btn-xl btn-block" pendingText="Lege Gruppe an…">
        Gruppe anlegen
      </SubmitButton>
    </StatefulForm>
  );
}
