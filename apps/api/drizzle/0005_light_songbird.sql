CREATE TABLE "run_contexts" (
	"run_id" text PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"workspace_id" integer NOT NULL,
	"instance_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "run_contexts" ADD CONSTRAINT "run_contexts_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_contexts" ADD CONSTRAINT "run_contexts_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "run_contexts" ADD CONSTRAINT "run_contexts_instance_id_gateway_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "public"."gateway_instances"("id") ON DELETE set null ON UPDATE no action;