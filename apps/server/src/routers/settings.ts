import { db } from "@/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { settings } from "../db/schema/app";
import { protectedProcedure } from "../lib/orpc";

export const settingsRouter = {
	getUserSettings: protectedProcedure.handler(async ({ context }) => {
		let userSettings = await db.query.settings.findFirst({
			where: eq(settings.userId, context.session.user.id),
			columns: {
				isDevMode: true,
				isPrivacyMode: true,
			},
		});

		if (!userSettings) {
			await db.insert(settings).values({
				userId: context.session.user.id,
			});

			userSettings = await db.query.settings.findFirst({
				where: eq(settings.userId, context.session.user.id),
			});
		}

		return {
			settings: userSettings,
		};
	}),
	updateSettings: protectedProcedure
		.input(
			z.object({
				isDevMode: z.boolean(),
				isPrivacyMode: z.boolean(),
			}),
		)
		.handler(async ({ context, input }) => {
			try {
				const updatedSettings = await db
					.update(settings)
					.set({
						...input,
						updatedAt: new Date(),
					})
					.where(eq(settings.userId, context.session.user.id))
					.returning();

				if (!updatedSettings || updatedSettings.length === 0) {
					throw new Error("Settings not found or update failed");
				}

				return {
					settings: updatedSettings[0],
				};
			} catch (error) {
				if (error instanceof Error) {
					throw new Error(`Failed to update settings: ${error.message}`);
				}
				throw new Error("An unexpected error occurred while updating settings");
			}
		}),
};
