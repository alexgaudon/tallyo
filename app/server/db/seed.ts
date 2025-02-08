import { Category } from "@/repositories/categories/categories.getAll";
import { faker } from "@faker-js/faker";
import { randomUUIDv7 } from "bun";
import { db } from ".";
import { category, NewTransaction, transaction } from "./schema";

const fakeCategories: Category[] = [
  {
    name: "Income",
    color: "#00ff00",
  },
  {
    name: "Fast Food",
    color: "#fff000",
  },
  {
    name: "Groceries",
    color: "#fff000",
  },
  {
    name: "Auto",
    color: "#00ffff",
  },
  {
    name: "Auto Insurance",
    color: "#00ffff",
  },
].map((x) => ({
  id: randomUUIDv7(),
  ...x,
  userId: "f_lkvpJQoBCrZNMPOPPNp",
  hideFromInsights: false,
  treatAsIncome: false,
  createdAt: new Date(),
  updatedAt: new Date(),
}));

const res = await db.insert(category).values(fakeCategories);

const fakeTransactions: NewTransaction[] = Array.from({ length: 12 }).map(
  () => ({
    id: randomUUIDv7(),
    amount: faker.number.int({
      min: 512,
      max: 98421,
    }),
    userId: fakeCategories[0].userId,
    createdAt: new Date(),
    date: faker.date.recent(),
    description: "",
    externalId: faker.lorem.words(3),
    reviewed: false,
    vendor: faker.company.name(),
  }),
);

await db.insert(transaction).values(fakeTransactions);
