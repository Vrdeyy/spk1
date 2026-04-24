"use client";

import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";

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
  const role = session?.user?.role;

  const { data: tools } = useQuery({
    queryKey: ["tools"],
    queryFn: () => fetch("/api/tools").then((r) => r.json()),
  });

  const { data: loans } = useQuery({
    queryKey: ["loans"],
    queryFn: () => fetch("/api/loans").then((r) => r.json()),
  });

  const totalTools = tools?.length || 0;
  const availableUnits = tools?.reduce((acc: number, t: any) => acc + (t.stockAvailable || 0), 0) || 0;
  const borrowedUnits = tools?.reduce((acc: number, t: any) => acc + (t.stockBorrowed || 0), 0) || 0;

  const loansPending = loans?.filter?.((l: any) => l.status === "PENDING")?.length || 0;
  const loansOngoing = loans?.filter?.((l: any) => l.status === "ONGOING")?.length || 0;
  const loansApproved = loans?.filter?.((l: any) => l.status === "APPROVED")?.length || 0;
  const totalLoans = loans?.length || 0;

  const formatDate = (d: string) => new Date(d).toLocaleDateString("id-ID");

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p className="description">
            Selamat datang kembali, {session?.user?.name || "..."}
          </p>
        </div>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="stats-grid">
          {(role === "ADMIN" || role === "PETUGAS") && (
            <>
              <div className="stat-card blue">
                <div className="stat-icon"><StatIcon type="tools" /></div>
                <div className="stat-value">{totalTools}</div>
                <div className="stat-label">Jenis Alat</div>
              </div>
              <div className="stat-card yellow">
                <div className="stat-icon"><StatIcon type="check" /></div>
                <div className="stat-value">{availableUnits}</div>
                <div className="stat-label">Unit Tersedia</div>
              </div>
              <div className="stat-card green">
                <div className="stat-icon"><StatIcon type="box" /></div>
                <div className="stat-value">{borrowedUnits}</div>
                <div className="stat-label">Unit Dipinjam</div>
              </div>
              <div className="stat-card blue">
                <div className="stat-icon"><StatIcon type="pending" /></div>
                <div className="stat-value">{loansPending}</div>
                <div className="stat-label">Approval</div>
              </div>
            </>
          )}

          <div className="stat-card yellow">
            <div className="stat-icon"><StatIcon type="clipboard" /></div>
            <div className="stat-value">{totalLoans}</div>
            <div className="stat-label">Total Pinjaman</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-icon"><StatIcon type="refresh" /></div>
            <div className="stat-value">{loansOngoing}</div>
            <div className="stat-label">Sedang Dipinjam</div>
          </div>
          <div className="stat-card green">
            <div className="stat-icon"><StatIcon type="hourglass" /></div>
            <div className="stat-value">{loansApproved}</div>
            <div className="stat-label">Siap Diambil</div>
          </div>
        </div>

        {/* Recent loans table */}
        <div className="table-container">
          <div className="table-header">
            <h3>Pinjaman Terbaru</h3>
          </div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  {(role === "ADMIN" || role === "PETUGAS") && <th>Peminjam</th>}
                  <th>Alat & Barang</th>
                  <th>Status</th>
                  <th>Tenggat</th>
                </tr>
              </thead>
              <tbody>
                {loans?.slice?.(0, 10)?.map?.((loan: any) => (
                  <tr key={loan.id}>
                    {(role === "ADMIN" || role === "PETUGAS") && (
                      <td>
                        <div className="td-user">
                          <div className="td-user-avatar">
                            {loan.user?.name?.[0]?.toUpperCase()}
                          </div>
                          <div className="td-user-name">{loan.user?.name}</div>
                        </div>
                      </td>
                    )}
                    <td>
                      <div className="td-item-info">
                        {loan.items?.map((item: any) => (
                          <div key={item.id} className="td-item-main">
                            {item.tool?.name} <span className="td-item-sub">× {item.qtyRequested}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span className={`badge badge-${loan.status?.toLowerCase()}`}>
                        {loan.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--sidebar-navy)" }}>
                        {formatDate(loan.dueDate)}
                      </div>
                    </td>
                  </tr>
                ))}
                {(!loans || loans.length === 0) && (
                  <tr>
                    <td colSpan={5} className="table-empty">
                      <div className="icon">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" style={{ opacity: 0.3 }}>
                          <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/>
                        </svg>
                      </div>
                      <div>Belum ada data pinjaman</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
