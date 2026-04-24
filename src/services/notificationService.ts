import { prisma } from "@/lib/prisma";

export async function createNotification(
  userId: string,
  title: string,
  message: string
) {
  return prisma.notification.create({
    data: { userId, title, message },
  });
}

export async function notifyAdminsAndPetugas(title: string, message: string) {
  const staff = await prisma.user.findMany({
    where: { role: { in: ["ADMIN", "PETUGAS"] } },
    select: { id: true },
  });

  return prisma.notification.createMany({
    data: staff.map((s) => ({
      userId: s.id,
      title,
      message,
    })),
  });
}
