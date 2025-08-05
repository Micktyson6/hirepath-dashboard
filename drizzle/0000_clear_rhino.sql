CREATE TABLE "candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"skills" text NOT NULL,
	"resume_link" varchar(500),
	"experience" integer DEFAULT 0 NOT NULL,
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "candidates_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE INDEX "email_idx" ON "candidates" USING btree ("email");--> statement-breakpoint
CREATE INDEX "status_idx" ON "candidates" USING btree ("status");--> statement-breakpoint
CREATE INDEX "experience_idx" ON "candidates" USING btree ("experience");