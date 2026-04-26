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
