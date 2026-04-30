"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [finePerDay, setFinePerDay] = useState<number | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => fetch("/api/settings").then((r) => r.json()),
  });

  useEffect(() => {
    if (settings && finePerDay === null) {
      setFinePerDay(settings.finePerDay);
    }
  }, [settings, finePerDay]);

  const updateMutation = useMutation({
    mutationFn: (data: { finePerDay: number }) =>
      fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  if (isLoading) {
    return (
      <div className="page-enter">
        <div className="page-body"><div className="loader"><div className="spinner" /></div></div>
      </div>
    );
  }

  return (
    <div className="page-enter">


      <div className="page-body">
        <div style={{ maxWidth: 800 }}>
          <div className="detail-section">
            <div className="section-title">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/><circle cx="12" cy="12" r="4"/>
                </svg>
                Keuangan & Denda
              </span>
            </div>
            <div style={{ padding: 32 }}>
              <div className="form-group" style={{ marginBottom: 32 }}>
                <label style={{ fontSize: "0.9rem", color: "var(--sidebar-navy)", fontWeight: 700 }}>
                  Denda Keterlambatan (Rupiah)
                </label>
                <div style={{ position: "relative", maxWidth: 320, marginTop: 12 }}>
                  <span style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontWeight: 600 }}>Rp</span>
                  <input
                    type="number"
                    className="form-input"
                    style={{ paddingLeft: 44, fontWeight: 700, fontSize: "1.1rem" }}
                    min={0}
                    value={finePerDay ?? ""}
                    onChange={(e) => setFinePerDay(parseInt(e.target.value) || 0)}
                  />
                </div>
                <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: 16, lineHeight: 1.6 }}>
                  Denda ini akan dihitung otomatis saat pengembalian terlambat.
                  <br />
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--accent-purple)", fontWeight: 600, marginTop: 4 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>
                    </svg>
                    Estimasi: {(finePerDay || 0).toLocaleString("id-ID")} / hari
                  </span>
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <button
                  className="btn btn-primary"
                  style={{ padding: "12px 28px" }}
                  onClick={() => updateMutation.mutate({ finePerDay: finePerDay || 0 })}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <>
                      <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                      Menyimpan...
                    </>
                  ) : "Simpan Perubahan"}
                </button>

                {updateMutation.isSuccess && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--accent-green)", fontWeight: 600, fontSize: "0.9rem" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                    Berhasil diperbarui
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
