import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, requireAuth, handleApiError } from "@/lib/permission";
import { toolSchema } from "@/lib/validations";

// GET all tools with units info
export async function GET() {
  try {
    await requireAuth();
    const tools = await prisma.tool.findMany({
      include: {
        category: true,
        units: true,
        _count: {
          select: { units: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const result = tools.map((tool) => ({
      ...tool,
      stockAvailable: tool.units.filter((u) => u.status === "AVAILABLE").length,
      stockBorrowed: tool.units.filter((u) => u.status === "BORROWED").length,
      stockDamaged: tool.units.filter((u) => u.status === "DAMAGED").length,
      stockTotal: tool.units.length,
    }));

    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST create tool + generate units (ADMIN/PETUGAS)
export async function POST(request: Request) {
  try {
    await requireRole("ADMIN");
    const body = await request.json();
    const data = toolSchema.parse(body);

    const tool = await prisma.$transaction(async (tx) => {
      const newTool = await tx.tool.create({
        data: {
          name: data.name,
          brand: data.brand,
          imageUrl: data.imageUrl,
          categoryId: data.categoryId,
        },
      });

      // Generate unit codes
      const prefix = data.name
        .substring(0, 3)
        .toUpperCase()
        .replace(/[^A-Z]/g, "X");

      const units = Array.from({ length: data.qty }, (_, i) => ({
        code: `${prefix}-${String(i + 1).padStart(3, "0")}`,
        toolId: newTool.id,
        status: "AVAILABLE" as const,
      }));

      await tx.toolUnit.createMany({ data: units });

      return tx.tool.findUnique({
        where: { id: newTool.id },
        include: { category: true, units: true },
      });
    });

    return NextResponse.json(tool, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
