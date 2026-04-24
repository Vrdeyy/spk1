"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

export default function ToolsPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const role = session?.user?.role;
  const isAdmin = role === "ADMIN";

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    brand: "",
    categoryId: "",
    qty: 1,
    addNewQty: 0,
    units: [] as any[],
    deletedUnitIds: [] as string[],
  });

  const resetForm = () => {
    setForm({ name: "", brand: "", categoryId: "", qty: 1, addNewQty: 0, units: [], deletedUnitIds: [] });
  };

  // handleEdit removed, moved to new page route

  const { data: tools, isLoading } = useQuery({
    queryKey: ["tools"],
    queryFn: () => fetch("/api/tools").then((r) => r.json()),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) throw new Error("Gagal menambah alat");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      setShowModal(false);
      resetForm();
    },
  });

  // updateMutation removed, moved to new page route

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/tools/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) throw new Error("Gagal menghapus");
        return r.json();
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tools"] }),
  });

  if (isLoading) {
    return (
      <div className="page-enter">
        <div className="page-header"><div><h1>Alat & Barang</h1></div></div>
        <div className="page-body"><div className="loader"><div className="spinner" /></div></div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1>Alat & Barang</h1>
          <p className="description">Kelola inventaris alat dan barang</p>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowModal(true); }}>
            + Tambah Alat
          </button>
        )}
      </div>

      <div className="page-body">
        <div className="stats-grid">
          <div className="stat-card blue">
            <div className="stat-icon">🔧</div>
            <div className="stat-value">{tools?.length || 0}</div>
            <div className="stat-label">Jenis Alat</div>
          </div>
          <div className="stat-card green">
            <div className="stat-icon">✅</div>
            <div className="stat-value">
              {tools?.reduce((a: number, t: any) => a + (t.stockAvailable || 0), 0) || 0}
            </div>
            <div className="stat-label">Unit Tersedia</div>
          </div>
          <div className="stat-card yellow">
            <div className="stat-icon">📦</div>
            <div className="stat-value">
              {tools?.reduce((a: number, t: any) => a + (t.stockBorrowed || 0), 0) || 0}
            </div>
            <div className="stat-label">Unit Dipinjam</div>
          </div>
          <div className="stat-card red">
            <div className="stat-icon">⚠️</div>
            <div className="stat-value">
              {tools?.reduce((a: number, t: any) => a + (t.stockDamaged || 0), 0) || 0}
            </div>
            <div className="stat-label">Unit Rusak</div>
          </div>
        </div>

        <div className="table-container">
          <div className="table-header">
            <h3>Daftar Inventaris</h3>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Alat & Barang</th>
                  <th>Kategori</th>
                  <th style={{ textAlign: "center" }}>Tersedia</th>
                  <th style={{ textAlign: "center" }}>Dipinjam</th>
                  <th style={{ textAlign: "center" }}>Rusak</th>
                  <th style={{ textAlign: "center" }}>Total</th>
                  {isAdmin && <th style={{ textAlign: "right" }}>Aksi</th>}
                </tr>
              </thead>
              <tbody>
                {tools?.map?.((tool: any) => (
                  <tr key={tool.id}>
                    <td>
                      <div className="td-item-info">
                        <div className="td-item-main">{tool.name}</div>
                        <div className="td-item-sub">{tool.brand}</div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-ongoing" style={{ textTransform: "capitalize" }}>
                        {tool.category?.name}
                      </span>
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 700, color: "var(--accent-green)" }}>
                      {tool.stockAvailable}
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 700, color: "var(--accent-purple)" }}>
                      {tool.stockBorrowed}
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 700, color: "var(--accent-red)" }}>
                      {tool.stockDamaged}
                    </td>
                    <td style={{ textAlign: "center", fontWeight: 800, color: "var(--sidebar-navy)" }}>
                      {tool.stockTotal}
                    </td>
                    {isAdmin && (
                      <td>
                        <div className="btn-group" style={{ justifyContent: "flex-end" }}>
                           <Link
                             href={`/dashboard/tools/${tool.id}/edit`}
                             className="btn btn-warning btn-sm"
                           >
                             Edit
                           </Link>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => {
                              if (confirm("Yakin hapus alat ini?"))
                                deleteMutation.mutate(tool.id);
                            }}
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {(!tools || tools.length === 0) && (
                  <tr>
                    <td colSpan={8} className="table-empty">
                      <div className="icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ opacity: 0.3 }}>
                          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                        </svg>
                      </div>
                      <div>Belum ada data inventaris</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tool Modal (Add Only) */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Tambah Alat & Barang</h2>
              <button className="modal-close" onClick={() => { setShowModal(false); resetForm(); }}>
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
            >
              <div className="modal-body">
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Nama Alat</label>
                  <input
                    className="form-input"
                    placeholder="Contoh: Multimeter Digital"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Brand / Merek</label>
                  <input
                    className="form-input"
                    placeholder="Contoh: Fluke / Sanwa"
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 20 }}>
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Kategori</label>
                  <select
                    className="form-input"
                    value={form.categoryId}
                    onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                    required
                  >
                    <option value="">Pilih Kategori</option>
                    {categories?.map?.((cat: any) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Jumlah Unit Awal</label>
                  <input
                    type="number"
                    className="form-input"
                    min={1}
                    value={form.qty}
                    onChange={(e) => setForm({ ...form, qty: parseInt(e.target.value) || 1 })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Batal</button>
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Menyimpan..." : "Tambah Alat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
