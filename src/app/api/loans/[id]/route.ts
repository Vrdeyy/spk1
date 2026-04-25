import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/permission";
import { loanApprovalSchema, adminLoanUpdateSchema } from "@/lib/validations";
import { createNotification } from "@/services/notificationService";
import { createActivityLog } from "@/services/activityLogService";

// GET single loan
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const loan = await prisma.loan.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        items: {
          include: { tool: { include: { category: true } } },
        },
        loanUnits: { include: { toolUnit: true } },
        return_: true,
      },
    });

    if (!loan) {
      return NextResponse.json({ error: "Pinjaman tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(loan);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT: Admin/Petugas approves/rejects OR Admin edits loan
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole("ADMIN", "PETUGAS");
    const body = await request.json();
    const isAdmin = session.user.role === "ADMIN";

    // If Admin is just editing the loan (not using the standard approval flow)
    if (isAdmin && body.isEdit) {
      const data = adminLoanUpdateSchema.parse(body);
      const updatedLoan = await prisma.$transaction(async (tx) => {
        const loan = await tx.loan.update({
          where: { id: params.id },
          data: {
            reason: data.reason,
            dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
            status: data.status,
            noteAdmin: data.noteAdmin,
          },
        });

        if (data.items) {
          // Simplest way: delete old items and create new ones or update
          // This is a correction tool, so we can be flexible
          for (const item of data.items) {
            if (item.id) {
              await tx.loanItem.update({
                where: { id: item.id },
                data: {
                  toolId: item.toolId,
                  qtyRequested: item.qtyRequested,
                  qtyApproved: item.qtyApproved,
                },
              });
            } else {
              await tx.loanItem.create({
                data: {
                  loanId: params.id,
                  toolId: item.toolId,
                  qtyRequested: item.qtyRequested,
                  qtyApproved: item.qtyApproved,
                },
              });
            }
          }
        }

        if (data.paymentStatus) {
          await tx.return.updateMany({
            where: { loanId: params.id },
            data: { 
              paymentStatus: data.paymentStatus as any,
              paidAt: data.paymentStatus === "PAID" ? new Date() : null
            }
          });
        }

        await createActivityLog(
          session.user.id,
          "UPDATE_LOAN",
          `Pinjaman ${params.id}`,
          JSON.stringify(body)
        );

        return tx.loan.findUnique({
          where: { id: params.id },
          include: { user: true, items: { include: { tool: true } }, return_: true },
        });
      });

      return NextResponse.json(updatedLoan);
    }

    // Standard Approval/Rejection Flow
    const data = loanApprovalSchema.parse(body);

    const loan = await prisma.$transaction(async (tx) => {
      const existing = await tx.loan.findUnique({
        where: { id: params.id },
        include: { items: true },
      });

      if (!existing) throw new Error("Pinjaman tidak ditemukan");
      if (existing.status !== "PENDING" && !isAdmin) {
        throw new Error("Pinjaman sudah diproses sebelumnya");
      }

      if (data.action === "REJECTED") {
        await createActivityLog(
          session.user.id,
          "REJECT_LOAN",
          `Pinjaman ${params.id}`,
          `Admin menolak peminjaman. Alasan: ${data.noteAdmin || "-"}`
        );
        return tx.loan.update({
          where: { id: params.id },
          data: {
            status: "REJECTED",
            noteAdmin: data.noteAdmin || null,
          },
          include: { user: true, items: { include: { tool: true } } },
        });
      }

      // APPROVED flow
      if (data.items) {
        for (const item of data.items) {
          // Validate available stock if not Admin (or Admin still might want validation)
          const available = await tx.toolUnit.count({
            where: {
              toolId: existing.items.find(
                (i) => i.id === item.loanItemId
              )?.toolId,
              status: "AVAILABLE",
            },
          });

          if (item.qtyApproved > available) {
            throw new Error("Stok tidak mencukupi untuk approval");
          }

          await tx.loanItem.update({
            where: { id: item.loanItemId },
            data: { qtyApproved: item.qtyApproved },
          });
        }
      }

      await createActivityLog(
        session.user.id,
        "APPROVE_LOAN",
        `Pinjaman ${params.id}`,
        `Admin menyetujui peminjaman. Status: Siap Diambil.`
      );

      return tx.loan.update({
        where: { id: params.id },
        data: {
          status: "APPROVED",
          noteAdmin: data.noteAdmin || null,
        },
        include: { user: true, items: { include: { tool: true } } },
      });
    });

    // Notify user
    await createNotification(
      loan!.userId,
      data.action === "APPROVED" ? "Pinjaman Disetujui" : "Pinjaman Ditolak",
      data.action === "APPROVED"
        ? "Pinjaman Anda telah disetujui. Silakan ambil barang."
        : `Pinjaman Anda ditolak. ${data.noteAdmin || ""}`
    );

    return NextResponse.json(loan);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE: Admin only
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole("ADMIN");
    
    await prisma.$transaction(async (tx) => {
        // Cascade delete will handle items/units if configured, but let's be safe or check schema
        await tx.loan.delete({ where: { id: params.id } });
        
        await createActivityLog(
            session.user.id,
            "DELETE_LOAN",
            `Pinjaman ${params.id}`,
            "Admin menghapus data pinjaman secara permanen"
        );
    });

    return NextResponse.json({ message: "Pinjaman berhasil dihapus" });
  } catch (error) {
    return handleApiError(error);
  }
}
