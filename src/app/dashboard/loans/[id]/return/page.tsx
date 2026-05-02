"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function LoanReturnPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const loanId = params.id as string;
  const role = session?.user?.role;
  const isAdmin = role === "ADMIN";
  const isPetugas = role === "PETUGAS";
  const isPeminjam = role === "PEMINJAM";

  const [form, setForm] = useState({
    note: "",
    fineDamage: 0,
    items: [] as { toolUnitId: string; condition: "GOOD" | "DAMAGED" | "LOST"; note?: string }[],
  });

  const { data: loan, isLoading } = useQuery({
    queryKey: ["loan", loanId],
    queryFn: () => fetch(`/api/loans/${loanId}`).then((r) => r.json()),
  });

  useEffect(() => {
    if (loan && !loan.error) {
      setForm({
        note: loan.return_?.inspectionNote || "",
        fineDamage: loan.return_?.fineDamage || 0,
        items: loan.loanUnits?.map((lu: any) => ({
          toolUnitId: lu.toolUnitId,
          condition: (lu.condition as any) || "GOOD",
          note: lu.inspectionNote || "",
        })) || [],
      });
    }
  }, [loan]);

  const mutation = useMutation({
    mutationFn: (data: any) =>
      fetch(`/api/loans/${loanId}/return`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.error);
        }
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["loan", loanId] });
      router.push("/dashboard/loans");
    },
  });

  const userReturnMutation = useMutation({
    mutationFn: (data: any) =>
      fetch(`/api/loans/${loanId}/return`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.error);
        }
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["loan", loanId] });
      router.push("/dashboard/loans");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPeminjam) {
      userReturnMutation.mutate(form);
    } else {
      mutation.mutate(form);
    }
  };

  if (isLoading) {
    return (
      <div className="page-enter">
        <div className="page-header"><h1>Memuat...</h1></div>
        <div className="page-body"><div className="loader"><div className="spinner" /></div></div>
      </div>
    );
  }

  if (!loan || loan.error) {
    return (
      <div className="page-enter">
        <div className="page-body">
          <div className="alert alert-error">Data tidak ditemukan.</div>
          <Link href="/dashboard/loans" className="btn btn-secondary" style={{ marginTop: 16 }}>Kembali</Link>
        </div>
      </div>
    );
  }

  const hasDamage = form.items.some(i => i.condition !== "GOOD");
  const isDispute = loan.status === "DISPUTE";
  const totalFine = (loan.return_?.fineLate || 0) + form.fineDamage;

  return (
    <div className="page-enter">
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button type="button" onClick={() => router.back()} className="btn btn-secondary btn-sm" style={{ padding: "8px 12px" }}>
            ← Batal
          </button>
          <div>
            <h1>{isPeminjam ? "Ajukan Pengembalian" : isDispute ? "Selesaikan Sengketa" : "Verifikasi Pengembalian"} #{loanId.slice(-6).toUpperCase()}</h1>
            <p className="description">
              {isPeminjam ? "Laporkan kondisi barang sebelum dikembalikan." : 
               `Pemeriksaan fisik aset dan ${(isAdmin || isPetugas) ? "penilaian kondisi barang" : "detail pengembalian"}.`}
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="page-body" style={{ maxWidth: 900, margin: "0 auto" }}>
        
        {/* 1. Borrower Info Summary */}
        <div className="detail-section" style={{ padding: 24, background: "white", marginBottom: 24 }}>
           <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                 <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>PEMINJAM</div>
                 <div style={{ fontSize: "1.1rem", fontWeight: 800 }}>{loan.user?.name}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                 <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>TENGGAT</div>
                 <div style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--accent-red)" }}>{new Date(loan.dueDate).toLocaleDateString("id-ID")}</div>
              </div>
           </div>
        </div>

        {/* 2. Dispute Alert if any */}
        {isDispute && (
          <div className="alert alert-error" style={{ marginBottom: 24, borderRadius: 16 }}>
            <div style={{ fontWeight: 800, fontSize: "1rem" }}>⚠️ Status Sengketa (Dispute)</div>
            <p style={{ opacity: 0.9, marginTop: 4 }}>Peminjam melaporkan barang BAIK, namun pemeriksaan menemukan adanya kerusakan/kehilangan. Harap tinjau kembali dan tentukan denda.</p>
          </div>
        )}

        {/* 3. Items Inspection */}
        <div className="detail-section">
          <div className="section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>{isPeminjam ? "Kondisi Barang Anda" : "Update Kondisi Unit Fisik"}</span>
            <span className="badge badge-primary">{form.items.length} Unit</span>
          </div>
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            {form.items.map((item, idx) => {
              const lu = loan.loanUnits?.find((u: any) => u.toolUnitId === item.toolUnitId);
              return (
                <div key={item.toolUnitId} style={{ 
                  display: "grid",
                  gridTemplateColumns: "1fr 2fr 180px",
                  alignItems: "center",
                  gap: 20,
                  background: item.condition === "GOOD" ? "#f8fafc" : "rgba(239, 68, 68, 0.03)",
                  padding: "16px 20px",
                  borderRadius: 16,
                  border: item.condition === "GOOD" ? "1px solid #e2e8f0" : "1px solid rgba(239, 68, 68, 0.2)"
                }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "1rem", color: "var(--sidebar-navy)" }}>
                      {lu?.toolUnit?.tool?.name}
                    </div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>
                      Merk: {lu?.toolUnit?.tool?.brand}
                    </div>
                    <div style={{ 
                      fontSize: "0.75rem", 
                      color: "white", 
                      background: "var(--sidebar-navy)", 
                      display: "inline-block",
                      padding: "2px 8px",
                      borderRadius: 4,
                      marginTop: 4,
                      fontWeight: 800
                    }}>
                      {lu?.toolUnit?.code}
                    </div>
                  </div>
                  
                  <div>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder={isPeminjam ? "Catatan kondisi (opsional)..." : "Catatan pemeriksaan (cth: Gores, pecah, dsb)"}
                      value={item.note || ""}
                      onChange={(e) => setForm({
                        ...form,
                        items: form.items.map(i => i.toolUnitId === item.toolUnitId ? { ...i, note: e.target.value } : i)
                      })}
                    />
                  </div>

                  <select 
                    className="form-input"
                    value={item.condition}
                    style={{ 
                      fontWeight: 700, 
                      color: item.condition === "GOOD" ? "var(--accent-green)" : "var(--accent-red)",
                      borderColor: item.condition === "GOOD" ? "#d1fae5" : "#fca5a5"
                    }}
                    onChange={(e) => setForm({
                      ...form,
                      items: form.items.map(i => i.toolUnitId === item.toolUnitId ? { ...i, condition: e.target.value as any } : i)
                    })}
                  >
                    <option value="GOOD">✅ BAIK</option>
                    <option value="DAMAGED">⚠️ RUSAK</option>
                    <option value="LOST">❌ HILANG</option>
                  </select>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. Fine & Final Note */}
        <div style={{ display: "grid", gridTemplateColumns: isPeminjam ? "1fr" : "1fr 340px", gap: 24, marginTop: 24 }}>
           <div className="detail-section">
              <div className="section-title">{isPeminjam ? "Pesan Tambahan (Opsional)" : "Kesimpulan Pemeriksaan"}</div>
              <div style={{ padding: 24 }}>
                 {!isPeminjam && (
                   <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 800, letterSpacing: 1, marginBottom: 8, color: "var(--text-muted)" }}>CATATAN PETUGAS UNTUK ADMIN/USER</label>
                 )}
                 <textarea 
                   className="form-input" 
                   rows={4} 
                   placeholder={isPeminjam ? "Tulis pesan atau alasan keterlambatan jika ada..." : "Berikan keterangan tambahan jika diperlukan..."}
                   value={form.note}
                   onChange={(e) => setForm({ ...form, note: e.target.value })}
                 />
              </div>
           </div>

           {!isPeminjam && (
             <div className="detail-section" style={{ background: isAdmin ? "rgba(139, 92, 246, 0.02)" : "white" }}>
                <div className="section-title">Penilaian Denda</div>
                <div style={{ padding: 24 }}>
                   <div style={{ marginBottom: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                         <span style={{ fontSize: "0.85rem", fontWeight: 700 }}>Denda Terlambat</span>
                         <span style={{ fontWeight: 800 }}>Rp {(loan.return_?.fineLate || 0).toLocaleString("id-ID")}</span>
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>*Dihitung otomatis oleh sistem</div>
                   </div>

                   <div style={{ padding: "0 0 16px", borderTop: "1px solid var(--border-light)", paddingTop: 16 }}>
                      <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, marginBottom: 12 }}>Denda Kerusakan</label>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                         <span style={{ fontWeight: 800 }}>Rp</span>
                         <input 
                           type="number" 
                           className="form-input"
                           style={{ fontWeight: 800, fontSize: "1.2rem" }}
                           disabled={!isAdmin}
                           value={form.fineDamage}
                           onChange={(e) => setForm({ ...form, fineDamage: parseInt(e.target.value) || 0 })}
                         />
                      </div>
                      {!isAdmin && (
                        <div style={{ fontSize: "0.7rem", color: "var(--accent-red)", marginTop: 8, fontStyle: "italic" }}>
                          *Hanya Admin yang dapat menentukan nominal denda.
                        </div>
                      )}
                   </div>

                   <div style={{ marginTop: 16, paddingTop: 16, borderTop: "2px solid var(--border-light)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                         <span style={{ fontWeight: 800 }}>TOTAL TAGIHAN</span>
                         <span style={{ fontWeight: 900, fontSize: "1.4rem", color: "var(--accent-red)" }}>
                           Rp {totalFine.toLocaleString("id-ID")}
                         </span>
                      </div>
                   </div>
                </div>
             </div>
           )}
        </div>

        {/* 5. Submit */}
        <div style={{ marginTop: 40, display: "flex", justifyContent: "flex-end", gap: 16 }}>
          <button type="button" onClick={() => router.back()} className="btn btn-secondary" style={{ padding: "12px 32px" }}>
            Batal
          </button>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ padding: "12px 48px", fontSize: "1rem" }}
            disabled={mutation.isPending || userReturnMutation.isPending}
          >
            {mutation.isPending || userReturnMutation.isPending ? "Sedang Memproses..." : 
             (isPetugas && hasDamage ? "Kirim Laporan ke Admin" : 
              isPeminjam ? "Ajukan Pengembalian" : "Selesaikan Verifikasi")}
          </button>
        </div>

      </form>
    </div>
  );
}
