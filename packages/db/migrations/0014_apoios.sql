CREATE TABLE "project_contributions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"project_id" uuid NOT NULL,
	"supporter_id" uuid,
	"amount" integer NOT NULL,
	"txid" text NOT NULL,
	"status" text DEFAULT 'PENDENTE' NOT NULL,
	"paid_claimed_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_contributions_txid_unique" UNIQUE("txid"),
	CONSTRAINT "project_contributions_valor_check" CHECK ("project_contributions"."amount" > 0)
);
--> statement-breakpoint
CREATE TABLE "project_pix" (
	"project_id" uuid PRIMARY KEY NOT NULL,
	"key_type" text NOT NULL,
	"key" text NOT NULL,
	"receiver_name" text NOT NULL,
	"city" text NOT NULL,
	"open" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_pix_nome_check" CHECK (char_length("project_pix"."receiver_name") BETWEEN 1 AND 25),
	CONSTRAINT "project_pix_cidade_check" CHECK (char_length("project_pix"."city") BETWEEN 1 AND 15)
);
--> statement-breakpoint
ALTER TABLE "project_contributions" ADD CONSTRAINT "project_contributions_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_contributions" ADD CONSTRAINT "project_contributions_supporter_id_users_id_fk" FOREIGN KEY ("supporter_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_pix" ADD CONSTRAINT "project_pix_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "project_contributions_project_idx" ON "project_contributions" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "project_contributions_supporter_idx" ON "project_contributions" USING btree ("supporter_id");