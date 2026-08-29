ALTER TABLE "driver_trips" ADD COLUMN IF NOT EXISTS "user_id" text;
--> statement-breakpoint
ALTER TABLE "driver_backups" ADD COLUMN IF NOT EXISTS "user_id" text;
--> statement-breakpoint
ALTER TABLE "scanned_documents" ADD COLUMN IF NOT EXISTS "user_id" text;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "driver_trips_user_id_idx" ON "driver_trips" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "driver_backups_user_id_saved_at_idx" ON "driver_backups" USING btree ("user_id","saved_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "scanned_documents_user_id_created_at_idx" ON "scanned_documents" USING btree ("user_id","created_at");
-- Custom SQL migration file, put your code below! --