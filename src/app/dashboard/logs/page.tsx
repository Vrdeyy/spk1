"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";

export default function LogsPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

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
    return date.toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!isAdmin) {
      return <div className="page-enter"><div className="alert alert-error">Akses Ditolak</div></div>;
  }

  if (isLoading) {
    return (
      <div className="page-enter">
        <div className="page-header"><div><h1>Log Aktivitas</h1></div></div>
        <div className="page-body"><div className="loader"><div className="spinner" /></div></div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1>Log Aktivitas Admin</h1>
          <p className="description">Riwayat perubahan data penting yang dilakukan oleh Admin</p>
        </div>
      </div>

      <div className="page-body">
        {isError && (
          <div className="alert alert-error" style={{ marginBottom: 20 }}>
            Error: {(error as Error).message}
          </div>
        )}
        <div className="table-container">
          <div className="table-header">
            <h3>Riwayat Aktivitas</h3>
          </div>
          <table>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Admin</th>
                <th>Aksi</th>
                <th>Target</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {logs?.map?.((log: any) => (
                <tr key={log.id}>
                  <td style={{ whiteSpace: "nowrap", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                    {formatDate(log.createdAt)}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{log.user?.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{log.user?.email}</div>
                  </td>
                  <td>
                    <span className={`badge badge-${log.action.includes("DELETE") ? "rejected" : log.action.includes("UPDATE") ? "warning" : "available"}`}>
                      {log.action}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>{log.target}</td>
                  <td style={{ fontSize: "0.8rem", maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis" }}>
                    {log.details}
                  </td>
                </tr>
              ))}
              {(!logs || logs.length === 0) && (
                <tr>
                  <td colSpan={5} className="table-empty">
                    <div className="icon">📜</div>
                    <div>Belum ada aktivitas tercatat</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
