import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/permission";
import { createActivityLog } from "@/services/activityLogService";

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole("ADMIN");
    const body = await request.json();
    const { status } = body;

    if (!["UNPAID", "PAID"].includes(status)) {
      throw new Error("Status pembayaran tidak valid");
    }

    const updated = await prisma.return.update({
      where: { loanId: params.id },
      data: { 
        paymentStatus: status,
        paidAt: status === "PAID" ? new Date() : null
      },
      include: { loan: { include: { user: true } } }
    });

    await createActivityLog(
      session.user.id,
      "UPDATE_PAYMENT",
      `Pinjaman ${params.id}`,
      `Admin mengubah status pembayaran menjadi ${status}`
    );

    return NextResponse.json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
