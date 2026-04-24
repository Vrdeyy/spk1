"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function LoansPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const role = session?.user?.role;
  const isStaff = role === "ADMIN" || role === "PETUGAS";
  const isPeminjam = role === "PEMINJAM";

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAdminEditModal, setShowAdminEditModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState("");

  // Create loan form state
  const [loanForm, setLoanForm] = useState({
    reason: "",
    dueDate: "",
    items: [] as { toolId: string; qtyRequested: number }[],
  });

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

  // Admin edit form state
  const [adminEditForm, setAdminEditForm] = useState({
    reason: "",
    dueDate: "",
    status: "PENDING" as any,
    items: [] as { id?: string; toolId: string; qtyRequested: number; qtyApproved: number }[],
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

  // CREATE loan
  const createMutation = useMutation({
    mutationFn: (data: any) =>
      fetch("/api/loans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.error || "Gagal membuat pinjaman");
        }
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      setShowCreateModal(false);
      setLoanForm({ reason: "", dueDate: "", items: [] });
    },
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

  // ADMIN UPDATE loan
  const adminUpdateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      fetch(`/api/loans/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, isEdit: true }),
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
      setShowAdminEditModal(false);
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

  // Helper: toggle tool in create form
  const toggleTool = (toolId: string) => {
    setLoanForm((prev) => {
      const exists = prev.items.find((i) => i.toolId === toolId);
      if (exists) {
        return { ...prev, items: prev.items.filter((i) => i.toolId !== toolId) };
      }
      return { ...prev, items: [...prev.items, { toolId, qtyRequested: 1 }] };
    });
  };

  const updateQty = (toolId: string, qty: number) => {
    setLoanForm((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        i.toolId === toolId ? { ...i, qtyRequested: Math.max(1, qty) } : i
      ),
    }));
  };

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
    setReturnForm({ note: "", damagedUnitIds: [], fineDamage: 0 });
    setShowReturnModal(true);
  };

  // Open detail
  const openDetail = (loan: any) => {
    setSelectedLoan(loan);
    setShowDetailModal(true);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString("id-ID");
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
          <button
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            + Ajukan Pinjaman
          </button>
        )}
      </div>

      <div className="page-body">
        {/* Filters */}
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
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="ONGOING">Ongoing</option>
                <option value="DONE">Done</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                {isStaff && <th>Peminjam</th>}
                <th>Barang</th>
                <th>Alasan</th>
                <th>Status</th>
                <th>Tanggal</th>
                <th>Tenggat</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loans?.map?.((loan: any) => (
                <tr key={loan.id}>
                  {isStaff && (
                    <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                      {loan.user?.name}
                    </td>
                  )}
                  <td>
                    {loan.items?.map((item: any) => (
                      <div key={item.id} style={{ fontSize: "0.8rem" }}>
                        {item.tool?.name} × {item.qtyRequested}
                        {item.qtyApproved > 0 &&
                          item.qtyApproved !== item.qtyRequested && (
                            <span style={{ color: "var(--accent-blue)" }}>
                              {" "}
                              (disetujui: {item.qtyApproved})
                            </span>
                          )}
                      </div>
                    ))}
                  </td>
                  <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {loan.reason}
                  </td>
                  <td>
                    <span
                      className={`badge badge-${
                        loan.status === "ONGOING" && loan.return_
                          ? "warning"
                          : loan.status?.toLowerCase()
                      }`}
                    >
                      {loan.status === "ONGOING" && loan.return_
                        ? "PENGECEKAN PENGEMBALIAN"
                        : loan.status}
                    </span>
                  </td>
                  <td>{formatDate(loan.createdAt)}</td>
                  <td>{formatDate(loan.dueDate)}</td>
                  <td>
                    <div className="btn-group">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openDetail(loan)}
                      >
                        Detail
                      </button>

                      {/* Admin only: Edit & Delete */}
                      {role === "ADMIN" && (
                        <>
                          <button
                            className="btn btn-warning btn-sm"
                            onClick={() => {
                              setSelectedLoan(loan);
                              setAdminEditForm({
                                reason: loan.reason,
                                dueDate: loan.dueDate.split("T")[0],
                                status: loan.status,
                                items: loan.items.map((i: any) => ({
                                  id: i.id,
                                  toolId: i.toolId,
                                  qtyRequested: i.qtyRequested,
                                  qtyApproved: i.qtyApproved,
                                })),
                              });
                              setShowAdminEditModal(true);
                            }}
                          >
                            Edit
                          </button>
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

                      {/* Staff: Approve/Reject PENDING */}
                      {isStaff && loan.status === "PENDING" && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => openApproval(loan)}
                        >
                          Proses
                        </button>
                      )}

                      {/* Staff: Pickup APPROVED */}
                      {isStaff && loan.status === "APPROVED" && (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => {
                            if (confirm("Konfirmasi pengambilan barang?"))
                              pickupMutation.mutate(loan.id);
                          }}
                        >
                          Pickup
                        </button>
                      )}

                      {/* User: Return ONGOING (no existing return) */}
                      {isPeminjam &&
                        loan.status === "ONGOING" &&
                        !loan.return_ && (
                          <button
                            className="btn btn-warning btn-sm"
                            onClick={() => openReturn(loan)}
                          >
                            Kembalikan
                          </button>
                        )}

                      {/* Staff: Finalize return (ONGOING) */}
                      {isStaff && loan.status === "ONGOING" && (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => openReturn(loan, true)}
                        >
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
                    <div className="icon">📋</div>
                    <div>Belum ada pinjaman</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========== CREATE LOAN MODAL ========== */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div
            className="modal"
            style={{ maxWidth: 700 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Ajukan Pinjaman</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(loanForm);
              }}
            >
              <div className="modal-body">
                {createMutation.isError && (
                  <div className="alert alert-error">
                    {(createMutation.error as Error).message}
                  </div>
                )}

                <div className="form-group">
                  <label>Pilih Barang</label>
                </div>

                <div className="item-select-grid">
                  {tools
                    ?.filter((t: any) => t.stockAvailable > 0)
                    ?.map((tool: any) => {
                      const selected = loanForm.items.find(
                        (i) => i.toolId === tool.id
                      );
                      return (
                        <div
                          key={tool.id}
                          className={`item-select-card ${selected ? "selected" : ""}`}
                          onClick={() => toggleTool(tool.id)}
                        >
                          <div className="tool-name">{tool.name}</div>
                          <div className="tool-brand">
                            {tool.brand} — {tool.category?.name}
                          </div>
                          <div className="tool-stock">
                            Tersedia: {tool.stockAvailable} unit
                          </div>

                          {selected && (
                            <div
                              className="qty-control"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  updateQty(tool.id, selected.qtyRequested - 1)
                                }
                              >
                                −
                              </button>
                              <span className="qty-value">
                                {selected.qtyRequested}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateQty(
                                    tool.id,
                                    Math.min(
                                      selected.qtyRequested + 1,
                                      tool.stockAvailable
                                    )
                                  )
                                }
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>

                <div className="form-group">
                  <label>Alasan Peminjaman</label>
                  <textarea
                    className="form-input"
                    placeholder="Jelaskan alasan peminjaman..."
                    value={loanForm.reason}
                    onChange={(e) =>
                      setLoanForm({ ...loanForm, reason: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Tanggal Pengembalian</label>
                  <input
                    type="date"
                    className="form-input"
                    value={loanForm.dueDate}
                    onChange={(e) =>
                      setLoanForm({ ...loanForm, dueDate: e.target.value })
                    }
                    min={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateModal(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    createMutation.isPending || loanForm.items.length === 0
                  }
                >
                  {createMutation.isPending
                    ? "Mengirim..."
                    : `Ajukan (${loanForm.items.length} item)`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========== APPROVAL MODAL ========== */}
      {showApprovalModal && selectedLoan && (
        <div
          className="modal-overlay"
          onClick={() => setShowApprovalModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Proses Pinjaman</h2>
              <button
                className="modal-close"
                onClick={() => setShowApprovalModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {approvalMutation.isError && (
                <div className="alert alert-error">
                  {(approvalMutation.error as Error).message}
                </div>
              )}

              <div className="detail-section">
                <div className="section-title">Detail Peminjam</div>
                <div className="detail-grid">
                  <div className="detail-item">
                    <div className="label">Nama</div>
                    <div className="value">{selectedLoan.user?.name}</div>
                  </div>
                  <div className="detail-item">
                    <div className="label">Tanggal</div>
                    <div className="value">{formatDate(selectedLoan.createdAt)}</div>
                  </div>
                  <div className="detail-item">
                    <div className="label">Alasan</div>
                    <div className="value">{selectedLoan.reason}</div>
                  </div>
                  <div className="detail-item">
                    <div className="label">Tenggat</div>
                    <div className="value">{formatDate(selectedLoan.dueDate)}</div>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <div className="section-title">Barang Diminta</div>
                <div className="loan-items-list">
                  {selectedLoan.items?.map((item: any) => {
                    const formItem = approvalForm.items.find(
                      (i) => i.loanItemId === item.id
                    );
                    return (
                      <div key={item.id} className="loan-item-row">
                        <div className="loan-item-info">
                          <div className="tool-name">{item.tool?.name}</div>
                          <div className="tool-brand">
                            {item.tool?.brand} — Diminta: {item.qtyRequested}
                          </div>
                        </div>
                        <div className="loan-item-qty">
                          <span className="qty-label">Disetujui:</span>
                          <input
                            type="number"
                            className="form-input approval-qty-input"
                            min={0}
                            max={item.qtyRequested}
                            value={formItem?.qtyApproved || 0}
                            onChange={(e) => {
                              const val = parseInt(e.target.value) || 0;
                              setApprovalForm((prev) => ({
                                ...prev,
                                items: prev.items.map((i) =>
                                  i.loanItemId === item.id
                                    ? { ...i, qtyApproved: val }
                                    : i
                                ),
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
                <label>Catatan Admin</label>
                <textarea
                  className="form-input"
                  placeholder="Catatan tambahan (opsional)"
                  value={approvalForm.noteAdmin}
                  onChange={(e) =>
                    setApprovalForm({ ...approvalForm, noteAdmin: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-danger"
                disabled={approvalMutation.isPending}
                onClick={() =>
                  approvalMutation.mutate({
                    id: selectedLoan.id,
                    data: { ...approvalForm, action: "REJECTED" },
                  })
                }
              >
                Tolak
              </button>
              <button
                className="btn btn-success"
                disabled={approvalMutation.isPending}
                onClick={() =>
                  approvalMutation.mutate({
                    id: selectedLoan.id,
                    data: { ...approvalForm, action: "APPROVED" },
                  })
                }
              >
                {approvalMutation.isPending ? "Memproses..." : "Setujui"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== RETURN MODAL ========== */}
      {showReturnModal && selectedLoan && (
        <div
          className="modal-overlay"
          onClick={() => setShowReturnModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {selectedLoan.isFinalize
                  ? "Selesaikan Pengembalian"
                  : "Kembalikan Barang"}
              </h2>
              <button
                className="modal-close"
                onClick={() => setShowReturnModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              {/* Show late info */}
              {(() => {
                const now = new Date();
                const due = new Date(selectedLoan.dueDate);
                const isLate = now > due;
                const diffDays = isLate
                  ? Math.ceil(
                      (now.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)
                    )
                  : 0;

                return isLate ? (
                  <div className="alert alert-error">
                    ⚠️ Terlambat {diffDays} hari! Denda keterlambatan akan dihitung otomatis.
                  </div>
                ) : null;
              })()}

              {selectedLoan.return_ && (
                <div className="detail-section">
                  <div className="section-title">Info Denda</div>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <div className="label">Denda Telat</div>
                      <div className="value">
                        {formatCurrency(selectedLoan.return_?.fineLate || 0)}
                      </div>
                    </div>
                    <div className="detail-item">
                      <div className="label">Dikembalikan</div>
                      <div className="value">
                        {formatDate(selectedLoan.return_?.returnedAt)}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Assigned units */}
              {selectedLoan.loanUnits?.length > 0 && (
                <div className="detail-section">
                  <div className="section-title">Unit yang Dipinjam</div>
                  <div style={{ padding: "12px 20px" }}>
                    <div className="unit-chips">
                      {selectedLoan.loanUnits.map((lu: any) => (
                        <label
                          key={lu.id}
                          className={`unit-chip ${
                            returnForm.damagedUnitIds.includes(lu.toolUnitId)
                              ? "badge-damaged"
                              : "badge-available"
                          }`}
                          style={{ cursor: "pointer" }}
                          onClick={() => {
                            setReturnForm((prev) => ({
                              ...prev,
                              damagedUnitIds: prev.damagedUnitIds.includes(
                                lu.toolUnitId
                              )
                                ? prev.damagedUnitIds.filter(
                                    (id) => id !== lu.toolUnitId
                                  )
                                : [...prev.damagedUnitIds, lu.toolUnitId],
                            }));
                          }}
                        >
                          {lu.toolUnit?.code}
                          {returnForm.damagedUnitIds.includes(lu.toolUnitId) &&
                            " (RUSAK)"}
                        </label>
                      ))}
                    </div>
                    <p
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                        marginTop: 8,
                      }}
                    >
                      Klik unit yang rusak untuk menandainya
                    </p>
                  </div>
                </div>
              )}

              {selectedLoan.isFinalize && (
                <div className="form-group">
                  <label>Denda Kerusakan (Rp)</label>
                  <input
                    type="number"
                    className="form-input"
                    min={0}
                    value={returnForm.fineDamage}
                    onChange={(e) =>
                      setReturnForm({
                        ...returnForm,
                        fineDamage: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              )}

              <div className="form-group">
                <label>Catatan</label>
                <textarea
                  className="form-input"
                  placeholder="Catatan pengembalian (opsional)"
                  value={returnForm.note}
                  onChange={(e) =>
                    setReturnForm({ ...returnForm, note: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowReturnModal(false)}
              >
                Batal
              </button>

              {selectedLoan.isFinalize ? (
                <button
                  className="btn btn-success"
                  disabled={finalizeMutation.isPending}
                  onClick={() =>
                    finalizeMutation.mutate({
                      id: selectedLoan.id,
                      data: {
                        fineDamage: returnForm.fineDamage,
                        note: returnForm.note,
                        damagedUnitIds: returnForm.damagedUnitIds,
                      },
                    })
                  }
                >
                  {finalizeMutation.isPending
                    ? "Memproses..."
                    : "Selesaikan Pengembalian"}
                </button>
              ) : (
                <button
                  className="btn btn-warning"
                  disabled={returnMutation.isPending}
                  onClick={() =>
                    returnMutation.mutate({
                      id: selectedLoan.id,
                      data: {
                        note: returnForm.note,
                        damagedUnitIds: returnForm.damagedUnitIds,
                      },
                    })
                  }
                >
                  {returnMutation.isPending
                    ? "Mengirim..."
                    : "Ajukan Pengembalian"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========== DETAIL MODAL ========== */}
      {showDetailModal && selectedLoan && (
        <div
          className="modal-overlay"
          onClick={() => setShowDetailModal(false)}
        >
          <div
            className="modal"
            style={{ maxWidth: 600 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>Detail Pinjaman</h2>
              <button
                className="modal-close"
                onClick={() => setShowDetailModal(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-section">
                <div className="section-title">Informasi</div>
                <div className="detail-grid">
                  <div className="detail-item">
                    <div className="label">Peminjam</div>
                    <div className="value">{selectedLoan.user?.name}</div>
                  </div>
                  <div className="detail-item">
                    <div className="label">Status</div>
                    <div className="value">
                      <span
                        className={`badge badge-${
                          selectedLoan.status === "ONGOING" && selectedLoan.return_
                            ? "warning"
                            : selectedLoan.status?.toLowerCase()
                        }`}
                      >
                        {selectedLoan.status === "ONGOING" && selectedLoan.return_
                          ? "PENGECEKAN PENGEMBALIAN"
                          : selectedLoan.status}
                      </span>
                    </div>
                  </div>
                  <div className="detail-item">
                    <div className="label">Tanggal Pengajuan</div>
                    <div className="value">{formatDate(selectedLoan.createdAt)}</div>
                  </div>
                  <div className="detail-item">
                    <div className="label">Tenggat</div>
                    <div className="value">{formatDate(selectedLoan.dueDate)}</div>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <div className="section-title">Alasan</div>
                <div style={{ padding: "14px 20px", fontSize: "0.9rem" }}>
                  {selectedLoan.reason}
                </div>
              </div>

              {selectedLoan.noteAdmin && (
                <div className="detail-section">
                  <div className="section-title">Catatan Admin</div>
                  <div style={{ padding: "14px 20px", fontSize: "0.9rem" }}>
                    {selectedLoan.noteAdmin}
                  </div>
                </div>
              )}

              <div className="detail-section">
                <div className="section-title">Barang</div>
                <div className="loan-items-list">
                  {selectedLoan.items?.map((item: any) => (
                    <div key={item.id} className="loan-item-row">
                      <div className="loan-item-info">
                        <div className="tool-name">{item.tool?.name}</div>
                        <div className="tool-brand">{item.tool?.brand}</div>
                      </div>
                      <div className="loan-item-qty">
                        <div>
                          <span className="qty-label">Diminta: </span>
                          <span className="qty-value">{item.qtyRequested}</span>
                        </div>
                        {item.qtyApproved > 0 && (
                          <div>
                            <span className="qty-label">Disetujui: </span>
                            <span className="qty-value">{item.qtyApproved}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedLoan.loanUnits?.length > 0 && (
                <div className="detail-section">
                  <div className="section-title">Unit Fisik</div>
                  <div style={{ padding: "12px 20px" }}>
                    <div className="unit-chips">
                      {selectedLoan.loanUnits.map((lu: any) => (
                        <span
                          key={lu.id}
                          className={`unit-chip badge-${lu.toolUnit?.status?.toLowerCase()}`}
                        >
                          {lu.toolUnit?.code}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {selectedLoan.return_ && (
                <div className="detail-section">
                  <div className="section-title">Pengembalian</div>
                  {selectedLoan.status === "ONGOING" && (
                     <div className="alert alert-warning" style={{ fontSize: "0.85rem", marginBottom: 12 }}>
                       ℹ️ Menunggu petugas/admin menerima dan melakukan pengecekan pengembalian fisik.
                     </div>
                  )}
                  <div className="detail-grid">
                    <div className="detail-item">
                      <div className="label">Dikembalikan</div>
                      <div className="value">
                        {formatDate(selectedLoan.return_.returnedAt)}
                      </div>
                    </div>
                    <div className="detail-item">
                      <div className="label">Denda Telat</div>
                      <div className="value">
                        {formatCurrency(selectedLoan.return_.fineLate)}
                      </div>
                    </div>
                    <div className="detail-item">
                      <div className="label">Denda Kerusakan</div>
                      <div className="value">
                        {formatCurrency(selectedLoan.return_.fineDamage)}
                      </div>
                    </div>
                    <div className="detail-item">
                      <div className="label">Total Denda</div>
                      <div
                        className="value"
                        style={{ color: "var(--accent-red)", fontWeight: 700 }}
                      >
                        {formatCurrency(
                          selectedLoan.return_.fineLate +
                            selectedLoan.return_.fineDamage
                        )}
                      </div>
                    </div>
                  </div>
                  {selectedLoan.return_.note && (
                    <div style={{ padding: "12px 20px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                      {selectedLoan.return_.note}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowDetailModal(false)}
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ========== ADMIN EDIT MODAL ========== */}
      {showAdminEditModal && selectedLoan && (
        <div className="modal-overlay" onClick={() => setShowAdminEditModal(false)}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Koreksi Data Pinjaman (Admin)</h2>
              <button className="modal-close" onClick={() => setShowAdminEditModal(false)}>✕</button>
            </div>
            <form onSubmit={(e) => {
              e.preventDefault();
              adminUpdateMutation.mutate({ id: selectedLoan.id, data: adminEditForm });
            }}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Alasan Peminjaman</label>
                  <textarea
                    className="form-input"
                    value={adminEditForm.reason}
                    onChange={(e) => setAdminEditForm({ ...adminEditForm, reason: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Status Pinjaman</label>
                  <select
                    className="form-input"
                    value={adminEditForm.status}
                    onChange={(e) => setAdminEditForm({ ...adminEditForm, status: e.target.value as any })}
                  >
                    <option value="PENDING">PENDING</option>
                    <option value="APPROVED">APPROVED</option>
                    <option value="ONGOING">ONGOING</option>
                    <option value="DONE">DONE</option>
                    <option value="REJECTED">REJECTED</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Tanggal Pengembalian</label>
                  <input
                    type="date"
                    className="form-input"
                    value={adminEditForm.dueDate}
                    onChange={(e) => setAdminEditForm({ ...adminEditForm, dueDate: e.target.value })}
                    required
                  />
                </div>

                <div className="detail-section">
                   <div className="section-title">Koreksi Barang & Jumlah</div>
                   <div className="loan-items-list">
                     {adminEditForm.items.map((item, idx) => (
                       <div key={idx} className="loan-item-row" style={{ alignItems: "center" }}>
                          <div style={{ flex: 1 }}>
                             <select
                               className="form-input"
                               style={{ padding: "4px 8px", fontSize: "0.85rem", height: "auto" }}
                               value={item.toolId}
                               onChange={(e) => {
                                 const newItems = [...adminEditForm.items];
                                 newItems[idx].toolId = e.target.value;
                                 setAdminEditForm({ ...adminEditForm, items: newItems });
                               }}
                             >
                               {tools?.map((t: any) => (
                                 <option key={t.id} value={t.id}>{t.name}</option>
                               ))}
                             </select>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                             <div style={{ width: 80 }}>
                                <label style={{ fontSize: "0.7rem" }}>Minta</label>
                                <input
                                  type="number"
                                  className="form-input"
                                  style={{ padding: "4px 8px", fontSize: "0.8rem", height: "auto" }}
                                  value={item.qtyRequested}
                                  onChange={(e) => {
                                    const newItems = [...adminEditForm.items];
                                    newItems[idx].qtyRequested = parseInt(e.target.value) || 1;
                                    setAdminEditForm({ ...adminEditForm, items: newItems });
                                  }}
                                />
                             </div>
                             <div style={{ width: 80 }}>
                                <label style={{ fontSize: "0.7rem" }}>Setuju</label>
                                <input
                                  type="number"
                                  className="form-input"
                                  style={{ padding: "4px 8px", fontSize: "0.8rem", height: "auto" }}
                                  value={item.qtyApproved}
                                  onChange={(e) => {
                                    const newItems = [...adminEditForm.items];
                                    newItems[idx].qtyApproved = parseInt(e.target.value) || 0;
                                    setAdminEditForm({ ...adminEditForm, items: newItems });
                                  }}
                                />
                             </div>
                          </div>
                       </div>
                     ))}
                   </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdminEditModal(false)}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={adminUpdateMutation.isPending}>
                  {adminUpdateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
