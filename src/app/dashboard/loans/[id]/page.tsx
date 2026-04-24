"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function LoanDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const loanId = params.id as string;

  const { data: loan, isLoading, isError } = useQuery({
    queryKey: ["loan", loanId],
    queryFn: () => fetch(`/api/loans/${loanId}`).then((r) => r.json()),
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
      <div className="page-header" style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <button onClick={() => router.back()} className="btn btn-secondary btn-sm" style={{ padding: "8px 12px" }}>
            ← Kembali
          </button>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <h1 style={{ marginBottom: 0 }}>Detail Pinjaman #{loanId.slice(-6).toUpperCase()}</h1>
              <span className={`badge badge-${(loan.status === "ONGOING" && loan.return_) ? "pending" : loan.status === "AWAITING_FINE" ? "warning" : loan.status?.toLowerCase()}`}>
                {loan.status === "PENDING" && "Menunggu"}
                {loan.status === "APPROVED" && "Siap Diambil"}
                {loan.status === "ONGOING" && (loan.return_ ? "Sedang Diperiksa" : "Sedang Dipinjam")}
                {loan.status === "AWAITING_FINE" && "Butuh Penilaian"}
                {loan.status === "DONE" && "Selesai"}
                {loan.status === "REJECTED" && "Ditolak"}
              </span>
            </div>
            <p className="description">Laporan lengkap riwayat dan status aset yang dipinjam.</p>
          </div>
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

            {/* 2. Physical Units (If Picked Up) */}
            {loan.loanUnits?.length > 0 && (
              <div className="detail-section">
                <div className="section-title">Unit Fisik yang Diterima</div>
                <div style={{ padding: 24 }}>
                  <div className="unit-chips" style={{ gap: 12 }}>
                    {loan.loanUnits.map((lu: any) => (
                      <div key={lu.id} className={`unit-chip badge-${lu.toolUnit?.status?.toLowerCase()}`} 
                           style={{ padding: "12px 20px", borderRadius: 14, fontSize: "0.9rem", fontWeight: 800, border: "2px solid rgba(0,0,0,0.05)" }}>
                        <span style={{ opacity: 0.5, marginRight: 4 }}>#</span>{lu.toolUnit?.code}
                      </div>
                    ))}
                  </div>
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
                    <div style={{ fontWeight: 800, fontSize: "0.75rem", textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>Catatan Admin:</div>
                    <div style={{ background: "rgba(107, 114, 255, 0.05)", padding: 16, borderRadius: 12, lineHeight: 1.6, border: "1px dashed var(--accent-purple)", color: "var(--sidebar-navy)" }}>
                      {loan.noteAdmin}
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

             {/* 3. Actions (If Staff) */}
             {session?.user?.role !== "PEMINJAM" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                   {loan.status === "APPROVED" && (
                     <button className="btn btn-success" style={{ width: "100%", justifyContent: "center", padding: 14 }}>
                        Tandai Sudah Diambil
                     </button>
                   )}
                   <button onClick={() => window.print()} className="btn btn-secondary" style={{ width: "100%", justifyContent: "center", padding: 14 }}>
                      Cetak Bukti Pinjam
                   </button>
                </div>
             )}

          </div>

        </div>
      </div>
    </div>
  );
}
