CREATE TABLE "driver_expenses" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"date" text NOT NULL,
	"category" text NOT NULL,
	"vendor" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"type" text,
	"verified" boolean DEFAULT false NOT NULL,
	"frequency" text,
	"due_date" text,
	"end_date" text,
	"receipt_doc_id" integer,
	"purpose" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_hours" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"date" text NOT NULL,
	"hours" numeric(10, 4) NOT NULL,
	"clock_in" text NOT NULL,
	"clock_out" text NOT NULL,
	"break_ms" integer DEFAULT 0 NOT NULL,
	"miles" numeric(10, 4),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "driver_goals" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"daily_goal" jsonb DEFAULT '400'::jsonb NOT NULL,
	"work_days" jsonb DEFAULT '[1,2,3,4,5]'::jsonb NOT NULL,
	"day_targets" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"recurring_plan" jsonb DEFAULT '{"enabled":false,"workDays":[],"dayTargets":{},"untilDate":""}'::jsonb NOT NULL,
	"week_overrides" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "driver_expenses_user_id_idx" ON "driver_expenses" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "driver_hours_user_id_idx" ON "driver_hours" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "driver_goals_user_id_idx" ON "driver_goals" USING btree ("user_id");