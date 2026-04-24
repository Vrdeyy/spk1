import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, handleApiError } from "@/lib/permission";
import ExcelJS from "exceljs";

export async function GET(request: Request) {
  try {
    await requireRole("PETUGAS");

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const loans = await prisma.loan.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        items: { include: { tool: true } },
        return_: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Laporan Pinjaman");

    sheet.columns = [
      { header: "No", key: "no", width: 5 },
      { header: "Tanggal", key: "date", width: 15 },
      { header: "Peminjam", key: "user", width: 20 },
      { header: "Email", key: "email", width: 25 },
      { header: "Barang", key: "items", width: 35 },
      { header: "Status", key: "status", width: 12 },
      { header: "Alasan", key: "reason", width: 30 },
      { header: "Tenggat", key: "dueDate", width: 15 },
      { header: "Denda Telat", key: "fineLate", width: 15 },
      { header: "Denda Rusak", key: "fineDamage", width: 15 },
      { header: "Total Denda", key: "fineTotal", width: 15 },
    ];

    // Style header
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4472C4" },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    loans.forEach((loan, i) => {
      const fineLate = loan.return_?.fineLate || 0;
      const fineDamage = loan.return_?.fineDamage || 0;

      sheet.addRow({
        no: i + 1,
        date: loan.createdAt.toLocaleDateString("id-ID"),
        user: loan.user.name,
        email: loan.user.email,
        items: loan.items
          .map((item) => `${item.tool.name} (${item.qtyRequested})`)
          .join(", "),
        status: loan.status,
        reason: loan.reason,
        dueDate: loan.dueDate.toLocaleDateString("id-ID"),
        fineLate,
        fineDamage,
        fineTotal: fineLate + fineDamage,
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename=laporan-pinjaman-${new Date().toISOString().split("T")[0]}.xlsx`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
