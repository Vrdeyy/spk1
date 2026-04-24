import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, handleApiError } from "@/lib/permission";
import { loanRequestSchema } from "@/lib/validations";
import { notifyAdminsAndPetugas } from "@/services/notificationService";

// GET loans (filtered by role)
export async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    const where: any = {};

    // Peminjam only sees own loans
    if (session.user.role === "PEMINJAM") {
      where.userId = session.user.id;
    }

    if (status) {
      where.status = status;
    }

    const loans = await prisma.loan.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        items: {
          include: {
            tool: { include: { category: true } },
          },
        },
        loanUnits: {
          include: { toolUnit: true },
        },
        return_: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(loans);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST: User creates loan request (PENDING)
export async function POST(request: Request) {
  try {
    const session = await requireAuth();

    if (session.user.role !== "PEMINJAM") {
      return NextResponse.json(
        { error: "Hanya peminjam yang bisa mengajukan pinjaman" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const data = loanRequestSchema.parse(body);

    const loan = await prisma.$transaction(async (tx) => {
      // Validate stock availability for each item
      for (const item of data.items) {
        const available = await tx.toolUnit.count({
          where: { toolId: item.toolId, status: "AVAILABLE" },
        });

        if (available < item.qtyRequested) {
          const tool = await tx.tool.findUnique({ where: { id: item.toolId } });
          throw new Error(
            `Stok ${tool?.name || "alat"} tidak cukup. Tersedia: ${available}, diminta: ${item.qtyRequested}`
          );
        }
      }

      const newLoan = await tx.loan.create({
        data: {
          userId: session.user.id,
          reason: data.reason,
          dueDate: new Date(data.dueDate),
          status: "PENDING",
          items: {
            create: data.items.map((item) => ({
              toolId: item.toolId,
              qtyRequested: item.qtyRequested,
            })),
          },
        },
        include: {
          items: { include: { tool: true } },
          user: { select: { name: true } },
        },
      });

      return newLoan;
    });

    // Notify staff
    await notifyAdminsAndPetugas(
      "Permintaan Pinjaman Baru",
      `${loan.user.name} mengajukan pinjaman ${loan.items.length} item`
    );

    return NextResponse.json(loan, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
