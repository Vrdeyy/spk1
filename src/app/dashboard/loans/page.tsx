"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

export default function LoansPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const role = session?.user?.role;
  const isStaff = role === "ADMIN" || role === "PETUGAS";
  const isPeminjam = role === "PEMINJAM";
  const isAdmin = role === "ADMIN";
  const isPetugas = role === "PETUGAS";

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDetailAlert, setShowDetailAlert] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const [approvalForm, setApprovalForm] = useState({
    action: "APPROVED" as "APPROVED" | "REJECTED",
    noteAdmin: "",
    items: [] as { loanItemId: string; qtyApproved: number }[],
  });

  const { data: loans, isLoading } = useQuery({
    queryKey: ["loans", statusFilter],
    queryFn: () =>
      fetch(
        `/api/loans${statusFilter ? `?status=${statusFilter}` : ""}`
      ).then((r) => r.json()),
  });

  const { data: tools } = useQuery({
    queryKey: ["tools"],
    queryFn: () => fetch("/api/tools").then((r) => r.json()),
  });

  // APPROVE/REJECT loan
  const approvalMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetch(`/api/loans/${id}`, {
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
      setShowApprovalModal(false);
    },
  });

  // PICKUP loan (APPROVED -> ONGOING)
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
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["tools"] });
    },
  });

  // RECEIVE loan (User confirms receipt)
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
      queryClient.invalidateQueries({ queryKey: ["loans"] });
    },
  });

  // PAYMENT STATUS (Admin only)
  const paymentMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "PAID" | "UNPAID" }) =>
      fetch(`/api/loans/${id}/payment`, {
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
      queryClient.invalidateQueries({ queryKey: ["loans"] });
    },
  });

  // DELETE loan (admin only)
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/loans/${id}`, { method: "DELETE" }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.error);
        }
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["tools"] });
    },
  });

  // Open approval modal
  const openApproval = (loan: any) => {
    setSelectedLoan(loan);
    setApprovalForm({
      action: "APPROVED",
      noteAdmin: "",
      items: loan.items.map((item: any) => ({
        loanItemId: item.id,
        qtyApproved: item.qtyRequested,
      })),
    });
    setShowApprovalModal(true);
  };

  // Open detail
  const openDetail = (loan: any) => {
    setSelectedLoan(loan);
    setShowDetailAlert(true);
    setShowDetailModal(true);
  };

  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString("id-ID") : "-";
  const formatCurrency = (n: number) => `Rp ${n.toLocaleString("id-ID")}`;

  if (isLoading) {
    return (
      <div className="page-enter">
        <div className="page-header"><div><h1>Pinjaman</h1></div></div>
        <div className="page-body"><div className="loader"><div className="spinner" /></div></div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1>Pinjaman</h1>
          <p className="description">
            {isPeminjam
              ? "Ajukan dan pantau pinjaman alat"
              : "Kelola semua pinjaman alat"}
          </p>
        </div>
        {isPeminjam && (
          <Link href="/dashboard/loans/create" className="btn btn-primary">
            + Ajukan Pinjaman
          </Link>
        )}
      </div>

      <div className="page-body">
        <div className="table-container">
          <div className="table-header">
            <h3>Daftar Pinjaman</h3>
            <div className="table-filters">
              <select
                className="form-input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">Semua Status</option>
                <option value="PENDING">Menunggu</option>
                <option value="APPROVED">Siap Diambil</option>
                <option value="ONGOING">Sedang Dipinjam</option>
                <option value="AWAITING_FINE">Butuh Penilaian</option>
                <option value="DISPUTE">Sengketa</option>
                <option value="DONE">Selesai</option>
                <option value="REJECTED">Ditolak</option>
              </select>
            </div>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {(isAdmin || isStaff) && <th>Peminjam</th>}
                  <th>Alat & Barang</th>
                  <th>Status</th>
                  <th>Tgl Pinjam</th>
                  <th>Tenggat</th>
                  <th style={{ textAlign: "right" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {loans?.map((loan: any) => (
                  <tr key={loan.id}>
                    {(isAdmin || isStaff) && (
                      <td>
                        <div className="td-user">
                          <div className="td-user-avatar">
                            {loan.user?.name?.[0]?.toUpperCase()}
                          </div>
                          <div className="td-user-name">{loan.user?.name}</div>
                        </div>
                      </td>
                    )}
                    <td>
                      <div className="td-item-info">
                        {loan.items?.map((item: any) => (
                          <div key={item.id} className="td-item-main">
                            {item.tool?.name} <span className="td-item-sub">× {loan.status === "PENDING" ? item.qtyRequested : (item.qtyApproved || item.qtyRequested)}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${(loan.status === "ONGOING" && loan.return_) ? "pending" : loan.status === "AWAITING_FINE" ? "warning" : loan.status?.toLowerCase()}`}>
                        {loan.status === "PENDING" && "Menunggu"}
                        {loan.status === "APPROVED" && "Siap Diambil"}
                        {loan.status === "ONGOING" && (
                          loan.return_ ? "Diperiksa" : 
                          loan.isReceived ? "Sedang Dipinjam" : "Menunggu Konfirmasi"
                        )}
                        {loan.status === "AWAITING_FINE" && "Butuh Penilaian"}
                        {loan.status === "DISPUTE" && "Sengketa"}
                        {loan.status === "DONE" && "Selesai"}
                        {loan.status === "REJECTED" && "Ditolak"}
                      </span>
                      {loan.return_ && (loan.return_.fineLate > 0 || loan.return_.fineDamage > 0) && (
                        <div style={{ marginTop: 4 }}>
                          <span style={{ 
                            fontSize: "0.6rem", 
                            fontWeight: 900, 
                            padding: "2px 6px", 
                            borderRadius: "6px",
                            background: loan.return_.paymentStatus === "PAID" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                            color: loan.return_.paymentStatus === "PAID" ? "var(--accent-green)" : "var(--accent-red)",
                            border: `1px solid ${loan.return_.paymentStatus === "PAID" ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`
                          }}>
                            {loan.return_.paymentStatus === "PAID" ? "LUNAS" : "BELUM LUNAS"}
                          </span>
                        </div>
                      )}
                    </td>
                    <td>{formatDate(loan.createdAt)}</td>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--sidebar-navy)" }}>
                        {formatDate(loan.dueDate)}
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="btn-group" style={{ justifyContent: "flex-end" }}>
                        <Link href={`/dashboard/loans/${loan.id}`} className="btn btn-secondary btn-sm">
                          Detail
                        </Link>

                        {isAdmin && (
                          <>
                            <Link href={`/dashboard/loans/${loan.id}/edit`} className="btn btn-warning btn-sm">
                              Edit
                            </Link>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => {
                                if (confirm("Hapus data pinjaman ini secara permanen?"))
                                  deleteMutation.mutate(loan.id);
                              }}
                            >
                              Hapus
                            </button>
                          </>
                        )}

                        {isStaff && loan.status === "PENDING" && (
                          <button className="btn btn-primary btn-sm" onClick={() => openApproval(loan)}>
                            Proses
                          </button>
                        )}

                        {isStaff && loan.status === "APPROVED" && (
                          <button
                            className="btn btn-success btn-sm"
                            disabled={pickupMutation.isPending}
                            onClick={() => pickupMutation.mutate(loan.id)}
                          >
                            Tandai Diambil
                          </button>
                        )}

                        {isPeminjam && loan.status === "ONGOING" && !loan.isReceived && (
                          <button 
                            className="btn btn-success btn-sm" 
                            disabled={receiveMutation.isPending}
                            onClick={() => receiveMutation.mutate(loan.id)}
                          >
                            {receiveMutation.isPending ? "..." : "Konfirmasi Terima"}
                          </button>
                        )}

                        {isStaff && (loan.status === "AWAITING_FINE" || loan.status === "DISPUTE") && isAdmin && (
                          <Link href={`/dashboard/loans/${loan.id}/return`} className="btn btn-danger btn-sm">
                            {loan.status === "DISPUTE" ? "Selesaikan Sengketa" : "Tentukan Denda"}
                          </Link>
                        )}

                        {isStaff && loan.status === "AWAITING_FINE" && !isAdmin && (
                          <Link href={`/dashboard/loans/${loan.id}/return`} className="btn btn-secondary btn-sm">
                            Cek Ulang
                          </Link>
                        )}

                        {/* Button: Return Request (Staff Side - for Inspection) */}
                        {isStaff && loan.status === "ONGOING" && loan.return_ && (
                          <>
                            {!loan.isReceived && !isAdmin ? (
                              <span className="badge badge-warning" style={{ fontSize: "0.65rem" }}>Menunggu Konfirmasi User</span>
                            ) : (
                              <Link
                                href={`/dashboard/loans/${loan.id}/return`}
                                className="btn btn-warning btn-sm"
                              >
                                Periksa Barang
                              </Link>
                            )}
                          </>
                        )}

                        {isPeminjam && loan.status === "ONGOING" && loan.isReceived && !loan.return_ && (
                          <Link href={`/dashboard/loans/${loan.id}/return`} className="btn btn-warning btn-sm">
                            Kembali
                          </Link>
                        )}

                        {isStaff && loan.status === "ONGOING" && !loan.return_ && (
                          <Link href={`/dashboard/loans/${loan.id}/return`} className="btn btn-success btn-sm">
                            Selesaikan
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {(!loans || loans.length === 0) && (
                  <tr>
                    <td colSpan={7} className="table-empty">
                      <div className="icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ opacity: 0.3 }}>
                          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/>
                        </svg>
                      </div>
                      <div>Belum ada data pinjaman</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ========== APPROVAL MODAL ========== */}
      {showApprovalModal && selectedLoan && (
        <div className="modal-overlay" onClick={() => setShowApprovalModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Proses Pinjaman</h2>
              <button className="modal-close" onClick={() => setShowApprovalModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div className="detail-section" style={{ background: "var(--bg-main)", border: "none" }}>
                <div className="section-title">Profil Peminjam</div>
                <div className="detail-grid" style={{ padding: "16px 20px" }}>
                  <div className="detail-item">
                    <div className="label">Nama Lengkap</div>
                    <div className="value" style={{ color: "var(--accent-purple)" }}>{selectedLoan.user?.name}</div>
                  </div>
                  <div className="detail-item">
                    <div className="label">Diajukan Pada</div>
                    <div className="value">{formatDate(selectedLoan.createdAt)}</div>
                  </div>
                  <div className="detail-item">
                    <div className="label">Rencana Kembali</div>
                    <div className="value" style={{ color: "var(--accent-red)" }}>{formatDate(selectedLoan.dueDate)}</div>
                  </div>
                  <div className="detail-item">
                    <div className="label">Alasan</div>
                    <div className="value">{selectedLoan.reason}</div>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <div className="section-title">Daftar Alat yang Diminta</div>
                <div className="loan-items-list" style={{ padding: 0 }}>
                  {selectedLoan.items?.map((item: any) => {
                    const formItem = approvalForm.items.find(i => i.loanItemId === item.id);
                    return (
                      <div key={item.id} className="loan-item-row" style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-light)" }}>
                        <div className="loan-item-info">
                          <div className="tool-name" style={{ fontWeight: 800 }}>{item.tool?.name}</div>
                          <div className="tool-brand" style={{ fontSize: "0.75rem", opacity: 0.7 }}>
                            {item.tool?.brand} • Diminta: <span style={{ fontWeight: 800, color: "var(--sidebar-navy)" }}>{item.qtyRequested} Unit</span>
                          </div>
                        </div>
                        <div className="loan-item-qty" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", color: "var(--text-muted)" }}>Setujui:</span>
                          <input
                            type="number"
                            className="form-input approval-qty-input"
                            min={0}
                            max={item.qtyRequested}
                            value={formItem?.qtyApproved || 0}
                            style={{ width: 80, textAlign: "center", padding: "8px", borderRadius: 10, fontWeight: 800 }}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setApprovalForm(prev => ({
                                ...prev,
                                items: prev.items.map(i => i.loanItemId === item.id ? { ...i, qtyApproved: val } : i)
                              }));
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 800, fontSize: "0.75rem", textTransform: "uppercase", marginBottom: 8, display: "block" }}>Catatan & Instruksi Admin</label>
                <textarea
                  className="form-input"
                  placeholder="Instruksi tambahan untuk pengambilan barang..."
                  value={approvalForm.noteAdmin}
                  style={{ minHeight: 80 }}
                  onChange={(e) => setApprovalForm({ ...approvalForm, noteAdmin: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-danger" 
                onClick={() => approvalMutation.mutate({ id: selectedLoan.id, data: { ...approvalForm, action: "REJECTED" } })}
                disabled={approvalMutation.isPending}
              >
                Tolak
              </button>
              <button 
                className="btn btn-success" 
                onClick={() => approvalMutation.mutate({ id: selectedLoan.id, data: { ...approvalForm, action: "APPROVED" } })}
                disabled={approvalMutation.isPending}
              >
                {approvalMutation.isPending ? "Memproses..." : "Setujui"}
              </button>
            </div>
          </div>
        </div>
      )}

<div style={{ display: "none" }}>Modal Removed</div>

      {/* ========== DETAIL MODAL ========== */}
      {showDetailModal && selectedLoan && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal" style={{ maxWidth: 800 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Detail Pinjaman</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              {/* Dismissible Alert Box */}
              {showDetailAlert && (
                 <div className="alert-premium" style={{ marginBottom: 24, animation: "fadeIn 0.5s ease-out" }}>
                   <div style={{ flex: 1 }}>
                     <div style={{ fontWeight: 800, fontSize: "1rem", marginBottom: 4 }}>Informasi Aset</div>
                     <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>Pastikan barang dicek kembali saat pengembalian untuk menghindari denda kerusakan.</div>
                   </div>
                   <button className="alert-close" onClick={() => setShowDetailAlert(false)}>✕</button>
                 </div>
              )}

              <div className="detail-grid" style={{ marginBottom: 24 }}>
                <div className="detail-item">
                  <div className="label">ID Pinjaman</div>
                  <div className="value">#{selectedLoan.id.slice(-8).toUpperCase()}</div>
                </div>
                <div className="detail-item">
                  <div className="label">Status</div>
                  <span className={`badge badge-${(selectedLoan.status === "ONGOING" && selectedLoan.return_) ? "pending" : selectedLoan.status === "AWAITING_FINE" ? "warning" : selectedLoan.status?.toLowerCase()}`}>
                    {selectedLoan.status === "PENDING" && "Menunggu"}
                    {selectedLoan.status === "APPROVED" && "Siap Diambil"}
                    {selectedLoan.status === "ONGOING" && (
                      selectedLoan.return_ ? "Sedang Diperiksa" : 
                      selectedLoan.isReceived ? "Sedang Dipinjam" : "Menunggu Konfirmasi"
                    )}
                    {selectedLoan.status === "AWAITING_FINE" && "Butuh Penilaian"}
                    {selectedLoan.status === "DONE" && "Selesai"}
                    {selectedLoan.status === "REJECTED" && "Ditolak"}
                  </span>
                </div>
                <div className="detail-item">
                  <div className="label">Peminjam</div>
                  <div className="value">{selectedLoan.user?.name}</div>
                </div>
                <div className="detail-item">
                  <div className="label">Tenggat</div>
                  <div className="value">{formatDate(selectedLoan.dueDate)}</div>
                </div>
              </div>

              <div className="detail-section">
                <div className="section-title">Barang & Unit</div>
                <div className="table-wrapper">
                   <table style={{ margin: 0, background: "transparent" }}>
                     <tbody>
                        {selectedLoan.items?.map((item: any) => (
                          <tr key={item.id} style={{ boxShadow: "none", background: "transparent" }}>
                            <td>
                              <div style={{ fontWeight: 800 }}>{item.tool?.name}</div>
                              <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>{item.tool?.brand}</div>
                            </td>
                            <td style={{ textAlign: "right", fontWeight: 800 }}>{item.qtyApproved || item.qtyRequested} Unit</td>
                          </tr>
                        ))}
                     </tbody>
                   </table>
                </div>
                
                 {selectedLoan.loanUnits?.length > 0 && (
                  <div style={{ padding: "20px", borderTop: "1px solid var(--border-light)" }}>
                    <div style={{ fontWeight: 800, fontSize: "0.75rem", textTransform: "uppercase", marginBottom: 12, color: "var(--text-muted)" }}>Rincian Unit Fisik:</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                       {selectedLoan.loanUnits.map((lu: any) => (
                         <div key={lu.id} style={{ 
                           display: "flex", 
                           alignItems: "center", 
                           justifyContent: "space-between",
                           padding: "10px 14px",
                           background: "var(--bg-main)",
                           borderRadius: 12,
                           border: "1px solid var(--border-light)"
                         }}>
                           <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                             <span className={`badge badge-${lu.toolUnit?.status?.toLowerCase()}`} style={{ margin: 0 }}>{lu.toolUnit?.code}</span>
                             {lu.note && <span style={{ fontSize: "0.8rem", opacity: 0.7 }}>— "{lu.note}"</span>}
                           </div>
                           <span style={{ 
                             fontSize: "0.7rem", 
                             fontWeight: 800, 
                             color: lu.condition === "GOOD" ? "var(--accent-green)" : "var(--accent-red)",
                             background: lu.condition === "GOOD" ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)",
                             padding: "4px 8px",
                             borderRadius: 6,
                             textTransform: "uppercase"
                           }}>
                             {lu.condition === "GOOD" ? "✅ Baik" : lu.condition === "DAMAGED" ? "⚠️ Rusak" : "❌ Hilang"}
                           </span>
                         </div>
                       ))}
                    </div>
                  </div>
                )}
              </div>

              {selectedLoan.return_ && (selectedLoan.return_.fineLate > 0 || selectedLoan.return_.fineDamage > 0) && (
                <div className="detail-section" style={{ 
                  padding: "24px", 
                  background: selectedLoan.return_.paymentStatus === "PAID" ? "rgba(16, 185, 129, 0.05)" : "rgba(239, 68, 68, 0.05)", 
                  borderRadius: "24px",
                  border: selectedLoan.return_.paymentStatus === "PAID" ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center"
                }}>
                  <div>
                    <div style={{ fontSize: "0.7rem", fontWeight: 800, opacity: 0.6, marginBottom: 4 }}>STATUS PEMBAYARAN DENDA</div>
                    <div style={{ 
                      fontSize: "1.1rem", 
                      fontWeight: 900, 
                      color: selectedLoan.return_.paymentStatus === "PAID" ? "var(--accent-green)" : "var(--accent-red)" 
                    }}>
                      {selectedLoan.return_.paymentStatus === "PAID" ? "✅ LUNAS" : "❌ BELUM LUNAS"}
                    </div>
                    {selectedLoan.return_.paymentStatus === "PAID" && selectedLoan.return_.paidAt && (
                      <div style={{ fontSize: "0.65rem", fontWeight: 700, opacity: 0.6, marginTop: 4 }}>
                        Lunas pada: {formatDate(selectedLoan.return_.paidAt)}
                      </div>
                    )}
                  </div>
                  {isAdmin && (
                    <button 
                      className={`btn btn-${selectedLoan.return_.paymentStatus === "PAID" ? "secondary" : "success"} btn-sm`}
                      disabled={paymentMutation.isPending}
                      onClick={() => paymentMutation.mutate({ 
                        id: selectedLoan.id, 
                        status: selectedLoan.return_.paymentStatus === "PAID" ? "UNPAID" : "PAID" 
                      })}
                    >
                      {paymentMutation.isPending ? "..." : selectedLoan.return_.paymentStatus === "PAID" ? "Batalkan Lunas" : "Tandai Lunas"}
                    </button>
                  )}
                </div>
              )}

              {selectedLoan.return_ && (
                <div className="detail-section">
                  <div className="section-title">Detail Pengembalian</div>
                  <div style={{ padding: "0 24px 24px 24px", display: "flex", flexDirection: "column", gap: 20 }}>
                    {/* Buyer Message */}
                    <div>
                      <div className="label" style={{ marginBottom: 8, fontSize: "0.65rem", letterSpacing: 1 }}>PESAN PEMINJAM</div>
                      <div style={{ 
                        background: "var(--bg-main)", 
                        padding: "16px", 
                        borderRadius: "16px", 
                        fontSize: "0.85rem", 
                        fontStyle: "italic",
                        color: "var(--sidebar-navy)",
                        border: "1px solid var(--border-light)"
                      }}>
                        "{selectedLoan.return_.note || "Tidak ada pesan dari peminjam."}"
                      </div>
                    </div>

                    {/* Staff Inspection Note */}
                    {selectedLoan.return_.inspectionNote && (
                      <div>
                        <div className="label" style={{ marginBottom: 8, fontSize: "0.65rem", letterSpacing: 1, color: "var(--accent-purple)" }}>CATATAN PETUGAS (INSPEKSI)</div>
                        <div style={{ 
                          background: "rgba(124, 58, 237, 0.03)", 
                          padding: "16px", 
                          borderRadius: "16px", 
                          fontSize: "0.85rem", 
                          color: "var(--sidebar-navy)",
                          border: "1px solid rgba(124, 58, 237, 0.2)"
                        }}>
                          {selectedLoan.return_.inspectionNote}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="detail-grid" style={{ borderTop: "1px solid var(--border-light)", paddingTop: 16 }}>
                    <div className="detail-item">
                      <div className="label">Dikembalikan</div>
                      <div className="value">{formatDate(selectedLoan.return_.returnedAt)}</div>
                    </div>
                    <div className="detail-item">
                      <div className="label">Denda Telat</div>
                      <div className="value">{formatCurrency(selectedLoan.return_.fineLate)}</div>
                    </div>
                    <div className="detail-item">
                      <div className="label">Denda Kerusakan</div>
                      <div className="value">{formatCurrency(selectedLoan.return_.fineDamage)}</div>
                    </div>
                    <div className="detail-item">
                      <div className="label">Total Denda</div>
                      <div className="value" style={{ color: "var(--accent-red)", fontWeight: 800 }}>{formatCurrency(selectedLoan.return_.fineLate + selectedLoan.return_.fineDamage)}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowDetailModal(false)}>Tutup</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
