CREATE TABLE IF NOT EXISTS "oauth_accounts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "provider" text NOT NULL,
  "provider_account_id" text NOT NULL,
  "provider_email" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_login_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "oauth_accounts"
    ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "oauth_accounts_provider_account_idx"
  ON "oauth_accounts" ("provider", "provider_account_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "oauth_accounts_user_idx" ON "oauth_accounts" ("user_id");
--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN IF EXISTS "password_hash";
--> statement-breakpoint
ALTER TABLE "exchange_import_rows" DROP COLUMN IF EXISTS "raw_row";
--> statement-breakpoint
ALTER TABLE "exchange_import_rows" DROP COLUMN IF EXISTS "transaction";
--> statement-breakpoint
ALTER TABLE "exchange_import_batches" DROP COLUMN IF EXISTS "filename";
--> statement-breakpoint
ALTER TABLE "tax_validation_logs" DROP COLUMN IF EXISTS "raw_snapshot";
--> statement-breakpoint
DO $$ BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'tax_validation_logs'
      AND column_name = 'masked_value'
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'tax_validation_logs'
        AND column_name = 'identifier_hash'
    ) THEN
      ALTER TABLE "tax_validation_logs" DROP COLUMN "masked_value";
    ELSE
      ALTER TABLE "tax_validation_logs" RENAME COLUMN "masked_value" TO "identifier_hash";
    END IF;
  END IF;
END $$;
--> statement-breakpoint
UPDATE "tax_validation_logs" SET "identifier_hash" = 'legacy-redacted';
--> statement-breakpoint
DELETE FROM "bank_import_audit_batches";
--> statement-breakpoint
ALTER TABLE "bank_import_audit_batches" ADD COLUMN IF NOT EXISTS "user_id" uuid;
--> statement-breakpoint
ALTER TABLE "bank_import_audit_batches"
  ALTER COLUMN "user_id" SET NOT NULL;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "bank_import_audit_batches"
    ADD CONSTRAINT "bank_import_audit_batches_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "bank_import_audit_user_created_idx"
  ON "bank_import_audit_batches" ("user_id", "created_at");
--> statement-breakpoint
ALTER TABLE "admin_audit_logs"
  DROP CONSTRAINT IF EXISTS "admin_audit_logs_actor_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ALTER COLUMN "actor_user_id" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "admin_audit_logs"
  ADD CONSTRAINT "admin_audit_logs_actor_user_id_users_id_fk"
  FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null;
--> statement-breakpoint
UPDATE "admin_audit_logs"
SET "metadata" = CASE
  WHEN "action" = 'entries.purged' AND "metadata" ? 'entriesPurged'
    THEN jsonb_build_object('entriesPurged', "metadata"->'entriesPurged')
  ELSE NULL
END;
