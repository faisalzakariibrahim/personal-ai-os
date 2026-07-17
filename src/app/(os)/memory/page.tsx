import MemoryManager from "@/components/MemoryManager";

export const dynamic = "force-dynamic";

export default function MemoryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Memory</h1>
        <p className="text-sm text-slate-400">
          What your AI knows about you. You can view, correct, and delete anything — the AI never builds a profile you can’t control.
        </p>
      </div>
      <MemoryManager />
    </div>
  );
}
