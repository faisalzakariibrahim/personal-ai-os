import ApprovalList from "@/components/ApprovalList";

export const dynamic = "force-dynamic";

export default function ApprovalsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Approval Center</h1>
        <p className="text-sm text-slate-400">
          No agent can execute a restricted action without your sign-off. Critical actions (level 4) are never executed by the system.
        </p>
      </div>
      <ApprovalList />
    </div>
  );
}
