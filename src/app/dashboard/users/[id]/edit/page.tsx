"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function EditUserPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "",
  });

  const { data: user, isLoading: isLoadingUser } = useQuery({
    queryKey: ["users", id],
    queryFn: () => fetch(`/api/users/${id}`).then((res) => res.json()),
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        email: user.email || "",
        password: "", // Jangan tampilkan password lama
        role: user.role || "PEMINJAM",
      });
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      fetch(`/api/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.error || "Gagal memperbarui pengguna");
        }
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      router.push("/dashboard/users");
    },
  });

  if (!isAdmin) {
    return (
      <div className="page-enter">
        <div className="page-header">
          <h1>Akses Ditolak</h1>
        </div>
        <div className="page-body">
          <div className="alert alert-error">Hanya Admin yang dapat mengakses halaman ini.</div>
        </div>
      </div>
    );
  }

  if (isLoadingUser) {
    return (
      <div className="page-enter">
        <div className="page-header">
           <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <Link href="/dashboard/users" className="btn btn-secondary btn-sm">← Kembali</Link>
          </div>
          <h1>Loading...</h1>
        </div>
        <div className="page-body">
          <div className="loader"><div className="spinner" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <Link href="/dashboard/users" className="btn btn-secondary btn-sm" style={{ padding: "6px 12px" }}>
              ← Kembali
            </Link>
            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Manajemen / Edit Pengguna</span>
          </div>
          <h1>Edit Pengguna</h1>
          <p className="description">Perbarui informasi akun dan hak akses pengguna</p>
        </div>
      </div>

      <div className="page-body">
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          {updateMutation.isError && (
            <div className="alert alert-error">{(updateMutation.error as Error).message}</div>
          )}

          <form onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate(form);
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 32, alignItems: "start" }}>
              
              <div className="detail-section">
                <div className="section-title">Profil Pengguna</div>
                <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 24 }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>Nama Lengkap</label>
                    <input
                      className="form-input"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      required
                      placeholder="Masukkan nama pengguna..."
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
                      placeholder="email@contoh.com"
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>Ubah Password (Opsional)</label>
                    <input
                      type="password"
                      className="form-input"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder="Biarkan kosong jika tidak ingin mengubah"
                      minLength={6}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div className="detail-section">
                  <div className="section-title">Akses & Role</div>
                  <div style={{ padding: 24 }}>
                    <div className="form-group">
                      <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>Pilih Role</label>
                      <select
                        className="form-input"
                        value={form.role}
                        onChange={(e) => setForm({ ...form, role: e.target.value })}
                        required
                        style={{ fontWeight: 600 }}
                      >
                        <option value="PEMINJAM">PEMINJAM (Siswa)</option>
                        <option value="PETUGAS">PETUGAS (Staf Toko)</option>
                        <option value="ADMIN">ADMIN (Kepala)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="detail-section" style={{ padding: 24, background: "var(--sidebar-navy)", border: "none" }}>
                   <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: 16 }}>
                     Perubahan role akan langsung mengubah hak akses pengguna di seluruh sistem.
                   </p>
                   <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                     <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "14px" }} disabled={updateMutation.isPending}>
                       {updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
                     </button>
                     <Link href="/dashboard/users" className="btn btn-secondary" style={{ width: "100%", justifyContent: "center", padding: "14px" }}>
                       Batalkan
                     </Link>
                   </div>
                </div>
              </div>

            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
