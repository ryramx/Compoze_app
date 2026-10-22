CREATE TYPE "public"."block_type" AS ENUM('SECTION', 'LYRIC', 'CHORD', 'NOTE');--> statement-breakpoint
CREATE TYPE "public"."collaborator_role" AS ENUM('OWNER', 'COMPOSER', 'LYRICIST', 'MUSICIAN', 'PRODUCER', 'VIEWER');--> statement-breakpoint
CREATE TYPE "public"."project_status" AS ENUM('PLANEJAMENTO', 'PRODUCAO', 'MIXAGEM', 'LANCADO');--> statement-breakpoint
CREATE TYPE "public"."project_style" AS ENUM('ACUSTICO', 'BANDA', 'AO_VIVO');--> statement-breakpoint
CREATE TYPE "public"."project_type" AS ENUM('SINGLE', 'EP', 'ALBUM', 'OTHER');--> statement-breakpoint
CREATE TYPE "public"."song_status" AS ENUM('IDEIA', 'ESCRITA', 'REVISAO', 'FINALIZADA', 'REGISTRADA', 'GRAVADA', 'ARQUIVADA', 'CANCELADA');--> statement-breakpoint
CREATE TYPE "public"."version_reason" AS ENUM('MANUAL', 'ESTAGIO', 'REGISTRO');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('PUBLIC', 'PRIVATE', 'UNLISTED');--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"name" text NOT NULL,
	"username" "citext" NOT NULL,
	"email" "citext" NOT NULL,
	"bio" text,
	"avatar_url" text,
	"city" text,
	"state" text,
	"country" text,
	"location" geography(Point, 4326),
	"show_on_map" boolean DEFAULT false NOT NULL,
	"instruments" text[] DEFAULT '{}' NOT NULL,
	"specialties" text[] DEFAULT '{}' NOT NULL,
	"genres" text[] DEFAULT '{}' NOT NULL,
	"external_links" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "folders" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"owner_id" uuid NOT NULL,
	"parent_id" uuid,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "song_blocks" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"song_id" uuid NOT NULL,
	"type" "block_type" NOT NULL,
	"label" text,
	"content" text DEFAULT '' NOT NULL,
	"position" integer NOT NULL,
	"author_id" uuid,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "song_blocks_position_check" CHECK ("song_blocks"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "song_collaborators" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"song_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "collaborator_role" NOT NULL,
	"contribution_percent" numeric(5, 2),
	"invited_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "song_collaborators_song_user_key" UNIQUE("song_id","user_id"),
	CONSTRAINT "song_collaborators_percent_check" CHECK ("song_collaborators"."contribution_percent" BETWEEN 0 AND 100)
);
--> statement-breakpoint
CREATE TABLE "song_documents" (
	"song_id" uuid PRIMARY KEY NOT NULL,
	"ydoc" "bytea" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "song_versions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"song_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"snapshot" jsonb NOT NULL,
	"sha256" text NOT NULL,
	"reason" "version_reason" NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "song_versions_song_number_key" UNIQUE("song_id","number")
);
--> statement-breakpoint
CREATE TABLE "songs" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"owner_id" uuid NOT NULL,
	"folder_id" uuid,
	"title" text NOT NULL,
	"description" text,
	"status" "song_status" DEFAULT 'IDEIA' NOT NULL,
	"visibility" "visibility" DEFAULT 'PRIVATE' NOT NULL,
	"musical_key" text,
	"bpm" smallint,
	"time_signature" text,
	"tags" text[] DEFAULT '{}' NOT NULL,
	"contributions_confirmed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "songs_bpm_check" CHECK ("songs"."bpm" BETWEEN 20 AND 300)
);
--> statement-breakpoint
CREATE TABLE "project_songs" (
	"project_id" uuid NOT NULL,
	"song_id" uuid NOT NULL,
	"track_number" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "project_songs_project_id_song_id_pk" PRIMARY KEY("project_id","song_id")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"type" "project_type" DEFAULT 'SINGLE' NOT NULL,
	"status" "project_status" DEFAULT 'PLANEJAMENTO' NOT NULL,
	"style" "project_style",
	"release_date" date,
	"cover_url" text,
	"estimated_cost" integer,
	"funding_target" integer,
	"funding_current" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "projects_money_check" CHECK (coalesce("projects"."estimated_cost", 0) >= 0 AND coalesce("projects"."funding_target", 0) >= 0 AND "projects"."funding_current" >= 0)
);
--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "folders" ADD CONSTRAINT "folders_parent_id_folders_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_blocks" ADD CONSTRAINT "song_blocks_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_blocks" ADD CONSTRAINT "song_blocks_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_collaborators" ADD CONSTRAINT "song_collaborators_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_collaborators" ADD CONSTRAINT "song_collaborators_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_collaborators" ADD CONSTRAINT "song_collaborators_invited_by_users_id_fk" FOREIGN KEY ("invited_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_documents" ADD CONSTRAINT "song_documents_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_versions" ADD CONSTRAINT "song_versions_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "song_versions" ADD CONSTRAINT "song_versions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "songs" ADD CONSTRAINT "songs_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "songs" ADD CONSTRAINT "songs_folder_id_folders_id_fk" FOREIGN KEY ("folder_id") REFERENCES "public"."folders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_songs" ADD CONSTRAINT "project_songs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_songs" ADD CONSTRAINT "project_songs_song_id_songs_id_fk" FOREIGN KEY ("song_id") REFERENCES "public"."songs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_location_idx" ON "users" USING gist ("location") WHERE "users"."show_on_map";--> statement-breakpoint
CREATE INDEX "folders_owner_idx" ON "folders" USING btree ("owner_id","deleted_at");--> statement-breakpoint
CREATE UNIQUE INDEX "song_collaborators_one_owner_idx" ON "song_collaborators" USING btree ("song_id") WHERE "song_collaborators"."role" = 'OWNER';--> statement-breakpoint
CREATE INDEX "song_collaborators_user_idx" ON "song_collaborators" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "songs_owner_idx" ON "songs" USING btree ("owner_id","deleted_at");--> statement-breakpoint
CREATE INDEX "songs_tags_idx" ON "songs" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "songs_title_trgm_idx" ON "songs" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "project_songs_song_idx" ON "project_songs" USING btree ("song_id");--> statement-breakpoint
CREATE INDEX "projects_owner_idx" ON "projects" USING btree ("owner_id","deleted_at");