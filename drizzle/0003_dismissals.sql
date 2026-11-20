CREATE TABLE "dismissals" (
	"user_id" uuid NOT NULL,
	"item_key" text NOT NULL,
	"until" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dismissals_user_id_item_key_pk" PRIMARY KEY("user_id","item_key")
);
--> statement-breakpoint
ALTER TABLE "dismissals" ADD CONSTRAINT "dismissals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;