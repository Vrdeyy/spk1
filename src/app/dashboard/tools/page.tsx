"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

export default function ToolsPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const role = session?.user?.role;
  const isAdmin = role === "ADMIN";

  // Modal states and logic moved to dedicated routes

  // handleEdit removed, moved to new page route

  const { data: tools, isLoading } = useQuery({
    queryKey: ["tools"],
    queryFn: () => fetch("/api/tools").then((r) => r.json()),
  });

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetch("/api/categories").then((r) => r.json()),
  });

  // createMutation moved to create/page.tsx

  // updateMutation removed, moved to new page route

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
        <div className="page-body"><div className="loader"><div className="spinner" /></div></div>
      </div>
    );
  }

  // --- Sub Component for Card ---
  const ToolCard = ({ tool, isAdmin, role, onDetail, onDelete }: { tool: any, isAdmin: boolean, role: string, onDetail: () => void, onDelete: (id: string) => void }) => {
    const [imgError, setImgError] = useState(false);

    return (
      <div className="bento-card" style={{ 
        padding: 0, 
        overflow: "hidden", 
        display: "flex", 
        flexDirection: "column",
        transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
        border: "1px solid var(--border-light)",
        height: "100%"
      }}>
        {/* Image Section */}
        <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)" }}>
          {tool.image && !imgError ? (
            <img 
              src={tool.image} 
              alt={tool.name} 
              style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s ease" }}
              onError={() => setImgError(true)}
              onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.1)")}
              onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
            />
          ) : (
            <div style={{ 
               width: "100%", 
               height: "100%", 
               display: "flex", 
               flexDirection: "column",
               alignItems: "center", 
               justifyContent: "center", 
               gap: 12,
               background: "linear-gradient(135deg, var(--sidebar-navy) 0%, var(--accent-purple) 100%)",
               color: "white"
            }}>
              <div style={{ fontSize: "3rem" }}>
                 {tool.category?.name === "Elektronik" ? "⚡" : tool.category?.name === "Perkakas" ? "🛠️" : "📦"}
              </div>
              <div style={{ fontSize: "0.6rem", fontWeight: 800, textTransform: "uppercase", opacity: 0.6, letterSpacing: 2 }}>{tool.category?.name}</div>
            </div>
          )}
          <div style={{ position: "absolute", top: 12, right: 12 }}>
            <span className="badge badge-ongoing" style={{ backdropFilter: "blur(12px)", background: "rgba(255,255,255,0.85)", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
              {tool.category?.name}
            </span>
          </div>
        </div>

        {/* Content Section */}
        <div style={{ padding: 20, flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ marginBottom: 4, fontSize: "0.75rem", fontWeight: 800, color: "var(--accent-purple)", textTransform: "uppercase", letterSpacing: 0.5 }}>
            {tool.brand}
          </div>
          <h4 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--sidebar-navy)", marginBottom: 16, lineHeight: 1.2, minHeight: "2.4em", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {tool.name}
          </h4>

          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "1fr 1fr", 
            gap: 12, 
            marginBottom: 20,
            padding: "12px",
            background: "var(--bg-main)",
            borderRadius: 16,
            border: "1px solid var(--border-light)"
          }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 2 }}>Tersedia</div>
              <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--accent-green)" }}>{tool.stockAvailable}</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "0.65rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 2 }}>Total Unit</div>
              <div style={{ fontSize: "1rem", fontWeight: 800, color: "var(--sidebar-navy)" }}>{tool.stockTotal}</div>
            </div>
          </div>

           <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
             {tool.stockAvailable > 0 && role === "PEMINJAM" && (
               <Link 
                href="/dashboard/loans/create" 
                className="btn btn-primary" 
                style={{ justifyContent: "center", fontSize: "0.85rem", padding: "12px", borderRadius: 14, background: "var(--accent-purple)", width: "100%" }}
               >
                 Pinjam Sekarang
               </Link>
             )}
             <div style={{ display: "flex", gap: 8 }}>
                <Link 
                  href={`/dashboard/tools/${tool.id}`}
                  className="btn btn-secondary" 
                  style={{ flex: 1, justifyContent: "center", fontSize: "0.8rem", padding: "10px" }}
                >
                  Detail Alat
                </Link>
                {isAdmin && (
                  <div style={{ display: "flex", gap: 6 }}>
                      <Link href={`/dashboard/tools/${tool.id}/edit`} className="btn btn-warning" style={{ padding: "10px", borderRadius: 14 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      </Link>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: "10px", borderRadius: 14 }}
                        onClick={() => onDelete(tool.id)}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                      </button>
                  </div>
                )}
             </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page-enter">
      {isAdmin && (
        <div className="page-header" style={{ borderBottom: "none", paddingBottom: 0, justifyContent: "flex-end" }}>
          <Link href="/dashboard/tools/create" className="btn btn-primary">
            + Tambah Alat
          </Link>
        </div>
      )}

      <div className="page-body">
        <div className="stats-grid">
          <div className="stat-card blue">
            <div className="stat-icon">🔧</div>
            <div className="stat-value">{Array.isArray(tools) ? tools.length : 0}</div>
            <div className="stat-label">Jenis Alat</div>
          </div>
          <div className="stat-card green">
            <div className="stat-icon">✅</div>
            <div className="stat-value">
              {Array.isArray(tools) ? tools.reduce((a: number, t: any) => a + (t.stockAvailable || 0), 0) : 0}
            </div>
            <div className="stat-label">Unit Tersedia</div>
          </div>
          <div className="stat-card yellow">
            <div className="stat-icon">📦</div>
            <div className="stat-value">
              {Array.isArray(tools) ? tools.reduce((a: number, t: any) => a + (t.stockBorrowed || 0), 0) : 0}
            </div>
            <div className="stat-label">Unit Dipinjam</div>
          </div>
          <div className="stat-card red">
            <div className="stat-icon">⚠️</div>
            <div className="stat-value">
              {Array.isArray(tools) ? tools.reduce((a: number, t: any) => a + (t.stockDamaged || 0), 0) : 0}
            </div>
            <div className="stat-label">Unit Rusak</div>
          </div>
        </div>

        <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
           <h3 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--sidebar-navy)" }}>Katalog Inventaris</h3>
           <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>Total {tools?.length || 0} Jenis Alat</div>
        </div>

        <div style={{ 
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", 
          gap: 24 
        }}>
          {Array.isArray(tools) && tools.map((tool: any) => (
            <ToolCard 
              key={tool.id} 
              tool={tool} 
              isAdmin={isAdmin} 
              role={role || ""}
              onDetail={() => {}} // Not used anymore
              onDelete={(id) => {
                if (confirm(`Hapus ${tool.name}?`)) deleteMutation.mutate(id);
              }}
            />
          ))}
        </div>

        {(!Array.isArray(tools) || tools.length === 0) && (
          <div style={{ padding: 80, textAlign: "center", color: "var(--text-muted)", background: "white", borderRadius: 24, border: "1px dashed var(--border-light)" }}>
             <div style={{ fontSize: "3rem", marginBottom: 16 }}>📦</div>
             <p style={{ fontWeight: 600 }}>Belum ada data inventaris ditemukan.</p>
          </div>
        )}
      </div>

      {/* Modals have been migrated to dedicated pages */}
    </div>
  );
}
