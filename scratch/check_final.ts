import { prisma } from "../src/lib/prisma";

async function check() {
  const tools = await prisma.tool.findMany();
  console.log("Total tools:", tools.length);
  tools.forEach(t => {
    console.log(`- ${t.name}: ${t.imageUrl ? "HAS IMAGE" : "NO IMAGE"} (${t.imageUrl})`);
  });
}

check();
