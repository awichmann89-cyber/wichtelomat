import Link from 'next/link';
import { after } from 'next/server';
import { and, asc, count, eq, isNull } from 'drizzle-orm';
import { Chat } from '@/components/Chat';
import { Flash } from '@/components/Flash';
import { Footer } from '@/components/Footer';
import { InstallHint } from '@/components/InstallHint';
import { RevealName } from '@/components/RevealName';
import { StatefulForm } from '@/components/StatefulForm';
import { SubmitButton } from '@/components/SubmitButton';
import { Topbar } from '@/components/Topbar';
import { WishFields, WishItem } from '@/components/WishItem';
import { db, messages, participants } from '@/lib/db';
import { chains } from '@/lib/draw';
import { countdown, firstName, formatDate } from '@/lib/format';
import { flushDueNotifications, markSeen, santaOf, wishesOf } from '@/lib/service';
import { requireMember } from '@/lib/session';
import { addWish, deleteWish, logout, sendMessage, updateWish } from './actions';

export const dynamic = 'force-dynamic';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function GroupPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const { group, me } = await requireMember(slug);

  const [myWishes, recipient, santa, admin] = await Promise.all([
    wishesOf(me.id),
    me.assignedToId ? db.query.participants.findFirst({ where: eq(participants.id, me.assignedToId) }) : null,
    group.status !== 'setup' ? santaOf(me.id) : null,
    db.query.participants.findFirst({ where: and(eq(participants.groupId, group.id), eq(participants.isAdmin, true)) }),
  ]);
  // ACHTUNG: `santa` nur serverseitig verwenden – Name erst nach der Auflösung anzeigen!
  const locked = Boolean(santa?.giftDoneAt);
  const thread = santa
    ? await db
        .select()
        .from(messages)
        .where(and(eq(messages.santaId, santa.id), eq(messages.recipientId, me.id)))
        .orderBy(asc(messages.createdAt))
    : [];
  const unreadFromKind =
    recipient && group.status === 'drawn'
      ? (
          await db
            .select({ n: count() })
            .from(messages)
            .where(
              and(eq(messages.santaId, me.id), eq(messages.recipientId, recipient.id), eq(messages.fromSanta, false), isNull(messages.readAt)),
            )
        )[0].n
      : 0;

  let reveal: { chainNames: string[][]; mySantaName: string | null } | null = null;
  if (group.status === 'revealed') {
    const all = await db.select().from(participants).where(eq(participants.groupId, group.id));
    const byId = new Map(all.map((p) => [p.id, p.name]));
    const assign = new Map(all.filter((p) => p.assignedToId).map((p) => [p.id, p.assignedToId!]));
    reveal = {
      chainNames: chains(assign).map((c) => [...c, c[0]].map((id) => byId.get(id) ?? '?')),
      mySantaName: santa?.name ?? null,
    };
  }

  after(async () => {
    try {
      await markSeen(me.id);
      await db
        .update(messages)
        .set({ readAt: new Date() })
        .where(and(eq(messages.recipientId, me.id), eq(messages.fromSanta, true), isNull(messages.readAt)));
      await flushDueNotifications();
    } catch (err) {
      console.error('[after] dashboard', err);
    }
  });

  const cd = countdown(group.eventDate);
  const adminName = admin?.name ?? 'die Orga';

  return (
    <>
      <Topbar
        title={group.name}
        href={`/g/${slug}`}
        right={
          me.isAdmin ? (
            <Link className="btn btn-soft btn-small" href={`/g/${slug}/admin`}>
              Admin
            </Link>
          ) : null
        }
      />
      <main className="wrap">
        <Flash sp={sp} />
        <InstallHint />

        <section className="mt-m stack">
          {!me.plays ? (
            <div className="card">
              <div className="eyebrow">Orga</div>
              <h2 className="mt-s">Du organisierst diese Runde</h2>
              <p className="small muted mt-s">Du wichtelst selbst nicht mit – im Admin-Bereich siehst du, wie weit alle sind.</p>
              <Link className="btn btn-green btn-block mt-m" href={`/g/${slug}/admin`}>
                Zum Admin-Bereich
              </Link>
            </div>
          ) : group.status === 'setup' ? (
            <div className="card">
              <div className="eyebrow">Noch nicht ausgelost</div>
              <h2 className="mt-s">Gleich geht’s los!</h2>
              <p className="small muted mt-s">
                {me.isAdmin
                  ? 'Trag alle Mitwichtel ein und starte die Auslosung. Danach bekommt jede Person eine Mail mit ihrem Wichtelkind.'
                  : `Sobald ${adminName} auslost, bekommst du eine Mail mit deinem Wichtelkind. Trag schon mal deine Wünsche ein!`}
              </p>
              {me.isAdmin && (
                <Link className="btn btn-primary btn-block mt-m" href={`/g/${slug}/admin`}>
                  Mitwichtel eintragen &amp; auslosen
                </Link>
              )}
            </div>
          ) : recipient ? (
            <RevealName name={recipient.name}>
              <Link className="btn btn-light btn-block" href={`/g/${slug}/kind`}>
                Wunschliste ansehen{unreadFromKind ? ` · ${unreadFromKind} neue Antwort${unreadFromKind > 1 ? 'en' : ''}` : ''}
              </Link>
              {me.giftDoneAt && <p className="small mt-s" style={{ opacity: 0.85 }}>Geschenk besorgt ✓</p>}
            </RevealName>
          ) : null}

          {(cd || group.budget || group.eventLocation || group.message) && (
            <div className="card">
              {cd && <div className="countdown">{cd}</div>}
              <div className={`facts${cd ? ' mt-m' : ''}`}>
                {group.eventDate && (
                  <div className="fact">
                    <div className="k">Bescherung</div>
                    <div className="v">{formatDate(group.eventDate, false)}</div>
                  </div>
                )}
                {group.eventLocation && (
                  <div className="fact">
                    <div className="k">Ort</div>
                    <div className="v">{group.eventLocation}</div>
                  </div>
                )}
                {group.budget && (
                  <div className="fact">
                    <div className="k">Budget</div>
                    <div className="v">{group.budget}</div>
                  </div>
                )}
              </div>
              {group.message && (
                <div className="admin-note mt-m">
                  <div className="tiny muted" style={{ fontWeight: 650 }}>
                    Nachricht von {adminName}
                  </div>
                  <div className="pre">{group.message}</div>
                </div>
              )}
              {group.eventDate && (
                <a className="btn btn-soft btn-small mt-m" href={`/g/${slug}/kalender`}>
                  📅 In den Kalender
                </a>
              )}
            </div>
          )}
        </section>

        {me.plays && (
          <section id="wuensche">
            <div className="section-head">
              <h2>Deine Wunschliste</h2>
              <span className="count">{myWishes.length ? `${myWishes.length} ${myWishes.length === 1 ? 'Wunsch' : 'Wünsche'}` : ''}</span>
            </div>
            <div className="stack">
              {locked && (
                <div className="locked">
                  <span className="big" aria-hidden>
                    🎁
                  </span>
                  <div>
                    <strong>Dein Wichtel hat schon etwas besorgt!</strong>
                    <div className="small">Deine Liste ist jetzt geschlossen. Was genau es ist, bleibt natürlich geheim.</div>
                  </div>
                </div>
              )}
              {myWishes.length > 0 ? (
                <div className="card">
                  <ul className="list">
                    {myWishes.map((w) => (
                      <li key={w.id}>
                        <WishItem
                          wish={w}
                          editable={!locked}
                          update={updateWish.bind(null, slug)}
                          remove={deleteWish.bind(null, slug)}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                !locked && (
                  <p className="small muted" style={{ padding: '0 4px' }}>
                    Noch keine Wünsche. Schon ein, zwei Ideen helfen deinem Wichtel enorm – gern mit Link zum Shop.
                  </p>
                )
              )}
              {!locked && (
                <div className="card">
                  <h3>{myWishes.length ? 'Noch ein Wunsch' : 'Ersten Wunsch eintragen'}</h3>
                  <StatefulForm action={addWish.bind(null, slug)} className="mt-m">
                    <WishFields />
                    <SubmitButton className="btn btn-green btn-block mt-m" pendingText="Speichere…">
                      Wunsch hinzufügen
                    </SubmitButton>
                  </StatefulForm>
                  {group.status === 'drawn' && (
                    <p className="hint">Dein Wichtel bekommt automatisch eine Mail – gebündelt, wenn du ein paar Minuten nichts mehr änderst.</p>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {group.status === 'drawn' && santa && (
          <section id="nachrichten">
            <div className="section-head">
              <h2>Dein geheimer Wichtel</h2>
            </div>
            <Chat
              thread={thread}
              iAmSanta={false}
              to="wichtel"
              action={sendMessage.bind(null, slug)}
              empty="Dein Wichtel kann dir hier anonym Fragen stellen. Du kannst auch selbst einen Tipp hinterlassen."
              placeholder="Tipp oder Antwort …"
            />
          </section>
        )}

        {reveal && (
          <section>
            <div className="section-head">
              <h2>Die Auflösung</h2>
            </div>
            <div className="card stack">
              {reveal.mySantaName && (
                <div className="center">
                  <div className="eyebrow">Dein Wichtel war</div>
                  <div className="countdown" style={{ fontSize: 28 }}>
                    {reveal.mySantaName}
                  </div>
                </div>
              )}
              <div className="chain">
                {reveal.chainNames.map((c, i) => (
                  <p key={i}>
                    {c.map((n, j) => (
                      <span key={j}>
                        {j > 0 && ' → '}
                        {n === me.name ? <b>{n}</b> : n}
                      </span>
                    ))}
                  </p>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer>
        <p>
          Angemeldet als {firstName(me.name)} ({me.email})
        </p>
        <form action={logout.bind(null, slug)}>
          <button className="link-btn" type="submit">
            Auf diesem Gerät abmelden
          </button>
        </form>
      </Footer>
    </>
  );
}
