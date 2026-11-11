import type { Metadata } from 'next';
import Link from 'next/link';
import { asc, count, desc, eq } from 'drizzle-orm';
import { Flash } from '@/components/Flash';
import { Footer } from '@/components/Footer';
import { ShareText } from '@/components/ShareText';
import { StatefulForm } from '@/components/StatefulForm';
import { SubmitButton } from '@/components/SubmitButton';
import { Topbar } from '@/components/Topbar';
import { db, exclusions, participants, wishes, type Participant } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { mailFrom } from '@/lib/env';
import { requireAdmin } from '@/lib/session';
import {
  addExclusion,
  addParticipants,
  deleteGroup,
  remindAll,
  removeExclusion,
  removeParticipant,
  resendDrawMail,
  resetDrawAction,
  revealAction,
  runDraw,
  updateParticipant,
  updateSettings,
} from '../actions';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Auslosung verschickt alle Mails
export const metadata: Metadata = { title: 'Admin' };

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const STATUS = {
  setup: ['Vorbereitung', 'status-setup'],
  drawn: ['Ausgelost', 'status-drawn'],
  revealed: ['Aufgelöst', 'status-revealed'],
} as const;

function Progress({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="between small">
        <span>{label}</span>
        <strong>
          {value}/{total}
        </strong>
      </div>
      <div className="progress mt-s" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function AdminPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const { group, me } = await requireAdmin(slug);

  const [people, ex, wishCounts] = await Promise.all([
    db.select().from(participants).where(eq(participants.groupId, group.id)).orderBy(desc(participants.isAdmin), asc(participants.createdAt), asc(participants.name)),
    db.select().from(exclusions).where(eq(exclusions.groupId, group.id)),
    db
      .select({ pid: wishes.participantId, n: count() })
      .from(wishes)
      .innerJoin(participants, eq(participants.id, wishes.participantId))
      .where(eq(participants.groupId, group.id))
      .groupBy(wishes.participantId),
  ]);
  const wc = new Map(wishCounts.map((w) => [w.pid, w.n]));
  const byId = new Map(people.map((p) => [p.id, p]));
  const players = people.filter((p) => p.plays);
  const setup = group.status === 'setup';

  let password: string | null = null;
  try {
    password = group.passwordEnc ? decrypt(group.passwordEnc) : null;
  } catch {
    password = null;
  }
  const sender = mailFrom().match(/<([^>]+)>/)?.[1] ?? mailFrom();
  const invite = `Hallo zusammen! 🎁 Wir wichteln mit dem Wichtelomat („${group.name}“).
${setup ? 'Sobald ich ausgelost habe' : 'Es ist ausgelost'}${setup ? ', bekommt ihr' : ' – ihr habt'} eine Mail von ${sender} mit eurem Wichtelkind${setup ? '' : ' bekommen'}. Schaut zur Sicherheit auch im Spam-Ordner nach.
Beim ersten Öffnen braucht ihr unser Gruppenpasswort: ${password ?? '…'}`;

  const stats = {
    mailed: players.filter((p) => p.drawMailSentAt).length,
    opened: players.filter((p) => p.firstSeenAt).length,
    withWishes: players.filter((p) => (wc.get(p.id) ?? 0) > 0).length,
    giftDone: players.filter((p) => p.giftDoneAt).length,
  };
  const withoutWishes = players.length - stats.withWishes;

  const personBadges = (p: Participant) => {
    const out: React.ReactNode[] = [];
    if (p.isAdmin) out.push(<span key="a" className="badge badge-red">Orga</span>);
    if (!p.plays) out.push(<span key="np" className="badge">macht nicht mit</span>);
    if (!setup && p.plays) {
      if (p.drawMailError) out.push(<span key="m" className="badge badge-bad" title={p.drawMailError}>Mail fehlgeschlagen</span>);
      else if (p.drawMailSentAt) out.push(<span key="m" className="badge badge-ok">Mail ✓</span>);
      else out.push(<span key="m" className="badge badge-warn">Mail ausstehend</span>);
      if (p.firstSeenAt) out.push(<span key="o" className="badge badge-ok">geöffnet</span>);
      if (p.giftDoneAt) out.push(<span key="g" className="badge badge-ok">besorgt 🎁</span>);
    }
    if (p.plays) {
      const n = wc.get(p.id) ?? 0;
      out.push(<span key="w" className={`badge${n ? '' : ' badge-warn'}`}>{n ? `${n} ${n === 1 ? 'Wunsch' : 'Wünsche'}` : 'keine Wünsche'}</span>);
    }
    return out;
  };

  return (
    <>
      <Topbar
        title={group.name}
        href={`/g/${slug}/admin`}
        right={
          <Link className="btn btn-soft btn-small" href={`/g/${slug}`}>
            {me.plays ? 'Meine Seite' : 'Gruppe'}
          </Link>
        }
      />
      <main className="wrap">
        <Flash sp={sp} />

        <div className="between mt-l" style={{ padding: '0 4px' }}>
          <div style={{ minWidth: 0 }}>
            <div className="eyebrow">Admin-Bereich</div>
            <h1 className="mt-s" style={{ overflowWrap: 'anywhere' }}>
              {group.name}
            </h1>
          </div>
          <span className={`status-pill ${STATUS[group.status][1]}`}>{STATUS[group.status][0]}</span>
        </div>

        {!setup && (
          <section className="card mt-m stack">
            <Progress label="Mails zugestellt" value={stats.mailed} total={players.length} />
            <Progress label="Link geöffnet" value={stats.opened} total={players.length} />
            <Progress label="Wünsche eingetragen" value={stats.withWishes} total={players.length} />
            <Progress label="Geschenk besorgt" value={stats.giftDone} total={players.length} />
            <p className="tiny muted">Wer wen beschenkt, siehst auch du nicht – versprochen.</p>
          </section>
        )}

        {/* ---------------------------------------------------------------- Mitwichtel */}
        <section>
          <div className="section-head">
            <h2>Mitwichtel</h2>
            <span className="count">{players.length} dabei</span>
          </div>
          <div className="card">
            <ul className="list">
              {people.map((p) => (
                <li key={p.id}>
                  <div className="between" style={{ alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="person-name">
                        {p.name}
                        {p.id === me.id && <span className="muted"> (du)</span>}
                      </div>
                      <div className="person-mail">{p.email}</div>
                    </div>
                  </div>
                  <div className="row-tight mt-s">{personBadges(p)}</div>
                  <details className="disclose mt-s">
                    <summary>Bearbeiten</summary>
                    <StatefulForm action={updateParticipant.bind(null, slug)} resetOnSuccess={false}>
                      <input type="hidden" name="id" value={p.id} />
                      <div className="row">
                        <input className="input" name="name" defaultValue={p.name} required maxLength={60} aria-label="Name" />
                      </div>
                      <div className="row mt-s">
                        <input
                          className="input"
                          name="email"
                          type="email"
                          defaultValue={p.email}
                          required
                          autoCapitalize="off"
                          aria-label="E-Mail"
                        />
                      </div>
                      <SubmitButton className="btn btn-green btn-small mt-s" pendingText="Speichere…">
                        Speichern
                      </SubmitButton>
                      {!setup && p.plays && <p className="hint">Neue Adresse nach der Auslosung? Die Mail geht dann automatisch dorthin.</p>}
                    </StatefulForm>
                    <div className="row-tight mt-s">
                      {!setup && p.plays && (
                        <form action={resendDrawMail.bind(null, slug)}>
                          <input type="hidden" name="id" value={p.id} />
                          <SubmitButton className="btn btn-soft btn-small" pendingText="Sende…">
                            Auslosungs-Mail erneut senden
                          </SubmitButton>
                        </form>
                      )}
                      {setup && p.id !== me.id && (
                        <form action={removeParticipant.bind(null, slug)}>
                          <input type="hidden" name="id" value={p.id} />
                          <SubmitButton className="link-btn danger" confirm={`${p.name} aus der Gruppe entfernen?`}>
                            Entfernen
                          </SubmitButton>
                        </form>
                      )}
                    </div>
                  </details>
                </li>
              ))}
            </ul>
          </div>

          {setup ? (
            <div className="card mt-m">
              <h3>Person hinzufügen</h3>
              <StatefulForm action={addParticipants.bind(null, slug)} className="mt-m">
                <label className="field">
                  <span className="label">Name</span>
                  <input className="input" name="name" required maxLength={60} placeholder="z. B. Tante Inge" />
                </label>
                <label className="field">
                  <span className="label">E-Mail-Adresse</span>
                  <input
                    className="input"
                    name="email"
                    type="email"
                    required
                    autoCapitalize="off"
                    inputMode="email"
                    placeholder="inge@beispiel.de"
                  />
                </label>
                <SubmitButton className="btn btn-green btn-block mt-m" pendingText="Füge hinzu…">
                  Hinzufügen
                </SubmitButton>
              </StatefulForm>
              <details className="disclose mt-m">
                <summary>Mehrere auf einmal einfügen</summary>
                <StatefulForm action={addParticipants.bind(null, slug)}>
                  <textarea
                    className="input"
                    name="bulk"
                    rows={5}
                    required
                    autoCapitalize="off"
                    placeholder={'Eine Person pro Zeile, z. B.:\nAnna, anna@beispiel.de\nBen <ben@beispiel.de>\ncarla@beispiel.de'}
                  />
                  <SubmitButton className="btn btn-soft btn-block mt-s" pendingText="Füge hinzu…">
                    Alle hinzufügen
                  </SubmitButton>
                </StatefulForm>
              </details>
            </div>
          ) : (
            <p className="small muted mt-s" style={{ padding: '0 4px' }}>
              Jemand kommt dazu oder springt ab? Unten „Neu auslosen“ – dann lässt sich die Liste wieder ändern.
            </p>
          )}
        </section>

        {/* ---------------------------------------------------------------- Ausschlüsse */}
        {setup && (
          <section>
            <div className="section-head">
              <h2>Ausschlüsse</h2>
              <span className="count">optional</span>
            </div>
            <div className="card">
              <p className="small muted">Wer soll sich nicht gegenseitig ziehen? Z. B. Paare, die sich sowieso beschenken. Gilt in beide Richtungen.</p>
              {ex.length > 0 && (
                <ul className="list mt-m">
                  {ex.map((e) => (
                    <li key={e.id} className="between">
                      <span>
                        <strong>{byId.get(e.aId)?.name}</strong> ⇄ <strong>{byId.get(e.bId)?.name}</strong>
                      </span>
                      <form action={removeExclusion.bind(null, slug)}>
                        <input type="hidden" name="id" value={e.id} />
                        <SubmitButton className="link-btn danger" aria-label="Ausschluss entfernen">
                          Entfernen
                        </SubmitButton>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              {players.length >= 2 ? (
                <StatefulForm action={addExclusion.bind(null, slug)} className="mt-m">
                  <div className="row">
                    <select className="input" name="a" required defaultValue="" aria-label="Person 1">
                      <option value="" disabled>
                        Person …
                      </option>
                      {players.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    <select className="input" name="b" required defaultValue="" aria-label="Person 2">
                      <option value="" disabled>
                        … und
                      </option>
                      {players.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <SubmitButton className="btn btn-soft btn-block mt-s" pendingText="Speichere…">
                    Nicht gegenseitig ziehen
                  </SubmitButton>
                </StatefulForm>
              ) : (
                <p className="small muted mt-m">Erst mindestens zwei Personen eintragen.</p>
              )}
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- Passwort & Einladung */}
        <section>
          <div className="section-head">
            <h2>Passwort &amp; Einladung</h2>
          </div>
          <div className="card stack">
            {password && (
              <div className="pw-box">
                <div>
                  <div className="tiny muted">Gruppenpasswort</div>
                  <code>{password}</code>
                </div>
              </div>
            )}
            <p className="small muted">
              Schick allen vorab diesen Text (z. B. in den Familienchat), damit die Mail niemanden überrascht und das Passwort bekannt ist:
            </p>
            <ShareText text={invite} title={`Wichteln: ${group.name}`} />
          </div>
        </section>

        {/* ---------------------------------------------------------------- Auslosung / Aktionen */}
        {setup ? (
          <section>
            <div className="section-head">
              <h2>Auslosen</h2>
            </div>
            <div className="card">
              {players.length < 3 ? (
                <p className="small">
                  Für die Auslosung braucht ihr mindestens <strong>3 Mitwichtel</strong>. Noch {3 - players.length} – dann kann’s losgehen.
                </p>
              ) : (
                <>
                  <p className="small">
                    <strong>{players.length} Mitwichtel</strong>
                    {ex.length ? `, ${ex.length} ${ex.length === 1 ? 'Ausschluss' : 'Ausschlüsse'}` : ''}. Alle bekommen sofort eine Mail mit
                    ihrem Wichtelkind. Auch du siehst nicht, wer wen gezogen hat.
                  </p>
                  <StatefulForm action={runDraw.bind(null, slug)} className="mt-m">
                    <SubmitButton
                      className="btn btn-primary btn-xl btn-block"
                      pendingText="Lose werden gezogen…"
                      confirm={`Jetzt auslosen und ${players.length} Mails verschicken?`}
                    >
                      🎲 Jetzt auslosen
                    </SubmitButton>
                  </StatefulForm>
                </>
              )}
            </div>
          </section>
        ) : (
          <section>
            <div className="section-head">
              <h2>Aktionen</h2>
            </div>
            <div className="stack">
              {group.status === 'drawn' && (
                <div className="card">
                  <h3>Erinnern</h3>
                  <p className="small muted mt-s">
                    {withoutWishes
                      ? `${withoutWishes} ${withoutWishes === 1 ? 'Person hat' : 'Personen haben'} noch keine Wünsche eingetragen.`
                      : 'Alle haben Wünsche eingetragen. 🎉'}
                  </p>
                  {withoutWishes > 0 && (
                    <form action={remindAll.bind(null, slug)} className="mt-m">
                      <SubmitButton className="btn btn-green btn-block" pendingText="Sende…">
                        Freundlich erinnern
                      </SubmitButton>
                    </form>
                  )}
                </div>
              )}
              {group.status === 'drawn' && (
                <div className="card">
                  <h3>Auflösen</h3>
                  <p className="small muted mt-s">
                    Nach der Bescherung: Alle sehen, wer wessen Wichtel war, und bekommen eine Mail mit der ganzen Wichtelkette.
                  </p>
                  <form action={revealAction.bind(null, slug)} className="mt-m">
                    <SubmitButton
                      className="btn btn-soft btn-block"
                      pendingText="Löse auf…"
                      confirm="Wirklich auflösen? Danach sehen alle, wer wen beschenkt hat."
                    >
                      Auflösung veröffentlichen
                    </SubmitButton>
                  </form>
                </div>
              )}
              <div className="card danger-zone">
                <h3>Neu auslosen</h3>
                <p className="small muted mt-s">
                  Jemand ist abgesprungen oder kommt dazu? Setze die Auslosung zurück, ändere die Liste und lose neu aus. Alle bekommen dann
                  eine neue Mail. Nachrichten werden gelöscht, Wünsche bleiben.
                </p>
                <form action={resetDrawAction.bind(null, slug)} className="mt-m">
                  <SubmitButton
                    className="btn btn-danger btn-block"
                    pendingText="Setze zurück…"
                    confirm="Auslosung wirklich zurücksetzen? Die bisherige Ziehung ist dann ungültig."
                  >
                    Auslosung zurücksetzen
                  </SubmitButton>
                </form>
              </div>
            </div>
          </section>
        )}

        {/* ---------------------------------------------------------------- Einstellungen */}
        <section>
          <div className="section-head">
            <h2>Einstellungen</h2>
          </div>
          <details className="card">
            <summary>Gruppe, Budget, Datum &amp; Passwort</summary>
            <StatefulForm action={updateSettings.bind(null, slug)} resetOnSuccess={false}>
              <label className="field">
                <span className="label">Name der Gruppe</span>
                <input className="input" name="name" defaultValue={group.name} required maxLength={80} />
              </label>
              <label className="field">
                <span className="label">Budget</span>
                <input className="input" name="budget" defaultValue={group.budget ?? ''} maxLength={40} placeholder="z. B. max. 25 €" />
              </label>
              <label className="field">
                <span className="label">Datum der Bescherung</span>
                <input className="input" name="eventDate" type="date" defaultValue={group.eventDate ?? ''} />
              </label>
              <label className="field">
                <span className="label">Ort</span>
                <input className="input" name="eventLocation" defaultValue={group.eventLocation ?? ''} maxLength={120} />
              </label>
              <label className="field">
                <span className="label">Nachricht an alle</span>
                <textarea className="input" name="message" defaultValue={group.message ?? ''} maxLength={1000} rows={3} />
                <span className="hint">Steht in der Auslosungs-Mail und auf der Gruppenseite.</span>
              </label>
              {setup && (
                <>
                  <label className="check">
                    <input type="checkbox" name="avoidMutual" defaultChecked={group.avoidMutual} />
                    <span>
                      Keine Pärchen-Tausche
                      <small>Verhindert, dass sich zwei Personen gegenseitig ziehen (A → B und B → A).</small>
                    </span>
                  </label>
                  <label className="check">
                    <input type="checkbox" name="plays" defaultChecked={me.plays} />
                    <span>
                      Ich mache selbst mit
                      <small>Aus, wenn du nur organisierst.</small>
                    </span>
                  </label>
                </>
              )}
              <label className="field">
                <span className="label">
                  Neues Gruppenpasswort <span className="opt">(leer = unverändert)</span>
                </span>
                <input className="input" name="newPassword" maxLength={60} autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
              </label>
              <label className="field">
                <span className="label">Hinweis zum Passwort</span>
                <input className="input" name="passwordHint" defaultValue={group.passwordHint ?? ''} maxLength={120} />
              </label>
              <SubmitButton className="btn btn-green btn-block mt-m" pendingText="Speichere…">
                Speichern
              </SubmitButton>
            </StatefulForm>
          </details>

          <details className="card danger-zone mt-m">
            <summary>Gruppe löschen</summary>
            <p className="small muted">
              Löscht die Gruppe mit allen Wünschen und Nachrichten sofort und endgültig. Ohne dein Zutun passiert das automatisch einige
              Wochen nach der Bescherung.
            </p>
            <form action={deleteGroup.bind(null, slug)} className="mt-m">
              <SubmitButton
                className="btn btn-danger btn-block"
                pendingText="Lösche…"
                confirm={`Gruppe „${group.name}“ endgültig löschen? Das kann nicht rückgängig gemacht werden.`}
              >
                Endgültig löschen
              </SubmitButton>
            </form>
          </details>
        </section>
      </main>
      <Footer />
    </>
  );
}
