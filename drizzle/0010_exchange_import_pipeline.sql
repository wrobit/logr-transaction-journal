ALTER TABLE "entries"
ADD COLUMN "import_batch_id" uuid;

CREATE TABLE "exchange_import_batches" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "provider" text NOT NULL,
  "filename" text,
  "status" text DEFAULT 'completed' NOT NULL,
  "total_rows" integer DEFAULT 0 NOT NULL,
  "valid_rows" integer DEFAULT 0 NOT NULL,
  "imported_rows" integer DEFAULT 0 NOT NULL,
  "failed_rows" integer DEFAULT 0 NOT NULL,
  "metadata" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE "exchange_import_rows" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "batch_id" uuid NOT NULL,
  "row_number" integer NOT NULL,
  "row_hash" text NOT NULL,
  "status" text NOT NULL,
  "issues" jsonb,
  "raw_row" jsonb,
  "transaction" jsonb,
  "entry_id" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "exchange_import_batches"
ADD CONSTRAINT "exchange_import_batches_user_id_users_id_fk"
FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "exchange_import_rows"
ADD CONSTRAINT "exchange_import_rows_batch_id_exchange_import_batches_id_fk"
FOREIGN KEY ("batch_id") REFERENCES "public"."exchange_import_batches"("id") ON DELETE cascade ON UPDATE no action;

ALTER TABLE "exchange_import_rows"
ADD CONSTRAINT "exchange_import_rows_entry_id_entries_id_fk"
FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE set null ON UPDATE no action;

CREATE INDEX "exchange_import_batches_user_created_idx"
ON "exchange_import_batches" USING btree ("user_id", "created_at");

CREATE UNIQUE INDEX "exchange_import_rows_batch_row_hash_idx"
ON "exchange_import_rows" USING btree ("batch_id", "row_hash");

CREATE INDEX "exchange_import_rows_batch_status_idx"
ON "exchange_import_rows" USING btree ("batch_id", "status");
