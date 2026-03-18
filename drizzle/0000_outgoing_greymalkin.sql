CREATE TABLE IF NOT EXISTS "alerts" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_domain" varchar(255) NOT NULL,
	"product_id" varchar(255) NOT NULL,
	"location_id" varchar(255),
	"quantity" integer NOT NULL,
	"threshold" integer NOT NULL,
	"status" varchar(20) DEFAULT 'active',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "batching_queue" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_domain" varchar(255) NOT NULL,
	"alert_id" varchar(255) NOT NULL,
	"product_id" varchar(255) NOT NULL,
	"location_id" varchar(255),
	"quantity" integer NOT NULL,
	"threshold" integer NOT NULL,
	"alert_type" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'pending',
	"scheduled_for" timestamp NOT NULL,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "billing_plan" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_domain" varchar(255) NOT NULL,
	"plan" varchar(20) DEFAULT 'free' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "billing_plan_shop_domain_unique" UNIQUE("shop_domain")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "inventory" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_domain" varchar(255) NOT NULL,
	"product_id" varchar(255) NOT NULL,
	"location_id" varchar(255) NOT NULL,
	"sku" text,
	"quantity" integer DEFAULT 0 NOT NULL,
	"threshold" integer DEFAULT 5,
	"last_updated" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"shop_domain" varchar(255) NOT NULL,
	"shopify_product_id" varchar(255) NOT NULL,
	"title" text NOT NULL,
	"handle" text,
	"image_url" text,
	"threshold_type" varchar(20) DEFAULT 'quantity',
	"threshold_value" integer DEFAULT 5,
	"safety_stock" integer DEFAULT 10,
	"location_id" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shop_settings" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_domain" varchar(255) NOT NULL,
	"notification_method" varchar(20) DEFAULT 'email',
	"notification_email" varchar(255),
	"whatsapp_number" varchar(20),
	"threshold_type" varchar(20) DEFAULT 'quantity',
	"threshold_value" integer DEFAULT 5,
	"safety_stock" integer DEFAULT 10,
	"batching_enabled" boolean DEFAULT false,
	"batching_interval" varchar(20) DEFAULT 'daily',
	"email_alerts_enabled" boolean DEFAULT true,
	"is_onboarded" boolean DEFAULT false,
	"dismissed_upsell_banner" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "shop_settings_shop_domain_unique" UNIQUE("shop_domain")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "shopify_sessions" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"shop" varchar(255) NOT NULL,
	"state" varchar(255),
	"is_online" boolean DEFAULT false,
	"scope" text,
	"expires" timestamp,
	"access_token" text,
	"online_access_info" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "usage_tracker" (
	"id" varchar(255) PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shop_domain" varchar(255) NOT NULL,
	"plan" varchar(20) NOT NULL,
	"email_count" integer DEFAULT 0 NOT NULL,
	"whatsapp_count" integer DEFAULT 0 NOT NULL,
	"month" varchar(7) NOT NULL,
	"usage_remaining" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
