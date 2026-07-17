import NotificationsList from "@/components/NotificationsList";

export const dynamic = "force-dynamic";

export default function NotificationsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        <p className="text-sm text-slate-400">Approvals, alerts, and briefings your agents surfaced for you.</p>
      </div>
      <NotificationsList />
    </div>
  );
}
