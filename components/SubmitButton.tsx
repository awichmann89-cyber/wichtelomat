'use client';
import { useContext, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { PendingContext } from './pending';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  pendingText?: string;
  /** Sicherheitsabfrage vor dem Absenden */
  confirm?: string;
};

export function SubmitButton({ children, pendingText, confirm, className = 'btn btn-primary', onClick, ...rest }: Props) {
  const { pending: formPending } = useFormStatus();
  const ctxPending = useContext(PendingContext);
  const pending = formPending || ctxPending;
  return (
    <button
      type="submit"
      className={className}
      disabled={pending || rest.disabled}
      aria-busy={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) {
          e.preventDefault();
          return;
        }
        onClick?.(e);
      }}
      {...rest}
    >
      {pending && pendingText ? (
        <>
          <span className="spinner" aria-hidden /> {pendingText}
        </>
      ) : (
        children
      )}
    </button>
  );
}
