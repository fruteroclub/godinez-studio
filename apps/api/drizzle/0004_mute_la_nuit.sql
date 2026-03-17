ALTER TABLE "files" ADD COLUMN "conversation_id" integer;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "files_conversation_id_idx" ON "files" USING btree ("conversation_id");