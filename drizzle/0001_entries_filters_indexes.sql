CREATE INDEX "entries_user_date_idx" ON "entries" USING btree ("user_id","date");
--> statement-breakpoint
CREATE INDEX "entries_user_asset_idx" ON "entries" USING btree ("user_id","base_asset");
--> statement-breakpoint
CREATE INDEX "entries_user_operation_idx" ON "entries" USING btree ("user_id","operation");
