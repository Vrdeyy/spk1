"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function CategoriesPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.json()),
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { name: string }) => {
      const url = editId ? `/api/categories/${editId}` : "/api/categories";
      const method = editId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Gagal menyimpan");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      closeModal();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/categories/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) throw new Error("Gagal menghapus");
        return r.json();
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  const closeModal = () => {
    setShowModal(false);
    setEditId(null);
    setName("");
  };

  const openEdit = (cat: any) => {
    setEditId(cat.id);
    setName(cat.name);
    setShowModal(true);
  };

  if (isLoading) {
    return (
      <div className="page-enter">
        <div className="page-header"><div><h1>Kategori</h1></div></div>
        <div className="page-body"><div className="loader"><div className="spinner" /></div></div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1>Kategori</h1>
          <p className="description">Kelola kategori alat</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Tambah Kategori
        </button>
      </div>

      <div className="page-body">
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Nama Kategori</th>
                <th>Jumlah Alat</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {categories?.map?.((cat: any, i: number) => (
                <tr key={cat.id}>
                  <td>{i + 1}</td>
                  <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                    {cat.name}
                  </td>
                  <td>
                    <span className="badge badge-available">
                      {cat._count?.tools || 0} alat
                    </span>
                  </td>
                  <td>
                    <div className="btn-group">
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => openEdit(cat)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => {
                          if (confirm("Yakin hapus kategori ini?"))
                            deleteMutation.mutate(cat.id);
                        }}
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!categories || categories.length === 0) && (
                <tr>
                  <td colSpan={4} className="table-empty">
                    <div className="icon">📁</div>
                    <div>Belum ada kategori</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editId ? "Edit" : "Tambah"} Kategori</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate({ name });
              }}
            >
              <div className="modal-body">
                <div className="form-group">
                  <label>Nama Kategori</label>
                  <input
                    className="form-input"
                    placeholder="Contoh: Elektronik"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Batal
                </button>
                <button type="submit" className="btn btn-primary" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
