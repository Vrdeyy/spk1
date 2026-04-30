"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";

export default function UsersPage() {
  const queryClient = useQueryClient();


  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: () => fetch("/api/users").then((r) => r.json()),
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
        <Link href="/dashboard/users/create" className="btn btn-primary">
          + Tambah Pengguna
        </Link>
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


    </div>
  );
}
