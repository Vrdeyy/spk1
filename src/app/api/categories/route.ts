import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/permission";
import { categorySchema } from "@/lib/validations";

// GET all categories
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { tools: true } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(categories);
  } catch (error) {
    return handleApiError(error);
  }
}

// POST create category (ADMIN only)
export async function POST(request: Request) {
  try {
    await requireRole("ADMIN");
    const body = await request.json();
    const data = categorySchema.parse(body);

    const category = await prisma.category.create({ data });
    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
