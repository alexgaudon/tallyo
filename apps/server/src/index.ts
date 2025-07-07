import { RPCHandler } from "@orpc/server/fetch";
import "dotenv/config";
import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { z } from "zod";
import { healthCheck } from "./db";

import { auth } from "./lib/auth";
import { createContext } from "./lib/context";
import { logger } from "./lib/logger";
import { appRouter } from "./routers/index";

const app = new Hono();

app.use(honoLogger());

if (process.env.NODE_ENV === "development") {
	app.use(async (c, next) => {
		const delay = Math.floor(Math.random() * (200 - 50 + 1)) + 50;
		console.log(`Delaying request by ${delay}ms`);
		await new Promise((resolve) => setTimeout(resolve, delay));
		await next();
	});
}

// Log slow requests and errors
app.use(async (c, next) => {
	const start = Date.now();
	try {
		await next();
	} catch (error) {
		logger.error("Request failed", {
			error,
			metadata: {
				method: c.req.method,
				url: c.req.url,
				path: new URL(c.req.url).pathname,
			},
		});
		throw error;
	}

	const ms = Date.now() - start;
	// Only log requests that take longer than 100ms
	if (ms > 100) {
		logger.warn(
			`Slow request detected: ${c.req.method} ${c.req.url} - ${ms}ms`,
			{
				metadata: {
					method: c.req.method,
					url: new URL(c.req.url).pathname,
					ms,
				},
			},
		);
	}
	logger.debug(`${c.req.method} ${c.req.url} - ${ms}ms`);
});

// Log CORS errors
app.use("*", async (c, next) => {
	try {
		await next();
	} catch (error) {
		if (error instanceof Error && error.message.includes("CORS")) {
			logger.error("CORS error", {
				error,
				metadata: {
					origin: c.req.header("Origin"),
					url: c.req.url,
				},
			});
		}
		throw error;
	}
});

app.use(
	"/*",
	cors({
		origin: process.env.CORS_ORIGIN || "",
		allowMethods: ["GET", "POST", "OPTIONS"],
		allowHeaders: ["Content-Type", "Authorization"],
		credentials: true,
	}),
);

app.on(["POST", "GET"], "/api/auth/**", async (c) => {
	try {
		return await auth.handler(c.req.raw);
	} catch (error) {
		logger.error("Auth request failed", {
			error,
			metadata: {
				method: c.req.method,
				url: c.req.url,
			},
		});
		throw error;
	}
});

// API route for creating transactions with custom auth token
app.post("/api/transactions", async (c) => {
	try {
		const authHeader = c.req.header("Authorization");
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return c.json({ error: "Missing or invalid Authorization header" }, 401);
		}

		const token = authHeader.substring(7); // Remove "Bearer " prefix

		// Validate the custom auth token
		const { validateAuthToken } = await import("./lib/auth-token");
		const userId = await validateAuthToken(token);

		if (!userId) {
			return c.json({ error: "Invalid or expired token" }, 401);
		}

		// Parse and validate request body with Zod
		const body = await c.req.json();

		const transactionSchema = z.object({
			amount: z.number().int(),
			date: z.string().or(z.date()),
			transactionDetails: z.string(),
			merchantId: z.string().optional(),
			categoryId: z.string().optional(),
			notes: z.string().optional(),
			externalId: z.string(),
		});

		const requestSchema = z.object({
			transactions: z.array(transactionSchema).min(1).max(100),
		});

		const validationResult = requestSchema.safeParse(body);
		if (!validationResult.success) {
			return c.json(
				{
					error: "Invalid request format",
					details: validationResult.error.errors,
				},
				400,
			);
		}

		const { transactions } = validationResult.data;

		// Import the transaction creation logic
		const { getMerchantFromVendor } = await import("./routers/merchants");
		const { transaction } = await import("./db/schema");
		const { db } = await import("./db");

		const createdTransactions = [];
		const errors = [];

		// Process each transaction
		for (const transactionData of transactions) {
			try {
				// Validate date
				const date = new Date(transactionData.date);
				if (Number.isNaN(date.getTime())) {
					errors.push({
						transaction: transactionData,
						error: "Invalid date format",
					});
					continue;
				}

				// Get merchant from vendor name
				const merchantRecord = await getMerchantFromVendor(
					transactionData.transactionDetails,
					userId,
				);

				// Create the transaction
				const newTransaction = await db
					.insert(transaction)
					.values({
						userId: userId,
						amount: transactionData.amount,
						date: date,
						transactionDetails: transactionData.transactionDetails,
						merchantId: transactionData.merchantId || merchantRecord?.id,
						categoryId:
							transactionData.categoryId ||
							merchantRecord?.recommendedCategoryId,
						notes: transactionData.notes,
						externalId: transactionData.externalId,
					})
					.returning();

				if (!newTransaction || newTransaction.length === 0) {
					errors.push({
						transaction: transactionData,
						error: "Failed to create transaction",
					});
					continue;
				}

				// Fetch the created transaction with relations
				const { eq } = await import("drizzle-orm");
				const createdTransaction = await db.query.transaction.findFirst({
					where: eq(transaction.id, newTransaction[0].id),
					with: {
						merchant: true,
						category: {
							with: {
								parentCategory: true,
							},
						},
					},
				});

				createdTransactions.push(createdTransaction);

				logger.info(`Transaction created successfully for user ${userId}`, {
					transactionId: newTransaction[0].id,
					amount: transactionData.amount,
				});
			} catch (error) {
				errors.push({
					transaction: transactionData,
					error: error instanceof Error ? error.message : "Unknown error",
				});

				console.error(error);
			}
		}

		// Return results
		const response = {
			success: createdTransactions.length > 0,
			created: createdTransactions,
			errors: errors.length > 0 ? errors : undefined,
		};

		const statusCode = createdTransactions.length > 0 ? 201 : 400;

		return c.json(response, statusCode);
	} catch (error) {
		logger.error("API transaction creation failed", {
			error,
			metadata: {
				method: c.req.method,
				url: c.req.url,
			},
		});

		if (error instanceof Error) {
			return c.json({ error: error.message }, 500);
		}
		return c.json({ error: "Internal server error" }, 500);
	}
});

const handler = new RPCHandler(appRouter);
app.use("/rpc/*", async (c, next) => {
	const context = await createContext({ context: c });

	try {
		const { matched, response } = await handler.handle(c.req.raw, {
			prefix: "/rpc",
			context: context,
		});
		if (matched) {
			return c.newResponse(response.body, response);
		}
		await next();
	} catch (error) {
		logger.error("RPC request failed", {
			error,
			metadata: {
				method: c.req.method,
				url: c.req.url,
				userId: context.session?.user?.id,
			},
		});
		throw error;
	}
});

app.get("/", async (c) => {
	try {
		const url = new URL(c.req.url);
		if (
			process.env.NODE_ENV === "development" &&
			url.hostname === "localhost"
		) {
			return c.redirect("http://localhost:3001");
		}
		await healthCheck();
		if (process.env.NODE_ENV === "production") {
			return c.html(await Bun.file("./public/index.html").text());
		}
		return c.text("OK");
	} catch (error) {
		logger.error("Health check failed", {
			error,
			metadata: {
				url: c.req.url,
			},
		});
		return c.text("DB Not OK", 500);
	}
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
	app.use("/*", serveStatic({ root: "./public" }));

	// Handle client-side routing for SPA
	app.get("*", async (c) => {
		const url = new URL(c.req.url);
		// Don't serve index.html for API routes
		if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/rpc/")) {
			return c.notFound();
		}
		return c.html(await Bun.file("./public/index.html").text());
	});
}

// Log application startup errors
process.on("uncaughtException", (error) => {
	logger.error("Uncaught exception", { error });
	process.exit(1);
});

process.on("unhandledRejection", (reason) => {
	logger.error("Unhandled rejection", { error: reason });
});

export default app;
