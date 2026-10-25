CREATE TABLE "song_memo_audio" (
	"memo_id" uuid PRIMARY KEY NOT NULL,
	"bytes" "bytea" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "song_memos" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"song_id" uuid NOT NULL,
	"author_id" uuid,
	"title" text DEFAULT '' NOT NULL,
	"duration_ms" integer NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "song_memos_duracao_check" CHECK ("song_memos"."duration_ms" >= 0),
	CONSTRAINT "song_memos_tamanho_check" CHECK ("song_memos"."size_bytes" > 0)
);
--> statement-breakpoint
ALTER TABLE "song_memo_audio" ADD CONSTRAINT "song_memo_audio_memo_id_song_memos_id_fk" FOREIGN KEY ("memo_id") REFERENCES "public"."song_memos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_memos" ADD CONSTRAINT "song_memos_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_memos" ADD CONSTRAINT "song_memos_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "song_memos_song_idx" ON "song_memos" USING btree ("song_id","created_at");