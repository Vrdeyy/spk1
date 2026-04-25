import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, handleApiError } from "@/lib/permission";
import { createActivityLog } from "@/services/activityLogService";

// POST: Borrower confirms receipt of physical goods
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();

    const loan = await prisma.$transaction(async (tx) => {
      const existing = await tx.loan.findUnique({
        where: { id: params.id },
      });

      if (!existing) throw new Error("Pinjaman tidak ditemukan");
      if (existing.userId !== session.user.id && session.user.role === "PEMINJAM") {
        throw new Error("Anda tidak memiliki akses ke pinjaman ini");
      }
      if (existing.status !== "ONGOING") {
        throw new Error("Pinjaman harus berstatus ONGOING untuk dikonfirmasi");
      }
      if (existing.isReceived) {
        throw new Error("Pinjaman sudah dikonfirmasi sebelumnya");
      }

      const updated = await tx.loan.update({
        where: { id: params.id },
        data: { isReceived: true },
        include: {
          items: { include: { tool: true } },
          loanUnits: { include: { toolUnit: true } },
        },
      });

      await createActivityLog(
        session.user.id,
        "RECEIVE_LOAN",
        `Pinjaman ${params.id}`,
        `Peminjam mengkonfirmasi penerimaan barang secara fisik.`
      );

      return updated;
    });

    return NextResponse.json(loan);
  } catch (error) {
    return handleApiError(error);
  }
}
