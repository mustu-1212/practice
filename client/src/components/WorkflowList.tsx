import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Settings, Trash2, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { CreateWorkflowModal } from "./CreateWorkflowModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Workflow {
  id: string;
  name: string;
  companyId: string;
  ruleType: "SEQUENTIAL" | "PERCENTAGE" | "SPECIFIC_APPROVER" | "HYBRID";
  ruleConfig: any;
  createdAt: string;
}

export function WorkflowList() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<string | null>(null);

  const { data: workflows = [], isLoading } = useQuery<Workflow[]>({
    queryKey: ["/api/workflows"],
    queryFn: async () => {
      const response = await fetch("/api/workflows", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch workflows");
      return response.json();
    },
    enabled: !!token,
  });

  const deleteWorkflowMutation = useMutation({
    mutationFn: async (workflowId: string) => {
      const response = await fetch(`/api/workflows/${workflowId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to delete workflow");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows"] });
      toast({
        title: "Success",
        description: "Workflow deleted successfully",
      });
      setDeleteDialogOpen(false);
      setWorkflowToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const getRuleTypeLabel = (ruleType: string) => {
    const labels: Record<string, string> = {
      SEQUENTIAL: "Sequential",
      PERCENTAGE: "Percentage-based",
      SPECIFIC_APPROVER: "Specific Approver",
      HYBRID: "Hybrid",
    };
    return labels[ruleType] || ruleType;
  };

  const getRuleTypeBadgeVariant = (ruleType: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      SEQUENTIAL: "default",
      PERCENTAGE: "secondary",
      SPECIFIC_APPROVER: "outline",
      HYBRID: "default",
    };
    return variants[ruleType] || "default";
  };

  const handleDeleteClick = (workflowId: string) => {
    setWorkflowToDelete(workflowId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (workflowToDelete) {
      deleteWorkflowMutation.mutate(workflowToDelete);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Approval Workflows</h2>
          <p className="text-muted-foreground mt-1">
            Configure custom approval flows for expense processing
          </p>
        </div>
        <Button onClick={() => setCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-muted-foreground">Loading workflows...</p>
        </div>
      ) : workflows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Settings className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No workflows configured yet</p>
            <Button onClick={() => setCreateModalOpen(true)} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Workflow
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {workflows.map((workflow) => (
            <Card key={workflow.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle>{workflow.name}</CardTitle>
                    <CardDescription>
                      Created on {new Date(workflow.createdAt).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toast({ title: "Edit", description: "Edit functionality coming soon" })}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(workflow.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rule Type:</span>
                  <Badge variant={getRuleTypeBadgeVariant(workflow.ruleType)}>
                    {getRuleTypeLabel(workflow.ruleType)}
                  </Badge>
                </div>
                {workflow.ruleConfig && (
                  <div className="mt-3 text-sm text-muted-foreground">
                    <pre className="bg-muted p-2 rounded text-xs overflow-auto">
                      {JSON.stringify(workflow.ruleConfig, null, 2)}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateWorkflowModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this workflow? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
