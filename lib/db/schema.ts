import {
  pgTable,
  pgEnum,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  date,
  uniqueIndex,
  index,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';

const ts = (name: string) => timestamp(name, { withTimezone: true });

export const groupStatus = pgEnum('group_status', ['setup', 'drawn', 'revealed']);

export const groups = pgTable('groups', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  message: text('message'),
  budget: text('budget'),
  eventDate: date('event_date'),
  eventLocation: text('event_location'),
  passwordHash: text('password_hash').notNull(),
  /** Gruppenpasswort verschlüsselt, damit der Admin es jederzeit nachschauen/teilen kann */
  passwordEnc: text('password_enc'),
  passwordHint: text('password_hint'),
  avoidMutual: boolean('avoid_mutual').notNull().default(true),
  status: groupStatus('status').notNull().default('setup'),
  drawCount: integer('draw_count').notNull().default(0),
  drawnAt: ts('drawn_at'),
  revealedAt: ts('revealed_at'),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const participants = pgTable(
  'participants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    email: text('email').notNull(),
    isAdmin: boolean('is_admin').notNull().default(false),
    plays: boolean('plays').notNull().default(true),
    /** sha256 des persönlichen Link-Tokens (für die Suche) */
    tokenHash: text('token_hash').notNull().unique(),
    /** AES-GCM-verschlüsselter Token, damit spätere Mails denselben Link enthalten */
    tokenEnc: text('token_enc').notNull(),
    sessionVersion: integer('session_version').notNull().default(1),
    /** Wen diese Person beschenkt (geheim!) */
    assignedToId: uuid('assigned_to_id').references((): AnyPgColumn => participants.id, {
      onDelete: 'set null',
    }),
    /** Wichtel hat sein Geschenk besorgt → Liste des Beschenkten wird gesperrt (ohne zu verraten, was) */
    giftDoneAt: ts('gift_done_at'),
    drawMailSentAt: ts('draw_mail_sent_at'),
    drawMailError: text('draw_mail_error'),
    firstSeenAt: ts('first_seen_at'),
    lastSeenAt: ts('last_seen_at'),
    wishesChangedAt: ts('wishes_changed_at'),
    remindedAt: ts('reminded_at'),
    loginCodeHash: text('login_code_hash'),
    loginCodeExpiresAt: ts('login_code_expires_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('participants_group_email_idx').on(t.groupId, t.email),
    index('participants_group_idx').on(t.groupId),
    index('participants_assigned_idx').on(t.assignedToId),
  ],
);

export const exclusions = pgTable(
  'exclusions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    aId: uuid('a_id')
      .notNull()
      .references(() => participants.id, { onDelete: 'cascade' }),
    bId: uuid('b_id')
      .notNull()
      .references(() => participants.id, { onDelete: 'cascade' }),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('exclusions_pair_idx').on(t.groupId, t.aId, t.bId)],
);

export const wishes = pgTable(
  'wishes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    participantId: uuid('participant_id')
      .notNull()
      .references(() => participants.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    url: text('url'),
    note: text('note'),
    favorite: boolean('favorite').notNull().default(false),
    /** null = neu/geändert und noch nicht an den Wichtel gemeldet */
    notifiedAt: ts('notified_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [index('wishes_participant_idx').on(t.participantId)],
);

export const messages = pgTable(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => groups.id, { onDelete: 'cascade' }),
    santaId: uuid('santa_id')
      .notNull()
      .references(() => participants.id, { onDelete: 'cascade' }),
    recipientId: uuid('recipient_id')
      .notNull()
      .references(() => participants.id, { onDelete: 'cascade' }),
    fromSanta: boolean('from_santa').notNull(),
    body: text('body').notNull(),
    readAt: ts('read_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('messages_thread_idx').on(t.santaId, t.recipientId)],
);

export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  resetAt: ts('reset_at').notNull(),
});

export type Group = typeof groups.$inferSelect;
export type Participant = typeof participants.$inferSelect;
export type Wish = typeof wishes.$inferSelect;
export type Message = typeof messages.$inferSelect;
