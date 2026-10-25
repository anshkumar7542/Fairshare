import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient, SplitMethod } from "@prisma/client";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath) && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(envPath);
}

const prisma = new PrismaClient(
  process.env.DATABASE_URL
    ? {
        datasources: {
          db: {
            url: process.env.DATABASE_URL
          }
        }
      }
    : undefined
);

async function main() {
  const passwordHash = await bcrypt.hash("Password123", 10);
  await prisma.group.deleteMany({ where: { name: "Weekend Trip" } });

  const users = await Promise.all(
    [
      { name: "Ava Student", email: "ava@example.com" },
      { name: "Ben Roommate", email: "ben@example.com" },
      { name: "Cara Traveler", email: "cara@example.com" }
    ].map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: { ...user, passwordHash }
      })
    )
  );

  const group = await prisma.group.create({
    data: {
      name: "Weekend Trip",
      description: "Demo trip group",
      createdById: users[0].id,
      members: {
        create: users.map((user) => ({ userId: user.id }))
      }
    }
  });

  const expense = await prisma.expense.create({
    data: {
      groupId: group.id,
      description: "Cab from airport",
      amountCents: 4500,
      originalAmountMinor: 4500,
      originalCurrency: "INR",
      normalizedAmountInrCents: 4500,
      currencyCode: "INR",
      paidById: users[0].id,
      splitMethod: SplitMethod.EQUAL,
      expenseDate: new Date(),
      createdById: users[0].id,
      splits: {
        create: users.map((user) => ({
          userId: user.id,
          owedCents: 1500,
          normalizedOwedInrCents: 1500,
          originalOwedMinor: 1500,
          originalCurrency: "INR"
        }))
      }
    }
  });

  await prisma.expenseMessage.create({
    data: {
      expenseId: expense.id,
      authorId: users[1].id,
      message: "Thanks for covering this."
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
