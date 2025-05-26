ALTER TABLE `account` RENAME COLUMN "accountId" TO "account_id";--> statement-breakpoint
ALTER TABLE `account` RENAME COLUMN "providerId" TO "provider_id";--> statement-breakpoint
ALTER TABLE `account` RENAME COLUMN "userId" TO "user_id";--> statement-breakpoint
ALTER TABLE `account` RENAME COLUMN "accessToken" TO "access_token";--> statement-breakpoint
ALTER TABLE `account` RENAME COLUMN "refreshToken" TO "refresh_token";--> statement-breakpoint
ALTER TABLE `account` RENAME COLUMN "idToken" TO "id_token";--> statement-breakpoint
ALTER TABLE `account` RENAME COLUMN "accessTokenExpiresAt" TO "access_token_expires_at";--> statement-breakpoint
ALTER TABLE `account` RENAME COLUMN "refreshTokenExpiresAt" TO "refresh_token_expires_at";--> statement-breakpoint
ALTER TABLE `account` RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE `account` RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE `session` RENAME COLUMN "expiresAt" TO "expires_at";--> statement-breakpoint
ALTER TABLE `session` RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE `session` RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE `session` RENAME COLUMN "ipAddress" TO "ip_address";--> statement-breakpoint
ALTER TABLE `session` RENAME COLUMN "userAgent" TO "user_agent";--> statement-breakpoint
ALTER TABLE `session` RENAME COLUMN "userId" TO "user_id";--> statement-breakpoint
ALTER TABLE `user` RENAME COLUMN "emailVerified" TO "email_verified";--> statement-breakpoint
ALTER TABLE `user` RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE `user` RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
ALTER TABLE `verification` RENAME COLUMN "expiresAt" TO "expires_at";--> statement-breakpoint
ALTER TABLE `verification` RENAME COLUMN "createdAt" TO "created_at";--> statement-breakpoint
ALTER TABLE `verification` RENAME COLUMN "updatedAt" TO "updated_at";--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`privacy_mode` integer DEFAULT false,
	`developer_mode` integer DEFAULT false,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `account` ALTER COLUMN "user_id" TO "user_id" text NOT NULL REFERENCES user(id) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session` ALTER COLUMN "user_id" TO "user_id" text NOT NULL REFERENCES user(id) ON DELETE cascade ON UPDATE no action;