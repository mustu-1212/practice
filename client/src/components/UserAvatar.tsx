import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface UserAvatarProps {
  name: string;
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.split(" ");
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function getColorFromName(name: string): string {
  const colors = [
    "bg-primary",
    "bg-chart-2",
    "bg-chart-3",
    "bg-chart-4",
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
}

export function UserAvatar({ name, className = "" }: UserAvatarProps) {
  const initials = getInitials(name);
  const colorClass = getColorFromName(name);

  return (
    <Avatar className={className} data-testid="avatar-user">
      <AvatarFallback className={`${colorClass} text-white`}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
