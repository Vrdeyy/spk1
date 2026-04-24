"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [finePerDay, setFinePerDay] = useState<number | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () =>
      fetch("/api/settings").then(async (r) => {
        const data = await r.json();
        setFinePerDay(data.finePerDay);
        return data;
      }),
  });

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
        <div className="page-header"><div><h1>Pengaturan</h1></div></div>
        <div className="page-body"><div className="loader"><div className="spinner" /></div></div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1>Pengaturan</h1>
          <p className="description">Konfigurasi sistem</p>
        </div>
      </div>

      <div className="page-body">
        <div className="detail-section">
          <div className="section-title">Denda Keterlambatan</div>
          <div style={{ padding: 20 }}>
            <div className="form-group">
              <label>Denda Per Hari (Rupiah)</label>
              <input
                type="number"
                className="form-input"
                style={{ maxWidth: 300 }}
                min={0}
                value={finePerDay ?? ""}
                onChange={(e) =>
                  setFinePerDay(parseInt(e.target.value) || 0)
                }
              />
              <p
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-muted)",
                  marginTop: 6,
                }}
              >
                Denda ini akan dihitung otomatis saat pengembalian terlambat.
                <br />
                Formula: (hari terlambat) × Rp {(finePerDay || 0).toLocaleString("id-ID")}
              </p>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => updateMutation.mutate({ finePerDay: finePerDay || 0 })}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>

            {updateMutation.isSuccess && (
              <span
                style={{
                  marginLeft: 12,
                  color: "var(--accent-green)",
                  fontSize: "0.85rem",
                }}
              >
                ✓ Tersimpan!
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
