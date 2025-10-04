import { useState, useEffect } from "react";
import { Building2, Plus, Users, UserCog, UserCheck, Settings, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatsCard } from "@/components/StatsCard";
import { UserTable } from "@/components/UserTable";
import { CreateUserModal } from "@/components/CreateUserModal";
import { WorkflowList } from "@/components/WorkflowList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

interface User {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "EMPLOYEE";
  managerId: string | null;
}

interface TeamExpense {
  id: string;
  userId: string;
  amount: string;
  currency: string;
  description: string;
  date: string;
  category: string;
  status: string;
  createdAt: string;
  convertedAmount: number;
  convertedCurrency: string;
  employeeName: string;
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

  const { data: expenses = [], isLoading: isLoadingExpenses } = useQuery<TeamExpense[]>({
    queryKey: ["/api/expenses/team"],
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
        const errorMessage = Array.isArray(error.error)
          ? error.error.map((e: any) => e.message).join(", ")
          : error.error || "Failed to create user";
        throw new Error(errorMessage);
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
            <h1 className="text-3xl font-semibold" data-testid="text-page-title">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-1">Manage users and approval workflows</p>
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid w-full max-w-2xl grid-cols-3">
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              User Management
            </TabsTrigger>
            <TabsTrigger value="expenses" className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Expenses
            </TabsTrigger>
            <TabsTrigger value="workflows" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Workflows
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold">User Management</h2>
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
          </TabsContent>

          <TabsContent value="expenses" className="space-y-6">
            <div>
              <h2 className="text-2xl font-semibold">All Company Expenses</h2>
              <p className="text-muted-foreground mt-1">View all expense claims from across the company</p>
            </div>

            {isLoadingExpenses ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Loading expenses...</p>
              </div>
            ) : expenses.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Receipt className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No expenses submitted yet</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>All Expenses</CardTitle>
                  <CardDescription>View and track all expense claims</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((expense) => (
                        <TableRow key={expense.id}>
                          <TableCell className="font-medium">{expense.employeeName}</TableCell>
                          <TableCell>{expense.description}</TableCell>
                          <TableCell>{expense.category || '-'}</TableCell>
                          <TableCell>
                            {expense.convertedCurrency} {expense.convertedAmount.toFixed(2)}
                          </TableCell>
                          <TableCell>{format(new Date(expense.date), "MMM dd, yyyy")}</TableCell>
                          <TableCell>
                            <Badge variant={
                              expense.status === "APPROVED" ? "default" :
                              expense.status === "REJECTED" ? "destructive" : "secondary"
                            }>
                              {expense.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="workflows" className="space-y-6">
            <WorkflowList />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
