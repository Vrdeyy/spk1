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

  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDetailAlert, setShowDetailAlert] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("");

  // Approval form state
  const [approvalForm, setApprovalForm] = useState({
    action: "APPROVED" as "APPROVED" | "REJECTED",
    noteAdmin: "",
    items: [] as { loanItemId: string; qtyApproved: number }[],
  });

  // Return form state
  const [returnForm, setReturnForm] = useState({
    note: "",
    damagedUnitIds: [] as string[],
    fineDamage: 0,
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

  // RETURN (user initiates)
  const returnMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetch(`/api/loans/${id}/return`, {
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
      setShowReturnModal(false);
    },
  });

  // FINALIZE return (admin/petugas)
  const finalizeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetch(`/api/loans/${id}/return`, {
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
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      setShowReturnModal(false);
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

  // Open return modal
  const openReturn = (loan: any, isFinalize: boolean = false) => {
    setSelectedLoan({ ...loan, isFinalize });
    
    // Pre-populate units that are already marked as DAMAGED (from user report or previous check)
    const initialDamaged = loan.loanUnits
      ?.filter((lu: any) => lu.toolUnit?.status === "DAMAGED")
      .map((lu: any) => lu.toolUnitId) || [];

    setReturnForm({ 
      note: loan.isFinalize ? "" : (loan.return_?.note || ""), 
      damagedUnitIds: initialDamaged, 
      fineDamage: loan.return_?.fineDamage || 0 
    });
    setShowReturnModal(true);
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
                        {loan.status === "ONGOING" && (loan.return_ ? "Diperiksa" : "Sedang Dipinjam")}
                        {loan.status === "AWAITING_FINE" && "Butuh Penilaian"}
                        {loan.status === "DONE" && "Selesai"}
                        {loan.status === "REJECTED" && "Ditolak"}
                      </span>
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

                        {isPeminjam && loan.status === "ONGOING" && !loan.return_ && (
                          <button className="btn btn-warning btn-sm" onClick={() => openReturn(loan)}>
                            Kembali
                          </button>
                        )}

                        {isStaff && loan.status === "ONGOING" && (
                          <button className="btn btn-success btn-sm" onClick={() => openReturn(loan, true)}>
                            {loan.return_ ? "Selesaikan" : "Selesaikan (Langsung)"}
                          </button>
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

      {/* ========== RETURN MODAL ========== */}
      {showReturnModal && selectedLoan && (
        <div className="modal-overlay" onClick={() => setShowReturnModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedLoan.isFinalize ? "Selesaikan Pengembalian" : "Kembalikan Barang"}</h2>
              <button className="modal-close" onClick={() => setShowReturnModal(false)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {(() => {
                const now = new Date();
                const due = new Date(selectedLoan.dueDate);
                const isLate = now > due;
                const diffDays = isLate ? Math.ceil((now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)) : 0;
                return isLate ? (
                  <div className="alert alert-error" style={{ borderRadius: 16 }}>
                    ⚠️ <strong>Terlambat {diffDays} hari!</strong> Denda keterlambatan akan dihitung otomatis.
                  </div>
                ) : null;
              })()}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                {selectedLoan.return_ && (
                  <div className="detail-section" style={{ background: "white", border: "1px solid var(--border-light)", height: "100%", display: "flex", flexDirection: "column" }}>
                    <div className="section-title" style={{ padding: "16px 20px", background: "rgba(0,0,0,0.02)" }}>Informasi Pelaporan User</div>
                    <div style={{ padding: "20px", flex: 1, display: "flex", flexDirection: "column", gap: 20 }}>
                      <div>
                        <div className="label" style={{ marginBottom: 10, fontSize: "0.65rem", letterSpacing: 1 }}>PESAN USER</div>
                        <div style={{ 
                          background: "var(--bg-main)", 
                          padding: "16px", 
                          borderRadius: "16px", 
                          fontSize: "0.9rem", 
                          fontStyle: "italic",
                          color: "var(--sidebar-navy)",
                          lineHeight: 1.6,
                          position: "relative",
                          border: "1px solid var(--border-light)"
                        }}>
                          "{selectedLoan.return_.note || "Tidak ada pesan tambahan dari peminjam."}"
                        </div>
                      </div>

                      <div className="detail-grid" style={{ gridTemplateColumns: "1fr 1fr", borderTop: "1px solid var(--border-light)", paddingTop: 16 }}>
                        <div className="detail-item">
                          <div className="label">Denda Telat</div>
                          <div className="value" style={{ color: selectedLoan.return_.fineLate > 0 ? "var(--accent-red)" : "inherit", fontWeight: 800 }}>
                            {formatCurrency(selectedLoan.return_?.fineLate || 0)}
                          </div>
                        </div>
                        <div className="detail-item">
                          <div className="label">Tgl Kembali</div>
                          <div className="value" style={{ fontWeight: 600 }}>{formatDate(selectedLoan.return_?.returnedAt)}</div>
                        </div>
                      </div>

                      {selectedLoan.loanUnits?.some((lu: any) => lu.toolUnit?.status === "DAMAGED") && (
                        <div style={{ 
                          marginTop: "auto",
                          padding: "12px 16px", 
                          borderRadius: "12px", 
                          background: "rgba(239, 68, 68, 0.08)", 
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10
                        }}>
                           <span style={{ fontSize: "1.2rem" }}>⚠️</span>
                           <div style={{ fontSize: "0.75rem", color: "#b91c1c", lineHeight: 1.5 }}>
                              <strong style={{ display: "block", marginBottom: 2 }}>Laporan Kerusakan User:</strong>
                              Unit {selectedLoan.loanUnits.filter((lu: any) => lu.toolUnit?.status === "DAMAGED").map((lu: any) => lu.toolUnit?.code).join(", ")}
                           </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedLoan.isFinalize && (
                  <div className="detail-section" style={{ 
                    background: "rgba(239, 68, 68, 0.02)", 
                    borderColor: "rgba(239, 68, 68, 0.1)",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column"
                  }}>
                     <div className="section-title" style={{ color: "var(--accent-red)", padding: "16px 20px", background: "rgba(239, 68, 68, 0.05)" }}>Penilaian Denda Kerusakan</div>
                     <div style={{ padding: "40px 24px", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center" }}>
                        <div className="form-group" style={{ width: "100%", maxWidth: 240 }}>
                           <input
                             type="number"
                             className="form-input"
                             min={0}
                             placeholder="Nominal"
                             disabled={!isAdmin}
                             value={returnForm.fineDamage}
                             style={{ 
                               fontSize: "2rem", 
                               fontWeight: 900, 
                               color: "var(--accent-red)", 
                               textAlign: "center", 
                               height: "auto",
                               padding: "20px",
                               borderRadius: "24px",
                               background: isAdmin ? "white" : "rgba(255,255,255,0.5)",
                               border: "3px solid rgba(239, 68, 68, 0.2)",
                               boxShadow: "0 10px 25px -5px rgba(239, 68, 68, 0.1)"
                             }}
                             onChange={(e) => setReturnForm({ ...returnForm, fineDamage: parseInt(e.target.value) || 0 })}
                           />
                           <div style={{ 
                             fontSize: "0.7rem", 
                             color: "var(--accent-red)", 
                             marginTop: 20, 
                             fontWeight: 800, 
                             letterSpacing: "0.5px",
                             textTransform: "uppercase",
                             opacity: 0.7
                           }}>
                             {isAdmin ? "Input Nominal Denda Kerusakan" : "Denda Hanya Bisa Diisi Admin"}
                           </div>
                        </div>
                     </div>
                  </div>
                )}
              </div>

              {selectedLoan.loanUnits?.length > 0 && (
                <div className="detail-section" style={{ border: "1px solid var(--border-light)", background: "white" }}>
                  <div className="section-title" style={{ padding: "12px 20px", background: "rgba(0,0,0,0.02)", fontSize: "0.75rem" }}>Update Kondisi Unit Fisik</div>
                  <div style={{ padding: "24px" }}>
                    <div className="unit-chips" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 12 }}>
                      {selectedLoan.loanUnits.map((lu: any) => {
                        const isSelected = returnForm.damagedUnitIds.includes(lu.toolUnitId);
                        return (
                          <div
                            key={lu.id}
                            className={`unit-chip ${isSelected ? "badge-damaged" : "badge-available"}`}
                            style={{ 
                              cursor: "pointer", 
                              padding: "14px", 
                              borderRadius: "16px", 
                              fontWeight: 800, 
                              display: "flex", 
                              alignItems: "center", 
                              justifyContent: "space-between",
                              gap: 8, 
                              border: isSelected ? "2px solid #ef4444" : "2px solid var(--border-light)",
                              background: isSelected ? "rgba(239, 68, 68, 0.05)" : "white",
                              transition: "all 0.2s ease"
                            }}
                            onClick={() => {
                              setReturnForm(prev => ({
                                ...prev,
                                damagedUnitIds: prev.damagedUnitIds.includes(lu.toolUnitId) ? prev.damagedUnitIds.filter(id => id !== lu.toolUnitId) : [...prev.damagedUnitIds, lu.toolUnitId]
                              }));
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                               <span style={{ opacity: 0.4, fontSize: "0.8rem" }}>#</span>
                               <span style={{ fontSize: "0.9rem" }}>{lu.toolUnit?.code}</span>
                            </div>
                            {isSelected && <span style={{ fontSize: "1rem" }}>⚠️</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label style={{ fontWeight: 800, fontSize: "0.75rem", textTransform: "uppercase", marginBottom: 8, display: "block" }}>Catatan Pengembalian</label>
                <textarea
                  className="form-input"
                  placeholder="Catatan kondisi saat diterima..."
                  value={returnForm.note}
                  style={{ minHeight: 80 }}
                  onChange={(e) => setReturnForm({ ...returnForm, note: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowReturnModal(false)}>Batal</button>
              <button 
                className="btn btn-primary" 
                onClick={() => {
                  if (selectedLoan.isFinalize) finalizeMutation.mutate({ id: selectedLoan.id, data: returnForm });
                  else returnMutation.mutate({ id: selectedLoan.id, data: returnForm });
                }}
                disabled={finalizeMutation.isPending || returnMutation.isPending}
              >
                Konfirmasi
              </button>
            </div>
          </div>
        </div>
      )}

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
                    {selectedLoan.status === "ONGOING" && (selectedLoan.return_ ? "Sedang Diperiksa" : "Sedang Dipinjam")}
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
                    <div style={{ fontWeight: 800, fontSize: "0.75rem", textTransform: "uppercase", marginBottom: 12, color: "var(--text-muted)" }}>Unit Fisik:</div>
                    <div className="unit-chips">
                       {selectedLoan.loanUnits.map((lu: any) => (
                         <span key={lu.id} className={`unit-chip badge-${lu.toolUnit?.status?.toLowerCase()}`}>{lu.toolUnit?.code}</span>
                       ))}
                    </div>
                  </div>
                )}
              </div>

              {selectedLoan.return_ && (
                <div className="detail-section">
                  <div className="section-title">Detail Pengembalian</div>
                  <div className="detail-grid">
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
