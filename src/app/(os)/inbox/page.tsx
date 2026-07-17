import TaskInbox from "@/components/TaskInbox";

export const dynamic = "force-dynamic";

export default function InboxPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Task Inbox</h1>
        <p className="text-sm text-slate-400">
          Your Email Agent proposes tasks from your inbox; you confirm them. The Calendar Agent orders
          everything by due date and how busy each day already is.
        </p>
      </div>
      <TaskInbox />
    </div>
  );
}
