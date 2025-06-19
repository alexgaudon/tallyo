import { RPCHandler } from "@orpc/server/fetch";
import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { healthCheck } from "./db";
import { auth } from "./lib/auth";
import { createContext } from "./lib/context";
import { logger } from "./lib/logger";
import { appRouter } from "./routers/index";

const app = new Hono();

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

// API route for creating transactions with Bearer token
app.post("/api/transactions", async (c) => {
	try {
		const authHeader = c.req.header("Authorization");
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return c.json({ error: "Missing or invalid Authorization header" }, 401);
		}

		const token = authHeader.substring(7); // Remove "Bearer " prefix

		// Validate the session using the token
		const session = await auth.api.getSession({
			headers: new Headers({
				Authorization: `Bearer ${token}`,
			}),
		});

		if (!session?.user?.id) {
			return c.json({ error: "Invalid or expired token" }, 401);
		}

		// Parse request body
		const body = await c.req.json();

		// Validate required fields
		if (!body.amount || !body.date || !body.transactionDetails) {
			return c.json(
				{
					error:
						"Missing required fields: amount, date, and transactionDetails are required",
				},
				400,
			);
		}

		// Validate amount is a number
		const amount = Number(body.amount);
		if (Number.isNaN(amount) || amount <= 0) {
			return c.json({ error: "Amount must be a positive number" }, 400);
		}

		// Validate date
		const date = new Date(body.date);
		if (Number.isNaN(date.getTime())) {
			return c.json({ error: "Invalid date format" }, 400);
		}

		// Import the transaction creation logic
		const { getMerchantFromVendor } = await import("./routers/merchants");
		const { transaction } = await import("./db/schema");
		const { db } = await import("./db");

		// Get merchant from vendor name
		const merchantRecord = await getMerchantFromVendor(
			body.transactionDetails,
			session.user.id,
		);

		// Create the transaction
		const newTransaction = await db
			.insert(transaction)
			.values({
				userId: session.user.id,
				amount: amount,
				date: date,
				transactionDetails: body.transactionDetails,
				merchantId: body.merchantId || merchantRecord?.id,
				categoryId: body.categoryId || merchantRecord?.recommendedCategoryId,
				notes: body.notes,
			})
			.returning();

		if (!newTransaction || newTransaction.length === 0) {
			logger.error(`Failed to create transaction for user ${session.user.id}`);
			return c.json({ error: "Failed to create transaction" }, 500);
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

		logger.info(
			`Transaction created successfully for user ${session.user.id}`,
			{
				transactionId: newTransaction[0].id,
				amount: amount,
			},
		);

		return c.json(
			{
				success: true,
				transaction: createdTransaction,
			},
			201,
		);
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
		await healthCheck();
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

// Log application startup errors
process.on("uncaughtException", (error) => {
	logger.error("Uncaught exception", { error });
	process.exit(1);
});

process.on("unhandledRejection", (reason) => {
	logger.error("Unhandled rejection", { error: reason });
});

export default app;
