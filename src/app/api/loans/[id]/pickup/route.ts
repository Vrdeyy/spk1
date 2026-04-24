import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/permission";
import { createActivityLog } from "@/services/activityLogService";

// POST: Admin/Petugas picks up (APPROVED -> ONGOING, assign physical units)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole("ADMIN", "PETUGAS");

    const loan = await prisma.$transaction(async (tx) => {
      const existing = await tx.loan.findUnique({
        where: { id: params.id },
        include: { items: { include: { tool: true } } },
      });

      if (!existing) throw new Error("Pinjaman tidak ditemukan");
      if (existing.status !== "APPROVED") {
        throw new Error("Pinjaman harus berstatus APPROVED untuk pickup");
      }

      // For each approved item, assign physical units
      for (const item of existing.items) {
        if (item.qtyApproved <= 0) continue;

        const availableUnits = await tx.toolUnit.findMany({
          where: { toolId: item.toolId, status: "AVAILABLE" },
          take: item.qtyApproved,
        });

        if (availableUnits.length < item.qtyApproved) {
          throw new Error(
            `Stok fisik tidak cukup untuk pickup`
          );
        }

        // Mark units as BORROWED
        for (const unit of availableUnits) {
          await tx.toolUnit.update({
            where: { id: unit.id },
            data: { status: "BORROWED" },
          });

          await tx.loanUnit.create({
            data: {
              loanId: existing.id,
              toolUnitId: unit.id,
            },
          });
        }
      }

      await createActivityLog(
        session.user.id,
        "PICKUP_LOAN",
        `Pinjaman ${params.id}`,
        `Barang diambil oleh peminjam. Status: Sedang Dipinjam.`
      );

      return tx.loan.update({
        where: { id: params.id },
        data: { status: "ONGOING" },
        include: {
          items: { include: { tool: true } },
          loanUnits: { include: { toolUnit: true } },
        },
      });
    });

    return NextResponse.json(loan);
  } catch (error) {
    return handleApiError(error);
  }
}
