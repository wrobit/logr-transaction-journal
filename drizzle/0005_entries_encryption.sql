ALTER TABLE "users" ADD COLUMN "encryption_key_encrypted" jsonb;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "encryption_version" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "encrypted_payload" jsonb;
--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "encryption_version" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "entries" ALTER COLUMN "operation" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "entries" ALTER COLUMN "base_asset" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "entries" ALTER COLUMN "quote_currency" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "entries" ALTER COLUMN "quantity" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "entries" ALTER COLUMN "price_per_unit" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "entries" ALTER COLUMN "full_price" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "entries" ALTER COLUMN "nbp_rate_date" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "entries" ALTER COLUMN "nbp_rate" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "entries" ALTER COLUMN "value_pln" DROP NOT NULL;
