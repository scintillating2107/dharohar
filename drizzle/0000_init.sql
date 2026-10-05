CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"prefix" text NOT NULL,
	"key_hash" text NOT NULL,
	"scopes" jsonb NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_log" (
	"seq" serial PRIMARY KEY NOT NULL,
	"id" text NOT NULL,
	"ts" timestamp with time zone NOT NULL,
	"actor" text NOT NULL,
	"actor_name" text NOT NULL,
	"action" text NOT NULL,
	"document_id" text,
	"record_id" text,
	"field" text,
	"old_value" text,
	"new_value" text,
	"details" text,
	"prev_hash" text NOT NULL,
	"hash" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "citizen_claims" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"record_id" text NOT NULL,
	"relationship" text NOT NULL,
	"note" text,
	"status" text DEFAULT 'PENDING' NOT NULL,
	"reviewed_by" text,
	"review_comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"reviewed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "corrections" (
	"id" text PRIMARY KEY NOT NULL,
	"record_id" text NOT NULL,
	"field" text NOT NULL,
	"ai_value" text NOT NULL,
	"human_value" text NOT NULL,
	"accepted" boolean NOT NULL,
	"source" text,
	"district" text,
	"record_type" text,
	"language" text,
	"ocr_context" text,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_pages" (
	"document_id" text NOT NULL,
	"page" integer NOT NULL,
	"width" integer,
	"height" integer,
	"original_key" text NOT NULL,
	"enhanced_key" text,
	"quality_before" jsonb,
	"quality_after" jsonb,
	"enhanced_by" text,
	"language" text,
	CONSTRAINT "document_pages_document_id_page_pk" PRIMARY KEY("document_id","page")
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size" bigint NOT NULL,
	"sha256" text NOT NULL,
	"storage_key" text NOT NULL,
	"page_count" integer DEFAULT 1 NOT NULL,
	"uploaded_by" text NOT NULL,
	"uploaded_by_name" text NOT NULL,
	"uploaded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text NOT NULL,
	"steps" jsonb NOT NULL,
	"district" text,
	"state" text,
	"tehsil" text,
	"village" text,
	"record_year" text,
	"record_type" text,
	"source_office" text,
	"language" text,
	"detected_language" text,
	"description" text,
	"priority" text,
	"ocr_engine" text,
	"record_id" text,
	"error" text,
	"pipeline_state" jsonb
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"run_after" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"locked_by" text,
	"last_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"ip" text NOT NULL,
	"email" text,
	"success" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "master_locations" (
	"id" serial PRIMARY KEY NOT NULL,
	"state" text NOT NULL,
	"district" text NOT NULL,
	"tehsil" text,
	"village" text,
	"name_hi" text,
	"lgd_code" text,
	"lat" double precision,
	"lng" double precision,
	"level" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ocr_results" (
	"document_id" text PRIMARY KEY NOT NULL,
	"engine" text NOT NULL,
	"pages" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parcels" (
	"id" text PRIMARY KEY NOT NULL,
	"record_id" text NOT NULL,
	"geometry" jsonb,
	"geometry_source" text DEFAULT 'none' NOT NULL,
	"polygon_area_ha" double precision,
	"center_lat" double precision,
	"center_lng" double precision,
	"location_note" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "record_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"record_id" text NOT NULL,
	"version" integer NOT NULL,
	"reason" text NOT NULL,
	"snapshot" jsonb NOT NULL,
	"created_by" text NOT NULL,
	"created_by_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "records" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" text NOT NULL,
	"owner_name" text DEFAULT '' NOT NULL,
	"father_name" text,
	"owners" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"khasra_number" text DEFAULT '' NOT NULL,
	"khasra_normalized" text DEFAULT '' NOT NULL,
	"khata_number" text DEFAULT '' NOT NULL,
	"survey_number" text,
	"land_type" text,
	"area" double precision DEFAULT 0 NOT NULL,
	"area_unit" text DEFAULT 'hectare' NOT NULL,
	"area_hectares" double precision,
	"village" text DEFAULT '' NOT NULL,
	"tehsil" text DEFAULT '' NOT NULL,
	"district" text DEFAULT '' NOT NULL,
	"state" text DEFAULT '' NOT NULL,
	"registration_number" text,
	"mutation_number" text,
	"mutation_date" text,
	"record_year" integer,
	"fields" jsonb NOT NULL,
	"validation" jsonb,
	"average_confidence" double precision DEFAULT 0 NOT NULL,
	"certificate" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"verified_at" timestamp with time zone,
	"verified_by" text
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"district" text,
	"phone" text,
	"password_hash" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"failed_logins" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"notification_prefs" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"record_id" text NOT NULL,
	"document_id" text NOT NULL,
	"status" text NOT NULL,
	"priority" text NOT NULL,
	"confidence" double precision NOT NULL,
	"validation_status" text NOT NULL,
	"assigned_to" text,
	"last_edited_by" text,
	"comments" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhooks" (
	"id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"secret" text NOT NULL,
	"events" jsonb NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_delivery_at" timestamp with time zone,
	"last_status" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "audit_id_idx" ON "audit_log" USING btree ("id");--> statement-breakpoint
CREATE INDEX "audit_record_idx" ON "audit_log" USING btree ("record_id");--> statement-breakpoint
CREATE INDEX "audit_document_idx" ON "audit_log" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "claims_user_idx" ON "citizen_claims" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "claims_record_idx" ON "citizen_claims" USING btree ("record_id");--> statement-breakpoint
CREATE INDEX "corrections_field_idx" ON "corrections" USING btree ("field");--> statement-breakpoint
CREATE INDEX "corrections_record_idx" ON "corrections" USING btree ("record_id");--> statement-breakpoint
CREATE INDEX "documents_status_idx" ON "documents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "documents_sha_idx" ON "documents" USING btree ("sha256");--> statement-breakpoint
CREATE INDEX "jobs_status_idx" ON "jobs" USING btree ("status","run_after");--> statement-breakpoint
CREATE INDEX "login_attempts_ip_idx" ON "login_attempts" USING btree ("ip","created_at");--> statement-breakpoint
CREATE INDEX "master_district_idx" ON "master_locations" USING btree ("district");--> statement-breakpoint
CREATE INDEX "master_level_idx" ON "master_locations" USING btree ("level");--> statement-breakpoint
CREATE INDEX "notifications_user_idx" ON "notifications" USING btree ("user_id","read_at");--> statement-breakpoint
CREATE UNIQUE INDEX "parcels_record_idx" ON "parcels" USING btree ("record_id");--> statement-breakpoint
CREATE INDEX "record_versions_record_idx" ON "record_versions" USING btree ("record_id");--> statement-breakpoint
CREATE UNIQUE INDEX "records_document_idx" ON "records" USING btree ("document_id");--> statement-breakpoint
CREATE INDEX "records_khasra_idx" ON "records" USING btree ("khasra_normalized");--> statement-breakpoint
CREATE INDEX "records_district_idx" ON "records" USING btree ("district");--> statement-breakpoint
CREATE INDEX "records_status_idx" ON "records" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "tasks_record_idx" ON "verification_tasks" USING btree ("record_id");--> statement-breakpoint
CREATE INDEX "tasks_status_idx" ON "verification_tasks" USING btree ("status");