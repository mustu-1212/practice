import { useQuery } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAuth } from "@/lib/auth";
import { format } from "date-fns";

interface Expense {
  id: string;
  userId: string;
  amount: string;
  currency: string;
  description: string;
  date: string;
  category: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  employeeName?: string;
}

export function NotificationBadge() {
  const { token, user } = useAuth();

  const { data: teamExpenses = [] } = useQuery<Expense[]>({
    queryKey: ["/api/expenses/team"],
    queryFn: async () => {
      const response = await fetch("/api/expenses/team", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!token && (user?.role === "MANAGER" || user?.role === "ADMIN"),
    refetchInterval: 30000,
  });

  const pendingExpenses = teamExpenses.filter((e: Expense) => e.status === "PENDING");
  const notificationCount = pendingExpenses.length;

  if (user?.role === "EMPLOYEE") {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {notificationCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-2">
          <h3 className="font-semibold text-sm">Pending Approvals</h3>
          {notificationCount === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No pending approvals
            </p>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {pendingExpenses.map((expense: Expense) => (
                  <div
                    key={expense.id}
                    className="p-3 rounded-lg border bg-card hover:bg-accent transition-colors"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium text-sm">
                        {expense.employeeName || "Unknown"}
                      </p>
                      <Badge variant="secondary" className="text-xs">
                        {expense.currency} {expense.amount}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-1">
                      {expense.description}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(expense.date), "MMM dd, yyyy")}
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
