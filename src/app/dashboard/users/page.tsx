"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

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

  if (isLoading) {
    return (
      <div className="page-enter">
        <div className="page-header"><div><h1>Pengguna</h1></div></div>
        <div className="page-body"><div className="loader"><div className="spinner" /></div></div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1>Pengguna</h1>
          <p className="description">Kelola akun pengguna sistem</p>
        </div>
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
          <table>
            <thead>
              <tr>
                <th>Nama</th>
                <th>Email</th>
                <th>Role</th>
                <th>Total Pinjaman</th>
                <th>Bergabung</th>
              </tr>
            </thead>
            <tbody>
              {users?.map?.((user: any) => (
                <tr key={user.id}>
                  <td style={{ color: "var(--text-primary)", fontWeight: 500 }}>
                    {user.name}
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`badge badge-${user.role?.toLowerCase()}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>{user._count?.loans || 0}</td>
                  <td>{new Date(user.createdAt).toLocaleDateString("id-ID")}</td>
                </tr>
              ))}
            </tbody>
          </table>
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
