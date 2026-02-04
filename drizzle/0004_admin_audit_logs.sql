CREATE TABLE "admin_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"target_user_id" uuid,
	"action" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_target_user_id_users_id_fk" FOREIGN KEY ("target_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "admin_audit_actor_idx" ON "admin_audit_logs" ("actor_user_id");
--> statement-breakpoint
CREATE INDEX "admin_audit_target_idx" ON "admin_audit_logs" ("target_user_id");
--> statement-breakpoint
CREATE INDEX "admin_audit_created_at_idx" ON "admin_audit_logs" ("created_at");
--> statement-breakpoint
CREATE INDEX "admin_audit_action_idx" ON "admin_audit_logs" ("action");
