CREATE TYPE "public"."group_status" AS ENUM('setup', 'drawn', 'revealed');--> statement-breakpoint
CREATE TABLE "exclusions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"a_id" uuid NOT NULL,
	"b_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"message" text,
	"budget" text,
	"event_date" date,
	"event_location" text,
	"password_hash" text NOT NULL,
	"password_enc" text,
	"password_hint" text,
	"avoid_mutual" boolean DEFAULT true NOT NULL,
	"status" "group_status" DEFAULT 'setup' NOT NULL,
	"draw_count" integer DEFAULT 0 NOT NULL,
	"drawn_at" timestamp with time zone,
	"revealed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "groups_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"santa_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"from_santa" boolean NOT NULL,
	"body" text NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "participants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"is_admin" boolean DEFAULT false NOT NULL,
	"plays" boolean DEFAULT true NOT NULL,
	"token_hash" text NOT NULL,
	"token_enc" text NOT NULL,
	"session_version" integer DEFAULT 1 NOT NULL,
	"assigned_to_id" uuid,
	"gift_done_at" timestamp with time zone,
	"draw_mail_sent_at" timestamp with time zone,
	"draw_mail_error" text,
	"first_seen_at" timestamp with time zone,
	"last_seen_at" timestamp with time zone,
	"wishes_changed_at" timestamp with time zone,
	"reminded_at" timestamp with time zone,
	"login_code_hash" text,
	"login_code_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "participants_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wishes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"participant_id" uuid NOT NULL,
	"title" text NOT NULL,
	"url" text,
	"note" text,
	"favorite" boolean DEFAULT false NOT NULL,
	"notified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "exclusions" ADD CONSTRAINT "exclusions_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exclusions" ADD CONSTRAINT "exclusions_a_id_participants_id_fk" FOREIGN KEY ("a_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exclusions" ADD CONSTRAINT "exclusions_b_id_participants_id_fk" FOREIGN KEY ("b_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_santa_id_participants_id_fk" FOREIGN KEY ("santa_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_id_participants_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_group_id_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "participants" ADD CONSTRAINT "participants_assigned_to_id_participants_id_fk" FOREIGN KEY ("assigned_to_id") REFERENCES "public"."participants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wishes" ADD CONSTRAINT "wishes_participant_id_participants_id_fk" FOREIGN KEY ("participant_id") REFERENCES "public"."participants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "exclusions_pair_idx" ON "exclusions" USING btree ("group_id","a_id","b_id");--> statement-breakpoint
CREATE INDEX "messages_thread_idx" ON "messages" USING btree ("santa_id","recipient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "participants_group_email_idx" ON "participants" USING btree ("group_id","email");--> statement-breakpoint
CREATE INDEX "participants_group_idx" ON "participants" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "participants_assigned_idx" ON "participants" USING btree ("assigned_to_id");--> statement-breakpoint
CREATE INDEX "wishes_participant_idx" ON "wishes" USING btree ("participant_id");