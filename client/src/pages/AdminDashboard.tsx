import { useState, useEffect } from "react";
import { Building2, Plus, Users, UserCog, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatsCard } from "@/components/StatsCard";
import { UserTable } from "@/components/UserTable";
import { CreateUserModal } from "@/components/CreateUserModal";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  managerId: string | null;
}

export default function AdminDashboard() {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const response = await fetch("/api/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch users");
      return response.json();
    },
    enabled: !!token,
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create user");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to delete user");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const usersWithManagerNames = users.map(user => {
    const manager = users.find(u => u.id === user.managerId);
    return {
      ...user,
      managerName: manager?.name,
    };
  });

  const filteredUsers = usersWithManagerNames.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === "ADMIN").length,
    managers: users.filter(u => u.role === "MANAGER").length,
    employees: users.filter(u => u.role === "EMPLOYEE").length,
  };

  const managers = users
    .filter(u => u.role === "ADMIN" || u.role === "MANAGER")
    .map(u => ({ id: u.id, name: u.name }));

  const handleCreateUser = (data: any) => {
    createUserMutation.mutate(data);
    setCreateModalOpen(false);
  };

  const handleEditUser = (user: any) => {
    toast({
      title: "Edit functionality",
      description: "Edit user feature coming soon",
    });
  };

  const handleDeleteUser = (userId: string) => {
    deleteUserMutation.mutate(userId);
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

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading users...</p>
          </div>
        ) : (
          <UserTable
            users={filteredUsers}
            onEdit={handleEditUser}
            onDelete={handleDeleteUser}
          />
        )}

        <CreateUserModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onSubmit={handleCreateUser}
          managers={managers}
        />
      </div>
    </div>
  );
}
