import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/permission";

// GET single tool with all details
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const tool = await prisma.tool.findUnique({
      where: { id: params.id },
      include: { category: true, units: true },
    });

    if (!tool) {
      return NextResponse.json({ error: "Alat tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json(tool);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT update tool
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole("ADMIN");
    const body = await request.json();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Update main tool info
      const tool = await tx.tool.update({
        where: { id: params.id },
        data: {
          name: body.name,
          brand: body.brand,
          imageUrl: body.imageUrl,
          categoryId: body.categoryId,
        },
      });

      // 2. Update unit statuses if provided
      if (body.units && Array.isArray(body.units)) {
        for (const u of body.units) {
          // ensure we only update units belonging to this tool
          await tx.toolUnit.updateMany({
            where: { id: u.id, toolId: params.id },
            data: { status: u.status },
          });
        }
      }

      // 2b. Delete specific units if provided
      if (body.deletedUnitIds && Array.isArray(body.deletedUnitIds) && body.deletedUnitIds.length > 0) {
        await tx.toolUnit.deleteMany({
          where: {
            id: { in: body.deletedUnitIds },
            toolId: params.id,
          },
        });
      }

      // 3. Add new units if addNewQty is provided
      if (body.addNewQty && body.addNewQty > 0) {
        const brandCode = (body.brand || tool.brand).substring(0, 3).toUpperCase();
        for (let i = 0; i < body.addNewQty; i++) {
          const uniqueId = Math.random().toString(36).substring(2, 6).toUpperCase();
          const code = `${brandCode}-${Date.now().toString().slice(-4)}-${uniqueId}`;
          await tx.toolUnit.create({
            data: {
              code,
              toolId: tool.id,
              status: "AVAILABLE",
            },
          });
        }
      }

      return tx.tool.findUnique({
        where: { id: params.id },
        include: { category: true, units: true },
      });
    });

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE tool
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole("ADMIN");
    await prisma.tool.delete({ where: { id: params.id } });
    return NextResponse.json({ message: "Alat berhasil dihapus" });
  } catch (error) {
    return handleApiError(error);
  }
}
