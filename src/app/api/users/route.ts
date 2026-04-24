import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/permission";
import bcrypt from "bcryptjs";

// GET all users (ADMIN only)
export async function GET() {
  try {
    await requireRole("ADMIN");

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { loans: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST create user (ADMIN only - for creating PETUGAS accounts)
export async function POST(request: Request) {
  try {
    await requireRole("ADMIN");
    const body = await request.json();

    const exists = await prisma.user.findUnique({
      where: { email: body.email },
    });

    if (exists) {
      return NextResponse.json({ error: "Email sudah digunakan" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(body.password, 12);

    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        password: hashed,
        role: body.role || "PEMINJAM",
      },
      select: { id: true, name: true, email: true, role: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
