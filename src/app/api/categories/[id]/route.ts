import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/permission";
import { categorySchema } from "@/lib/validations";

// PUT update category
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole("ADMIN");
    const body = await request.json();
    const data = categorySchema.parse(body);

    const category = await prisma.category.update({
      where: { id: params.id },
      data,
    });
    return NextResponse.json(category);
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE category
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await requireRole("ADMIN");
    await prisma.category.delete({ where: { id: params.id } });
    return NextResponse.json({ message: "Kategori berhasil dihapus" });
  } catch (error) {
    return handleApiError(error);
  }
}
