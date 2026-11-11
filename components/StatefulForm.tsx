'use client';
import { useActionState, useEffect, useRef, useTransition, type ReactNode } from 'react';
import type { FormState } from '@/lib/form';
import { PendingContext } from './pending';

type Props = {
  action: (state: FormState, fd: FormData) => Promise<FormState>;
  children: ReactNode | ((state: FormState) => ReactNode);
  className?: string;
  resetOnSuccess?: boolean;
  id?: string;
};

/** Formular mit Rückmeldung – behält Eingaben bei Fehlern (React setzt Formulare sonst zurück). */
export function StatefulForm({ action, children, className, resetOnSuccess = true, id }: Props) {
  const [state, dispatch] = useActionState(action, null);
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      id={id}
      ref={ref}
      className={className}
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
        startTransition(() => dispatch(fd));
      }}
    >
      <PendingContext.Provider value={pending}>
        {typeof children === 'function' ? children(state) : children}
      </PendingContext.Provider>
      {state?.error && (
        <p className="form-msg form-error" role="alert">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p className="form-msg form-ok" role="status">
          {state.ok}
        </p>
      )}
    </form>
  );
}
