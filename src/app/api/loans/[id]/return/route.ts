import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, handleApiError } from "@/lib/permission";
import { returnSchema, returnApprovalSchema } from "@/lib/validations";
import {
  createNotification,
  notifyAdminsAndPetugas,
} from "@/services/notificationService";

// POST: User initiates return (creates Return record, status still ONGOING)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const data = returnSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({
        where: { id: params.id },
        include: { return_: true, loanUnits: true },
      });

      if (!loan) throw new Error("Pinjaman tidak ditemukan");
      if (loan.status !== "ONGOING") {
        throw new Error("Pinjaman harus berstatus ONGOING untuk dikembalikan");
      }
      if (loan.return_) {
        throw new Error("Pengembalian sudah diajukan sebelumnya");
      }

      // Calculate late fine
      const settings = await tx.setting.findFirst();
      const finePerDay = settings?.finePerDay || 5000;
      const now = new Date();
      const dueDate = new Date(loan.dueDate);
      let fineLate = 0;

      if (now > dueDate) {
        const diffDays = Math.ceil(
          (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        fineLate = diffDays * finePerDay;
      }

      // Mark damaged units if any
      if (data.damagedUnitIds && data.damagedUnitIds.length > 0) {
        for (const unitId of data.damagedUnitIds) {
          await tx.toolUnit.update({
            where: { id: unitId },
            data: { status: "DAMAGED" },
          });
        }
      }

      const returnRecord = await tx.return.create({
        data: {
          loanId: loan.id,
          fineLate,
          note: data.note || null,
        },
      });

      return returnRecord;
    });

    // Notify staff
    await notifyAdminsAndPetugas(
      "Permintaan Pengembalian",
      `Pengembalian pinjaman #${params.id.slice(-6)} telah diajukan`
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT: Admin/Petugas finalizes return (DONE)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    await requireRole("ADMIN", "PETUGAS");
    const body = await request.json();
    const data = returnApprovalSchema.parse(body);

    const loan = await prisma.$transaction(async (tx) => {
      const existing = await tx.loan.findUnique({
        where: { id: params.id },
        include: { return_: true, loanUnits: { include: { toolUnit: true } } },
      });

      if (!existing) throw new Error("Pinjaman tidak ditemukan");
      if (existing.status === "DONE") throw new Error("Pinjaman sudah selesai");

      if (!existing.return_) {
        // Create return directly by Admin
        const settings = await tx.setting.findFirst();
        const finePerDay = settings?.finePerDay || 5000;
        const now = new Date();
        const dueDate = new Date(existing.dueDate);
        let fineLate = 0;

        if (now > dueDate) {
          const diffDays = Math.ceil(
            (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          fineLate = diffDays * finePerDay;
        }

        await tx.return.create({
          data: {
            loanId: existing.id,
            fineLate,
            fineDamage: data.fineDamage || 0,
            note: data.note || null,
          },
        });
      } else {
        // Update return record with damage fine
        await tx.return.update({
          where: { id: existing.return_.id },
          data: {
            fineDamage: data.fineDamage || 0,
            note: data.note || existing.return_.note,
          },
        });
      }

      // Release all borrowed units back to AVAILABLE (except DAMAGED ones)
      for (const lu of existing.loanUnits) {
        if (lu.toolUnit.status === "BORROWED") {
          const isDamaged = data.damagedUnitIds?.includes(lu.toolUnitId);
          await tx.toolUnit.update({
            where: { id: lu.toolUnitId },
            data: { status: isDamaged ? "DAMAGED" : "AVAILABLE" },
          });
        }
      }

      return tx.loan.update({
        where: { id: params.id },
        data: { status: "DONE" },
        include: {
          user: true,
          return_: true,
          items: { include: { tool: true } },
        },
      });
    });

    // Notify user
    await createNotification(
      loan.userId,
      "Pengembalian Selesai",
      `Pengembalian pinjaman Anda telah diselesaikan.`
    );

    return NextResponse.json(loan);
  } catch (error) {
    return handleApiError(error);
  }
}
