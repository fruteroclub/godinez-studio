ALTER TABLE "conversations" ADD COLUMN "is_starred" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "is_global" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "project_type" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "project_subtype" varchar(30);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "deadline" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "messages_workspace_id_idx" ON "messages" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "run_contexts_created_at_idx" ON "run_contexts" USING btree ("created_at");