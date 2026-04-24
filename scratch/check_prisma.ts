import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("ActivityLog model in prisma client:", "activityLog" in prisma);
  console.log("Keys in prisma client:", Object.keys(prisma).filter(k => !k.startsWith("_")));
}

main().catch(err => console.error(err)).finally(() => prisma.$disconnect());
