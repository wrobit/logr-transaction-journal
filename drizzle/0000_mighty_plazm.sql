CREATE TYPE "public"."entry_operation" AS ENUM('BUY', 'SELL');--> statement-breakpoint
CREATE TABLE "entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"date" date NOT NULL,
	"operation" "entry_operation" NOT NULL,
	"base_asset" text NOT NULL,
	"quote_currency" text NOT NULL,
	"quantity" numeric(30, 12) NOT NULL,
	"price_per_unit" numeric(30, 12) NOT NULL,
	"full_price" numeric(30, 12) NOT NULL,
	"commission" numeric(30, 12),
	"source" text,
	"note" text,
	"nbp_rate_date" date NOT NULL,
	"nbp_rate" numeric(18, 6) NOT NULL,
	"value_pln" numeric(30, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fx_rates_cache" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"currency" text NOT NULL,
	"rate_date" date NOT NULL,
	"rate" numeric(18, 6) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"login" text NOT NULL,
	"password_hash" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_login_unique" UNIQUE("login")
);
--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "fx_rates_cache_currency_rate_date_idx" ON "fx_rates_cache" USING btree ("currency","rate_date");