import { Badge } from "@/components/ui/badge";

type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";

interface RoleBadgeProps {
  role: Role;
}

const roleStyles = {
  ADMIN: "bg-primary text-primary-foreground",
  MANAGER: "bg-chart-2 text-white",
  EMPLOYEE: "bg-muted text-muted-foreground",
};

export function RoleBadge({ role }: RoleBadgeProps) {
  return (
    <Badge className={`${roleStyles[role]} text-xs font-medium`} data-testid={`badge-role-${role.toLowerCase()}`}>
      {role}
    </Badge>
  );
}
