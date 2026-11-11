# 🎅 Wichtelomat

**Wichteln ohne Zettelchaos.** Gruppe anlegen, auslosen lassen, alle bekommen ihr Wichtelkind per Mail, Wünsche mit Links teilen und anonym nachfragen. Mobil-first, als App auf den iPhone-Home-Bildschirm installierbar.

Next.js 16 (App Router) · Neon Postgres via Drizzle · Vercel · Mailversand per SMTP oder Resend

---

## Was die App kann

**Orga (Admin)**

- Gruppe anlegen mit **Gruppenpasswort** (+ optionaler Passwort-Hinweis), Budget, Datum, Ort, Nachricht an alle
- Mitwichtel einzeln oder **per Copy-and-paste** eintragen (`Anna, anna@x.de` / `Ben <ben@x.de>` / nur `carla@x.de`)
- **Ausschlüsse** (z. B. Paare ziehen sich nicht gegenseitig) und „Keine Pärchen-Tausche“ (A→B und B→A)
- Orga kann selbst mitmachen oder nur organisieren
- **Auslosung mit einem Tipp.** Alle bekommen sofort eine Mail. Die Orga sieht **nicht**, wer wen hat.
- Fortschritt ohne Spoiler: Mail zugestellt, Link geöffnet, Wünsche eingetragen, Geschenk besorgt
- Mail erneut senden, E-Mail-Adresse korrigieren (die Mail geht dann automatisch an die neue Adresse), Erinnerung an alle ohne Wünsche
- Einladungstext inkl. Passwort zum Teilen (WhatsApp & Co.)
- Neu auslosen, falls jemand abspringt. **Auflösung** nach der Bescherung mit der ganzen Wichtelkette
- Gruppe löschen. Ohne Löschen passiert das automatisch 60 Tage nach der Bescherung.

**Mitwichtel**

- Mail nach der Auslosung: **Der gezogene Name ist anklickbar** und führt direkt zur Wunschliste. Ein zweiter Button führt zur eigenen Wunschliste.
- Betreff und Vorschautext verraten keinen Namen, die Sperrbildschirm-Vorschau ist also spoilerfrei.
- Beim ersten Öffnen einmalig das Gruppenpasswort eingeben, danach bleibt das Gerät angemeldet (120 Tage)
- „Du beschenkst …“ wird erst **beim Antippen aufgedeckt**, gegen Blicke über die Schulter
- Wunschliste: Titel, Link, Notiz, ★ Herzenswunsch
- **Gebündelte Mail an den Wichtel**, wenn Wünsche dazukommen (nach 3 Minuten Ruhe eine Mail statt fünf)
- **Anonymer Chat** Wichtel ↔ Wichtelkind („Welche Schuhgröße?“), mit Mail-Benachrichtigung
- **„Geschenk besorgt“** (ein Schalter für die ganze Liste): Das Wichtelkind sieht nur *dass*, nicht *was*. Die Wunschliste wird damit gesperrt.
- Countdown, Kalendereintrag (.ics mit Erinnerung 3 Tage vorher)
- **Anmeldecode per Mail** für neue Geräte und die Home-Bildschirm-App (iOS teilt keine Cookies zwischen Safari und Web-App)
- PWA: „Zum Home-Bildschirm“ öffnet direkt die eigene Gruppe

---

## Deployment auf Vercel

1. **Repo zu GitHub pushen** und in Vercel importieren (Framework: Next.js, keine weiteren Einstellungen nötig).
2. **Neon anbinden:** Vercel → Projekt → *Storage* → *Neon* → Datenbank erstellen/verbinden (Region Frankfurt).
   Das setzt `DATABASE_URL` und `DATABASE_URL_UNPOOLED` automatisch.
3. **Umgebungsvariablen** setzen (siehe `.env.example`):

   | Variable | Pflicht | Beschreibung |
   |---|---|---|
   | `APP_URL` | empfohlen | z. B. `https://wichtelomat.alw-mediaworks.de` – für die Links in den Mails |
   | `SESSION_SECRET` | empfohlen | `openssl rand -base64 32` |
   | `CRON_SECRET` | empfohlen | beliebiger langer Wert, Vercel Cron schickt ihn mit |
   | `MAIL_FROM` | – | Standard: `Wichtelomat <apps@alw-mediaworks.de>` |
   | `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | eins von beiden | SMTP-Zugang des Postfachs `apps@alw-mediaworks.de` (Port 465 oder 587) |
   | `RESEND_API_KEY` | eins von beiden | alternativ Resend (hat Vorrang, wenn gesetzt) |
   | `CREATE_CODE` | optional | Nur wer den Code kennt, kann Gruppen anlegen, damit niemand über deine Domain Mails verschickt |
   | `IMPRESSUM_URL`, `OPERATOR_NAME` | optional | Footer-Link & Datenschutzseite |

4. **Deploy.** `npm run build` führt vorher automatisch `scripts/migrate.mjs` aus, die DB-Migrationen laufen also bei jedem Push mit.
5. **Cron-Jobs** sind in `vercel.json` hinterlegt (`/api/cron/notify` alle 5 Minuten für gebündelte Wunsch-Mails, `/api/cron/cleanup` nachts für die Auto-Löschung). Alle 5 Minuten braucht Vercel Pro. Zusätzlich wird bei jedem Seitenaufruf nebenbei geprüft, ob Mails fällig sind.

### Zustellbarkeit der Mails (wichtig!)

Damit die Mails nicht im Spam landen, muss `alw-mediaworks.de` sauber konfiguriert sein:

- **SPF:** TXT-Record muss den versendenden Server erlauben (`include:` deines Mail-Hosters; bei Resend einfach die angezeigten DNS-Records übernehmen)
- **DKIM:** beim Mail-Hoster bzw. in Resend aktivieren und die DNS-Records setzen
- **DMARC:** mindestens `v=DMARC1; p=none; rua=mailto:…`

Testen lässt sich das z. B. mit [mail-tester.com](https://www.mail-tester.com).

---

## Lokal entwickeln

```bash
npm install
cp .env.example .env.local      # DATABASE_URL eintragen (Neon-Branch oder lokales Postgres)
echo "MAIL_OUTBOX_DIR=.mail-outbox" >> .env.local   # Mails als Dateien statt Versand
npm run db:migrate
npm run dev
```

- `npm test` testet den Auslosungs-Algorithmus statistisch (Selbstziehung, Ausschlüsse, Pärchen, Gleichverteilung)
- `npm run db:generate` erzeugt nach Änderungen an `lib/db/schema.ts` eine neue Migration in `drizzle/` (mit committen!)
- `npm run icons` erzeugt alle Icons neu aus `scripts/icon-art.mjs` (braucht Playwright)

---

## Sicherheit & Datenschutz in Kürze

- **Persönliche Links** (`/l/<token>`) sind 192-Bit-Zufallstoken. In der DB liegen sie als SHA-256 (für die Suche) und AES-256-GCM-verschlüsselt (damit spätere Mails denselben Link enthalten).
- **Zwei Faktoren:** Link *und* Gruppenpasswort. Eine weitergeleitete Mail allein reicht nicht. Die Passwortprüfung ist rate-limitiert. Das Passwort selbst ist mit scrypt gehasht und zusätzlich verschlüsselt, damit die Orga es nachschauen kann.
- **„Link verloren“ / neues Gerät:** E-Mail + Gruppenpasswort → 6-stelliger Code per Mail. Mit dem Passwort allein kann man sich also nicht als jemand anderes anmelden.
- Mail-Link-Scanner (Outlook Safe Links & Co.) sind harmlos: Ein GET auf den Link verändert nichts.
- `Referrer-Policy: no-referrer`, damit beim Klick auf Shop-Links keine Tokens an Amazon & Co. gehen
- Wunsch-Links werden auf `http(s)` normalisiert (kein `javascript:`)
- Die Paarungen tauchen nirgends in der Admin-Oberfläche auf
- Keine Tracker, nur ein technisch notwendiges Cookie pro Gruppe. Auto-Löschung nach dem Event.

## Projektstruktur

```
app/
  page.tsx                 Startseite (+ „Deine Gruppen“ auf diesem Gerät)
  neu/                     Gruppe anlegen
  l/[token]/route.ts       Persönlicher Link aus der Mail
  g/[slug]/page.tsx        Übersicht: Wichtelkind, eigene Wunschliste, Nachrichten
  g/[slug]/kind/           Wunschliste des Wichtelkinds, „Geschenk besorgt“, anonym fragen
  g/[slug]/admin/          Orga-Bereich
  g/[slug]/login/          Gruppenpasswort / Anmeldecode
  g/[slug]/actions.ts      Alle Server Actions
  api/cron/                Benachrichtigungen & Aufräumen
lib/
  db/schema.ts             Drizzle-Schema
  draw.ts                  Auslosung (Kreis bevorzugt, sonst Backtracking)
  service.ts               Auslosung, Mails, Bündelung, Auflösung
  emails.ts                Mail-Templates (HTML + Text)
  session.ts               Signierte Cookies pro Gruppe
drizzle/                   SQL-Migrationen
```
