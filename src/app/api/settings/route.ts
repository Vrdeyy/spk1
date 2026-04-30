import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/permission";
import { settingSchema } from "@/lib/validations";

// GET settings
export async function GET() {
  try {
    let settings = await prisma.setting.findUnique({
      where: { id: "default" },
    });
    if (!settings) {
      settings = await prisma.setting.create({
        data: { id: "default", finePerDay: 5000 },
      });
    }
    return NextResponse.json(settings);
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT update settings (ADMIN only)
export async function PUT(request: Request) {
  try {
    await requireRole("ADMIN");
    const body = await request.json();
    const data = settingSchema.parse(body);

    const settings = await prisma.setting.upsert({
      where: { id: "default" },
      update: { finePerDay: data.finePerDay },
      create: { id: "default", finePerDay: data.finePerDay },
    });

    return NextResponse.json(settings);
  } catch (error) {
    return handleApiError(error);
  }
}
