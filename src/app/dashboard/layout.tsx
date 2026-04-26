"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";

/* ── Inline SVG Icons (clean & consistent) ── */
const icons: Record<string, React.ReactNode> = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  ),
  loans: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 14l2 2 4-4"/>
    </svg>
  ),
  tools: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
    </svg>
  ),
  categories: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  users: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  ),
  logs: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="12 8 12 12 14 14"/><circle cx="12" cy="12" r="10"/>
    </svg>
  ),
  reports: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  ),
  notifications: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
    </svg>
  ),
  logout: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  ),
};

const iconMap: Record<string, string> = {
  "/dashboard": "dashboard",
  "/dashboard/loans": "loans",
  "/dashboard/tools": "tools",
  "/dashboard/categories": "categories",
  "/dashboard/users": "users",
  "/dashboard/settings": "settings",
  "/dashboard/logs": "logs",
  "/dashboard/reports": "reports",
  "/dashboard/notifications": "notifications",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const role = session?.user?.role;

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetch("/api/notifications").then((r) => r.json()),
    refetchInterval: 5000,
  });

  const unreadCount = notifications?.filter?.((n: any) => !n.isRead)?.length || 0;

  const isActive = (path: string) => pathname === path;

  const navItems = [
    {
      section: "Menu Utama",
      items: [
        { href: "/dashboard", label: "Dashboard", roles: ["ADMIN", "PETUGAS", "PEMINJAM"] },
        { href: "/dashboard/loans", label: "Pinjaman", roles: ["ADMIN", "PETUGAS", "PEMINJAM"] },
      ],
    },
    {
      section: "Inventaris",
      items: [
        { href: "/dashboard/tools", label: "Alat & Barang", roles: ["ADMIN", "PETUGAS", "PEMINJAM"] },
        { href: "/dashboard/categories", label: "Kategori", roles: ["ADMIN"] },
      ],
    },
    {
      section: "Manajemen",
      items: [
        { href: "/dashboard/users", label: "Pengguna", roles: ["ADMIN"] },
        { href: "/dashboard/settings", label: "Pengaturan", roles: ["ADMIN"] },
        { href: "/dashboard/logs", label: "Log Aktivitas", roles: ["ADMIN"] },
        { href: "/dashboard/reports", label: "Laporan", roles: ["PETUGAS"] },
      ],
    },
  ];

  const currentPath = pathname === "/dashboard" ? "/dashboard" : pathname;
  const pageInfoMap: Record<string, { title: string; desc: string }> = {
    "/dashboard": { 
      title: "Dashboard", 
      desc: `Selamat datang kembali, ${session?.user?.name || "..."}` 
    },
    "/dashboard/loans": { 
      title: "Pinjaman", 
      desc: "Kelola permintaan dan status peminjaman alat" 
    },
    "/dashboard/tools": { 
      title: "Alat & Barang", 
      desc: "Kelola inventaris alat dan barang" 
    },
    "/dashboard/categories": { 
      title: "Kategori", 
      desc: "Kelola kategori alat dan barang" 
    },
    "/dashboard/users": { 
      title: "Pengguna", 
      desc: "Manajemen akun dan hak akses pengguna" 
    },
    "/dashboard/settings": { 
      title: "Pengaturan", 
      desc: "Konfigurasi sistem dan preferensi profil" 
    },
    "/dashboard/logs": { 
      title: "Log Aktivitas", 
      desc: "Pantau riwayat aktivitas penggunaan sistem" 
    },
    "/dashboard/notifications": { 
      title: "Notifikasi", 
      desc: "Kotak masuk pemberitahuan sistem" 
    },
    "/dashboard/reports": { 
      title: "Laporan", 
      desc: "Rekap data dan laporan aktivitas" 
    },
  };

  const pageInfo = pageInfoMap[currentPath] || { 
    title: "Detail", 
    desc: "Informasi detail data" 
  };

  const handleNotifClick = () => {
    if (pathname === "/dashboard/notifications") {
      router.back();
    } else {
      router.push("/dashboard/notifications");
    }
  };

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h2>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
              </svg>
              SPK Tools
            </span>
          </h2>
          <p>Sistem Peminjaman Alat</p>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((section) => {
            const filteredItems = section.items.filter((item) =>
              item.roles.includes(role || "")
            );
            if (filteredItems.length === 0) return null;

            return (
              <div key={section.section}>
                <div className="sidebar-section">{section.section}</div>
                {filteredItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`sidebar-link ${isActive(item.href) ? "active" : ""}`}
                  >
                    <span className="icon">{icons[iconMap[item.href]] || "•"}</span>
                    <span>{item.label}</span>
                    {item.href === "/dashboard/notifications" && unreadCount > 0 && (
                      <span className="notif-count">{unreadCount}</span>
                    )}
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>

      </aside>

      <main className="main-content">
        <header className="top-nav">
          <div className="top-nav-left">
            <div className="page-identity">
              <h1>{pageInfo.title}</h1>
              <p>{pageInfo.desc}</p>
            </div>
          </div>
          <div className="top-nav-right">
            <div className="top-nav-user">
              <div className="user-avatar-mini">
                {session?.user?.name?.[0]?.toUpperCase() || "?"}
              </div>
              <div className="user-info-mini">
                <span className="user-name">{session?.user?.name}</span>
                <span className="user-role">{role}</span>
              </div>
            </div>

            <button 
              onClick={handleNotifClick}
              className={`notif-btn ${isActive("/dashboard/notifications") ? "active" : ""}`}
              style={{ border: "none", background: "none", cursor: "pointer", position: "relative", padding: 0 }}
            >
              <div className="icon-wrapper">
                {icons.notifications}
                {unreadCount > 0 && <span className="badge-count">{unreadCount}</span>}
              </div>
            </button>

            <button 
              className="logout-nav-btn"
              onClick={() => signOut({ callbackUrl: "/login" })}
              title="Keluar"
            >
              {icons.logout}
              <span>Keluar</span>
            </button>
          </div>
        </header>
        <div className="page-container">
          {children}
        </div>
      </main>
    </div>
  );
}
