import { RoleBadge } from "../RoleBadge";

export default function RoleBadgeExample() {
  return (
    <div className="flex gap-2 p-4">
      <RoleBadge role="ADMIN" />
      <RoleBadge role="MANAGER" />
      <RoleBadge role="EMPLOYEE" />
    </div>
  );
}
