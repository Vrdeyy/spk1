"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

export default function LogsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const [searchTerm, setSearchTerm] = useState("");

  const { data: logs, isLoading, isError, error } = useQuery({
    queryKey: ["activity-logs"],
    queryFn: async () => {
      const res = await fetch("/api/logs");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengambil data");
      return data;
    },
    enabled: isAdmin,
  });

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  };

  const getActionStyles = (action: string) => {
    const a = action.toUpperCase();
    if (a.includes("CREATE")) return { badge: "badge-approved", icon: "✨" };
    if (a.includes("UPDATE")) return { badge: "badge-ongoing", icon: "📝" };
    if (a.includes("DELETE")) return { badge: "badge-rejected", icon: "🗑️" };
    if (a.includes("APPROVE")) return { badge: "badge-done", icon: "✅" };
    if (a.includes("REJECT")) return { badge: "badge-rejected", icon: "❌" };
    if (a.includes("RETURN")) return { badge: "badge-pending", icon: "📦" };
    if (a.includes("FINALIZE")) return { badge: "badge-approved", icon: "🏁" };
    return { badge: "badge-peminjam", icon: "🔔" };
  };

  const filteredLogs = logs?.filter((log: any) => 
    log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.target.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="page-enter">
        <div className="page-body">
           <div className="alert alert-error">Maaf, hanya Admin yang dapat mengakses riwayat aktivitas sistem.</div>
        </div>
      </div>
    );
  }

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
        <div className="header-actions" style={{ display: "flex", gap: 12 }}>
          <input 
            type="text" 
            className="form-input" 
            placeholder="Cari aktivitas..." 
            style={{ width: 250 }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="page-body">
        {isError && (
          <div className="alert alert-error" style={{ marginBottom: 24 }}>
            {(error as Error).message}
          </div>
        )}

        <div className="table-container">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 140 }}>Waktu</th>
                  <th>Admin / Petugas</th>
                  <th>Aksi</th>
                  <th>Target Aset</th>
                  <th>Catatan Detail</th>
                  <th style={{ textAlign: "right" }}>Opsi</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs?.map?.((log: any) => {
                  const style = getActionStyles(log.action);
                  return (
                    <tr key={log.id}>
                      <td style={{ whiteSpace: "nowrap" }}>
                         <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontWeight: 800, color: "var(--sidebar-navy)" }}>{formatDate(log.createdAt)}</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 600 }}>
                                {new Date(log.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                            </span>
                         </div>
                      </td>
                      <td>
                        <div className="td-user">
                          <div className="td-user-avatar" style={{ borderRadius: 10, background: "var(--bg-main)" }}>
                             {log.user?.name?.[0].toUpperCase()}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                             <div className="td-user-name" style={{ fontSize: "0.9rem" }}>{log.user?.name}</div>
                             <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", fontWeight: 700 }}>{log.user?.role}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                           <span style={{ fontSize: "1.2rem" }}>{style.icon}</span>
                           <span className={`badge ${style.badge}`} style={{ fontSize: "0.6rem", minWidth: "auto", padding: "4px 10px" }}>
                             {log.action}
                           </span>
                        </div>
                      </td>
                      <td>
                         {log.target.includes("Pinjaman") ? (
                           <Link 
                             href={`/dashboard/loans/${log.target.replace("Pinjaman ", "")}`}
                             className="link-style"
                             style={{ fontWeight: 700, color: "var(--accent-purple)", fontSize: "0.9rem", textDecoration: "underline" }}
                           >
                             {log.target}
                           </Link>
                         ) : (
                           <div style={{ fontWeight: 700, color: "var(--accent-purple)", fontSize: "0.9rem" }}>{log.target}</div>
                         )}
                      </td>
                      <td>
                         <div style={{ 
                             fontSize: "0.85rem", 
                             color: "var(--text-secondary)", 
                             fontWeight: 500,
                             lineHeight: 1.5,
                             maxWidth: 350
                         }}>
                            {log.details}
                         </div>
                      </td>
                      <td style={{ textAlign: "right" }}>
                         {log.target.includes("Pinjaman") && (
                            <Link 
                              href={`/dashboard/loans/${log.target.replace("Pinjaman ", "")}`}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: "6px 12px", borderRadius: 10, fontSize: "0.7rem", fontWeight: 800 }}
                            >
                              Detail
                            </Link>
                         )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
