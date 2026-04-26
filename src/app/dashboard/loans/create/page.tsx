"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

export default function CreateLoanPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: session } = useSession();


  const [loanForm, setLoanForm] = useState({
    reason: "",
    dueDate: "",
    items: [] as { toolId: string; qtyRequested: number }[],
  });
  const [search, setSearch] = useState("");

  const { data: tools, isLoading: isLoadingTools } = useQuery({
    queryKey: ["tools"],
    queryFn: () => fetch("/api/tools").then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      fetch("/api/loans", {
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
      queryClient.invalidateQueries({ queryKey: ["loans"] });
      router.push("/dashboard/loans");
    },
  });

  const toggleTool = (toolId: string) => {
    setLoanForm((prev) => {
      const exists = prev.items.find((i) => i.toolId === toolId);
      if (exists) {
        return { ...prev, items: prev.items.filter((i) => i.toolId !== toolId) };
      }
      return { ...prev, items: [...prev.items, { toolId, qtyRequested: 1 }] };
    });
  };

  const updateQty = (toolId: string, qty: number) => {
    setLoanForm((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        i.toolId === toolId ? { ...i, qtyRequested: Math.max(1, qty) } : i
      ),
    }));
  };

  if (isLoadingTools) {
    return (
      <div className="page-enter">
        <div className="page-body"><div className="loader"><div className="spinner" /></div></div>
      </div>
    );
  }

  // --- Sub Component for Selection Card ---
  const SelectToolCard = ({ tool, selected, onToggle, onQtyChange }: { tool: any, selected: any, onToggle: () => void, onQtyChange: (q: number) => void }) => {
     const [imgError, setImgError] = useState(false);

     return (
        <div 
          className={`bento-card ${selected ? "selected-premium" : ""}`}
          onClick={onToggle}
          style={{ 
            padding: 0, 
            overflow: "hidden", 
            display: "flex", 
            flexDirection: "column",
            transition: "all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
            border: selected ? "2.5px solid var(--accent-purple)" : "1px solid var(--border-light)",
            cursor: "pointer",
            background: "white",
            position: "relative",
            boxShadow: selected ? "0 0 20px var(--accent-purple-glow)" : "none",
            transform: selected ? "scale(1.02)" : "scale(1)"
          }}
        >
          {/* Image Section */}
          <div style={{ position: "relative", width: "100%", aspectRatio: "1/1", background: "#f1f5f9" }}>
            {tool.imageUrl && !imgError ? (
              <img 
                src={tool.imageUrl} 
                alt={tool.name} 
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                onError={() => setImgError(true)}
              />
            ) : (
              <div style={{ 
                 width: "100%", 
                 height: "100%", 
                 display: "flex", 
                 flexDirection: "column",
                 alignItems: "center", 
                 justifyContent: "center", 
                 gap: 8,
                 background: "linear-gradient(135deg, var(--sidebar-navy) 0%, var(--accent-purple) 100%)",
                 color: "white"
              }}>
                <div style={{ fontSize: "2.5rem" }}>
                   {tool.category?.name === "Elektronik" ? "⚡" : tool.category?.name === "Perkakas" ? "🛠️" : "📦"}
                </div>
              </div>
            )}
            
            {/* Selection Checkmark */}
            {selected && (
              <div style={{ 
                position: "absolute", 
                top: 12, 
                left: 12, 
                width: 32, 
                height: 32, 
                background: "var(--accent-purple)", 
                borderRadius: "50%", 
                display: "flex", 
                alignItems: "center", 
                justifyContent: "center", 
                color: "white", 
                boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                zIndex: 2
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
            )}

            <div style={{ position: "absolute", top: 12, right: 12 }}>
              <span className="badge badge-ongoing" style={{ backdropFilter: "blur(8px)", background: "rgba(255,255,255,0.85)", border: "none" }}>
                {tool.category?.name}
              </span>
            </div>
          </div>

          {/* Content Section */}
          <div style={{ padding: 16, flex: 1, display: "flex", flexDirection: "column" }}>
            <div style={{ marginBottom: 4, fontSize: "0.65rem", fontWeight: 800, color: "var(--accent-purple)", textTransform: "uppercase", letterSpacing: 0.5 }}>
              {tool.brand}
            </div>
            <h4 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--sidebar-navy)", marginBottom: 12, lineHeight: 1.2 }}>
              {tool.name}
            </h4>

            <div style={{ 
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "center",
              marginTop: "auto",
              paddingTop: 12,
              borderTop: "1px solid var(--border-light)"
            }}>
              <div>
                 <div style={{ fontSize: "0.6rem", fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Tersedia</div>
                 <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--accent-green)" }}>{tool.stockAvailable}</div>
              </div>

              {selected && (
                 <div className="qty-control" onClick={(e) => e.stopPropagation()} style={{ background: "var(--sidebar-navy)", borderRadius: 10, padding: "2px 4px", display: "flex", alignItems: "center", color: "white" }}>
                   <button type="button" onClick={() => onQtyChange(selected.qtyRequested - 1)} style={{ border: "none", background: "none", width: 28, height: 28, cursor: "pointer", fontWeight: 800, color: "white" }}>−</button>
                   <span style={{ fontWeight: 800, minWidth: 20, textAlign: "center", fontSize: "0.9rem" }}>{selected.qtyRequested}</span>
                   <button type="button" onClick={() => onQtyChange(Math.min(selected.qtyRequested + 1, tool.stockAvailable))} style={{ border: "none", background: "none", width: 28, height: 28, cursor: "pointer", fontWeight: 800, color: "white" }}>+</button>
                 </div>
              )}
            </div>
          </div>
        </div>
     );
  };

  return (
    <div className="page-enter">
      <div className="page-header" style={{ borderBottom: "none", paddingBottom: 0, marginBottom: -20 }}>
        <div className="page-identity">
          <h1>Ajukan Pinjaman</h1>
          <p>Pilih alat dan lengkapi detail pengembalian</p>
        </div>
      </div>

      <div className="page-body">
        <form onSubmit={(e) => {
          e.preventDefault();
          createMutation.mutate(loanForm);
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 32, alignItems: "start" }}>
            
            {/* LEFT: Item Selection */}
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              
              {/* Search & Filter Bar */}
              <div slot="search" style={{ 
                display: "flex", 
                gap: 16, 
                alignItems: "center", 
                background: "white", 
                padding: "16px 24px", 
                borderRadius: 20, 
                border: "1px solid var(--border-light)",
                boxShadow: "var(--shadow-sm)"
              }}>
                <div style={{ color: "var(--text-muted)" }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                </div>
                <input 
                   type="text"
                   placeholder="Cari alat berdasarkan nama atau merek..."
                   style={{ border: "none", outline: "none", width: "100%", fontSize: "0.95rem", fontWeight: 500 }}
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                />
                <div className="badge badge-ongoing" style={{ whiteSpace: "nowrap" }}>
                   {tools?.filter((t: any) => t.stockAvailable > 0 && (t.name.toLowerCase().includes(search.toLowerCase()) || t.brand.toLowerCase().includes(search.toLowerCase()))).length || 0} Tersedia
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 24 }}>
                {tools?.filter((t: any) => 
                  t.stockAvailable > 0 && 
                  (t.name.toLowerCase().includes(search.toLowerCase()) || t.brand.toLowerCase().includes(search.toLowerCase()))
                ).map((tool: any) => (
                    <SelectToolCard 
                      key={tool.id}
                      tool={tool}
                      selected={loanForm.items.find((i) => i.toolId === tool.id)}
                      onToggle={() => toggleTool(tool.id)}
                      onQtyChange={(q) => updateQty(tool.id, q)}
                    />
                ))}
              </div>
            </div>

            {/* RIGHT: Form Details */}
            <div style={{ position: "sticky", top: 120 }}>
               <div className="bento-card" style={{ padding: 32, borderRadius: 28, boxShadow: "var(--shadow-lg)", border: "1px solid var(--border-light)" }}>
                  <h3 style={{ fontSize: "1.1rem", fontWeight: 800, color: "var(--sidebar-navy)", marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
                     <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                     Detail Pinjaman
                  </h3>
                  
                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <label style={{ fontWeight: 800, fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 8, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>Alasan</label>
                    <textarea
                      className="form-input"
                      placeholder="Apa tujuan peminjaman ini?"
                      value={loanForm.reason}
                      onChange={(e) => setLoanForm({ ...loanForm, reason: e.target.value })}
                      required
                      style={{ minHeight: 100, fontSize: "0.9rem", background: "var(--bg-main)", border: "none", borderRadius: 16 }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 32 }}>
                    <label style={{ fontWeight: 800, fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 8, display: "block", textTransform: "uppercase", letterSpacing: 1 }}>Tgl Balik</label>
                    <input
                      type="date"
                      className="form-input"
                      value={loanForm.dueDate}
                      onChange={(e) => setLoanForm({ ...loanForm, dueDate: e.target.value })}
                      min={new Date().toISOString().split("T")[0]}
                      required
                      style={{ fontSize: "0.95rem", fontWeight: 700, background: "var(--bg-main)", border: "none", borderRadius: 16 }}
                    />
                  </div>

                  {loanForm.items.length > 0 ? (
                     <div style={{ marginBottom: 32 }}>
                        <div style={{ fontWeight: 800, fontSize: "0.75rem", color: "var(--sidebar-navy)", marginBottom: 16, textTransform: "uppercase" }}>Ringkasan Pesanan</div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                           {loanForm.items.map(item => {
                              const t = tools?.find((tool: any) => tool.id === item.toolId);
                              return (
                                <div key={item.toolId} style={{ display: "flex", alignItems: "center", gap: 12, padding: 8, background: "var(--bg-main)", borderRadius: 14 }}>
                                   <div style={{ width: 40, height: 40, borderRadius: 10, overflow: "hidden", background: "white" }}>
                                      {t?.imageUrl ? <img src={t.imageUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: "1rem" }}>🛠️</div>}
                                   </div>
                                   <div style={{ flex: 1 }}>
                                      <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--sidebar-navy)" }}>{t?.name}</div>
                                      <div style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>{t?.brand}</div>
                                   </div>
                                   <div style={{ fontSize: "0.9rem", fontWeight: 800, color: "var(--accent-purple)", padding: "0 8px" }}>x{item.qtyRequested}</div>
                                </div>
                              )
                           })}
                        </div>
                     </div>
                  ) : (
                    <div style={{ padding: "20px", textAlign: "center", border: "2px dashed var(--border-light)", borderRadius: 20, marginBottom: 32 }}>
                       <div style={{ fontSize: "1.5rem", marginBottom: 8, opacity: 0.5 }}>🔨</div>
                       <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600 }}>Pilih alat untuk memulai</p>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <button 
                      type="submit" 
                      className="btn btn-primary" 
                      style={{ width: "100%", justifyContent: "center", padding: 18, borderRadius: 18, fontSize: "1rem", background: "var(--accent-purple)", boxShadow: "0 10px 20px -5px rgba(139, 92, 246, 0.4)" }}
                      disabled={createMutation.isPending || loanForm.items.length === 0}
                    >
                      {createMutation.isPending ? "Mengajukan..." : `Konfirmasi Pinjaman (${loanForm.items.length})`}
                    </button>
                    <button type="button" onClick={() => router.push("/dashboard/loans")} className="btn btn-secondary" style={{ width: "100%", justifyContent: "center", padding: 14, borderRadius: 16, border: "none", color: "var(--text-muted)" }}>
                      Batalkan
                    </button>
                  </div>
               </div>

               {createMutation.isError && (
                 <div className="alert alert-error" style={{ marginTop: 16 }}>
                    {(createMutation.error as Error).message}
                 </div>
               )}
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}
