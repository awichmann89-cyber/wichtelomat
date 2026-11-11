import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { after } from 'next/server';
import { and, asc, eq, isNull } from 'drizzle-orm';
import { Chat } from '@/components/Chat';
import { Flash } from '@/components/Flash';
import { Footer } from '@/components/Footer';
import { SubmitButton } from '@/components/SubmitButton';
import { Topbar } from '@/components/Topbar';
import { WishItem } from '@/components/WishItem';
import { db, messages, participants } from '@/lib/db';
import { countdown, firstName, formatDate } from '@/lib/format';
import { flushDueNotifications, markSeen, wishesOf } from '@/lib/service';
import { requireMember } from '@/lib/session';
import { sendMessage, setGiftDone } from '../actions';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Dein Wichtelkind' };

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function KindPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const { group, me } = await requireMember(slug);
  if (!me.assignedToId) redirect(`/g/${slug}`);
  const recipient = await db.query.participants.findFirst({ where: eq(participants.id, me.assignedToId) });
  if (!recipient) redirect(`/g/${slug}`);

  const [list, thread] = await Promise.all([
    wishesOf(recipient.id),
    db
      .select()
      .from(messages)
      .where(and(eq(messages.santaId, me.id), eq(messages.recipientId, recipient.id)))
      .orderBy(asc(messages.createdAt)),
  ]);

  after(async () => {
    try {
      await markSeen(me.id);
      await db
        .update(messages)
        .set({ readAt: new Date() })
        .where(and(eq(messages.santaId, me.id), eq(messages.fromSanta, false), isNull(messages.readAt)));
      await flushDueNotifications();
    } catch (err) {
      console.error('[after] kind', err);
    }
  });

  const name = firstName(recipient.name);
  const cd = countdown(group.eventDate);

  return (
    <>
      <Topbar title={group.name} href={`/g/${slug}`} />
      <main className="wrap">
        <Flash sp={sp} />

        <section className="card mt-m">
          <div className="eyebrow">Dein Wichtelkind</div>
          <h1 className="mt-s" style={{ color: 'var(--red)' }}>
            {recipient.name}
          </h1>
          <p className="small muted mt-s">Psst – das bleibt unter uns.{cd && cd !== 'Die Bescherung ist vorbei' ? ` ${cd}.` : ''}</p>
          {(group.budget || group.eventDate) && (
            <div className="facts mt-m">
              {group.budget && (
                <div className="fact">
                  <div className="k">Budget</div>
                  <div className="v">{group.budget}</div>
                </div>
              )}
              {group.eventDate && (
                <div className="fact">
                  <div className="k">Bescherung</div>
                  <div className="v">{formatDate(group.eventDate, false)}</div>
                </div>
              )}
            </div>
          )}
        </section>

        <section>
          <div className="section-head">
            <h2>Wunschliste</h2>
            <span className="count">{list.length ? `${list.length} ${list.length === 1 ? 'Wunsch' : 'Wünsche'}` : ''}</span>
          </div>
          {list.length ? (
            <div className="card">
              <ul className="list">
                {list.map((w) => (
                  <li key={w.id}>
                    <WishItem wish={w} />
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="card center">
              <div style={{ fontSize: 34 }} aria-hidden>
                🧐
              </div>
              <p className="mt-s">
                <strong>{name} hat noch nichts eingetragen.</strong>
              </p>
              <p className="small muted mt-s">Sobald sich etwas tut, bekommst du eine Mail. Oder frag einfach unten anonym nach.</p>
            </div>
          )}
        </section>

        {group.status === 'drawn' && (
          <section>
            <div className="section-head">
              <h2>Geschenk besorgt?</h2>
            </div>
            <div className="card">
              {me.giftDoneAt ? (
                <form action={setGiftDone.bind(null, slug)} className="gift-toggle">
                  <span className="big" aria-hidden>
                    ✅
                  </span>
                  <div style={{ flex: 1 }}>
                    <strong>Erledigt!</strong>
                    <div className="small muted">
                      {name} sieht nur, <em>dass</em> du fertig bist – nicht was. Die Wunschliste ist geschlossen.
                    </div>
                    <input type="hidden" name="done" value="0" />
                    <SubmitButton className="link-btn" pendingText="…">
                      Doch noch nicht fertig
                    </SubmitButton>
                  </div>
                </form>
              ) : (
                <form action={setGiftDone.bind(null, slug)}>
                  <p className="small">
                    Schon was besorgt? Dann markiere es hier. {name} sieht nur, <em>dass</em> du fertig bist – nicht was es ist. Die
                    Wunschliste wird damit geschlossen, damit nichts mehr nachgetragen wird.
                  </p>
                  <input type="hidden" name="done" value="1" />
                  <SubmitButton
                    className="btn btn-green btn-block mt-m"
                    pendingText="Speichere…"
                    confirm={`Geschenk als besorgt markieren? ${name} kann dann keine Wünsche mehr ändern.`}
                  >
                    🎁 Geschenk ist besorgt
                  </SubmitButton>
                </form>
              )}
            </div>
          </section>
        )}

        {group.status === 'drawn' && (
          <section>
            <div className="section-head">
              <h2>Anonym nachfragen</h2>
            </div>
            <Chat
              thread={thread}
              iAmSanta
              to="kind"
              action={sendMessage.bind(null, slug)}
              empty={`Frag ${name} etwas, ohne dich zu verraten – z. B. Schuhgröße oder Lieblingsfarbe. ${name} bekommt eine Mail und kann hier antworten.`}
              placeholder="Deine Frage …"
            />
          </section>
        )}

        <div className="center mt-l">
          <Link href={`/g/${slug}`} className="btn btn-ghost">
            ← Zu meiner Übersicht
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}
