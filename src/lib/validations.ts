import { z } from "zod";

// Auth
export const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

// Category
export const categorySchema = z.object({
  name: z.string().min(2, "Nama kategori minimal 2 karakter"),
});

// Tool
export const toolSchema = z.object({
  name: z.string().min(2, "Nama alat minimal 2 karakter"),
  brand: z.string().min(1, "Brand wajib diisi"),
  categoryId: z.string().min(1, "Kategori wajib dipilih"),
  qty: z.number().int().min(1, "Jumlah minimal 1"),
});

// Loan Request
export const loanRequestSchema = z.object({
  reason: z.string().min(5, "Alasan minimal 5 karakter"),
  dueDate: z.string().min(1, "Tanggal pengembalian wajib diisi"),
  items: z
    .array(
      z.object({
        toolId: z.string().min(1),
        qtyRequested: z.number().int().min(1, "Jumlah minimal 1"),
      })
    )
    .min(1, "Minimal pilih 1 barang"),
});

// Loan Approval
export const loanApprovalSchema = z.object({
  action: z.enum(["APPROVED", "REJECTED"]),
  noteAdmin: z.string().optional(),
  items: z
    .array(
      z.object({
        loanItemId: z.string(),
        qtyApproved: z.number().int().min(0),
      })
    )
    .optional(),
});

// Loan Admin Update
export const adminLoanUpdateSchema = z.object({
  reason: z.string().optional(),
  dueDate: z.string().optional(),
  status: z.enum(["PENDING", "APPROVED", "REJECTED", "ONGOING", "DONE", "AWAITING_FINE", "DISPUTE"]).optional(),
  paymentStatus: z.enum(["UNPAID", "PAID"]).optional(),
  items: z.array(
    z.object({
      id: z.string().optional(), // loanItem ID
      toolId: z.string(),
      qtyRequested: z.number().int().min(1),
      qtyApproved: z.number().int().min(0),
    })
  ).optional(),
});


// Return
export const returnSchema = z.object({
  note: z.string().optional(),
  items: z.array(z.object({
    toolUnitId: z.string(),
    condition: z.enum(["GOOD", "DAMAGED", "LOST"]),
    note: z.string().optional(),
  })).optional(),
});

// Return Approval (by admin)
export const returnApprovalSchema = z.object({
  fineDamage: z.number().int().min(0).optional(),
  note: z.string().optional(),
  items: z.array(z.object({
    toolUnitId: z.string(),
    condition: z.enum(["GOOD", "DAMAGED", "LOST"]),
    note: z.string().optional(),
  })).optional(),
});

// Setting
export const settingSchema = z.object({
  finePerDay: z.number().int().min(0, "Denda per hari minimal 0"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type ToolInput = z.infer<typeof toolSchema>;
export type LoanRequestInput = z.infer<typeof loanRequestSchema>;
export type LoanApprovalInput = z.infer<typeof loanApprovalSchema>;
export type ReturnInput = z.infer<typeof returnSchema>;
export type ReturnApprovalInput = z.infer<typeof returnApprovalSchema>;
export type SettingInput = z.infer<typeof settingSchema>;
