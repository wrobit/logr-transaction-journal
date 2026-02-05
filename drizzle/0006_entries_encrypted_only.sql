ALTER TABLE "entries" ALTER COLUMN "encrypted_payload" SET NOT NULL;
--> statement-breakpoint
DROP INDEX "entries_user_asset_idx";
--> statement-breakpoint
DROP INDEX "entries_user_operation_idx";
--> statement-breakpoint
ALTER TABLE "entries" DROP COLUMN "operation";
--> statement-breakpoint
ALTER TABLE "entries" DROP COLUMN "base_asset";
--> statement-breakpoint
ALTER TABLE "entries" DROP COLUMN "quote_currency";
--> statement-breakpoint
ALTER TABLE "entries" DROP COLUMN "quantity";
--> statement-breakpoint
ALTER TABLE "entries" DROP COLUMN "price_per_unit";
--> statement-breakpoint
ALTER TABLE "entries" DROP COLUMN "full_price";
--> statement-breakpoint
ALTER TABLE "entries" DROP COLUMN "commission";
--> statement-breakpoint
ALTER TABLE "entries" DROP COLUMN "source";
--> statement-breakpoint
ALTER TABLE "entries" DROP COLUMN "note";
--> statement-breakpoint
ALTER TABLE "entries" DROP COLUMN "nbp_rate_date";
--> statement-breakpoint
ALTER TABLE "entries" DROP COLUMN "nbp_rate";
--> statement-breakpoint
ALTER TABLE "entries" DROP COLUMN "value_pln";
