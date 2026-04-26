"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export default function LoanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const loanId = params.id as string;

  const { data: loan, isLoading, isError } = useQuery({
    queryKey: ["loan", loanId],
    queryFn: () => fetch(`/api/loans/${loanId}`).then((r) => r.json()),
  });

  const queryClient = useQueryClient();
  
  const pickupMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/loans/${id}/pickup`, { method: "POST" }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.error);
        }
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan", loanId] });
    },
  });

  const receiveMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/loans/${id}/receive`, { method: "POST" }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.error);
        }
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan", loanId] });
    },
  });

  const paymentMutation = useMutation({
    mutationFn: ({ status }: { status: "PAID" | "UNPAID" }) =>
      fetch(`/api/loans/${loanId}/payment`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.error);
        }
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loan", loanId] });
    },
  });

  const formatDate = (d: string) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCurrency = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

  if (isLoading) {
    return (
      <div className="page-enter">
        <div className="page-header"><h1>Detail Peminjaman</h1></div>
        <div className="page-body"><div className="loader"><div className="spinner" /></div></div>
      </div>
    );
  }

  if (isError || !loan || loan.error) {
    return (
      <div className="page-enter">
        <div className="page-body">
          <div className="alert alert-error">Data peminjaman tidak ditemukan atau akses ditolak.</div>
          <Link href="/dashboard/loans" className="btn btn-secondary" style={{ marginTop: 16 }}>Kembali ke Daftar</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="page-header" style={{ borderBottom: "none", paddingBottom: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => router.back()} className="btn btn-secondary btn-sm" style={{ padding: "8px 12px" }}>
            ← Kembali
          </button>
          <span className={`badge badge-${(loan.status === "ONGOING" && loan.return_) ? "pending" : loan.status === "AWAITING_FINE" ? "warning" : loan.status === "DISPUTE" ? "danger" : loan.status?.toLowerCase()}`}>
            {loan.status === "PENDING" && "Menunggu"}
            {loan.status === "APPROVED" && "Siap Diambil"}
            {loan.status === "ONGOING" && (
              loan.return_ ? "Sedang Diperiksa" : 
              loan.isReceived ? "Sedang Dipinjam" : "Menunggu Konfirmasi"
            )}
            {loan.status === "AWAITING_FINE" && "Butuh Penilaian"}
            {loan.status === "DISPUTE" && "Sengketa"}
            {loan.status === "DONE" && "Selesai"}
            {loan.status === "REJECTED" && "Ditolak"}
          </span>
        </div>
      </div>

      <div className="page-body">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 32, alignItems: "start" }}>
          
          {/* MAIN COLUMN */}
          <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
            
            {/* 1. Items List */}
            <div className="detail-section" style={{ padding: 0, overflow: "hidden" }}>
              <div className="section-title" style={{ padding: "20px 24px", background: "rgba(0,0,0,0.02)", marginBottom: 0 }}>
                Daftar Alat & Barang
              </div>
              <div className="table-wrapper">
                <table style={{ margin: 0, background: "transparent" }}>
                  <thead>
                    <tr style={{ background: "transparent", borderBottom: "2px solid var(--border-light)" }}>
                      <th style={{ paddingLeft: 24 }}>Nama Alat</th>
                      <th>Kategori</th>
                      <th style={{ textAlign: "right", paddingRight: 24 }}>Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loan.items?.map((item: any) => (
                      <tr key={item.id} style={{ boxShadow: "none", background: "transparent", borderBottom: "1px solid var(--border-light)" }}>
                        <td style={{ padding: "16px 24px" }}>
                          <div style={{ fontWeight: 800, color: "var(--sidebar-navy)" }}>{item.tool?.name}</div>
                          <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>Merk: {item.tool?.brand}</div>
                        </td>
                        <td>
                          <span className="badge badge-peminjam" style={{ fontSize: "0.65rem" }}>{item.tool?.category?.name}</span>
                        </td>
                        <td style={{ textAlign: "right", paddingRight: 24, fontWeight: 800, fontSize: "1.1rem" }}>
                          {item.qtyApproved || item.qtyRequested} <span style={{ fontSize: "0.75rem", opacity: 0.6 }}>Unit</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Finance & Status Card (NEW) */}
            {loan.return_ && (loan.return_.fineLate > 0 || loan.return_.fineDamage > 0) && (
              <div className="detail-section" style={{ 
                background: loan.return_.paymentStatus === "PAID" ? "rgba(16, 185, 129, 0.05)" : "rgba(239, 68, 68, 0.05)", 
                padding: "32px",
                borderRadius: "28px",
                border: loan.return_.paymentStatus === "PAID" ? "2px solid rgba(16, 185, 129, 0.2)" : "2px solid rgba(239, 68, 68, 0.2)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 32
              }}>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 800, opacity: 0.6, letterSpacing: 1, marginBottom: 8 }}>TAGIHAN DENDA TERAKHIR</div>
                  <div style={{ fontSize: "2.4rem", fontWeight: 900, color: "var(--sidebar-navy)" }}>
                    {formatCurrency(loan.return_.fineLate + loan.return_.fineDamage)}
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
                     <span style={{ fontSize: "0.85rem", padding: "6px 12px", borderRadius: 10, background: "rgba(0,0,0,0.05)", fontWeight: 700 }}>Late: {formatCurrency(loan.return_.fineLate)}</span>
                     <span style={{ fontSize: "0.85rem", padding: "6px 12px", borderRadius: 10, background: "rgba(0,0,0,0.05)", fontWeight: 700 }}>Damage: {formatCurrency(loan.return_.fineDamage)}</span>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ 
                    fontSize: "1.2rem", 
                    fontWeight: 900, 
                    color: loan.return_.paymentStatus === "PAID" ? "var(--accent-green)" : "var(--accent-red)",
                    marginBottom: 8
                  }}>
                    {loan.return_.paymentStatus === "PAID" ? "✅ LUNAS" : "❌ BELUM LUNAS"}
                  </div>
                  {loan.return_.paymentStatus === "PAID" && loan.return_.paidAt && (
                    <div style={{ fontSize: "0.7rem", fontWeight: 700, opacity: 0.6, marginBottom: 16 }}>
                      Dibayar pada: {formatDate(loan.return_.paidAt)}
                    </div>
                  )}
                  {session?.user?.role === "ADMIN" && (
                    <button 
                      className={`btn btn-${loan.return_.paymentStatus === "PAID" ? "secondary" : "success"}`}
                      style={{ padding: "12px 24px" }}
                      disabled={paymentMutation.isPending}
                      onClick={() => paymentMutation.mutate({ 
                        status: loan.return_.paymentStatus === "PAID" ? "UNPAID" : "PAID" 
                      })}
                    >
                      {paymentMutation.isPending ? "..." : loan.return_.paymentStatus === "PAID" ? "Batalkan Lunas" : "Tandai Lunas"}
                    </button>
                  )}
                </div>
              </div>
            )}

            

            {/* 3. Reason & Notes */}
            <div className="detail-section">
              <div className="section-title">Informasi Tambahan</div>
              <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>Alasan Peminjaman:</div>
                  <div style={{ background: "var(--bg-main)", padding: 16, borderRadius: 12, lineHeight: 1.6, color: "var(--sidebar-navy)" }}>
                    {loan.reason}
                  </div>
                </div>
                {loan.noteAdmin && (
                  <div>
                    <div style={{ fontWeight: 800, fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>Catatan Admin (Persetujuan):</div>
                    <div style={{ background: "rgba(107, 114, 255, 0.05)", padding: 16, borderRadius: 12, lineHeight: 1.6, border: "1px dashed var(--accent-purple)", color: "var(--sidebar-navy)" }}>
                      {loan.noteAdmin}
                    </div>
                  </div>
                )}
                {loan.return_?.note && (
                  <div style={{ marginTop: 24, paddingTop: 24, borderTop: "1px dashed var(--border-light)" }}>
                    <div style={{ fontWeight: 800, fontSize: "0.75rem", textTransform: "uppercase", color: "var(--sidebar-navy)", marginBottom: 8 }}>Pesan Pengembalian Peminjam:</div>
                    <div style={{ background: "var(--bg-main)", padding: 16, borderRadius: 12, lineHeight: 1.6, border: "1px solid var(--border-light)", color: "var(--sidebar-navy)", fontStyle: "italic" }}>
                      "{loan.return_.note}"
                    </div>
                  </div>
                )}
                {loan.return_?.inspectionNote && (
                  <div style={{ marginTop: 24, paddingTop: 24, borderTop: "1px dashed var(--border-light)" }}>
                    <div style={{ fontWeight: 800, fontSize: "0.75rem", textTransform: "uppercase", color: "var(--accent-purple)", marginBottom: 8 }}>Catatan Inspeksi Petugas (Kesimpulan):</div>
                    <div style={{ background: "rgba(124, 58, 237, 0.03)", padding: 16, borderRadius: 12, lineHeight: 1.6, border: "1px solid rgba(124, 58, 237, 0.2)", color: "var(--sidebar-navy)" }}>
                      {loan.return_.inspectionNote}
                    </div>
                  </div>
                )}
                {/* 2. Physical Units (If Picked Up) */}
            {loan.loanUnits?.length > 0 && (

              <div className="detail-section">
                <div className="section-title">Unit Fisik & Kondisi</div>
                <div style={{ padding: 24 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    {loan.loanUnits.map((lu: any) => (
                      <div key={lu.id} style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "space-between",
                        padding: "12px 16px",
                        background: "var(--bg-main)",
                        borderRadius: 16,
                        border: "1px solid var(--border-light)"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span className={`badge badge-${lu.toolUnit?.status?.toLowerCase()}`} style={{ margin: 0, padding: "6px 12px", fontSize: "0.85rem" }}>
                            {lu.toolUnit?.code}
                          </span>
                          {lu.note && (
                            <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontStyle: "italic", marginTop: 4 }}>
                              💬 User: "{lu.note}"
                            </div>
                          )}
                          {lu.inspectionNote && (
                            <div style={{ fontSize: "0.85rem", color: "var(--accent-purple)", fontWeight: 700, marginTop: 4 }}>
                              🔍 Petugas: "{lu.inspectionNote}"
                            </div>
                          )}

                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                           <span style={{ 
                             fontSize: "0.75rem", 
                             fontWeight: 800, 
                             padding: "6px 12px", 
                             borderRadius: 10,
                             background: lu.condition === "GOOD" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                             color: lu.condition === "GOOD" ? "var(--accent-green)" : "var(--accent-red)"
                           }}>
                             {lu.condition === "GOOD" ? "✅ KONDISI BAIK" : lu.condition === "DAMAGED" ? "⚠️ LAPORAN RUSAK" : "❌ LAPORAN HILANG"}
                           </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
              </div>
            </div>

          </div>

          {/* SIDEBAR COLUMN */}
          <div style={{ position: "sticky", top: 32, display: "flex", flexDirection: "column", gap: 24 }}>
             
             {/* 1. Borrower Info Card */}
             <div className="detail-section" style={{ padding: 28, borderRadius: 24 }}>
                <div style={{ textAlign: "center", marginBottom: 24 }}>
                   <div style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--accent-purple)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem", fontWeight: 800, margin: "0 auto 12px" }}>
                      {loan.user?.name?.[0]?.toUpperCase()}
                   </div>
                   <div style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--sidebar-navy)" }}>{loan.user?.name}</div>
                   <div style={{ fontSize: "0.85rem", opacity: 0.6 }}>{loan.user?.email}</div>
                   <span className="badge badge-peminjam" style={{ marginTop: 8, fontSize: "0.65rem" }}>{loan.user?.role}</span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 16, borderTop: "1px solid var(--border-light)", paddingTop: 24 }}>
                   <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 700 }}>TGL PENGAJUAN</span>
                      <span style={{ fontSize: "0.85rem", fontWeight: 800 }}>{new Date(loan.createdAt).toLocaleDateString("id-ID")}</span>
                   </div>
                   <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 700 }}>TENGGAT KEMBALI</span>
                      <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--accent-red)" }}>{new Date(loan.dueDate).toLocaleDateString("id-ID")}</span>
                   </div>
                </div>
             </div>

             {/* 2. Financial Summary (If Returned) */}
             {loan.return_ && (
               <div className="detail-section" style={{ padding: 28, borderRadius: 24, background: "rgba(239, 68, 68, 0.03)", border: "1.5px solid rgba(239, 68, 68, 0.1)" }}>
                  <div className="section-title" style={{ color: "var(--accent-red)", border: "none", padding: 0, marginBottom: 16 }}>Rincian Pengembalian</div>
                  
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                       <span>Denda Terlambat</span>
                       <span style={{ fontWeight: 800 }}>{formatCurrency(loan.return_.fineLate)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem" }}>
                       <span>Denda Kerusakan</span>
                       <span style={{ fontWeight: 800 }}>{formatCurrency(loan.return_.fineDamage)}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 12, borderTop: "1px solid rgba(239,68,68,0.2)", fontSize: "1.1rem", fontWeight: 900, color: "var(--accent-red)" }}>
                       <span>Total Bayar</span>
                       <span>{formatCurrency(loan.return_.fineLate + loan.return_.fineDamage)}</span>
                    </div>
                  </div>
                  
                  <div style={{ marginTop: 20, fontSize: "0.75rem", opacity: 0.7, fontStyle: "italic" }}>
                     Dikembalikan: {formatDate(loan.return_.returnedAt)}
                  </div>
               </div>
             )}

             {/* 3. Actions */}
             <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {session?.user?.role === "PEMINJAM" && loan.status === "ONGOING" && !loan.isReceived && (
                  <button 
                    className="btn btn-success" 
                    style={{ width: "100%", justifyContent: "center", padding: 14 }}
                    disabled={receiveMutation.isPending}
                    onClick={() => receiveMutation.mutate(loan.id)}
                  >
                    {receiveMutation.isPending ? "Memproses..." : "Konfirmasi Terima Barang"}
                  </button>
                )}
                
                {session?.user?.role !== "PEMINJAM" && loan.status === "APPROVED" && (
                  <button 
                    className="btn btn-success" 
                    style={{ width: "100%", justifyContent: "center", padding: 14 }}
                    disabled={pickupMutation.isPending}
                    onClick={() => pickupMutation.mutate(loan.id)}
                  >
                    {pickupMutation.isPending ? "Memproses..." : "Tandai Sudah Diambil (Pickup)"}
                  </button>
                )}
                
                <button onClick={() => window.print()} className="btn btn-secondary" style={{ width: "100%", justifyContent: "center", padding: 14 }}>
                  Cetak Bukti Pinjam
                </button>
             </div>

          </div>

        </div>
      </div>
    </div>
  );
}
