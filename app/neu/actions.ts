'use server';

import { redirect } from 'next/navigation';
import { db, groups, participants } from '@/lib/db';
import { encrypt, hashPassword, randomSlug, safeEqual } from '@/lib/crypto';
import { createCode } from '@/lib/env';
import { fail, type FormState } from '@/lib/form';
import { sendMail } from '@/lib/mail';
import { adminWelcomeMail } from '@/lib/emails';
import { clientKey, rateLimit } from '@/lib/ratelimit';
import { newToken, personalLink } from '@/lib/service';
import { setSession } from '@/lib/session';
import { cleanMultiline, cleanText, isIsoDate, normalizeEmail, normalizeGroupPassword } from '@/lib/validate';

export async function createGroup(_: FormState, fd: FormData): Promise<FormState> {
  const name = cleanText(fd.get('name'), 80);
  const adminName = cleanText(fd.get('adminName'), 60);
  const adminEmail = normalizeEmail(fd.get('adminEmail'));
  const plays = fd.get('plays') === 'on';
  const passwordDisplay = cleanText(fd.get('password'), 60);
  const password = normalizeGroupPassword(passwordDisplay);
  const passwordHint = cleanText(fd.get('passwordHint'), 120) || null;
  const budget = cleanText(fd.get('budget'), 40) || null;
  const eventDateRaw = String(fd.get('eventDate') ?? '').trim();
  const eventLocation = cleanText(fd.get('eventLocation'), 120) || null;
  const message = cleanMultiline(fd.get('message'), 1000) || null;

  if (!name) return fail('Wie soll eure Wichtelgruppe heißen?');
  if (!adminName) return fail('Bitte gib deinen Namen an.');
  if (!adminEmail) return fail('Bitte gib eine gültige E-Mail-Adresse an.');
  if (password.length < 4) return fail('Das Gruppenpasswort braucht mindestens 4 Zeichen.');
  if (eventDateRaw && !isIsoDate(eventDateRaw)) return fail('Das Datum ist ungültig.');

  const required = createCode();
  if (required && !safeEqual(String(fd.get('createCode') ?? '').trim(), required)) {
    return fail('Der Erstell-Code stimmt nicht. Frag den Betreiber dieser Seite danach.');
  }
  if (!(await rateLimit(`create:${await clientKey()}`, 10, 86_400))) {
    return fail('Von hier aus wurden heute schon sehr viele Gruppen angelegt. Bitte versuch es morgen wieder.');
  }

  const slug = randomSlug();
  const t = newToken();
  const passwordHash = await hashPassword(password);

  const { group, admin } = await db.transaction(async (tx) => {
    const [group] = await tx
      .insert(groups)
      .values({
        slug,
        name,
        message,
        budget,
        eventDate: eventDateRaw || null,
        eventLocation,
        passwordHash,
        passwordEnc: encrypt(passwordDisplay),
        passwordHint,
      })
      .returning();
    const [admin] = await tx
      .insert(participants)
      .values({ groupId: group.id, name: adminName, email: adminEmail, isAdmin: true, plays, tokenHash: t.tokenHash, tokenEnc: t.tokenEnc })
      .returning();
    return { group, admin };
  });

  await setSession(slug, admin);

  let mailOk = true;
  try {
    await sendMail({
      to: adminEmail,
      ...adminWelcomeMail({ group, adminName, adminLink: personalLink(admin, 'admin'), password: passwordDisplay }),
    });
  } catch (err) {
    console.error('[create] Admin-Mail fehlgeschlagen', err);
    mailOk = false;
  }

  redirect(`/g/${slug}/admin?m=${mailOk ? 'created' : 'created-nomail'}`);
}
