DO $$ BEGIN
 CREATE TYPE "public"."integration_provider_type" AS ENUM('rate', 'tax_validation', 'bank_import');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "fx_provider_rates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "base_currency" text NOT NULL,
  "quote_currency" text NOT NULL,
  "effective_date" date NOT NULL,
  "rate_value" numeric(18, 8) NOT NULL,
  "source_provider" text NOT NULL,
  "published_at" timestamp with time zone,
  "retrieved_at" timestamp with time zone DEFAULT now() NOT NULL,
  "rate_type" text NOT NULL,
  "method" text NOT NULL,
  "response_hash" text,
  "raw_snapshot" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "country_integration_policies" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "country_code" text NOT NULL,
  "provider_type" "integration_provider_type" NOT NULL,
  "provider_name" text NOT NULL,
  "priority" integer DEFAULT 100 NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "tax_validation_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "country_code" text NOT NULL,
  "id_type" text NOT NULL,
  "masked_value" text NOT NULL,
  "result" text NOT NULL,
  "provider_name" text NOT NULL,
  "checked_at" timestamp with time zone NOT NULL,
  "response_hash" text,
  "raw_snapshot" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE TABLE IF NOT EXISTS "bank_import_audit_batches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider_name" text NOT NULL,
  "account_ref" text NOT NULL,
  "batch_id" text NOT NULL,
  "imported_count" integer DEFAULT 0 NOT NULL,
  "failed_count" integer DEFAULT 0 NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS "fx_provider_rates_lookup_idx" ON "fx_provider_rates" ("base_currency", "quote_currency", "effective_date", "rate_type");
CREATE UNIQUE INDEX IF NOT EXISTS "fx_provider_rates_unique_snapshot_idx" ON "fx_provider_rates" ("base_currency", "quote_currency", "effective_date", "source_provider", "rate_type", "method", "response_hash");
CREATE UNIQUE INDEX IF NOT EXISTS "country_integration_policy_idx" ON "country_integration_policies" ("country_code", "provider_type", "provider_name");
CREATE INDEX IF NOT EXISTS "tax_validation_logs_lookup_idx" ON "tax_validation_logs" ("country_code", "id_type", "provider_name", "checked_at");
CREATE UNIQUE INDEX IF NOT EXISTS "bank_import_audit_batch_idx" ON "bank_import_audit_batches" ("provider_name", "account_ref", "batch_id");
