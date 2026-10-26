CREATE TABLE "project_entries" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"project_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"description" text NOT NULL,
	"category" text,
	"amount" integer NOT NULL,
	"occurred_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_entries_valor_check" CHECK ("project_entries"."amount" > 0),
	CONSTRAINT "project_entries_descricao_check" CHECK (char_length("project_entries"."description") BETWEEN 1 AND 160)
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "cover_url" text;--> statement-breakpoint
ALTER TABLE "project_entries" ADD CONSTRAINT "project_entries_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_entries_project_idx" ON "project_entries" USING btree ("project_id","kind");--> statement-breakpoint
CREATE TRIGGER project_entries_tocar BEFORE UPDATE ON project_entries
  FOR EACH ROW EXECUTE FUNCTION compoze_tocar();
