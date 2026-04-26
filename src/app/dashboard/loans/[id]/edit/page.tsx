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
    isReceived: false,
    noteAdmin: "",
    // New fields
    fineLate: 0,
    fineDamage: 0,
    returnNote: "",
    inspectionNote: "",
    returnedAt: "",
    paidAt: "",
    loanUnits: [] as any[],
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
        isReceived: loan.isReceived || false,
        noteAdmin: loan.noteAdmin || "",
        fineLate: loan.return_?.fineLate || 0,
        fineDamage: loan.return_?.fineDamage || 0,
        returnNote: loan.return_?.note || "",
        inspectionNote: loan.return_?.inspectionNote || "",
        returnedAt: loan.return_?.returnedAt ? loan.return_.returnedAt.slice(0, 16) : "",
        paidAt: loan.return_?.paidAt ? loan.return_.paidAt.slice(0, 16) : "",
        loanUnits: loan.loanUnits?.map((lu: any) => ({
          id: lu.id,
          toolUnitId: lu.toolUnitId,
          code: lu.toolUnit?.code,
          condition: lu.condition,
          note: lu.note || "",
          inspectionNote: lu.inspectionNote || "",
        })) || [],
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

  const handleUnitChange = (idx: number, field: string, value: any) => {
    const newUnits = [...form.loanUnits];
    newUnits[idx] = { ...newUnits[idx], [field]: value };
    setForm({ ...form, loanUnits: newUnits });
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
                
                {/* 1. Items List */}
                <div className="detail-section">
                  <div className="section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Daftar Alat & Barang</span>
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

                {/* 2. Finance & Returns (If applicable) */}
                {(form.status === "DONE" || form.status === "AWAITING_FINE" || loan.return_) && (
                  <div className="detail-section" style={{ background: "rgba(0,0,0,0.01)" }}>
                    <div className="section-title">Keuangan & Pengembalian</div>
                    <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div className="form-group">
                          <label style={{ fontWeight: 800, fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Tgl Dikembalikan</label>
                          <input
                            type="datetime-local"
                            className="form-input"
                            value={form.returnedAt}
                            onChange={(e) => setForm({ ...form, returnedAt: e.target.value })}
                          />
                        </div>
                        <div className="form-group">
                          <label style={{ fontWeight: 800, fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Status Pembayaran</label>
                          <select
                            className="form-input"
                            style={{ fontWeight: 700, color: form.paymentStatus === "PAID" ? "var(--accent-green)" : "var(--accent-red)" }}
                            value={form.paymentStatus}
                            onChange={(e) => setForm({ ...form, paymentStatus: e.target.value })}
                          >
                            <option value="UNPAID">❌ BELUM LUNAS</option>
                            <option value="PAID">✅ LUNAS</option>
                          </select>
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                        <div className="form-group">
                          <label style={{ fontWeight: 800, fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Denda Terlambat</label>
                          <input
                            type="number"
                            className="form-input"
                            value={form.fineLate}
                            onChange={(e) => setForm({ ...form, fineLate: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="form-group">
                          <label style={{ fontWeight: 800, fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Denda Kerusakan</label>
                          <input
                            type="number"
                            className="form-input"
                            value={form.fineDamage}
                            onChange={(e) => setForm({ ...form, fineDamage: parseInt(e.target.value) || 0 })}
                          />
                        </div>
                      </div>

                      {form.paymentStatus === "PAID" && (
                        <div className="form-group">
                          <label style={{ fontWeight: 800, fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Tgl Dibayar</label>
                          <input
                            type="datetime-local"
                            className="form-input"
                            value={form.paidAt}
                            onChange={(e) => setForm({ ...form, paidAt: e.target.value })}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 3. Informasi Tambahan (Notes) */}
                <div className="detail-section">
                  <div className="section-title">Informasi Tambahan</div>
                  <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
                    <div className="form-group">
                      <label style={{ fontWeight: 800, fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Alasan Peminjaman</label>
                      <textarea
                        className="form-input"
                        style={{ minHeight: 100 }}
                        value={form.reason}
                        onChange={(e) => setForm({ ...form, reason: e.target.value })}
                        placeholder="Masukkan alasan peminjaman..."
                      />
                    </div>
                    
                    <div className="form-group">
                      <label style={{ fontWeight: 800, fontSize: "0.75rem", textTransform: "uppercase", color: "var(--accent-purple)" }}>Catatan Admin (Internal)</label>
                      <textarea
                        className="form-input"
                        style={{ minHeight: 80, border: "1px dashed var(--accent-purple)", background: "rgba(139, 92, 246, 0.02)" }}
                        value={form.noteAdmin}
                        onChange={(e) => setForm({ ...form, noteAdmin: e.target.value })}
                        placeholder="Catatan persetujuan..."
                      />
                    </div>

                    {(form.status === "DONE" || form.status === "AWAITING_FINE" || loan.return_) && (
                      <>
                        <div style={{ paddingTop: 16, borderTop: "1px dashed var(--border-light)" }}>
                          <div className="form-group">
                            <label style={{ fontWeight: 800, fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)" }}>Pesan Pengembalian Peminjam</label>
                            <input
                              type="text"
                              className="form-input"
                              style={{ fontStyle: "italic" }}
                              value={form.returnNote}
                              onChange={(e) => setForm({ ...form, returnNote: e.target.value })}
                              placeholder="Pesan dari user..."
                            />
                          </div>
                        </div>
                        <div className="form-group">
                          <label style={{ fontWeight: 800, fontSize: "0.75rem", textTransform: "uppercase", color: "var(--accent-purple)" }}>Catatan Inspeksi Petugas</label>
                          <textarea
                            className="form-input"
                            style={{ minHeight: 80 }}
                            value={form.inspectionNote}
                            onChange={(e) => setForm({ ...form, inspectionNote: e.target.value })}
                            placeholder="Kesimpulan pengecekan..."
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* 4. Loan Units */}
                {form.loanUnits.length > 0 && (
                  <div className="detail-section">
                    <div className="section-title">Unit Fisik & Kondisi</div>
                    <div style={{ padding: "0 24px" }}>
                      {form.loanUnits.map((lu, idx) => (
                        <div key={lu.id} style={{ 
                          padding: "20px 0", 
                          borderBottom: idx === form.loanUnits.length - 1 ? "none" : "1px solid var(--border-light)",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                            <span className="badge badge-secondary" style={{ fontWeight: 800 }}>{lu.code}</span>
                            <select
                              className="form-input"
                              style={{ width: "auto", minWidth: 150 }}
                              value={lu.condition}
                              onChange={(e) => handleUnitChange(idx, "condition", e.target.value)}
                            >
                              <option value="GOOD">✅ GOOD</option>
                              <option value="DAMAGED">⚠️ DAMAGED</option>
                              <option value="LOST">❌ LOST</option>
                            </select>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                            <div className="form-group">
                              <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Catatan Peminjam</label>
                              <input
                                type="text"
                                className="form-input"
                                value={lu.note}
                                onChange={(e) => handleUnitChange(idx, "note", e.target.value)}
                              />
                            </div>
                            <div className="form-group">
                              <label style={{ fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Catatan Inspeksi</label>
                              <input
                                type="text"
                                className="form-input"
                                value={lu.inspectionNote}
                                onChange={(e) => handleUnitChange(idx, "inspectionNote", e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                    {form.status === "ONGOING" && (
                      <div className="form-group" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <input
                          type="checkbox"
                          id="isReceived"
                          checked={form.isReceived}
                          onChange={(e) => setForm({ ...form, isReceived: e.target.checked })}
                          style={{ width: 20, height: 20 }}
                        />
                        <label htmlFor="isReceived" style={{ fontWeight: 800, fontSize: "0.8rem", color: "var(--sidebar-navy)", marginBottom: 0, cursor: "pointer" }}>
                          Sudah Diterima User
                        </label>
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
