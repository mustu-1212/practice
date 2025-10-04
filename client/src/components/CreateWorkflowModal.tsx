import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const workflowFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  ruleType: z.enum(["SEQUENTIAL", "PERCENTAGE", "SPECIFIC_APPROVER", "HYBRID"]),
  requiredPercentage: z.string().optional(),
  specificApproverId: z.string().optional(),
  usePercentage: z.boolean().optional(),
});

type WorkflowFormData = z.infer<typeof workflowFormSchema>;

interface WorkflowStep {
  stepNumber: number;
  approverRole?: "ADMIN" | "MANAGER" | "EMPLOYEE";
  approverUserId?: string;
}

interface CreateWorkflowModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateWorkflowModal({ open, onOpenChange }: CreateWorkflowModalProps) {
  const { token } = useAuth();
  const { toast } = useToast();
  const [steps, setSteps] = useState<WorkflowStep[]>([]);

  const { data: users = [] } = useQuery<any[]>({
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
    enabled: !!token && open,
  });

  const form = useForm<WorkflowFormData>({
    resolver: zodResolver(workflowFormSchema),
    defaultValues: {
      name: "",
      ruleType: "SEQUENTIAL",
      requiredPercentage: "50",
    },
  });

  const createWorkflowMutation = useMutation({
    mutationFn: async (data: { workflow: any; steps: WorkflowStep[] }) => {
      const workflowResponse = await fetch("/api/workflows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data.workflow),
      });
      if (!workflowResponse.ok) throw new Error("Failed to create workflow");
      const workflow = await workflowResponse.json();

      for (const step of data.steps) {
        await fetch(`/api/workflows/${workflow.id}/steps`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(step),
        });
      }

      return workflow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
      toast({
        title: "Success",
        description: "Workflow created successfully",
      });
      form.reset();
      setSteps([]);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const onSubmit = (data: WorkflowFormData) => {
    if (steps.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please add at least one workflow step",
      });
      return;
    }

    const ruleConfig: any = {};

    if (data.ruleType === "PERCENTAGE" && data.requiredPercentage) {
      ruleConfig.requiredPercentage = parseInt(data.requiredPercentage);
    }

    if (data.ruleType === "SPECIFIC_APPROVER" && data.specificApproverId) {
      ruleConfig.specificApproverId = data.specificApproverId;
    }

    if (data.ruleType === "HYBRID") {
      if (data.usePercentage && data.requiredPercentage) {
        ruleConfig.usePercentage = true;
        ruleConfig.requiredPercentage = parseInt(data.requiredPercentage);
      }
      if (data.specificApproverId) {
        ruleConfig.specificApproverId = data.specificApproverId;
      }
    }

    const workflow = {
      name: data.name,
      ruleType: data.ruleType,
      ruleConfig: Object.keys(ruleConfig).length > 0 ? ruleConfig : null,
    };

    createWorkflowMutation.mutate({ workflow, steps });
  };

  const addStep = () => {
    setSteps([
      ...steps,
      {
        stepNumber: steps.length + 1,
        approverRole: "MANAGER",
      },
    ]);
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index).map((step, i) => ({ ...step, stepNumber: i + 1 })));
  };

  const updateStep = (index: number, field: string, value: any) => {
    const newSteps = [...steps];
    if (field === "approverRole") {
      newSteps[index] = { ...newSteps[index], approverRole: value, approverUserId: undefined };
    } else if (field === "approverUserId") {
      newSteps[index] = { ...newSteps[index], approverUserId: value, approverRole: undefined };
    }
    setSteps(newSteps);
  };

  const ruleType = form.watch("ruleType");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Approval Workflow</DialogTitle>
          <DialogDescription>
            Define a multi-step approval flow with custom rules
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Workflow Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Standard Expense Approval" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ruleType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rule Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select rule type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="SEQUENTIAL">Sequential - Each step must approve in order</SelectItem>
                      <SelectItem value="PERCENTAGE">Percentage - Requires a certain % of approvals</SelectItem>
                      <SelectItem value="SPECIFIC_APPROVER">Specific Approver - Requires specific person</SelectItem>
                      <SelectItem value="HYBRID">Hybrid - Combines multiple rules</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {(ruleType === "PERCENTAGE" || (ruleType === "HYBRID")) && (
              <FormField
                control={form.control}
                name="requiredPercentage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Required Approval Percentage</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="100" placeholder="50" {...field} />
                    </FormControl>
                    <FormDescription>
                      The percentage of approvers that must approve for the expense to pass
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {(ruleType === "SPECIFIC_APPROVER" || ruleType === "HYBRID") && (
              <FormField
                control={form.control}
                name="specificApproverId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specific Approver</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a specific approver" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {users.filter(u => u.role === "ADMIN" || u.role === "MANAGER").map(user => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Workflow Steps</h3>
                  <p className="text-sm text-muted-foreground">
                    Define the approval steps in order
                  </p>
                </div>
                <Button type="button" variant="outline" onClick={addStep}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Step
                </Button>
              </div>

              {steps.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-8">
                    <p className="text-muted-foreground">No steps added yet. Click "Add Step" to begin.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {steps.map((step, index) => (
                    <Card key={index}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Step {step.stepNumber}</CardTitle>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeStep(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Approver Type</label>
                            <Select
                              value={step.approverRole ? "role" : "user"}
                              onValueChange={(value) => {
                                if (value === "role") {
                                  updateStep(index, "approverRole", "MANAGER");
                                }
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="role">By Role</SelectItem>
                                <SelectItem value="user">Specific User</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {step.approverRole ? (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Role</label>
                              <Select
                                value={step.approverRole}
                                onValueChange={(value) => updateStep(index, "approverRole", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="MANAGER">Manager</SelectItem>
                                  <SelectItem value="ADMIN">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <label className="text-sm font-medium">User</label>
                              <Select
                                value={step.approverUserId}
                                onValueChange={(value) => updateStep(index, "approverUserId", value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select user" />
                                </SelectTrigger>
                                <SelectContent>
                                  {users.filter(u => u.role === "ADMIN" || u.role === "MANAGER").map(user => (
                                    <SelectItem key={user.id} value={user.id}>
                                      {user.name} ({user.role})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createWorkflowMutation.isPending}>
                {createWorkflowMutation.isPending ? "Creating..." : "Create Workflow"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
