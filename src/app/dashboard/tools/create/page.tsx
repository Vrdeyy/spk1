"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function CreateToolPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [form, setForm] = useState({
    name: "",
    brand: "",
    image: "",
    categoryId: "",
    qty: 1,
  });

  const [isDragging, setIsDragging] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then((res) => res.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.error || "Gagal menambah alat");
        }
        return r.json();
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tools"] });
      router.push("/dashboard/tools");
    },
  });

  if (!isAdmin) {
    return (
      <div className="page-enter">
        <div className="page-header">
           <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <Link href="/dashboard/tools" className="btn btn-secondary btn-sm">← Kembali</Link>
          </div>
          <h1>Akses Ditolak</h1>
        </div>
        <div className="page-body">
          <div className="alert alert-error">Hanya Admin yang dapat mengakses halaman ini.</div>
        </div>
      </div>
    );
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="page-enter">
      <div className="page-header" style={{ borderBottom: "none", paddingBottom: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/dashboard/tools" className="btn btn-secondary btn-sm" style={{ padding: "6px 12px" }}>
              ← Kembali
            </Link>
          </div>
        </div>
      </div>

      <div className="page-body">
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          {createMutation.isError && (
            <div className="alert alert-error">{(createMutation.error as Error).message}</div>
          )}

          <form onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate(form);
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 32, alignItems: "start" }}>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                {/* General Info */}
                <div className="detail-section">
                  <div className="section-title">Informasi Alat Baru</div>
                  <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 24 }}>
                    <div className="form-group">
                      <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>Nama Alat</label>
                      <input
                        className="form-input"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                        placeholder="Contoh: Bor Listrik Maktec"
                      />
                    </div>
                     <div className="form-group">
                      <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>Brand / Merek</label>
                      <input
                        className="form-input"
                        value={form.brand}
                        onChange={(e) => setForm({ ...form, brand: e.target.value })}
                        required
                        placeholder="Contoh: Bosch, Makita"
                      />
                    </div>
                    <div className="form-group">
                      <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>Foto Alat (Opsional)</label>
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        style={{
                          border: `2px dashed ${isDragging ? "var(--accent-purple)" : "var(--border-light)"}`,
                          background: isDragging ? "rgba(139, 92, 246, 0.05)" : "var(--bg-main)",
                          borderRadius: 16,
                          padding: "24px",
                          textAlign: "center",
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 12
                        }}
                        onClick={() => document.getElementById("create-file-upload")?.click()}
                      >
                        <input
                          id="create-file-upload"
                          type="file"
                          accept="image/*"
                          style={{ display: "none" }}
                          onChange={handleImageUpload}
                        />
                        {form.image ? (
                          <div style={{ position: "relative" }}>
                            <img src={form.image} alt="Preview" style={{ width: "120px", height: "120px", objectFit: "cover", borderRadius: 12, boxShadow: "var(--shadow-sm)" }} onError={(e) => (e.currentTarget.style.display = "none")} />
                            <button 
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setForm({ ...form, image: "" }); }}
                              style={{ position: "absolute", top: -8, right: -8, background: "var(--accent-red)", color: "white", border: "none", borderRadius: "50%", width: 24, height: 24, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", fontWeight: "bold" }}
                            >✕</button>
                          </div>
                        ) : (
                          <>
                            <div style={{ fontSize: "2rem", opacity: 0.5 }}>📸</div>
                            <div style={{ fontSize: "0.85rem", color: "var(--sidebar-navy)", fontWeight: 600 }}>
                              Klik untuk memilih atau tarik & lepas gambar di sini
                            </div>
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>
                              Format didukung: JPG, PNG, GIF
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="form-group">
                      <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>Kategori</label>
                      <select
                        className="form-input"
                        value={form.categoryId}
                        onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
                        required
                      >
                        <option value="">Pilih Kategori</option>
                        {categories?.map((cat: any) => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                <div className="detail-section">
                  <div className="section-title">Stok Awal</div>
                  <div style={{ padding: 32 }}>
                    <div className="form-group">
                       <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>Jumlah Unit Tersedia</label>
                       <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <input
                            type="number"
                            className="form-input"
                            style={{ maxWidth: 120 }}
                            min={1}
                            value={form.qty}
                            onChange={(e) => setForm({ ...form, qty: parseInt(e.target.value) || 1 })}
                            required
                          />
                          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                            Sistem akan otomatis membuatkan kode unit/barcode unik untuk masing-masing unit ini.
                          </span>
                       </div>
                    </div>
                  </div>
                </div>

                <div className="detail-section" style={{ padding: 24, background: "var(--sidebar-navy)", border: "none" }}>
                   <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                     <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "14px" }} disabled={createMutation.isPending}>
                       {createMutation.isPending ? "Menyimpan..." : "Simpan Alat Baru"}
                     </button>
                     <Link href="/dashboard/tools" className="btn btn-secondary" style={{ width: "100%", justifyContent: "center", padding: "14px" }}>
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
