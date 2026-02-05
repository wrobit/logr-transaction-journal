DO $$ BEGIN
 CREATE TYPE "public"."display_currency" AS ENUM('PLN', 'EUR', 'USD');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "display_currency" "display_currency" DEFAULT 'PLN' NOT NULL;
