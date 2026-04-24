"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function ReportsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(false);

  if (session?.user?.role && session.user.role !== "PETUGAS") {
    // If not PETUGAS, redirect or show mostly blank
    if (typeof window !== "undefined") {
        router.replace("/dashboard");
    }
    return null;
  }

  const handleExport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (from) params.set("from", from);
      if (to) params.set("to", to);

      const res = await fetch(`/api/export/loans?${params.toString()}`);

      if (!res.ok) throw new Error("Export gagal");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `laporan-pinjaman-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert("Gagal mengunduh laporan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1>Laporan</h1>
          <p className="description">Export data pinjaman ke Excel</p>
        </div>
      </div>

      <div className="page-body">
        <div className="detail-section">
          <div className="section-title">Export Laporan Pinjaman</div>
          <div style={{ padding: 24 }}>
            <div className="report-controls">
              <div className="form-group">
                <label>Dari Tanggal</label>
                <input
                  type="date"
                  className="form-input"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Sampai Tanggal</label>
                <input
                  type="date"
                  className="form-input"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                />
              </div>
              <button
                className="btn btn-primary"
                onClick={handleExport}
                disabled={loading}
              >
                {loading ? "Mengunduh..." : "📥 Download Excel"}
              </button>
            </div>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
              Kosongkan filter tanggal untuk mengunduh semua data. File Excel
              berisi informasi peminjam, barang, status, dan denda.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
