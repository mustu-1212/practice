import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";
import { UserAvatar } from "./UserAvatar";
import { RoleBadge } from "./RoleBadge";

interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  managerName?: string;
}

interface UserTableProps {
  users: User[];
  onEdit?: (user: User) => void;
  onDelete?: (userId: string) => void;
}

export function UserTable({ users, onEdit, onDelete }: UserTableProps) {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center" data-testid="empty-state">
        <p className="text-lg font-medium text-foreground">No users yet</p>
        <p className="text-sm text-muted-foreground mt-1">Get started by creating your first user</p>
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Manager</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow
              key={user.id}
              onMouseEnter={() => setHoveredRow(user.id)}
              onMouseLeave={() => setHoveredRow(null)}
              data-testid={`row-user-${user.id}`}
            >
              <TableCell>
                <div className="flex items-center gap-3">
                  <UserAvatar name={user.name} />
                  <span className="font-medium" data-testid={`text-username-${user.id}`}>{user.name}</span>
                </div>
              </TableCell>
              <TableCell data-testid={`text-email-${user.id}`}>{user.email}</TableCell>
              <TableCell>
                <RoleBadge role={user.role} />
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground" data-testid={`text-manager-${user.id}`}>
                  {user.managerName || "—"}
                </span>
              </TableCell>
              <TableCell className="text-right">
                <div className={`inline-flex gap-1 transition-opacity ${hoveredRow === user.id ? 'opacity-100' : 'opacity-0'}`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit?.(user)}
                    data-testid={`button-edit-${user.id}`}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete?.(user.id)}
                    data-testid={`button-delete-${user.id}`}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
