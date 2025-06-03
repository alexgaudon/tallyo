import { seed } from "./index";

async function main() {
	try {
		console.log("Starting database seed...");
		await seed();
		console.log("Database seed completed successfully!");
	} catch (error) {
		console.error("Error seeding database:", error);
		process.exit(1);
	}
}

main();
