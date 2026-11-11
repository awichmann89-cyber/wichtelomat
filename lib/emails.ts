import type { Mail } from './mail';
import type { Group, Wish } from './db/schema';
import { appUrl, APP_NAME } from './env';
import { esc, formatDate, firstName, hostOf, countdown } from './format';

const C = {
  bg: '#f6f1e9',
  card: '#ffffff',
  ink: '#1c2420',
  muted: '#5d6b63',
  red: '#c8283a',
  green: '#14583a',
  gold: '#f2c14e',
  line: '#ece5d8',
};

const FONT = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`;

type Out = Omit<Mail, 'to'>;

function layout(opts: { preheader: string; body: string; footer?: string }): string {
  const logo = `${appUrl()}/icons/mail-logo.png`;
  return `<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only"><title>${APP_NAME}</title></head>
<body style="margin:0;padding:0;background:${C.bg};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader)}&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};">
<tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
    <tr><td align="center" style="padding:0 0 16px;">
      <a href="${appUrl()}" style="text-decoration:none;color:${C.green};font-family:${FONT};">
        <img src="${logo}" width="56" height="56" alt="" style="display:block;margin:0 auto 6px;border-radius:14px;border:0;">
        <span style="font-size:15px;font-weight:800;letter-spacing:.3px;">${APP_NAME}</span>
      </a>
    </td></tr>
    <tr><td style="background:${C.card};border-radius:20px;padding:28px 24px;font-family:${FONT};color:${C.ink};font-size:16px;line-height:1.55;">
      ${opts.body}
    </td></tr>
    <tr><td style="padding:16px 12px 0;font-family:${FONT};color:${C.muted};font-size:12px;line-height:1.5;text-align:center;">
      ${opts.footer ?? ''}
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;
}

function button(href: string, label: string, color = C.red): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:20px 0 4px;"><tr>
<td style="border-radius:999px;background:${color};">
<a href="${href}" style="display:inline-block;padding:14px 26px;font-family:${FONT};font-size:16px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">${esc(label)}</a>
</td></tr></table>`;
}

function infoRows(group: Group): { html: string; text: string } {
  const rows: [string, string][] = [];
  if (group.eventDate) rows.push(['Bescherung', formatDate(group.eventDate)!]);
  if (group.eventLocation) rows.push(['Ort', group.eventLocation]);
  if (group.budget) rows.push(['Budget', group.budget]);
  if (!rows.length) return { html: '', text: '' };
  const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 0;border-top:1px solid ${C.line};">
${rows
  .map(
    ([k, v]) => `<tr><td style="padding:10px 0;border-bottom:1px solid ${C.line};color:${C.muted};font-size:14px;width:110px;vertical-align:top;">${esc(k)}</td>
<td style="padding:10px 0;border-bottom:1px solid ${C.line};font-size:15px;font-weight:600;">${esc(v)}</td></tr>`,
  )
  .join('')}
</table>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n');
  return { html, text };
}

function wishList(wishes: Pick<Wish, 'title' | 'url' | 'note' | 'favorite'>[]): { html: string; text: string } {
  const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 0;">
${wishes
  .map(
    (w) => `<tr><td style="padding:10px 12px;background:${C.bg};border-radius:12px;">
<div style="font-weight:700;font-size:15px;">${w.favorite ? '★ ' : ''}${esc(w.title)}</div>
${w.note ? `<div style="color:${C.muted};font-size:14px;margin-top:2px;">${esc(w.note)}</div>` : ''}
${w.url ? `<div style="margin-top:4px;font-size:13px;"><a href="${esc(w.url)}" style="color:${C.green};">${esc(hostOf(w.url))} ↗</a></div>` : ''}
</td></tr><tr><td style="height:8px;line-height:8px;font-size:0;">&nbsp;</td></tr>`,
  )
  .join('')}
</table>`;
  const text = wishes
    .map((w) => `- ${w.favorite ? '★ ' : ''}${w.title}${w.note ? ` (${w.note})` : ''}${w.url ? `\n  ${w.url}` : ''}`)
    .join('\n');
  return { html, text };
}

function footer(group: Group, adminName?: string): string {
  const who = adminName ? `${esc(adminName)} hat dich zur Wichtelgruppe „${esc(group.name)}“ eingeladen.` : `Wichtelgruppe „${esc(group.name)}“.`;
  return `${who}<br>Alle Daten der Gruppe werden nach dem Wichteln automatisch gelöscht.`;
}

const p = (html: string, style = '') => `<p style="margin:0 0 14px;${style}">${html}</p>`;
const h1 = (html: string) => `<h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;font-weight:800;">${html}</h1>`;

// ---------------------------------------------------------------------------

export function adminWelcomeMail(o: { group: Group; adminName: string; adminLink: string; password: string }): Out {
  const body = `${h1(`Deine Wichtelgruppe steht, ${esc(firstName(o.adminName))}!`)}
${p(`„<strong>${esc(o.group.name)}</strong>“ ist angelegt. Über diesen Link kommst du jederzeit in den Admin-Bereich – trag dort alle Teilnehmenden ein und starte die Auslosung.`)}
${button(o.adminLink, 'Zum Admin-Bereich')}
<div style="margin:22px 0 0;padding:14px 16px;background:${C.bg};border-radius:14px;">
  <div style="font-size:13px;color:${C.muted};">Euer Gruppenpasswort</div>
  <div style="font-size:20px;font-weight:800;letter-spacing:.5px;margin-top:2px;">${esc(o.password)}</div>
  <div style="font-size:13px;color:${C.muted};margin-top:6px;">Sag es allen Teilnehmenden – am besten mündlich oder im Gruppenchat. Groß-/Kleinschreibung ist egal.</div>
</div>`;
  return {
    subject: `Deine Wichtelgruppe „${o.group.name}“ ist bereit`,
    html: layout({ preheader: 'Admin-Link und Gruppenpasswort – gut aufheben!', body, footer: 'Diese Mail enthält deinen persönlichen Admin-Link. Bitte nicht weiterleiten.' }),
    text: `Deine Wichtelgruppe „${o.group.name}“ ist angelegt.\n\nAdmin-Bereich: ${o.adminLink}\n\nGruppenpasswort: ${o.password}\n(Sag es allen Teilnehmenden. Groß-/Kleinschreibung ist egal.)`,
  };
}

export function drawMail(o: {
  group: Group;
  giverName: string;
  recipientName: string;
  kindLink: string;
  wishesLink: string;
  wishes: Pick<Wish, 'title' | 'url' | 'note' | 'favorite'>[];
  adminName: string;
  redraw: boolean;
}): Out {
  const info = infoRows(o.group);
  const wl = o.wishes.length ? wishList(o.wishes.slice(0, 5)) : null;
  const cd = countdown(o.group.eventDate);
  const body = `${o.redraw ? `<div style="margin:0 0 18px;padding:12px 14px;background:#fff4d6;border-radius:12px;font-size:14px;"><strong>Achtung, neue Auslosung!</strong> ${esc(o.adminName)} hat neu gezogen – die vorherige Mail ist ungültig.</div>` : ''}
${h1(`Hallo ${esc(firstName(o.giverName))}, die Lose sind gezogen!`)}
${p(`Du bist geheimer Wichtel in der Gruppe „${esc(o.group.name)}“. Du beschenkst:`)}
<div style="margin:6px 0 4px;padding:22px 16px;text-align:center;background:${C.bg};border-radius:16px;border:2px dashed ${C.gold};">
  <a href="${o.kindLink}" style="font-size:30px;line-height:1.2;font-weight:800;color:${C.red};text-decoration:none;">${esc(o.recipientName)}</a>
  <div style="margin-top:8px;font-size:14px;"><a href="${o.kindLink}" style="color:${C.green};font-weight:600;">Wunschliste ansehen →</a></div>
</div>
${wl ? `<div style="margin:18px 0 0;font-size:14px;color:${C.muted};font-weight:600;">Schon auf der Wunschliste:</div>${wl.html}${o.wishes.length > 5 ? p(`<span style="font-size:14px;color:${C.muted};">… und ${o.wishes.length - 5} weitere.</span>`) : ''}` : p(`<span style="font-size:14px;color:${C.muted};">Noch keine Wünsche eingetragen – du bekommst automatisch eine Mail, sobald welche dazukommen. Über den Link kannst du auch anonym nachfragen.</span>`, 'margin-top:14px;')}
${o.group.message ? `<div style="margin:18px 0 0;padding:14px 16px;border-left:4px solid ${C.green};background:#f1f7f3;border-radius:0 12px 12px 0;"><div style="font-size:13px;color:${C.muted};margin-bottom:4px;">Nachricht von ${esc(o.adminName)}</div>${esc(o.group.message).replace(/\n/g, '<br>')}</div>` : ''}
${info.html}
${cd && cd !== 'Die Bescherung ist vorbei' ? p(`<strong>${esc(cd)}</strong>`, 'margin-top:16px;color:' + C.green + ';') : ''}
<div style="margin:24px 0 0;padding-top:20px;border-top:1px solid ${C.line};">
  ${p('<strong>Und was wünschst du dir?</strong> Trag deine Wünsche ein – dein Wichtel wird automatisch benachrichtigt.')}
  ${button(o.wishesLink, 'Meine Wunschliste', C.green)}
</div>
${p(`<span style="font-size:13px;color:${C.muted};">Beim ersten Öffnen fragen wir nach dem Gruppenpasswort – das kennst du von ${esc(o.adminName)}. Psst: Verrate niemandem, wen du gezogen hast!</span>`, 'margin-top:18px;')}`;

  const text = `${o.redraw ? 'ACHTUNG, NEUE AUSLOSUNG! Die vorherige Mail ist ungültig.\n\n' : ''}Hallo ${firstName(o.giverName)},

die Lose für „${o.group.name}“ sind gezogen. Du beschenkst:

>>> ${o.recipientName} <<<
Wunschliste ansehen: ${o.kindLink}
${wl ? `\nSchon auf der Wunschliste:\n${wl.text}\n` : ''}${o.group.message ? `\nNachricht von ${o.adminName}:\n${o.group.message}\n` : ''}${info.text ? `\n${info.text}\n` : ''}
Deine eigene Wunschliste: ${o.wishesLink}

Beim ersten Öffnen fragen wir nach dem Gruppenpasswort. Psst – nichts verraten!`;

  return {
    // Bewusst ohne Namen: Sperrbildschirm-Vorschauen sollen nichts verraten.
    subject: `${o.redraw ? 'Neu ausgelost: ' : ''}Die Lose sind gezogen – ${o.group.name}`,
    html: layout({ preheader: 'Tippe rein, um zu sehen, wen du beschenkst. Pssst!', body, footer: footer(o.group, o.adminName) }),
    text,
  };
}

export function wishesUpdateMail(o: {
  group: Group;
  santaName: string;
  recipientName: string;
  wishes: Pick<Wish, 'title' | 'url' | 'note' | 'favorite'>[];
  totalCount: number;
  kindLink: string;
}): Out {
  const wl = wishList(o.wishes);
  const n = o.wishes.length;
  const body = `${h1(`Neue Wünsche für dich, ${esc(firstName(o.santaName))}!`)}
${p(`<strong>${esc(o.recipientName)}</strong> hat ${n === 1 ? 'einen Wunsch' : `${n} Wünsche`} eingetragen oder aktualisiert:`)}
${wl.html}
${button(o.kindLink, `Ganze Wunschliste ansehen (${o.totalCount})`)}
${p(`<span style="font-size:13px;color:${C.muted};">Schon was besorgt? Markiere es auf der Wunschliste – dann sieht ${esc(firstName(o.recipientName))} nur, <em>dass</em> du fertig bist, nicht <em>was</em> es ist.</span>`, 'margin-top:18px;')}`;
  return {
    subject: `Neue Wünsche auf der Liste deines Wichtelkinds – ${o.group.name}`,
    html: layout({ preheader: `${n === 1 ? 'Ein neuer Wunsch' : `${n} neue Wünsche`} – schau mal rein.`, body, footer: footer(o.group) }),
    text: `${o.recipientName} hat neue Wünsche:\n\n${wl.text}\n\nGanze Liste: ${o.kindLink}`,
  };
}

export function messageMail(o: {
  group: Group;
  toName: string;
  fromSanta: boolean;
  recipientName: string;
  body: string;
  link: string;
}): Out {
  const title = o.fromSanta ? 'Dein Wichtel hat dir geschrieben' : `${esc(o.recipientName)} hat geantwortet`;
  const body = `${h1(o.fromSanta ? `${title} 🤫` : title)}
${p(o.fromSanta ? 'Anonym, natürlich. Antworte direkt in der App – dein Wichtel bleibt geheim.' : 'Auf deine anonyme Nachricht:')}
<div style="margin:6px 0 0;padding:16px 18px;background:${C.bg};border-radius:16px 16px 16px 4px;font-size:16px;">${esc(o.body).replace(/\n/g, '<br>')}</div>
${button(o.link, o.fromSanta ? 'Antworten' : 'Zur Unterhaltung')}`;
  return {
    subject: o.fromSanta ? `Psst … Nachricht von deinem Wichtel – ${o.group.name}` : `Antwort von deinem Wichtelkind – ${o.group.name}`,
    html: layout({ preheader: o.body.slice(0, 90), body, footer: footer(o.group) }),
    text: `${o.fromSanta ? 'Dein Wichtel hat dir geschrieben' : `${o.recipientName} hat geantwortet`}:\n\n${o.body}\n\nAntworten: ${o.link}`,
  };
}

export function reminderMail(o: { group: Group; toName: string; wishesLink: string; adminName: string }): Out {
  const cd = countdown(o.group.eventDate);
  const body = `${h1(`Hey ${esc(firstName(o.toName))}, dein Wichtel tappt im Dunkeln!`)}
${p(`Auf deiner Wunschliste in „${esc(o.group.name)}“ steht noch nichts. Ein, zwei Ideen reichen schon – mit Link, wenn du magst.`)}
${cd && cd !== 'Die Bescherung ist vorbei' ? p(`<strong style="color:${C.green};">${esc(cd)}</strong>`) : ''}
${button(o.wishesLink, 'Wünsche eintragen', C.green)}`;
  return {
    subject: `Kleine Erinnerung: Deine Wunschliste ist noch leer – ${o.group.name}`,
    html: layout({ preheader: 'Ein, zwei Ideen reichen schon.', body, footer: footer(o.group, o.adminName) }),
    text: `Hey ${firstName(o.toName)}, deine Wunschliste in „${o.group.name}“ ist noch leer.\n\nWünsche eintragen: ${o.wishesLink}`,
  };
}

export function codeMail(o: { group: Group; toName: string; code: string; link: string }): Out {
  const body = `${h1('Dein Anmeldecode')}
${p(`Hallo ${esc(firstName(o.toName))}, hier ist dein Code für „${esc(o.group.name)}“:`)}
<div style="margin:8px 0 6px;padding:18px;text-align:center;background:${C.bg};border-radius:16px;font-size:34px;font-weight:800;letter-spacing:8px;">${esc(o.code)}</div>
${p(`<span style="font-size:14px;color:${C.muted};">Gültig für 15 Minuten. Oder direkt über deinen persönlichen Link einsteigen:</span>`)}
${button(o.link, 'Zum Wichtelomat', C.green)}
${p(`<span style="font-size:13px;color:${C.muted};">Du hast keinen Code angefordert? Dann kannst du diese Mail ignorieren.</span>`, 'margin-top:16px;')}`;
  return {
    subject: `${o.code} ist dein Wichtelomat-Code`,
    html: layout({ preheader: `Dein Code: ${o.code}`, body, footer: footer(o.group) }),
    text: `Dein Anmeldecode für „${o.group.name}“: ${o.code}\n(15 Minuten gültig)\n\nOder direkt: ${o.link}`,
  };
}

export function revealMail(o: { group: Group; toName: string; santaName: string | null; chainsText: string[]; link: string }): Out {
  const body = `${h1('Die große Auflösung!')}
${p(`Hallo ${esc(firstName(o.toName))}, in „${esc(o.group.name)}“ wird gelüftet, wer wessen Wichtel war.`)}
${o.santaName ? `<div style="margin:6px 0 18px;padding:18px;text-align:center;background:${C.bg};border-radius:16px;"><div style="font-size:14px;color:${C.muted};">Dein Wichtel war</div><div style="font-size:26px;font-weight:800;color:${C.red};margin-top:4px;">${esc(o.santaName)}</div></div>` : ''}
${o.chainsText.map((c) => p(esc(c), `font-size:14px;color:${C.muted};`)).join('')}
${button(o.link, 'Zur Gruppe')}`;
  return {
    subject: `Auflösung: Wer war wessen Wichtel? – ${o.group.name}`,
    html: layout({ preheader: 'Jetzt wird’s gelüftet …', body, footer: footer(o.group) }),
    text: `Auflösung in „${o.group.name}“:\n${o.santaName ? `Dein Wichtel war: ${o.santaName}\n` : ''}\n${o.chainsText.join('\n')}\n\n${o.link}`,
  };
}
