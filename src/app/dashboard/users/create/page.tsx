"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function CreateUserPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "PEMINJAM",
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
      router.push("/dashboard/users");
    },
  });

  return (
    <div className="page-enter">
      <div className="page-header" style={{ borderBottom: "none", paddingBottom: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/dashboard/users" className="btn btn-secondary btn-sm">
            ← Kembali
          </Link>
          <h1>Tambah Pengguna Baru</h1>
        </div>
      </div>

      <div className="page-body">
        <div className="detail-section" style={{ maxWidth: 600, margin: "0 auto" }}>
          <div className="section-title">Informasi Akun</div>
          <div style={{ padding: 32 }}>
            {createMutation.isError && (
              <div className="alert alert-error" style={{ marginBottom: 24 }}>
                {(createMutation.error as Error).message}
              </div>
            )}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate(form);
              }}
              style={{ display: "flex", flexDirection: "column", gap: 24 }}
            >
              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>Nama Lengkap</label>
                <input
                  className="form-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="Masukkan nama lengkap"
                />
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>Email</label>
                <input
                  type="email"
                  className="form-input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  placeholder="contoh@spk.com"
                />
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>Password</label>
                <input
                  type="password"
                  className="form-input"
                  value={form.password}
                  onChange={(e) =>
                    setForm({ ...form, password: e.target.value })
                  }
                  required
                  minLength={6}
                  placeholder="Minimal 6 karakter"
                />
              </div>
              <div className="form-group">
                <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>Role / Hak Akses</label>
                <select
                  className="form-input"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="PEMINJAM">Peminjam (Siswa/Guru)</option>
                  <option value="PETUGAS">Petugas Lab</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 12 }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: "center", padding: 14 }}
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Menyimpan..." : "Simpan Pengguna"}
                </button>
                <Link
                  href="/dashboard/users"
                  className="btn btn-secondary"
                  style={{ flex: 1, justifyContent: "center", padding: 14 }}
                >
                  Batal
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
