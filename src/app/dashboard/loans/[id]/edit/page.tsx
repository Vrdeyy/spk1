"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function AdminEditLoanPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [form, setForm] = useState({
    reason: "",
    status: "",
    dueDate: "",
    items: [] as any[],
    paymentStatus: "UNPAID",
  });

  const { data: loan, isLoading: isLoadingLoan } = useQuery({
    queryKey: ["loans", id],
    queryFn: () => fetch(`/api/loans/${id}`).then((res) => res.json()),
  });

  const { data: tools } = useQuery({
    queryKey: ["tools"],
    queryFn: () => fetch("/api/tools").then((res) => res.json()),
  });

  useEffect(() => {
    if (loan) {
      setForm({
        reason: loan.reason || "",
        status: loan.status || "",
        dueDate: loan.dueDate ? loan.dueDate.split("T")[0] : "",
        items: loan.items?.map((i: any) => ({
          id: i.id,
          toolId: i.toolId,
          qtyRequested: i.qtyRequested,
          qtyApproved: i.qtyApproved,
        })) || [],
        paymentStatus: loan.return_?.paymentStatus || "UNPAID",
      });
    }
  }, [loan]);

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      fetch(`/api/loans/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, isEdit: true }),
      }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.error || "Gagal memperbarui data");
        }
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      router.push("/dashboard/loans");
    },
  });

  if (!isAdmin) {
    return (
      <div className="page-enter">
        <div className="page-header">
          <h1>Akses Ditolak</h1>
        </div>
        <div className="page-body">
          <div className="alert alert-error">Hanya Admin yang dapat mengakses halaman ini.</div>
        </div>
      </div>
    );
  }

  if (isLoadingLoan) {
    return (
      <div className="page-enter">
        <div className="page-header">
          <h1>Loading...</h1>
        </div>
        <div className="page-body">
          <div className="loader"><div className="spinner" /></div>
        </div>
      </div>
    );
  }

  const handleItemChange = (idx: number, field: string, value: any) => {
    const newItems = [...form.items];
    newItems[idx] = { ...newItems[idx], [field]: value };
    setForm({ ...form, items: newItems });
  };

  const addItem = () => {
    setForm({
      ...form,
      items: [...form.items, { toolId: "", qtyRequested: 1, qtyApproved: 0 }],
    });
  };

  const removeItem = (idx: number) => {
    setForm({
      ...form,
      items: form.items.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <Link href="/dashboard/loans" className="btn btn-secondary btn-sm" style={{ padding: "6px 12px" }}>
              ← Kembali
            </Link>
            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Kelola Pinjaman / Edit</span>
          </div>
          <h1>Edit Peminjaman</h1>
          <p className="description">Koreksi data peminjaman oleh Admin</p>
        </div>
      </div>

      <div className="page-body">
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {updateMutation.isError && (
            <div className="alert alert-error">{(updateMutation.error as Error).message}</div>
          )}

          <form onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate(form);
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 32 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                {/* General Info */}
                <div className="detail-section">
                  <div className="section-title">Informasi Umum</div>
                  <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
                    <div className="form-group">
                      <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>Alasan Peminjaman</label>
                      <textarea
                        className="form-input"
                        style={{ minHeight: 120 }}
                        value={form.reason}
                        onChange={(e) => setForm({ ...form, reason: e.target.value })}
                        required
                        placeholder="Masukkan alasan peminjaman..."
                      />
                    </div>
                  </div>
                </div>

                {/* Items */}
                <div className="detail-section">
                  <div className="section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Barang & Jumlah</span>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>+ Tambah Barang</button>
                  </div>
                  <div style={{ padding: 0 }}>
                    {form.items.map((item, idx) => (
                      <div key={idx} style={{ 
                        display: "grid", 
                        gridTemplateColumns: "1fr 100px 100px 50px", 
                        gap: 16, 
                        padding: "16px 24px",
                        borderBottom: idx === form.items.length - 1 ? "none" : "1px solid var(--border-light)",
                        alignItems: "flex-end"
                      }}>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          {idx === 0 && <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Alat/Barang</label>}
                          <select
                            className="form-input"
                            value={item.toolId}
                            onChange={(e) => handleItemChange(idx, "toolId", e.target.value)}
                            required
                          >
                            <option value="">Pilih Alat</option>
                            {tools?.map((t: any) => (
                              <option key={t.id} value={t.id}>{t.name} ({t.brand})</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          {idx === 0 && <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Minta</label>}
                          <input
                            type="number"
                            className="form-input"
                            min={1}
                            value={item.qtyRequested}
                            onChange={(e) => handleItemChange(idx, "qtyRequested", parseInt(e.target.value) || 1)}
                            required
                          />
                        </div>
                        <div className="form-group" style={{ marginBottom: 0 }}>
                          {idx === 0 && <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Setuju</label>}
                          <input
                            type="number"
                            className="form-input"
                            min={0}
                            value={item.qtyApproved}
                            onChange={(e) => handleItemChange(idx, "qtyApproved", parseInt(e.target.value) || 0)}
                            required
                          />
                        </div>
                        <div style={{ paddingBottom: 6 }}>
                           <button type="button" className="btn btn-danger btn-sm" style={{ padding: "8px", minWidth: 0 }} onClick={() => removeItem(idx)}>
                             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                           </button>
                        </div>
                      </div>
                    ))}
                    {form.items.length === 0 && (
                      <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
                        Belum ada barang dipilih. Klik "+ Tambah Barang"
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status & Actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div className="detail-section">
                  <div className="section-title">Status & Jadwal</div>
                  <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
                    <div className="form-group">
                      <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>Status Pinjaman</label>
                      <select
                        className="form-input"
                        style={{ fontWeight: 600 }}
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                      >
                        <option value="PENDING">PENDING</option>
                        <option value="APPROVED">APPROVED</option>
                        <option value="ONGOING">ONGOING</option>
                        <option value="AWAITING_FINE">AWAITING_FINE</option>
                        <option value="DISPUTE">DISPUTE</option>
                        <option value="DONE">DONE</option>
                        <option value="REJECTED">REJECTED</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>Tenggat Pengembalian</label>
                      <input
                        type="date"
                        className="form-input"
                        value={form.dueDate}
                        onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                        required
                      />
                    </div>
                    {loan.return_ && (
                      <div className="form-group">
                        <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>Status Pembayaran Denda</label>
                        <select
                          className="form-input"
                          style={{ fontWeight: 600, color: form.paymentStatus === "PAID" ? "var(--accent-green)" : "var(--accent-red)" }}
                          value={form.paymentStatus}
                          onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
                        >
                          <option value="UNPAID">❌ BELUM LUNAS</option>
                          <option value="PAID">✅ LUNAS</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                <div className="detail-section" style={{ padding: 24, background: "var(--sidebar-navy)", border: "none" }}>
                   <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: 16 }}>
                     Pastikan semua data yang diubah sudah benar. Perubahan ini akan langsung berdampak pada stok dan riwayat alat.
                   </p>
                   <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                     <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "14px" }} disabled={updateMutation.isPending}>
                       {updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
                     </button>
                     <Link href="/dashboard/loans" className="btn btn-secondary" style={{ width: "100%", justifyContent: "center", padding: "14px" }}>
                       Batalkan
                     </Link>
                   </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      <style jsx>{`
        .form-group label {
          margin-bottom: 8px;
          display: block;
        }
      `}</style>
    </div>
  );
}
