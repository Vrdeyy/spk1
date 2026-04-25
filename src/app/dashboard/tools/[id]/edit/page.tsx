"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function EditToolPage() {
  const { id } = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  const [form, setForm] = useState({
    name: "",
    brand: "",
    categoryId: "",
    addNewQty: 0,
    units: [] as any[],
    deletedUnitIds: [] as string[],
  });

  const { data: tool, isLoading: isLoadingTool } = useQuery({
    queryKey: ["tools", id],
    queryFn: () => fetch(`/api/tools/${id}`).then((res) => res.json()),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then((res) => res.json()),
  });

  useEffect(() => {
    if (tool) {
      setForm({
        name: tool.name || "",
        brand: tool.brand || "",
        categoryId: tool.categoryId || "",
        addNewQty: 0,
        units: tool.units || [],
        deletedUnitIds: [],
      });
    }
  }, [tool]);

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      fetch(`/api/tools/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then(async (r) => {
        if (!r.ok) {
          const err = await r.json();
          throw new Error(err.error || "Gagal memperbarui alat");
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

  if (isLoadingTool) {
    return (
      <div className="page-enter">
        <div className="page-header">
          <h1>Loading...</h1>
        </div>
        <div className="page-body">
          <div className="loader"><div className="spinner" /></div>
        </div>
      </div>
    );
  }

  const removeUnit = (unitId: string) => {
    const unit = form.units.find(u => u.id === unitId);
    if (unit?.status === "BORROWED") {
      alert("Unit sedang dipinjam dan tidak dapat dihapus.");
      return;
    }
    
    if (confirm("Hapus unit fisik ini secara permanen?")) {
      setForm({
        ...form,
        units: form.units.filter(u => u.id !== unitId),
        deletedUnitIds: [...form.deletedUnitIds, unitId],
      });
    }
  };

  const handleUnitStatusChange = (unitId: string, status: string) => {
    setForm({
      ...form,
      units: form.units.map(u => u.id === unitId ? { ...u, status } : u),
    });
  };

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <Link href="/dashboard/tools" className="btn btn-secondary btn-sm" style={{ padding: "6px 12px" }}>
              ← Kembali
            </Link>
            <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Inventaris / Edit Alat</span>
          </div>
          <h1>Edit Alat & Barang</h1>
          <p className="description">Perbarui informasi aset dan kelola unit fisik</p>
        </div>
      </div>

      <div className="page-body">
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          {updateMutation.isError && (
            <div className="alert alert-error">{(updateMutation.error as Error).message}</div>
          )}

          <form onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate(form);
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 32, alignItems: "start" }}>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
                {/* General Info */}
                <div className="detail-section">
                  <div className="section-title">Informasi Alat</div>
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

                {/* Stock Expansion */}
                <div className="detail-section">
                  <div className="section-title">Tambah Stok Baru</div>
                  <div style={{ padding: 32 }}>
                    <div className="form-group">
                       <label style={{ fontWeight: 700, fontSize: "0.85rem", color: "var(--text-secondary)", marginBottom: 8, display: "block" }}>Jumlah Unit Tambahan</label>
                       <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                          <input
                            type="number"
                            className="form-input"
                            style={{ maxWidth: 120 }}
                            min={0}
                            value={form.addNewQty}
                            onChange={(e) => setForm({ ...form, addNewQty: parseInt(e.target.value) || 0 })}
                          />
                          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                            Unit baru akan otomatis dibuat dengan kode unik berdasarkan brand.
                          </span>
                       </div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                {/* Physical Units Maintenance */}
                <div className="detail-section" style={{ maxHeight: "calc(100vh - 200px)", display: "flex", flexDirection: "column" }}>
                  <div className="section-title">Unit Fisik ({form.units.length})</div>
                  <div style={{ flex: 1, overflowY: "auto", padding: "0" }}>
                    {form.units.map((unit, idx) => (
                      <div key={unit.id} style={{ 
                        padding: "16px 20px", 
                        borderBottom: idx === form.units.length - 1 ? "none" : "1px solid var(--border-light)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <div>
                          <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.9rem", color: "var(--sidebar-navy)" }}>{unit.code}</div>
                          <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
                             <span className={`badge badge-${unit.status.toLowerCase()}`} style={{ fontSize: "0.65rem", padding: "2px 8px" }}>{unit.status}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                           <select
                              className="form-input"
                              style={{ width: "auto", padding: "4px 8px", fontSize: "0.75rem", height: "auto" }}
                              value={unit.status}
                              onChange={(e) => handleUnitStatusChange(unit.id, e.target.value)}
                           >
                              <option value="AVAILABLE">Tersedia</option>
                              <option value="DAMAGED">Rusak</option>
                              <option value="LOST">Hilang</option>
                              <option value="BORROWED" disabled>Dipinjam</option>
                           </select>
                           <button type="button" className="btn btn-danger btn-sm" style={{ padding: 6 }} onClick={() => removeUnit(unit.id)}>
                             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                           </button>
                        </div>
                      </div>
                    ))}
                    {form.units.length === 0 && (
                      <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        Tidak ada unit fisik ditemukan.
                      </div>
                    )}
                  </div>
                </div>

                <div className="detail-section" style={{ padding: 24, background: "var(--sidebar-navy)", border: "none" }}>
                   <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                     <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", padding: "14px" }} disabled={updateMutation.isPending}>
                       {updateMutation.isPending ? "Menyimpan..." : "Simpan Perubahan"}
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
