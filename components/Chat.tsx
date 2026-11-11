import type { Message } from '@/lib/db/schema';
import type { FormState } from '@/lib/form';
import { formatDateTime } from '@/lib/format';
import { StatefulForm } from './StatefulForm';
import { SubmitButton } from './SubmitButton';

type Props = {
  thread: Message[];
  /** true = ich bin der Wichtel in diesem Gespräch */
  iAmSanta: boolean;
  to: 'kind' | 'wichtel';
  action?: (s: FormState, fd: FormData) => Promise<FormState>;
  empty: string;
  placeholder: string;
};

export function Chat({ thread, iAmSanta, to, action, empty, placeholder }: Props) {
  return (
    <div className="card">
      <div className="chat">
        {thread.length === 0 && <p className="chat-empty">{empty}</p>}
        {thread.map((m) => {
          const mine = m.fromSanta === iAmSanta;
          return (
            <div key={m.id} className={`bubble ${mine ? 'me' : 'them'}`}>
              {m.body}
              <span className="meta">
                {mine ? 'Du' : iAmSanta ? 'Antwort' : 'Dein Wichtel'} · {formatDateTime(m.createdAt)}
              </span>
            </div>
          );
        })}
      </div>
      {action && (
        <StatefulForm action={action} className="chat-form-wrap">
          <input type="hidden" name="to" value={to} />
          <div className="chat-form">
            <label className="sr-only" htmlFor={`chat-${to}`}>
              Nachricht
            </label>
            <textarea id={`chat-${to}`} className="input" name="body" rows={1} maxLength={1000} required placeholder={placeholder} />
            <SubmitButton className="btn btn-green" pendingText="…" aria-label="Senden">
              Senden
            </SubmitButton>
          </div>
        </StatefulForm>
      )}
    </div>
  );
}
