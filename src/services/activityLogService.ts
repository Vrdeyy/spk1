import { prisma } from "@/lib/prisma";

export async function createActivityLog(
  userId: string,
  action: string,
  target: string,
  details?: string
) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        target,
        details,
      },
    });
  } catch (error) {
    console.error("Failed to create activity log:", error);
  }
}
