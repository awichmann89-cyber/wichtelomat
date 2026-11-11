import type { Wish } from '@/lib/db/schema';
import type { FormState } from '@/lib/form';
import { hostOf } from '@/lib/format';
import { StatefulForm } from './StatefulForm';
import { SubmitButton } from './SubmitButton';

type Props = {
  wish: Wish;
  editable?: boolean;
  update?: (s: FormState, fd: FormData) => Promise<FormState>;
  remove?: (fd: FormData) => Promise<void>;
};

export function WishItem({ wish, editable, update, remove }: Props) {
  return (
    <div className="wish">
      <div className={`wish-dot${wish.favorite ? ' fav' : ''}`} aria-hidden>
        {wish.favorite ? '★' : '🎁'}
      </div>
      <div className="wish-body">
        <div className="wish-title">
          {wish.title}
          {wish.favorite && <span className="sr-only"> (Herzenswunsch)</span>}
        </div>
        {wish.note && <div className="wish-note">{wish.note}</div>}
        {wish.url && (
          <a className="wish-link" href={wish.url} target="_blank" rel="noopener noreferrer">
            <span className="truncate">{hostOf(wish.url)}</span> ↗
          </a>
        )}
        {editable && update && remove && (
          <details className="disclose mt-s">
            <summary>Bearbeiten</summary>
            <StatefulForm action={update} resetOnSuccess={false}>
              <input type="hidden" name="id" value={wish.id} />
              <WishFields wish={wish} />
              <div className="row mt-m">
                <SubmitButton className="btn btn-green btn-small" pendingText="Speichere…">
                  Speichern
                </SubmitButton>
              </div>
            </StatefulForm>
            <form action={remove} className="mt-s">
              <input type="hidden" name="id" value={wish.id} />
              <SubmitButton className="link-btn danger" confirm="Diesen Wunsch löschen?">
                Wunsch löschen
              </SubmitButton>
            </form>
          </details>
        )}
      </div>
    </div>
  );
}

export function WishFields({ wish }: { wish?: Wish }) {
  return (
    <>
      <label className="field">
        <span className="label">Was wünschst du dir?</span>
        <input className="input" name="title" required maxLength={160} defaultValue={wish?.title} placeholder="z. B. Kuschelsocken, Größe 39–42" />
      </label>
      <label className="field">
        <span className="label">
          Link <span className="opt">(optional)</span>
        </span>
        <input
          className="input"
          name="url"
          type="text"
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={2000}
          defaultValue={wish?.url ?? ''}
          placeholder="https://…"
        />
      </label>
      <label className="field">
        <span className="label">
          Notiz <span className="opt">(optional)</span>
        </span>
        <textarea className="input" name="note" rows={2} maxLength={500} defaultValue={wish?.note ?? ''} placeholder="Farbe, Größe, Alternativen …" />
      </label>
      <label className="check">
        <input type="checkbox" name="favorite" defaultChecked={wish?.favorite} />
        <span>
          Herzenswunsch ★<small>Wird ganz oben angezeigt.</small>
        </span>
      </label>
    </>
  );
}
