CREATE TABLE "errors" (
	"id" serial PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"message" text NOT NULL,
	"user_message" text NOT NULL,
	"priority" text DEFAULT 'P3' NOT NULL,
	"user_id" text,
	"path" text,
	"user_agent" text,
	"metadata" jsonb,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"message" text NOT NULL,
	"email" text,
	"status" text DEFAULT 'new' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "gateway_instances" ALTER COLUMN "max_slots" SET DEFAULT 25;