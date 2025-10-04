import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Users, Check, X } from "lucide-react";
import { format } from "date-fns";

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
  workflowId: string | null;
  currentStepNumber: number | null;
}

export default function ManagerDashboard() {
  const [selectedExpense, setSelectedExpense] = useState<TeamExpense | null>(null);
  const [approvalAction, setApprovalAction] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [comment, setComment] = useState("");
  const { toast } = useToast();

  const { data: expenses = [], isLoading } = useQuery<TeamExpense[]>({
    queryKey: ["/api/expenses/team"],
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, status, comment }: { id: string; status: string; comment?: string }) => {
      return await apiRequest("POST", `/api/expenses/${id}/approve`, {
        status,
        comment,
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/team"] });
      toast({
        title: "Success",
        description: `Expense ${variables.status.toLowerCase()} successfully`,
      });
      setSelectedExpense(null);
      setApprovalAction(null);
      setComment("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to process expense",
        variant: "destructive",
      });
    },
  });

  const handleApprove = (expense: TeamExpense) => {
    setSelectedExpense(expense);
    setApprovalAction("APPROVED");
  };

  const handleReject = (expense: TeamExpense) => {
    setSelectedExpense(expense);
    setApprovalAction("REJECTED");
  };

  const handleConfirm = () => {
    if (!selectedExpense || !approvalAction) return;

    if (approvalAction === "REJECTED" && !comment.trim()) {
      toast({
        title: "Comment required",
        description: "Please provide a reason for rejection",
        variant: "destructive",
      });
      return;
    }

    approveMutation.mutate({
      id: selectedExpense.id,
      status: approvalAction,
      comment: comment.trim() || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      PENDING: "secondary",
      APPROVED: "default",
      REJECTED: "destructive",
    };
    return (
      <Badge variant={variants[status]} data-testid={`badge-status-${status.toLowerCase()}`}>
        {status}
      </Badge>
    );
  };

  const pendingExpenses = expenses.filter(e => e.status === "PENDING");
  const processedExpenses = expenses.filter(e => e.status !== "PENDING");

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">
            Manager Dashboard
          </h1>
          <p className="text-muted-foreground" data-testid="text-dashboard-subtitle">
            Review and approve expense claims from your team
          </p>
        </div>

        <Card className="mb-6" data-testid="card-pending-expenses">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              Pending Expenses
            </CardTitle>
            <CardDescription>Expense claims awaiting your approval</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground" data-testid="text-loading">
                Loading expenses...
              </p>
            ) : pendingExpenses.length === 0 ? (
              <p className="text-center text-muted-foreground" data-testid="text-no-pending">
                No pending expenses
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Original Amount</TableHead>
                      <TableHead>Converted Amount</TableHead>
                      <TableHead>Workflow Step</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingExpenses.map((expense) => (
                      <TableRow key={expense.id} data-testid={`row-expense-${expense.id}`}>
                        <TableCell data-testid={`text-employee-${expense.id}`}>
                          {expense.employeeName}
                        </TableCell>
                        <TableCell data-testid={`text-date-${expense.id}`}>
                          {format(new Date(expense.date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell data-testid={`text-category-${expense.id}`}>
                          {expense.category}
                        </TableCell>
                        <TableCell data-testid={`text-description-${expense.id}`}>
                          {expense.description}
                        </TableCell>
                        <TableCell data-testid={`text-original-${expense.id}`}>
                          {expense.amount} {expense.currency}
                        </TableCell>
                        <TableCell data-testid={`text-converted-${expense.id}`}>
                          ≈ {expense.convertedAmount.toFixed(2)} {expense.convertedCurrency}
                        </TableCell>
                        <TableCell data-testid={`text-workflow-${expense.id}`}>
                          {expense.workflowId && expense.currentStepNumber ? (
                            <Badge variant="outline">
                              Step {expense.currentStepNumber}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">No workflow</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(expense)}
                              data-testid={`button-approve-${expense.id}`}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleReject(expense)}
                              data-testid={`button-reject-${expense.id}`}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-processed-expenses">
          <CardHeader>
            <CardTitle>Processed Expenses</CardTitle>
            <CardDescription>Previously approved or rejected claims</CardDescription>
          </CardHeader>
          <CardContent>
            {processedExpenses.length === 0 ? (
              <p className="text-center text-muted-foreground" data-testid="text-no-processed">
                No processed expenses
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {processedExpenses.map((expense) => (
                      <TableRow key={expense.id} data-testid={`row-processed-${expense.id}`}>
                        <TableCell>{expense.employeeName}</TableCell>
                        <TableCell>{format(new Date(expense.date), "MMM dd, yyyy")}</TableCell>
                        <TableCell>{expense.category}</TableCell>
                        <TableCell>
                          {expense.amount} {expense.currency}
                        </TableCell>
                        <TableCell>{getStatusBadge(expense.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog 
          open={!!selectedExpense} 
          onOpenChange={() => {
            setSelectedExpense(null);
            setApprovalAction(null);
            setComment("");
          }}
        >
          <DialogContent data-testid="dialog-approval">
            <DialogHeader>
              <DialogTitle>
                {approvalAction === "APPROVED" ? "Approve" : "Reject"} Expense
              </DialogTitle>
              <DialogDescription>
                {selectedExpense && (
                  <div className="mt-4 space-y-2">
                    <p><strong>Employee:</strong> {selectedExpense.employeeName}</p>
                    <p><strong>Amount:</strong> {selectedExpense.amount} {selectedExpense.currency}</p>
                    <p><strong>Converted:</strong> ≈ {selectedExpense.convertedAmount.toFixed(2)} {selectedExpense.convertedCurrency}</p>
                    <p><strong>Category:</strong> {selectedExpense.category}</p>
                    <p><strong>Description:</strong> {selectedExpense.description}</p>
                  </div>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="comment">
                  Comment {approvalAction === "REJECTED" && <span className="text-destructive">*</span>}
                </Label>
                <Textarea
                  id="comment"
                  placeholder={approvalAction === "REJECTED" ? "Please provide a reason for rejection" : "Add a comment (optional)"}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  data-testid="input-comment"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedExpense(null);
                  setApprovalAction(null);
                  setComment("");
                }}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                variant={approvalAction === "APPROVED" ? "default" : "destructive"}
                onClick={handleConfirm}
                disabled={approveMutation.isPending}
                data-testid="button-confirm"
              >
                {approveMutation.isPending ? "Processing..." : "Confirm"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
