'use client';
import { startTransition, useActionState, useEffect, useState } from 'react';
import { StatefulForm } from '@/components/StatefulForm';
import { SubmitButton } from '@/components/SubmitButton';
import { PendingContext } from '@/components/pending';
import type { FormState } from '@/lib/form';

type Action = (s: FormState, fd: FormData) => Promise<FormState>;

const pwInputProps = {
  className: 'input',
  name: 'password',
  type: 'password',
  required: true,
  autoComplete: 'current-password',
  autoCapitalize: 'off',
  autoCorrect: 'off',
  spellCheck: false,
} as const;

export function TokenLogin({ action, token, next }: { action: Action; token: string; next: string }) {
  return (
    <StatefulForm action={action} resetOnSuccess={false}>
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="next" value={next} />
      <label className="field">
        <span className="label">Gruppenpasswort</span>
        <input {...pwInputProps} autoFocus placeholder="Passwort" />
      </label>
      <SubmitButton className="btn btn-primary btn-block mt-m" pendingText="Prüfe…">
        Los geht’s
      </SubmitButton>
    </StatefulForm>
  );
}

export function CodeLogin({ request, verify }: { request: Action; verify: Action }) {
  const [reqState, reqDispatch, reqPending] = useActionState(request, null);
  const [verState, verDispatch, verPending] = useActionState(verify, null);
  const [stage, setStage] = useState<'start' | 'code'>('start');
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (reqState?.step === 'code') {
      setStage('code');
      setEmail(reqState.email ?? '');
    }
  }, [reqState]);

  if (stage === 'code') {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => verDispatch(fd));
        }}
      >
        <PendingContext.Provider value={verPending}>
          <p className="small">
            Wir haben einen 6-stelligen Code an <strong>{email}</strong> geschickt.
          </p>
          <input type="hidden" name="email" value={email} />
          <label className="field mt-m">
            <span className="label">Code aus der Mail</span>
            <input
              className="input input-code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 ]*"
              maxLength={7}
              required
              autoFocus
              placeholder="••••••"
            />
          </label>
          <SubmitButton className="btn btn-primary btn-block mt-m" pendingText="Prüfe…">
            Anmelden
          </SubmitButton>
          {verState?.error && (
            <p className="form-msg form-error" role="alert">
              {verState.error}
            </p>
          )}
          <button type="button" className="link-btn mt-s" onClick={() => setStage('start')}>
            Andere Adresse / neuen Code anfordern
          </button>
        </PendingContext.Provider>
      </form>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => reqDispatch(fd));
      }}
    >
      <PendingContext.Provider value={reqPending}>
        <label className="field">
          <span className="label">Deine E-Mail-Adresse</span>
          <input
            className="input"
            name="email"
            type="email"
            required
            autoComplete="email"
            autoCapitalize="off"
            inputMode="email"
            defaultValue={email}
            placeholder="du@beispiel.de"
          />
        </label>
        <label className="field">
          <span className="label">Gruppenpasswort</span>
          <input {...pwInputProps} placeholder="Passwort" />
        </label>
        <SubmitButton className="btn btn-green btn-block mt-m" pendingText="Sende Code…">
          Code per Mail schicken
        </SubmitButton>
        {reqState?.error && (
          <p className="form-msg form-error" role="alert">
            {reqState.error}
          </p>
        )}
      </PendingContext.Provider>
    </form>
  );
}
