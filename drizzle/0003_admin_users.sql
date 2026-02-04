CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_role" DEFAULT 'user' NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "last_login_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" ("role");
--> statement-breakpoint
CREATE INDEX "users_last_login_at_idx" ON "users" ("last_login_at");
