CREATE TABLE "song_invites" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"song_id" uuid NOT NULL,
	"role" "collaborator_role" NOT NULL,
	"invited_user_id" uuid,
	"token_hash" text,
	"email" "citext",
	"invited_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"accepted_by" uuid,
	"accepted_at" timestamp with time zone,
	"declined_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "song_invites_tipo_check" CHECK (("song_invites"."invited_user_id" IS NULL) <> ("song_invites"."token_hash" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "song_invites" ADD CONSTRAINT "song_invites_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_invites" ADD CONSTRAINT "song_invites_invited_user_id_users_id_fk" FOREIGN KEY ("invited_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_invites" ADD CONSTRAINT "song_invites_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_invites" ADD CONSTRAINT "song_invites_accepted_by_users_id_fk" FOREIGN KEY ("accepted_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "song_invites_token_idx" ON "song_invites" USING btree ("token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "song_invites_pendente_idx" ON "song_invites" USING btree ("song_id","invited_user_id") WHERE "song_invites"."accepted_at" IS NULL AND "song_invites"."declined_at" IS NULL AND "song_invites"."revoked_at" IS NULL;--> statement-breakpoint
CREATE INDEX "song_invites_convidada_idx" ON "song_invites" USING btree ("invited_user_id");--> statement-breakpoint
CREATE INDEX "song_invites_song_idx" ON "song_invites" USING btree ("song_id");