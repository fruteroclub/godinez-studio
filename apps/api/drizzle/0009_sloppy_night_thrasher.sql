CREATE TABLE "agentcamp_registrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" varchar(255),
	"name" varchar(255),
	"stripe_session_id" text NOT NULL,
	"stripe_customer_id" text,
	"stripe_payment_intent_id" text,
	"cohort" varchar(64) NOT NULL,
	"tier" varchar(32) NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(3) NOT NULL,
	"status" varchar(32) DEFAULT 'pending' NOT NULL,
	"checkout_source" varchar(255) NOT NULL,
	"locale" varchar(2) NOT NULL,
	"studio_user_id" integer,
	"studio_account_id" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "agentcamp_registrations" ADD CONSTRAINT "agentcamp_registrations_studio_user_id_users_id_fk" FOREIGN KEY ("studio_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agentcamp_registrations" ADD CONSTRAINT "agentcamp_registrations_studio_account_id_accounts_id_fk" FOREIGN KEY ("studio_account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "agentcamp_registrations_stripe_session_id_idx" ON "agentcamp_registrations" USING btree ("stripe_session_id");--> statement-breakpoint
CREATE INDEX "agentcamp_registrations_email_idx" ON "agentcamp_registrations" USING btree ("email");--> statement-breakpoint
CREATE INDEX "agentcamp_registrations_cohort_idx" ON "agentcamp_registrations" USING btree ("cohort");--> statement-breakpoint
CREATE INDEX "agentcamp_registrations_status_idx" ON "agentcamp_registrations" USING btree ("status");
