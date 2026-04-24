"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function ToolsPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const role = session?.user?.role;
  const isAdmin = role === "ADMIN";

  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editToolId, setEditToolId] = useState("");
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
    setEditMode(false);
    setEditToolId("");
  };

  const handleEdit = (tool: any) => {
    setForm({
      name: tool.name,
      brand: tool.brand,
      categoryId: tool.categoryId,
      qty: tool.units?.length || 1,
      addNewQty: 0,
      units: tool.units || [],
      deletedUnitIds: [],
    });
    setEditToolId(tool.id);
    setEditMode(true);
    setShowModal(true);
  };

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

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      fetch(`/api/tools/${editToolId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => {
        if (!r.ok) throw new Error("Gagal mengupdate alat");
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      setShowModal(false);
      resetForm();
    },
  });

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
            <h3>Daftar Alat</h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Brand</th>
                <th>Kategori</th>
                <th>Tersedia</th>
                <th>Dipinjam</th>
                <th>Rusak</th>
                <th>Total</th>
                {isAdmin && <th>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {tools?.map?.((tool: any) => (
                <tr key={tool.id}>
                  <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                    {tool.name}
                  </td>
                  <td>{tool.brand}</td>
                  <td>
                    <span className="badge badge-available">
                      {tool.category?.name}
                    </span>
                  </td>
                  <td style={{ color: "var(--accent-green)", fontWeight: 600 }}>
                    {tool.stockAvailable}
                  </td>
                  <td style={{ color: "var(--accent-yellow)", fontWeight: 600 }}>
                    {tool.stockBorrowed}
                  </td>
                  <td style={{ color: "var(--accent-red)", fontWeight: 600 }}>
                    {tool.stockDamaged}
                  </td>
                  <td style={{ fontWeight: 600 }}>{tool.stockTotal}</td>
                  {isAdmin && (
                    <td>
                      <div className="btn-group">
                        <button
                          className="btn btn-warning btn-sm"
                          onClick={() => handleEdit(tool)}
                        >
                          Edit
                        </button>
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
                    <div className="icon">🔧</div>
                    <div>Belum ada alat</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tool Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => { setShowModal(false); resetForm(); }}>
          <div className="modal" style={{ maxWidth: 600 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editMode ? "Edit Alat & Unit Fisik" : "Tambah Alat Baru"}</h2>
              <button className="modal-close" onClick={() => { setShowModal(false); resetForm(); }}>
                ✕
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (editMode) {
                  updateMutation.mutate(form);
                } else {
                  createMutation.mutate(form);
                }
              }}
            >
              <div className="modal-body">
                <div className="form-group">
                  <label>Nama Alat</label>
                  <input
                    className="form-input"
                    placeholder="Contoh: Multimeter"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Brand / Merek</label>
                  <input
                    className="form-input"
                    placeholder="Contoh: Fluke"
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Kategori</label>
                  <select
                    className="form-input"
                    value={form.categoryId}
                    onChange={(e) =>
                      setForm({ ...form, categoryId: e.target.value })
                    }
                    required
                  >
                    <option value="">Pilih Kategori</option>
                    {categories?.map?.((cat: any) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                {!editMode ? (
                  <div className="form-group">
                    <label>Jumlah Unit Tersedia Awal</label>
                    <input
                      type="number"
                      className="form-input"
                      min={1}
                      value={form.qty}
                      onChange={(e) =>
                        setForm({ ...form, qty: parseInt(e.target.value) || 1 })
                      }
                      required
                    />
                  </div>
                ) : (
                  <>
                    <div className="form-group">
                      <label>Tambah Stok Baru Tambahan (Opsional)</label>
                      <input
                        type="number"
                        className="form-input"
                        min={0}
                        value={form.addNewQty}
                        onChange={(e) =>
                          setForm({ ...form, addNewQty: parseInt(e.target.value) || 0 })
                        }
                      />
                    </div>
                    <div className="form-group">
                      <label>Status Tiap Unit Fisik</label>
                      <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid var(--border-color)", padding: "10px", borderRadius: "8px" }}>
                        {form.units.map((u: any) => (
                          <div key={u.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <span style={{ fontFamily: "monospace", fontSize: "0.85rem" }}>{u.code}</span>
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                              <select
                                className="form-input"
                                style={{ width: "auto", padding: "4px 8px", fontSize: "0.8rem", height: "auto" }}
                                value={u.status}
                                onChange={(e) => {
                                  setForm((prev) => ({
                                    ...prev,
                                    units: prev.units.map((unit) => 
                                      unit.id === u.id ? { ...unit, status: e.target.value } : unit
                                    )
                                  }));
                                }}
                              >
                                <option value="AVAILABLE">AVAILABLE</option>
                                <option value="DAMAGED">DAMAGED</option>
                                <option value="BORROWED">BORROWED</option>
                              </select>
                              <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                style={{ padding: "4px 8px", fontSize: "0.8rem", height: "auto" }}
                                title="Hapus Unit"
                                onClick={() => {
                                  if (u.status === "BORROWED") {
                                    alert("Unit sedang dipinjam (BORROWED), kemungkinan tidak bisa dihapus karena terkait historis peminjaman.");
                                  } else {
                                    if(confirm(`Yakin ingin menghapus fisik unit ${u.code}?`)) {
                                      setForm(prev => ({
                                        ...prev,
                                        units: prev.units.filter(unit => unit.id !== u.id),
                                        deletedUnitIds: [...prev.deletedUnitIds, u.id]
                                      }));
                                    }
                                  }
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setShowModal(false); resetForm(); }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
