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

    const unit = await prisma.toolUnit.update({
      where: { id: params.id },
      data: { status: "AVAILABLE" }
    });

    await createActivityLog(
      session.user.id,
      "RESTORE_UNIT",
      `Unit ${unit.code}`,
      `Admin memulihkan unit dari status Rusak/Hilang menjadi Tersedia.`
    );

    return NextResponse.json(unit);
  } catch (error) {
    return handleApiError(error);
  }
}
