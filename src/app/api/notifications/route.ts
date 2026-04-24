import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/permission";

// GET notifications for current user
export async function GET() {
  try {
    const session = await requireAuth();

    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    return NextResponse.json(notifications);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT mark all as read
export async function PUT(request: Request) {
  try {
    const session = await requireAuth();
    const body = await request.json().catch(() => ({}));

    if (body.id) {
        // Mark single as read
        await prisma.notification.update({
            where: { id: body.id, userId: session.user.id },
            data: { isRead: true },
        });
    } else {
        // Mark all as read
        await prisma.notification.updateMany({
            where: { userId: session.user.id, isRead: false },
            data: { isRead: true },
        });
    }

    return NextResponse.json({ message: "Notifikasi diperbarui" });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE notifications
export async function DELETE(request: Request) {
    try {
        const session = await requireAuth();
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (id) {
            await prisma.notification.delete({
                where: { id, userId: session.user.id }
            });
        } else {
            await prisma.notification.deleteMany({
                where: { userId: session.user.id }
            });
        }

        return NextResponse.json({ message: "Notifikasi dihapus" });
    } catch (error) {
        return handleApiError(error);
    }
}
