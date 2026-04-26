import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { LoanStatus } from "@prisma/client";
import { requireAuth, requireRole, handleApiError } from "@/lib/permission";
import { returnSchema, returnApprovalSchema } from "@/lib/validations";
import {
  createNotification,
  notifyAdminsAndPetugas,
} from "@/services/notificationService";
import { createActivityLog } from "@/services/activityLogService";

// POST: User initiates return (creates Return record, sets initial conditions)
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const data = returnSchema.parse(body);

    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUnique({
        where: { id: params.id },
        include: { return_: true, loanUnits: true },
      });

      if (!loan) throw new Error("Pinjaman tidak ditemukan");
      if (loan.status !== "ONGOING") {
        throw new Error("Pinjaman harus berstatus ONGOING untuk dikembalikan");
      }
      if (loan.return_) {
        throw new Error("Pengembalian sudah diajukan sebelumnya");
      }

      // Calculate late fine
      const settings = await tx.setting.findFirst();
      const finePerDay = settings?.finePerDay || 5000;
      const now = new Date();
      const dueDate = new Date(loan.dueDate);
      let fineLate = 0;

      if (now > dueDate) {
        const diffDays = Math.ceil(
          (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        fineLate = diffDays * finePerDay;
      }

      // Update unit conditions based on user report
      let hasDamage = false;
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          if (item.condition !== "GOOD") hasDamage = true;
          
          await tx.loanUnit.update({
            where: { 
              loanId_toolUnitId: {
                loanId: loan.id,
                toolUnitId: item.toolUnitId
              }
            },
            data: { 
              condition: item.condition,
              note: item.note || null
            } as any
          });

          // Also update ToolUnit status if damaged/lost so it's not borrowed again
          if (item.condition !== "GOOD") {
            await tx.toolUnit.update({
              where: { id: item.toolUnitId },
              data: { status: (item.condition === "LOST" ? "LOST" : "DAMAGED") as any }
            });
          }
        }
      }

      const returnRecord = await tx.return.create({
        data: {
          loanId: loan.id,
          fineLate,
          note: data.note || null,
        },
      });

      // Update loan status
      await tx.loan.update({
        where: { id: params.id },
        data: {
          status: "ONGOING" as any 
        }
      });

      await createActivityLog(
        session.user.id,
        "INITIATE_RETURN",
        `Pinjaman ${params.id}`,
        `Peminjam mengajukan pengembalian. ${hasDamage ? "Ada laporan kerusakan/kehilangan." : "Semua barang dilaporkan baik."}`
      );

      return returnRecord;
    });

    // Notify staff
    const hasDamage = result.fineLate > 0 || result.fineDamage > 0; // Simplified check
    await notifyAdminsAndPetugas(
      "Permintaan Pengembalian",
      `${session.user?.name || "User"} mengajukan pengembalian #${params.id.slice(-6).toUpperCase()}.${data.note ? ` Pesan: ${data.note}` : ""}`,
      params.id
    );

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT: Admin/Petugas finalizes return (DONE)
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth();
    await requireRole("ADMIN", "PETUGAS");
    const body = await request.json();
    console.log("PUT /api/loans/[id]/return body:", body);
    const data = returnApprovalSchema.parse(body);

    const loan = await prisma.$transaction(async (tx) => {
      const existing = await tx.loan.findUnique({
        where: { id: params.id },
        include: { return_: true, loanUnits: { include: { toolUnit: true } } },
      });

      if (!existing) throw new Error("Pinjaman tidak ditemukan");
      if (existing.status === "DONE") throw new Error("Pinjaman sudah selesai");

      // VALIDATION: Only Admin can set denda
      if (session.user.role === "PETUGAS" && data.fineDamage !== undefined && data.fineDamage !== (existing.return_?.fineDamage ?? 0)) {
        throw new Error("Hanya Admin yang berwenang mengubah nominal denda kerusakan.");
      }

      // 1. Process Item conditions from Staff POV (Staff report ALWAYS overrides for assessment)
      let hasDispute = false;
      if (data.items && data.items.length > 0) {
        for (const item of data.items) {
          const currentUnit = existing.loanUnits.find(lu => lu.toolUnitId === item.toolUnitId);
          
          // Check for dispute: User said GOOD, Staff says NOT GOOD
          if ((currentUnit as any)?.condition === "GOOD" && item.condition !== "GOOD") {
            hasDispute = true;
          }

          await tx.loanUnit.update({
            where: { 
              loanId_toolUnitId: {
                loanId: existing.id,
                toolUnitId: item.toolUnitId
              }
            },
            data: { 
              condition: item.condition as any,
              inspectionNote: item.note || null
            }
          });

          // Update physical unit status immediately based on staff report
          await tx.toolUnit.update({
            where: { id: item.toolUnitId },
            data: { 
              status: (item.condition === "GOOD" ? "AVAILABLE" : 
                      item.condition === "LOST" ? "LOST" : "DAMAGED") as any 
            }
          });
        }
      } else {
        // Fallback: If no items provided, use existing units
        for (const lu of existing.loanUnits) {
          const newStatus = (lu as any).condition === "GOOD" ? "AVAILABLE" : 
                            (lu as any).condition === "LOST" ? "LOST" : "DAMAGED";
          
          await tx.toolUnit.update({
            where: { id: lu.toolUnitId },
            data: { status: newStatus as any }
          });
        }
      }

      // 2. Handle Return Record
      if (!existing.return_) {
        const settings = await tx.setting.findFirst();
        const finePerDay = settings?.finePerDay || 5000;
        const now = new Date();
        const dueDate = new Date(existing.dueDate);
        let fineLate = 0;

        if (now > dueDate) {
          const diffDays = Math.ceil((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
          fineLate = diffDays * finePerDay;
        }

        await tx.return.create({
          data: {
            loanId: existing.id,
            fineLate,
            fineDamage: data.fineDamage || 0,
            note: data.note || null,
          },
        });
      } else {
        await tx.return.update({
          where: { id: existing.return_.id },
          data: {
            fineDamage: data.fineDamage || 0,
            inspectionNote: (data.note || (existing.return_ as any).inspectionNote) as any,
          } as any,
        });
      }

      // 3. Finalize Loan Status
      let finalStatus: LoanStatus = "DONE" as any;
      const isAdmin = session.user.role === "ADMIN";
      
      if (hasDispute && !isAdmin) {
        finalStatus = "DISPUTE" as any;
      } else {
        const hasDamage = data.items?.some(i => i.condition !== "GOOD");
        const fineSet = (data.fineDamage || (existing.return_?.fineDamage || 0)) > 0;
        
        if (hasDamage && !fineSet) {
          finalStatus = "AWAITING_FINE" as any;
        } else {
          finalStatus = "DONE" as any;
        }
      }

      await createActivityLog(
        session.user.id,
        "FINALIZE_RETURN",
        `Pinjaman ${params.id}`,
        `${session.user.role === "ADMIN" ? "Admin" : "Petugas"} memverifikasi pengembalian. ${finalStatus === "AWAITING_FINE" ? "Meneruskan ke Admin untuk penilaian denda." : `Status: ${finalStatus}.`}`
      );

      return tx.loan.update({
        where: { id: params.id },
        data: { status: finalStatus as any },
        include: {
          user: true,
          return_: true,
          items: { include: { tool: true } },
          loanUnits: { include: { toolUnit: true } },
        },
      });
    });

    // Notify interested parties
    if (loan.status === "AWAITING_FINE") {
      await notifyAdminsAndPetugas(
        "⚠️ Butuh Penilaian Denda",
        `Petugas ${session.user.name} telah memverifikasi kerusakan pada pinjaman #${params.id.slice(-6).toUpperCase()}. Admin harap segera menentukan denda.`,
        params.id
      );
    } else if (loan.status === "DONE") {
      const totalFine = (loan.return_?.fineLate || 0) + (loan.return_?.fineDamage || 0);
      await createNotification(
        loan.userId,
        "Pengembalian Selesai",
        totalFine > 0 
          ? `Pengembalian pinjaman Anda telah diselesaikan. Anda dikenakan denda sebesar Rp ${totalFine.toLocaleString("id-ID")}. Harap segera melakukan pembayaran.`
          : "Pengembalian pinjaman Anda telah disetujui dan dinyatakan selesai tanpa denda.",
        params.id
      );
    } else if (loan.status === "DISPUTE") {
      await createNotification(
        loan.userId,
        "⚠️ Pengembalian Bermasalah",
        "Ada ketidakcocokan data pada pengembalian Anda. Harap segera hubungi Admin.",
        params.id
      );
    }

    return NextResponse.json(loan);
  } catch (error) {
    return handleApiError(error);
  }
}
