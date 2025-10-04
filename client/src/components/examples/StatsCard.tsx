import { Users } from "lucide-react";
import { StatsCard } from "../StatsCard";

export default function StatsCardExample() {
  return (
    <div className="p-4 max-w-xs">
      <StatsCard title="Total Users" value={42} icon={Users} />
    </div>
  );
}
