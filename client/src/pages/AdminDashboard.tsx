import { useState } from "react";
import { Building2, Plus, Users, UserCog, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatsCard } from "@/components/StatsCard";
import { UserTable } from "@/components/UserTable";
import { CreateUserModal } from "@/components/CreateUserModal";

//todo: remove mock functionality
const mockUsers = [
  { id: "1", name: "John Smith", email: "john@company.com", role: "ADMIN" as const, managerName: undefined },
  { id: "2", name: "Sarah Johnson", email: "sarah@company.com", role: "MANAGER" as const, managerName: "John Smith" },
  { id: "3", name: "Mike Davis", email: "mike@company.com", role: "EMPLOYEE" as const, managerName: "Sarah Johnson" },
  { id: "4", name: "Emily Brown", email: "emily@company.com", role: "EMPLOYEE" as const, managerName: "Sarah Johnson" },
];

const mockManagers = [
  { id: "1", name: "John Smith" },
  { id: "2", name: "Sarah Johnson" },
];

export default function AdminDashboard() {
  const [users, setUsers] = useState(mockUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === "ADMIN").length,
    managers: users.filter(u => u.role === "MANAGER").length,
    employees: users.filter(u => u.role === "EMPLOYEE").length,
  };

  const handleCreateUser = (data: any) => {
    console.log("Creating user:", data);
    const newUser = {
      id: String(users.length + 1),
      name: data.name,
      email: data.email,
      role: data.role,
      managerName: data.managerId ? mockManagers.find(m => m.id === data.managerId)?.name : undefined,
    };
    setUsers([...users, newUser]);
  };

  const handleEditUser = (user: any) => {
    console.log("Edit user:", user);
  };

  const handleDeleteUser = (userId: string) => {
    console.log("Delete user:", userId);
    setUsers(users.filter(u => u.id !== userId));
  };

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold" data-testid="text-page-title">User Management</h1>
            <p className="text-muted-foreground mt-1">Manage your team members and their roles</p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)} data-testid="button-add-user">
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard title="Total Users" value={stats.total} icon={Users} />
          <StatsCard title="Admins" value={stats.admins} icon={UserCog} />
          <StatsCard title="Managers" value={stats.managers} icon={UserCheck} />
          <StatsCard title="Employees" value={stats.employees} icon={Building2} />
        </div>

        <div>
          <Input
            placeholder="Search users by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
            data-testid="input-search"
          />
        </div>

        <UserTable
          users={filteredUsers}
          onEdit={handleEditUser}
          onDelete={handleDeleteUser}
        />

        <CreateUserModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onSubmit={handleCreateUser}
          managers={mockManagers}
        />
      </div>
    </div>
  );
}
