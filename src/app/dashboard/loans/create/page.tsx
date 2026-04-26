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

  return (
    <div className="page-enter">
      <div className="page-header" style={{ borderBottom: "none", paddingBottom: 0 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Link href="/dashboard/loans" className="btn btn-secondary btn-sm" style={{ padding: "6px 12px" }}>
              ← Kembali
            </Link>
          </div>
        </div>
      </div>

      <div className="page-body">
        <form onSubmit={(e) => {
          e.preventDefault();
          createMutation.mutate(loanForm);
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 32, alignItems: "start" }}>
            
            {/* LEFT: Item Selection */}
            <div className="detail-section" style={{ background: "transparent", border: "none", boxShadow: "none", padding: 0 }}>
              <div style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--sidebar-navy)" }}>Pilih Alat & Barang</h2>
                <span className="badge badge-ongoing" style={{ fontSize: "0.65rem" }}>
                   {tools?.filter((t: any) => t.stockAvailable > 0).length || 0} Tersedia
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
                {tools?.filter((t: any) => t.stockAvailable > 0).map((tool: any) => {
                  const selected = loanForm.items.find((i) => i.toolId === tool.id);
                  return (
                    <div 
                      key={tool.id} 
                      className={`item-select-card ${selected ? "selected" : ""}`}
                      onClick={() => toggleTool(tool.id)}
                      style={{ 
                        cursor: "pointer", 
                        padding: 24, 
                        borderRadius: 20, 
                        border: selected ? "2px solid var(--accent-purple)" : "1.5px solid var(--border-light)",
                        background: selected ? "var(--bg-white)" : "rgba(255,255,255,0.6)",
                        transition: "all 0.3s ease",
                        position: "relative",
                        overflow: "hidden"
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                         <div style={{ fontSize: "1.5rem" }}>🛠️</div>
                         {selected && (
                           <div style={{ width: 24, height: 24, background: "var(--accent-purple)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "0.8rem" }}>
                             ✓
                           </div>
                         )}
                      </div>
                      
                      <div className="tool-name" style={{ fontWeight: 800, fontSize: "1.1rem", color: "var(--sidebar-navy)", marginBottom: 4 }}>
                        {tool.name}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 16 }}>
                         {tool.brand} • {tool.category?.name}
                      </div>

                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                         <div className="tool-stock" style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--accent-purple)" }}>
                           Stok: {tool.stockAvailable}
                         </div>

                         {selected && (
                            <div className="qty-control" onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-main)", borderRadius: 12, padding: "4px 8px" }}>
                              <button type="button" onClick={() => updateQty(tool.id, selected.qtyRequested - 1)} style={{ border: "none", background: "none", width: 24, height: 24, cursor: "pointer", fontWeight: 800 }}>−</button>
                              <span style={{ fontWeight: 800, minWidth: 20, textAlign: "center", padding: "0 8px" }}>{selected.qtyRequested}</span>
                              <button type="button" onClick={() => updateQty(tool.id, Math.min(selected.qtyRequested + 1, tool.stockAvailable))} style={{ border: "none", background: "none", width: 24, height: 24, cursor: "pointer", fontWeight: 800 }}>+</button>
                            </div>
                         )}
                      </div>
                      
                      {selected && <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4, background: "var(--accent-purple)" }}></div>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT: Form Details */}
            <div style={{ position: "sticky", top: 32 }}>
               <div className="detail-section" style={{ padding: 32, borderRadius: 24 }}>
                  <div className="section-title" style={{ marginBottom: 24 }}>Informasi Peminjaman</div>
                  
                  <div className="form-group" style={{ marginBottom: 24 }}>
                    <label style={{ fontWeight: 800, fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 8, display: "block", textTransform: "uppercase" }}>Alasan Peminjaman</label>
                    <textarea
                      className="form-input"
                      placeholder="Contoh: Praktikum Kelompok 5 di Lab..."
                      value={loanForm.reason}
                      onChange={(e) => setLoanForm({ ...loanForm, reason: e.target.value })}
                      required
                      style={{ minHeight: 120, fontSize: "0.95rem" }}
                    />
                  </div>

                  <div className="form-group" style={{ marginBottom: 32 }}>
                    <label style={{ fontWeight: 800, fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 8, display: "block", textTransform: "uppercase" }}>Rencana Pengembalian</label>
                    <input
                      type="date"
                      className="form-input"
                      value={loanForm.dueDate}
                      onChange={(e) => setLoanForm({ ...loanForm, dueDate: e.target.value })}
                      min={new Date().toISOString().split("T")[0]}
                      required
                      style={{ fontSize: "0.95rem", fontWeight: 600 }}
                    />
                  </div>

                  {loanForm.items.length > 0 && (
                     <div style={{ marginBottom: 32, padding: 16, background: "var(--bg-main)", borderRadius: 16 }}>
                        <div style={{ fontWeight: 800, fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase" }}>Ringkasan Pesanan</div>
                        {loanForm.items.map(item => {
                           const t = tools?.find((tool: any) => tool.id === item.toolId);
                           return (
                             <div key={item.toolId} style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>{t?.name}</span>
                                <span style={{ fontSize: "0.85rem", fontWeight: 800, color: "var(--accent-purple)" }}>x{item.qtyRequested}</span>
                             </div>
                           )
                        })}
                     </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <button 
                      type="submit" 
                      className="btn btn-primary" 
                      style={{ width: "100%", justifyContent: "center", padding: 16, borderRadius: 14, fontSize: "1rem" }}
                      disabled={createMutation.isPending || loanForm.items.length === 0}
                    >
                      {createMutation.isPending ? "Mengajukan..." : `Konfirmasi Pinjaman (${loanForm.items.length})`}
                    </button>
                    <Link href="/dashboard/loans" className="btn btn-secondary" style={{ width: "100%", justifyContent: "center", padding: 14, borderRadius: 14 }}>
                      Batalkan
                    </Link>
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
