import nodemailer, { type Transporter } from 'nodemailer';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { mailFrom } from './env';

export type Mail = { to: string; subject: string; html: string; text: string; replyTo?: string };

let smtp: Transporter | null = null;

function smtpTransport(): Transporter {
  if (!smtp) {
    const port = Number(process.env.SMTP_PORT || 465);
    const secure = (process.env.SMTP_SECURE ?? (port === 465 ? 'true' : 'false')) === 'true';
    smtp = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
      pool: true,
      maxConnections: 3,
    });
  }
  return smtp;
}

export function mailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST || process.env.MAIL_OUTBOX_DIR);
}

/** Versand über Resend (RESEND_API_KEY) oder SMTP (SMTP_HOST). Lokal optional in einen Ordner. */
export async function sendMail(m: Mail): Promise<void> {
  const from = mailFrom();

  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [m.to], subject: m.subject, html: m.html, text: m.text, reply_to: m.replyTo }),
    });
    if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 300)}`);
    return;
  }

  if (process.env.SMTP_HOST) {
    await smtpTransport().sendMail({ from, to: m.to, subject: m.subject, html: m.html, text: m.text, replyTo: m.replyTo });
    return;
  }

  if (process.env.MAIL_OUTBOX_DIR) {
    const dir = process.env.MAIL_OUTBOX_DIR;
    await mkdir(dir, { recursive: true });
    const base = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    await writeFile(path.join(dir, `${base}.json`), JSON.stringify({ from, ...m, html: undefined }, null, 2));
    await writeFile(path.join(dir, `${base}.html`), m.html);
    return;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Kein Mailversand konfiguriert (SMTP_HOST oder RESEND_API_KEY setzen).');
  }
  console.log(`[mail] An ${m.to}: ${m.subject}\n${m.text}`);
}

/** Schickt viele Mails mit begrenzter Parallelität und meldet Ergebnis pro Mail. */
export async function sendMany<T>(
  items: T[],
  build: (item: T) => Promise<Mail> | Mail,
  concurrency = 3,
): Promise<{ item: T; error?: string }[]> {
  const results: { item: T; error?: string }[] = [];
  let i = 0;
  const worker = async () => {
    while (i < items.length) {
      const item = items[i++];
      try {
        await sendMail(await build(item));
        results.push({ item });
      } catch (err) {
        results.push({ item, error: err instanceof Error ? err.message : String(err) });
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker));
  return results;
}
