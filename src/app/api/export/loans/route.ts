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
        loanUnits: { include: { toolUnit: { include: { tool: true } } } },
        return_: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Laporan Pinjaman");

    // Define columns with alignment and formatting
    sheet.columns = [
      { header: "No", key: "no", width: 8, style: { alignment: { horizontal: "center" } } },
      { header: "Tanggal Pinjam", key: "loanDate", width: 18, style: { alignment: { horizontal: "center" } } },
      { header: "Tgl Tenggat", key: "dueDate", width: 18, style: { alignment: { horizontal: "center" } } },
      { header: "Tgl Kembali", key: "returnDate", width: 18, style: { alignment: { horizontal: "center" } } },
      { header: "Terlambat", key: "lateDays", width: 15, style: { alignment: { horizontal: "center" } } },
      { header: "Peminjam", key: "user", width: 25 },
      { header: "Email", key: "email", width: 30 },
      { header: "Barang", key: "items", width: 45, style: { alignment: { wrapText: true, vertical: "top" } } },
      { header: "Status", key: "status", width: 15, style: { alignment: { horizontal: "center" } } },
      { header: "Alasan", key: "reason", width: 35, style: { alignment: { wrapText: true, vertical: "top" } } },
      { header: "Denda Telat", key: "fineLate", width: 15, style: { numFmt: '"Rp"#,##0' } },
      { header: "Denda Rusak", key: "fineDamage", width: 15, style: { numFmt: '"Rp"#,##0' } },
      { header: "Total Denda", key: "fineTotal", width: 18, style: { numFmt: '"Rp"#,##0', font: { bold: true } } },
    ];

    // Style header row
    const headerRow = sheet.getRow(1);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF2E75B6" }, // Professional Blue
      };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    // Freeze the header
    sheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];

    loans.forEach((loan, i) => {
      const fineLate = loan.return_?.fineLate || 0;
      const fineDamage = loan.return_?.fineDamage || 0;

      // Calculate days late
      let lateDays = 0;
      if (loan.return_) {
        const diffTime = loan.return_.returnedAt.getTime() - loan.dueDate.getTime();
        lateDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
      } else if (loan.status === "ONGOING" && new Date() > loan.dueDate) {
        const diffTime = new Date().getTime() - loan.dueDate.getTime();
        lateDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
      }

      // Format items with unit codes if available
      let itemDisplay = "";
      if (loan.loanUnits.length > 0) {
        const toolMap: Record<string, string[]> = {};
        loan.loanUnits.forEach((lu) => {
          const toolName = lu.toolUnit.tool.name;
          if (!toolMap[toolName]) toolMap[toolName] = [];
          toolMap[toolName].push(lu.toolUnit.code);
        });
        itemDisplay = Object.entries(toolMap)
          .map(([name, codes]) => `${name} [${codes.join(", ")}]`)
          .join("\n"); // Use newline for better wrap
      } else {
        itemDisplay = loan.items
          .map((item) => `${item.tool.name} (${item.qtyRequested})`)
          .join("\n");
      }

      const row = sheet.addRow({
        no: i + 1,
        loanDate: loan.createdAt.toLocaleDateString("id-ID"),
        dueDate: loan.dueDate.toLocaleDateString("id-ID"),
        returnDate: loan.return_?.returnedAt
          ? loan.return_.returnedAt.toLocaleDateString("id-ID")
          : "-",
        lateDays: lateDays > 0 ? `${lateDays} Hari` : "0",
        user: loan.user.name,
        email: loan.user.email,
        items: itemDisplay,
        status: loan.status,
        reason: loan.reason,
        fineLate,
        fineDamage,
        fineTotal: fineLate + fineDamage,
      });

      // Add borders to data row
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FFD9D9D9" } },
          left: { style: "thin", color: { argb: "FFD9D9D9" } },
          bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
          right: { style: "thin", color: { argb: "FFD9D9D9" } },
        };
        cell.alignment = cell.alignment || { vertical: "middle" };
      });
    });

    // Add auto-filter to the sheet
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: sheet.columns.length },
    };

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
