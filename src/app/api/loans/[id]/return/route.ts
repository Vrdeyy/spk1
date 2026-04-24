import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, handleApiError } from "@/lib/permission";
import { returnSchema, returnApprovalSchema } from "@/lib/validations";
import {
  createNotification,
  notifyAdminsAndPetugas,
} from "@/services/notificationService";
import { createActivityLog } from "@/services/activityLogService";

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

      // KEY LOGIC: If damage reported OR it's being finalized with damage, move to AWAITING_FINE
      const hasDamage = data.damagedUnitIds && data.damagedUnitIds.length > 0;
      
      await tx.loan.update({
        where: { id: params.id },
        data: {
          status: hasDamage ? "AWAITING_FINE" : "ONGOING"
        }
      });

      await createActivityLog(
        session.user.id,
        "INITIATE_RETURN",
        `Pinjaman ${params.id}`,
        `Peminjam mengajukan pengembalian. ${hasDamage ? "Dilaporkan ada kerusakan (Butuh Penilaian Admin)." : "Semua barang dilaporkan baik."}`
      );

      return returnRecord;
    });

    // Notify staff
    const hasDamage = data.damagedUnitIds && data.damagedUnitIds.length > 0;
    await notifyAdminsAndPetugas(
      hasDamage ? "⚠️ Butuh Penilaian Denda" : "Permintaan Pengembalian",
      `${session.user?.name || "User"} mengajukan pengembalian #${params.id.slice(-6).toUpperCase()}.${hasDamage ? " ADA KERUSAKAN." : ""}${data.note ? ` Pesan: ${data.note}` : ""}`
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

      // VALIDATION: Only Admin can set denda
      if (session.user.role === "PETUGAS" && data.fineDamage > 0) {
        throw new Error("Hanya Admin yang berwenang menetapkan nominal denda kerusakan.");
      }

      const hasDamageInInput = data.damagedUnitIds && data.damagedUnitIds.length > 0;

      if (!existing.return_) {
        // Create return directly (Case where return request hasn't been made yet)
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

      // Update unit status to AVAILABLE or DAMAGED
      for (const lu of existing.loanUnits) {
        const isDamaged = data.damagedUnitIds?.includes(lu.toolUnitId);
        await tx.toolUnit.update({
          where: { id: lu.toolUnitId },
          data: { status: isDamaged ? "DAMAGED" : "AVAILABLE" },
        });
      }

      await createActivityLog(
        session.user.id,
        "FINALIZE_RETURN",
        `Pinjaman ${params.id}`,
        `${session.user.role === "ADMIN" ? "Admin" : "Petugas"} menyelesaikan pengembalian. Status: Selesai.`
      );

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
