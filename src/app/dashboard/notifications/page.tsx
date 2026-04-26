"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetch("/api/notifications").then((r) => r.json()),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () =>
      fetch("/api/notifications", { 
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}) 
      }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markSingleReadMutation = useMutation({
    mutationFn: (id: string) =>
      fetch("/api/notifications", { 
        method: "PUT", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }) 
      }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const deleteOneMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/notifications?id=${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const deleteAllMutation = useMutation({
    mutationFn: () =>
      fetch("/api/notifications", { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount = notifications?.filter?.((n: any) => !n.isRead)?.length || 0;

  const getIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes("pinjam") || t.includes("request")) return "📥";
    if (t.includes("setuju") || t.includes("approve")) return "✅";
    if (t.includes("tolak") || t.includes("reject")) return "❌";
    if (t.includes("kembali") || t.includes("return")) return "📤";
    if (t.includes("telat") || t.includes("late")) return "⏰";
    if (t.includes("bayar") || t.includes("denda") || t.includes("konfirmasi")) return "💰";
    return "🔔";
  };

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
        <div style={{ display: "flex", gap: 12 }}>
          {notifications?.length > 0 && (
            <button
               className="btn btn-secondary"
               style={{ background: "transparent", color: "var(--accent-red)", borderColor: "var(--accent-red)" }}
               onClick={() => confirm("Hapus semua notifikasi?") && deleteAllMutation.mutate()}
               disabled={deleteAllMutation.isPending}
            >
              Bersihkan Semua
            </button>
          )}
          {unreadCount > 0 && (
            <button
              className="btn btn-primary"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              Tandai Semua Dibaca
            </button>
          )}
        </div>
      </div>

      <div className="page-body">
        <div style={{ width: "100%" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {notifications?.map?.((notif: any) => (
              <div
                key={notif.id}
                className={`notif-item ${!notif.isRead ? "unread" : ""}`}
                onClick={() => {
                   if (!notif.isRead) markSingleReadMutation.mutate(notif.id);
                   if (notif.loanId) router.push(`/dashboard/loans/${notif.loanId}`);
                }}
                style={{ 
                   display: "flex", 
                   gap: 20, 
                   alignItems: "flex-start",
                   padding: "24px",
                   backgroundColor: notif.isRead ? "var(--bg-card)" : "white",
                   borderLeft: notif.isRead ? "1px solid var(--border-light)" : "4px solid var(--accent-purple)",
                   opacity: notif.isRead ? 0.8 : 1,
                   animation: "slideIn 0.4s ease-out",
                   cursor: notif.loanId ? "pointer" : "default",
                   transition: "all 0.2s ease"
                }}
              >
                <div style={{ 
                    fontSize: "1.5rem", 
                    width: 48, 
                    height: 48, 
                    background: notif.isRead ? "var(--bg-main)" : "var(--accent-purple-soft)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 12,
                    flexShrink: 0
                }}>
                  {getIcon(notif.title)}
                </div>
                
                <div style={{ flex: 1 }}>
                  <div style={{ 
                      display: "flex", 
                      justifyContent: "space-between", 
                      alignItems: "center",
                      marginBottom: 6
                  }}>
                    <div style={{ 
                        fontWeight: 800, 
                        fontSize: "1.05rem", 
                        color: "var(--sidebar-navy)",
                        display: "flex",
                        alignItems: "center",
                        gap: 8
                    }}>
                        {notif.title.toLowerCase().includes("selesai") ? "🟣" : 
                           (notif.title.toLowerCase().includes("konfirmasi") || notif.title.toLowerCase().includes("bayar") || notif.title.toLowerCase().includes("denda")) ? "💰" :
                           notif.title.toLowerCase().includes("rusak") ? "⚠️" : "🔵"}
                        {notif.title}
                        {!notif.isRead && <span style={{ width: 8, height: 8, background: "var(--accent-purple)", borderRadius: "50%" }}></span>}
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                       {!notif.isRead && (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              markSingleReadMutation.mutate(notif.id);
                            }}
                            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--accent-purple)", fontSize: "0.75rem", fontWeight: 700 }}
                          >
                            Tandai Dibaca
                          </button>
                       )}
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           deleteOneMutation.mutate(notif.id);
                         }}
                         style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4 }}
                       >
                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18m-2 0v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6m3 0V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                       </button>
                    </div>
                  </div>
                  
                  <div style={{ 
                      fontSize: "0.925rem", 
                      color: "var(--text-secondary)", 
                      lineHeight: 1.6,
                      marginBottom: 12,
                      fontWeight: 500
                  }}>
                    {notif.message}
                  </div>
                  
                  <div style={{ 
                      fontSize: "0.75rem", 
                      color: "var(--text-muted)", 
                      display: "flex", 
                      alignItems: "center", 
                      gap: 6,
                      fontWeight: 600
                  }}>
                     <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                     </svg>
                     {new Date(notif.createdAt).toLocaleString("id-ID", { 
                        day: "numeric", 
                        month: "long", 
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                     })}
                  </div>
                </div>
              </div>
            ))}

            {(!notifications || notifications.length === 0) && (
              <div className="table-empty" style={{ padding: "100px 40px" }}>
                <div className="icon" style={{ fontSize: "4rem", marginBottom: 24 }}>📭</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--sidebar-navy)", marginBottom: 8 }}>
                  Kotak Masuk Kosong
                </div>
                <div style={{ color: "var(--text-muted)", maxWidth: 300, margin: "0 auto" }}>
                  Anda tidak memiliki notifikasi baru saat ini. Semua urusan sudah beres!
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
