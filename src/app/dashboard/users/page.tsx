"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "PEMINJAM",
  });

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      fetch("/api/users", {
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
      queryClient.invalidateQueries({ queryKey: ["users"] });
      setShowModal(false);
      setForm({ name: "", email: "", password: "", role: "PEMINJAM" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/users/${id}`, { method: "DELETE" }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.error);
        }
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  if (isLoading) {
    return (
      <div className="page-enter">
        <div className="page-body"><div className="loader"><div className="spinner" /></div></div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="page-header" style={{ borderBottom: "none", paddingBottom: 0, justifyContent: "flex-end" }}>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Tambah Pengguna
        </button>
      </div>

      <div className="page-body">
        <div className="stats-grid">
          <div className="stat-card purple">
            <div className="stat-icon">👤</div>
            <div className="stat-value">
              {users?.filter?.((u: any) => u.role === "ADMIN")?.length || 0}
            </div>
            <div className="stat-label">Admin</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-icon">🛠️</div>
            <div className="stat-value">
              {users?.filter?.((u: any) => u.role === "PETUGAS")?.length || 0}
            </div>
            <div className="stat-label">Petugas</div>
          </div>
          <div className="stat-card green">
            <div className="stat-icon">👥</div>
            <div className="stat-value">
              {users?.filter?.((u: any) => u.role === "PEMINJAM")?.length || 0}
            </div>
            <div className="stat-label">Peminjam</div>
          </div>
        </div>

        <div className="table-container">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Pengguna</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Aktivitas</th>
                  <th>Bergabung</th>
                  <th style={{ textAlign: "right" }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users?.map?.((user: any) => (
                  <tr key={user.id}>
                    <td>
                      <div className="td-user">
                        <div className="td-user-avatar">
                          {user.name?.[0]?.toUpperCase()}
                        </div>
                        <div className="td-user-name">{user.name}</div>
                      </div>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`badge badge-${user.role?.toLowerCase()}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>
                      <div className="td-item-info">
                        <div className="td-item-main">{user._count?.loans || 0} Pinjaman</div>
                        <div className="td-item-sub">Total peminjaman alat</div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--sidebar-navy)" }}>
                        {new Date(user.createdAt).toLocaleDateString("id-ID")}
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div className="btn-group" style={{ justifyContent: "flex-end" }}>
                        <Link
                          href={`/dashboard/users/${user.id}/edit`}
                          className="btn btn-warning btn-sm"
                        >
                          Edit
                        </Link>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => {
                            if (confirm(`Hapus pengguna "${user.name}"?`)) {
                              deleteMutation.mutate(user.id);
                            }
                          }}
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Tambah Pengguna</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>
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
                {createMutation.isError && (
                  <div className="alert alert-error">
                    {(createMutation.error as Error).message}
                  </div>
                )}
                <div className="form-group">
                  <label>Nama</label>
                  <input
                    className="form-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    className="form-input"
                    value={form.password}
                    onChange={(e) =>
                      setForm({ ...form, password: e.target.value })
                    }
                    required
                    minLength={6}
                  />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select
                    className="form-input"
                    value={form.role}
                    onChange={(e) => setForm({ ...form, role: e.target.value })}
                  >
                    <option value="PEMINJAM">Peminjam</option>
                    <option value="PETUGAS">Petugas</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowModal(false)}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
