import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create settings
  await prisma.setting.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default", finePerDay: 5000 },
  });

  // Create admin
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@spk.com" },
    update: {},
    create: {
      name: "Admin",
      email: "admin@spk.com",
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("✅ Admin created:", admin.email);

  // Create petugas
  const petugasPassword = await bcrypt.hash("petugas123", 12);
  const petugas = await prisma.user.upsert({
    where: { email: "petugas@spk.com" },
    update: {},
    create: {
      name: "Petugas Lab",
      email: "petugas@spk.com",
      password: petugasPassword,
      role: "PETUGAS",
    },
  });
  console.log("✅ Petugas created:", petugas.email);

  // Create peminjam
  const peminjamPassword = await bcrypt.hash("user123", 12);
  const peminjam = await prisma.user.upsert({
    where: { email: "user@spk.com" },
    update: {},
    create: {
      name: "Budi Santoso",
      email: "user@spk.com",
      password: peminjamPassword,
      role: "PEMINJAM",
    },
  });
  console.log("✅ Peminjam created:", peminjam.email);

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: "Elektronik" },
      update: {},
      create: { name: "Elektronik" },
    }),
    prisma.category.upsert({
      where: { name: "Perkakas" },
      update: {},
      create: { name: "Perkakas" },
    }),
    prisma.category.upsert({
      where: { name: "Alat Ukur" },
      update: {},
      create: { name: "Alat Ukur" },
    }),
    prisma.category.upsert({
      where: { name: "Keselamatan" },
      update: {},
      create: { name: "Keselamatan" },
    }),
  ]);
  console.log("✅ Categories created:", categories.length);

  // Create tools with units
  const toolsData = [
    { name: "Multimeter", brand: "Fluke", categoryIdx: 0, qty: 5 },
    { name: "Solder Station", brand: "Hakko", categoryIdx: 0, qty: 3 },
    { name: "Obeng Set", brand: "Tekiro", categoryIdx: 1, qty: 8 },
    { name: "Bor Listrik", brand: "Bosch", categoryIdx: 1, qty: 4 },
    { name: "Jangka Sorong", brand: "Mitutoyo", categoryIdx: 2, qty: 6 },
    { name: "Mikrometer", brand: "Mitutoyo", categoryIdx: 2, qty: 3 },
    { name: "Helm Safety", brand: "MSA", categoryIdx: 3, qty: 10 },
    { name: "Kacamata Las", brand: "3M", categoryIdx: 3, qty: 5 },
  ];

  for (const td of toolsData) {
    const prefix = td.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
    const existing = await prisma.tool.findFirst({
      where: { name: td.name, brand: td.brand },
    });

    if (!existing) {
      await prisma.tool.create({
        data: {
          name: td.name,
          brand: td.brand,
          categoryId: categories[td.categoryIdx].id,
          units: {
            create: Array.from({ length: td.qty }, (_, i) => ({
              code: `${prefix}-${String(i + 1).padStart(3, "0")}`,
              status: "AVAILABLE",
            })),
          },
        },
      });
    }
  }
  console.log("✅ Tools & units created");

  console.log("\n🎉 Seed complete!");
  console.log("📧 Login accounts:");
  console.log("   Admin:    admin@spk.com / admin123");
  console.log("   Petugas:  petugas@spk.com / petugas123");
  console.log("   Peminjam: user@spk.com / user123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
