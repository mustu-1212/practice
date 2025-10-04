import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { insertExpenseSchema, type Expense } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, Receipt, Upload, Loader2 } from "lucide-react";
import { format } from "date-fns";

const expenseFormSchema = insertExpenseSchema.extend({
  date: z.string(),
});

type ExpenseFormData = z.infer<typeof expenseFormSchema>;

export default function EmployeeDashboard() {
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { token } = useAuth();

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses/my"],
  });

  const form = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: {
      amount: "",
      currency: "USD",
      description: "",
      date: new Date().toISOString().split('T')[0],
      category: "",
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      return await apiRequest("POST", "/api/expenses", {
        ...data,
        date: new Date(data.date).toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses/my"] });
      toast({
        title: "Success",
        description: "Expense submitted successfully",
      });
      form.reset();
      setShowAddExpense(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to submit expense",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ExpenseFormData) => {
    createExpenseMutation.mutate(data);
  };

  const handleReceiptUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingOCR(true);

    try {
      const formData = new FormData();
      formData.append('receipt', file);

      const response = await fetch('/api/ocr/receipt', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'OCR processing failed');
      }

      const result = await response.json();
      const { parsed } = result;

      if (parsed.amount) {
        form.setValue('amount', parsed.amount);
      }
      if (parsed.date) {
        form.setValue('date', parsed.date);
      }
      if (parsed.merchantName) {
        form.setValue('description', `Receipt from ${parsed.merchantName}`);
      }

      toast({
        title: "Receipt scanned",
        description: "Form fields have been auto-filled from the receipt",
      });
    } catch (error) {
      console.error('OCR error:', error);
      toast({
        title: "Scan failed",
        description: error instanceof Error ? error.message : "Failed to process receipt",
        variant: "destructive",
      });
    } finally {
      setIsProcessingOCR(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
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

  return (
    <div className="h-full overflow-auto bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">
              Employee Dashboard
            </h1>
            <p className="text-muted-foreground" data-testid="text-dashboard-subtitle">
              Manage your expense claims
            </p>
          </div>
          <Button 
            onClick={() => setShowAddExpense(!showAddExpense)}
            data-testid="button-add-expense"
          >
            <Plus className="mr-2 h-4 w-4" />
            {showAddExpense ? "Cancel" : "Add Expense"}
          </Button>
        </div>

        {showAddExpense && (
          <Card className="mb-6" data-testid="card-add-expense">
            <CardHeader>
              <CardTitle>Submit New Expense</CardTitle>
              <CardDescription>Fill in the details of your expense claim or scan a receipt</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleReceiptUpload}
                  accept="image/*"
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingOCR}
                  className="w-full"
                >
                  {isProcessingOCR ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing receipt...
                    </>
                  ) : (
                    <>
                      <Upload className="mr-2 h-4 w-4" />
                      Scan Receipt (Auto-fill)
                    </>
                  )}
                </Button>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="0.00" 
                              {...field}
                              data-testid="input-amount"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-currency">
                                <SelectValue placeholder="Select currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="EUR">EUR</SelectItem>
                              <SelectItem value="GBP">GBP</SelectItem>
                              <SelectItem value="JPY">JPY</SelectItem>
                              <SelectItem value="CAD">CAD</SelectItem>
                              <SelectItem value="AUD">AUD</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-category">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Travel">Travel</SelectItem>
                              <SelectItem value="Meals">Meals</SelectItem>
                              <SelectItem value="Accommodation">Accommodation</SelectItem>
                              <SelectItem value="Office Supplies">Office Supplies</SelectItem>
                              <SelectItem value="Software">Software</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field}
                              data-testid="input-date"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Describe the expense..." 
                            {...field}
                            data-testid="input-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit" 
                    disabled={createExpenseMutation.isPending}
                    data-testid="button-submit-expense"
                  >
                    {createExpenseMutation.isPending ? "Submitting..." : "Submit Expense"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        <Card data-testid="card-my-expenses">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Receipt className="mr-2 h-5 w-5" />
              My Expenses
            </CardTitle>
            <CardDescription>View the status of your expense claims</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center text-muted-foreground" data-testid="text-loading">
                Loading expenses...
              </p>
            ) : expenses.length === 0 ? (
              <p className="text-center text-muted-foreground" data-testid="text-no-expenses">
                No expenses submitted yet
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Workflow</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((expense) => (
                      <TableRow key={expense.id} data-testid={`row-expense-${expense.id}`}>
                        <TableCell data-testid={`text-date-${expense.id}`}>
                          {format(new Date(expense.date), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell data-testid={`text-category-${expense.id}`}>
                          {expense.category}
                        </TableCell>
                        <TableCell data-testid={`text-description-${expense.id}`}>
                          {expense.description}
                        </TableCell>
                        <TableCell data-testid={`text-amount-${expense.id}`}>
                          {expense.amount} {expense.currency}
                        </TableCell>
                        <TableCell data-testid={`text-workflow-${expense.id}`}>
                          {expense.workflowId && expense.currentStepNumber ? (
                            <Badge variant="outline">
                              Step {expense.currentStepNumber}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(expense.status)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
