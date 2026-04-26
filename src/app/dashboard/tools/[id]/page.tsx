"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";

export default function ToolDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [imgError, setImgError] = useState(false);

  const { data: tool, isLoading } = useQuery({
    queryKey: ["tool", params.id],
    queryFn: () => fetch(`/api/tools/${params.id}`).then((r) => {
      if (!r.ok) throw new Error("Gagal mengambil data");
      return r.json();
    }),
  });

  if (isLoading) {
    return <div className="page-body"><div className="loader"><div className="spinner" /></div></div>;
  }

  if (!tool) return <div className="page-body">Alat tidak ditemukan</div>;

  const stats = [
    { label: "Tersedia", value: tool.units.filter((u: any) => u.status === "AVAILABLE").length, color: "var(--accent-green)" },
    { label: "Dipinjam", value: tool.units.filter((u: any) => u.status === "BORROWED").length, color: "var(--accent-purple)" },
    { label: "Rusak", value: tool.units.filter((u: any) => u.status === "DAMAGED").length, color: "var(--accent-red)" },
    { label: "Hilang", value: tool.units.filter((u: any) => u.status === "LOST").length, color: "var(--sidebar-navy)" },
  ];

  return (
    <div className="page-enter">
      <div className="page-header" style={{ borderBottom: "none", paddingBottom: 0 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
           <button onClick={() => router.back()} className="btn btn-secondary" style={{ padding: "8px 12px", borderRadius: 12 }}>
             ← Kembali
           </button>
           <div className="page-identity">
              <h1>Detail {tool.name}</h1>
              <p>{tool.brand} • {tool.category?.name}</p>
           </div>
        </div>
      </div>

      <div className="page-body" style={{ display: "flex", flexDirection: "column", gap: 32 }}>
        
        {/* TOP SECTION: IMAGE & STATS */}
        <div style={{ display: "grid", gridTemplateColumns: "400px 1fr", gap: 32, alignItems: "start" }}>
           {/* Visual Card */}
           <div className="bento-card" style={{ padding: 0, overflow: "hidden" }}>
              <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)" }}>
                 {tool.imageUrl && !imgError ? (
                   <img 
                    src={tool.imageUrl} 
                    alt={tool.name} 
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={() => setImgError(true)}
                   />
                 ) : (
                   <div style={{ 
                      width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
                      background: "linear-gradient(135deg, var(--sidebar-navy) 0%, var(--accent-purple) 100%)", color: "white" 
                   }}>
                      <div style={{ fontSize: "4rem" }}>
                        {tool.category?.name === "Elektronik" ? "⚡" : tool.category?.name === "Perkakas" ? "🛠️" : "📦"}
                      </div>
                      <span style={{ fontSize: "0.8rem", fontWeight: 800, textTransform: "uppercase", opacity: 0.6, letterSpacing: 2 }}>{tool.category?.name}</span>
                   </div>
                 )}
              </div>
              <div style={{ padding: 24, background: "white" }}>
                 <div style={{ fontSize: "0.75rem", fontWeight: 800, color: "var(--accent-purple)", textTransform: "uppercase", marginBottom: 8 }}>Merk Produk</div>
                 <h2 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--sidebar-navy)" }}>{tool.brand} {tool.name}</h2>
              </div>
           </div>

           {/* Stats & Info */}
           <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div className="stats-grid" style={{ marginBottom: 0 }}>
                 {stats.map((s, i) => (
                    <div key={i} className="stat-card" style={{ borderLeft: `4px solid ${s.color}` }}>
                       <div style={{ fontSize: "0.7rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>{s.label}</div>
                       <div style={{ fontSize: "2rem", fontWeight: 900, color: s.color }}>{s.value}</div>
                       <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: 4 }}>Unit</div>
                    </div>
                 ))}
              </div>

              <div className="bento-card" style={{ padding: 32 }}>
                 <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                    Spesifikasi Alat
                 </h3>
                 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                    <div className="detail-item-small">
                       <span style={{ display: "block", fontSize: "0.7rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>ID Alat</span>
                       <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{tool.id}</span>
                    </div>
                    <div className="detail-item-small">
                       <span style={{ display: "block", fontSize: "0.7rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>Asal Kategori</span>
                       <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{tool.category?.name}</span>
                    </div>
                    <div className="detail-item-small">
                       <span style={{ display: "block", fontSize: "0.7rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>Total Stok Inventaris</span>
                       <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{tool.units?.length} Unit Phisik</span>
                    </div>
                    <div className="detail-item-small">
                       <span style={{ display: "block", fontSize: "0.7rem", fontWeight: 800, color: "var(--text-muted)", textTransform: "uppercase" }}>Status Kondisi</span>
                       <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{tool.units.every((u: any) => u.status === "AVAILABLE") ? "Semua Siap" : "Ada Unit Dipinjam/Rusak"}</span>
                    </div>
                 </div>
              </div>
           </div>
        </div>

        {/* BOTTOM SECTION: UNIT LIST */}
        <div className="table-container">
           <div className="table-header">
              <h3>Daftar Unit Tersimpan (Unit Code)</h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Setiap unit memiliki barkode/kode unik tersendiri</p>
           </div>
           <div className="table-wrapper">
              <table>
                 <thead>
                    <tr>
                       <th>Identitas Unit / Barcode</th>
                       <th>Status Saat Ini</th>
                       <th>Terakhir Update</th>
                    </tr>
                 </thead>
                 <tbody>
                    {tool.units.map((unit: any) => (
                       <tr key={unit.id}>
                          <td>
                             <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                                <div style={{ width: 40, height: 40, background: "var(--bg-main)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem" }}>
                                   🏷️
                                </div>
                                <div>
                                   <div style={{ fontWeight: 800, fontFamily: "monospace", fontSize: "1rem", color: "var(--sidebar-navy)" }}>{unit.code}</div>
                                   <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Unit Phisik ID: {unit.id.slice(-8)}</div>
                                </div>
                             </div>
                          </td>
                          <td>
                             <span className={`badge badge-${unit.status.toLowerCase()}`}>
                                {unit.status === "AVAILABLE" ? "SIAP DIGUNAKAN" : 
                                 unit.status === "BORROWED" ? "SEDANG DIPINJAM" :
                                 unit.status === "DAMAGED" ? "RUSAK PERLU SERVICE" : "HILANG/TDK DITEMUKAN"}
                             </span>
                          </td>
                          <td style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                             {new Date(unit.updatedAt).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
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
