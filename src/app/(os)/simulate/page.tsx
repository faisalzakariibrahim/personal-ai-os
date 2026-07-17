import Simulator from "@/components/Simulator";

export const dynamic = "force-dynamic";

export default function SimulatePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Life Simulator</h1>
        <p className="text-sm text-slate-400">
          Explore consequences before you decide. Simulation, not prediction — grounded in what your AI knows about you.
        </p>
      </div>
      <Simulator />
    </div>
  );
}
