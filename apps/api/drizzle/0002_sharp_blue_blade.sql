CREATE TABLE "hackathon_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"workspace_id" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"deadline" timestamp with time zone NOT NULL,
	"hackathon_url" varchar(500),
	"resources_url" varchar(500),
	"active" boolean DEFAULT true NOT NULL,
	"current_phase" integer DEFAULT 0 NOT NULL,
	"phases" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversations" ADD COLUMN "hackathon_id" integer;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "preview_url" text;--> statement-breakpoint
ALTER TABLE "hackathon_progress" ADD CONSTRAINT "hackathon_progress_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hackathon_progress_workspace_id_idx" ON "hackathon_progress" USING btree ("workspace_id");--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_hackathon_id_hackathon_progress_id_fk" FOREIGN KEY ("hackathon_id") REFERENCES "public"."hackathon_progress"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agent_logs_workspace_created_idx" ON "agent_logs" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE INDEX "conversations_workspace_id_idx" ON "conversations" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "conversations_agent_id_idx" ON "conversations" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "conversations_hackathon_id_idx" ON "conversations" USING btree ("hackathon_id");--> statement-breakpoint
CREATE INDEX "files_workspace_id_idx" ON "files" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "projects_workspace_id_idx" ON "projects" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "tasks_workspace_status_idx" ON "tasks" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "tasks_project_id_idx" ON "tasks" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "workspace_members_user_id_idx" ON "workspace_members" USING btree ("user_id");