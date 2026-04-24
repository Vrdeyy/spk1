import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/permission";
import bcrypt from "bcryptjs";

// GET single user (ADMIN only)
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole("ADMIN");

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT update user (ADMIN only)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole("ADMIN");
    const body = await request.json();

    // Prevent admin from changing their own role or deleting themselves if needed
    // But for simplicity, we allow editing as long as it's an admin

    const data: any = {
      name: body.name,
      email: body.email,
      role: body.role,
    };

    if (body.password) {
      data.password = await bcrypt.hash(body.password, 12);
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json(user);
  } catch (error) {
    if ((error as any).code === "P2002") {
        return NextResponse.json({ error: "Email sudah digunakan" }, { status: 400 });
    }
    return handleApiError(error);
  }
}

// DELETE user (ADMIN only)
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole("ADMIN");

    // Don't allow admin to delete themselves
    if (session.user.id === params.id) {
        return NextResponse.json({ error: "Anda tidak dapat menghapus akun Anda sendiri" }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Pengguna berhasil dihapus" });
  } catch (error) {
    return handleApiError(error);
  }
}
