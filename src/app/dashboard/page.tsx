"use client";

import { useSession } from "next-auth/react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

/* SVG stat icons */
const StatIcon = ({ type }: { type: string }) => {
  const svgs: Record<string, React.ReactNode> = {
    tools: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
      </svg>
    ),
    check: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    box: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
      </svg>
    ),
    pending: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    clipboard: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/>
      </svg>
    ),
    refresh: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
        <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
    ),
    hourglass: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
        <path d="M5 22h14"/><path d="M5 2h14"/><path d="M17 22v-4.172a2 2 0 0 0-.586-1.414L12 12l-4.414 4.414A2 2 0 0 0 7 17.828V22"/><path d="M7 2v4.172a2 2 0 0 0 .586 1.414L12 12l4.414-4.414A2 2 0 0 0 17 6.172V2"/>
      </svg>
    ),
  };
  return <>{svgs[type] || null}</>;
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();
  const role = session?.user?.role;

  const markSingleReadMutation = useMutation({
    mutationFn: (id: string) =>
      fetch("/api/notifications", { 
        method: "PUT", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }) 
      }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const { data: tools } = useQuery({
    queryKey: ["tools"],
    queryFn: () => fetch("/api/tools").then((r) => r.json()),
  });

  const { data: loans } = useQuery({
    queryKey: ["loans"],
    queryFn: () => fetch("/api/loans").then((r) => r.json()),
  });

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetch("/api/notifications").then((r) => r.json()),
    refetchInterval: 5000,
  });

  const safeTools = Array.isArray(tools) ? tools : [];
  const safeLoans = Array.isArray(loans) ? loans : [];
  const safeNotifications = Array.isArray(notifications) ? notifications : [];

  const totalTools = safeTools.length;
  const availableUnits = safeTools.reduce((acc: number, t: any) => acc + (t.stockAvailable || 0), 0);
  const borrowedUnits = safeTools.reduce((acc: number, t: any) => acc + (t.stockBorrowed || 0), 0);

  const loansPending = safeLoans.filter((l: any) => l.status === "PENDING").length;
  const loansOngoing = safeLoans.filter((l: any) => l.status === "ONGOING").length;
  const loansApproved = safeLoans.filter((l: any) => l.status === "APPROVED").length;
  const totalLoans = safeLoans.length;

  const formatDate = (d: string) => new Date(d).toLocaleDateString("id-ID");

  return (
    <div className="page-enter">
      <div className="page-body">
        {/* standalone old stats grid removed to integrate into bento */}


        {/* BENTO DASHBOARD CONTENT (ALL ROLES) */}
        {(role === "ADMIN" || role === "PETUGAS" || role === "PEMINJAM") && (
          <div className="bento-grid">
            
            {/* LEFT COLUMN */}
            <div className="bento-left">
              
              {/* 1. WELCOME CARD (NOW AT TOP) */}
              <div className="bento-card welcome-card">
                 <div className="welcome-text">
                    <span 
                      style={{ 
                        fontSize: "0.75rem", 
                        fontWeight: 800, 
                        letterSpacing: 2, 
                        opacity: 0.6, 
                        marginBottom: 12, 
                        display: "block",
                        textTransform: "uppercase" 
                      }}
                    >
                      Ringkasan Dashboard
                    </span>
                    <h2>Halo, {session?.user?.name?.split(' ')[0]}! 👋</h2>
                    <p style={{ marginTop: 8 }}>
                       {role === "PEMINJAM" 
                        ? "Semoga harimu produktif. Jangan lupa untuk mengembalikan alat tepat waktu ya!" 
                        : "Sistem siap digunakan. Kelola peminjaman dan inventaris dengan mudah hari ini."}
                    </p>
                 </div>
                 <div className="welcome-illustration">
                    <StatIcon type={role === "PEMINJAM" ? "tools" : "box"} />
                 </div>
              </div>

              {/* 2. ROLE-SPECIFIC WARNING BANNERS */}
              {role === "PEMINJAM" ? (
                safeLoans.filter((l: any) => l.return_ && (l.return_.fineLate + l.return_.fineDamage > 0) && l.return_.paymentStatus === "UNPAID").length > 0 && (
                  <div className="bento-card warning-banner">
                    <div className="banner-icon-bg">⚖️</div>
                    <div className="banner-content">
                       <h3>Peringatan Denda</h3>
                       <p>Selesaikan tagihan denda Anda untuk tetap dapat meminjam alat.</p>
                       <button className="btn btn-primary" onClick={() => (window.location.href = "/dashboard/loans")}>
                          Cek Detail Pinjaman
                       </button>
                    </div>
                  </div>
                )
              ) : (
                safeTools.filter((t: any) => t.units?.some((u: any) => u.status === "DAMAGED" || u.status === "LOST")).length > 0 && (
                  <div className="bento-card damage-banner">
                    <div className="banner-icon-bg">⚠️</div>
                    <div className="banner-content">
                       <h3>Aset Bermasalah</h3>
                       <p>Ada alat yang dilaporkan rusak atau hilang. Segera periksa status inventaris.</p>
                       <button className="btn btn-primary" style={{ background: "var(--sidebar-navy)", color: "white" }} onClick={() => (window.location.href = "/dashboard/tools")}>
                          Kelola Inventaris
                       </button>
                    </div>
                  </div>
                )
              )}

              {/* 3. PRIMARY STATS GRID */}
              <div className="bento-stats-container">
                 {role === "PEMINJAM" ? (
                    <div className="stats-inner-grid">
                      <div className="bento-card-mini">
                         <span className="mini-label">Total Pinjaman</span>
                         <span className="mini-value">{totalLoans}</span>
                      </div>
                      <div className="bento-card-mini">
                         <span className="mini-label">Berjalan</span>
                         <span className="mini-value">{loansOngoing}</span>
                      </div>
                      <div className="bento-card-mini">
                         <span className="mini-label">Siap Diambil</span>
                         <span className="mini-value">{loansApproved}</span>
                      </div>
                      <div className="bento-card-mini">
                         <span className="mini-label">Selesai</span>
                         <span className="mini-value">{safeLoans.filter((l: any) => l.status === "DONE").length}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="stats-inner-grid">
                      <div className="bento-card-mini">
                         <span className="mini-label">Total Pinjaman</span>
                         <span className="mini-value">{totalLoans}</span>
                      </div>
                      <div className="bento-card-mini">
                         <span className="mini-label">Approval</span>
                         <span className="mini-value">{loansPending}</span>
                      </div>
                      <div className="bento-card-mini">
                         <span className="mini-label">Tersedia</span>
                         <span className="mini-value">{availableUnits}</span>
                      </div>
                      <div className="bento-card-mini">
                         <span className="mini-label">Dipinjam</span>
                         <span className="mini-value">{borrowedUnits}</span>
                      </div>
                    </div>
                  )}
              </div>

            </div>

            {/* RIGHT COLUMN: Notification Feed */}
            <div className="bento-right">
               <div className="feed-header">
                  <h3>Pesan & Aktivitas</h3>
                  <button className="btn-text" onClick={() => (window.location.href = "/dashboard/notifications")}>Lihat Semua</button>
               </div>
                              <div className="notification-feed">
                  {safeNotifications.slice(0, 8).map((notif: any, i: number) => (
                    <div 
                      key={notif.id} 
                      className={`feed-item ${!notif.isRead ? "unread" : ""}`} 
                      style={{ 
                        animationDelay: `${i * 0.1}s`,
                        cursor: notif.loanId ? "pointer" : "default"
                      }}
                      onClick={() => {
                        if (!notif.isRead) markSingleReadMutation.mutate(notif.id);
                        if (notif.loanId) router.push(`/dashboard/loans/${notif.loanId}`);
                      }}
                    >
                       <div className="feed-icon">
                          {notif.title.toLowerCase().includes("tolak") ? "🔴" : 
                           notif.title.toLowerCase().includes("setuju") ? "🟢" : 
                           notif.title.toLowerCase().includes("selesai") ? "🟣" : 
                           (notif.title.toLowerCase().includes("konfirmasi") || notif.title.toLowerCase().includes("bayar") || notif.title.toLowerCase().includes("denda")) ? "💰" :
                           notif.title.toLowerCase().includes("rusak") ? "⚠️" : "🔵"}
                       </div>
                       <div className="feed-content">
                          <div className="feed-title">{notif.title}</div>
                          <div className="feed-message">{notif.message}</div>
                          <div className="feed-time">{new Date(notif.createdAt).toLocaleDateString("id-ID", { hour: "2-digit", minute: "2-digit" })}</div>
                       </div>
                    </div>
                  ))}
                  {safeNotifications.length === 0 && (
                    <div className="empty-feed">
                       <div className="empty-icon">🧘</div>
                       <p>Belum ada notifikasi baru hari ini.</p>
                    </div>
                  )}
               </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
