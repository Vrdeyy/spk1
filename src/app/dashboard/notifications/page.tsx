"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function NotificationsPage() {
  const queryClient = useQueryClient();

  const { data: notifications, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetch("/api/notifications").then((r) => r.json()),
  });

  const markReadMutation = useMutation({
    mutationFn: () =>
      fetch("/api/notifications", { method: "PUT" }).then((r) => r.json()),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const unreadCount =
    notifications?.filter?.((n: any) => !n.isRead)?.length || 0;

  if (isLoading) {
    return (
      <div className="page-enter">
        <div className="page-header"><div><h1>Notifikasi</h1></div></div>
        <div className="page-body"><div className="loader"><div className="spinner" /></div></div>
      </div>
    );
  }

  return (
    <div className="page-enter">
      <div className="page-header">
        <div>
          <h1>Notifikasi</h1>
          <p className="description">
            {unreadCount > 0
              ? `${unreadCount} notifikasi belum dibaca`
              : "Semua notifikasi sudah dibaca"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            className="btn btn-secondary"
            onClick={() => markReadMutation.mutate()}
            disabled={markReadMutation.isPending}
          >
            Tandai Semua Dibaca
          </button>
        )}
      </div>

      <div className="page-body">
        <div className="notif-list">
          {notifications?.map?.((notif: any) => (
            <div
              key={notif.id}
              className={`notif-item ${!notif.isRead ? "unread" : ""}`}
            >
              <div className="notif-title">{notif.title}</div>
              <div className="notif-message">{notif.message}</div>
              <div className="notif-time">
                {new Date(notif.createdAt).toLocaleString("id-ID")}
              </div>
            </div>
          ))}
          {(!notifications || notifications.length === 0) && (
            <div className="table-empty">
              <div className="icon">🔔</div>
              <div>Belum ada notifikasi</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
