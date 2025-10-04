import { type Expense, type ApprovalWorkflow, type WorkflowStep, type User } from "@shared/schema";
import { storage } from "./storage";

interface ApprovalDecision {
  approved: boolean;
  nextStepNumber: number | null;
  nextApprovers: User[];
  completed: boolean;
  reason: string;
}

export class RuleEngine {
  async isApproverAuthorized(expense: Expense, approverId: string): Promise<boolean> {
    if (!expense.workflowId || !expense.currentStepNumber) {
      return true;
    }

    const steps = await storage.getWorkflowSteps(expense.workflowId);
    const currentStep = steps.find(s => s.stepNumber === expense.currentStepNumber);

    if (!currentStep) {
      return true;
    }

    const authorizedApprovers = await this.getApproversForStep(currentStep, expense.userId);
    return authorizedApprovers.some(approver => approver.id === approverId);
  }

  async processApproval(
    expense: Expense,
    approverId: string,
    decision: "APPROVED" | "REJECTED"
  ): Promise<ApprovalDecision> {
    if (decision === "REJECTED") {
      const isAuthorized = await this.isApproverAuthorized(expense, approverId);
      if (!isAuthorized) {
        return {
          approved: false,
          nextStepNumber: null,
          nextApprovers: [],
          completed: false,
          reason: "Unauthorized: You are not an authorized approver for this step"
        };
      }

      return {
        approved: false,
        nextStepNumber: null,
        nextApprovers: [],
        completed: true,
        reason: "Expense rejected by approver"
      };
    }

    if (!expense.workflowId) {
      return {
        approved: true,
        nextStepNumber: null,
        nextApprovers: [],
        completed: true,
        reason: "No workflow assigned - auto-approved"
      };
    }

    const workflow = await storage.getWorkflow(expense.workflowId);
    if (!workflow) {
      return {
        approved: true,
        nextStepNumber: null,
        nextApprovers: [],
        completed: true,
        reason: "Workflow not found - auto-approved"
      };
    }

    const steps = await storage.getWorkflowSteps(expense.workflowId);
    if (steps.length === 0) {
      return {
        approved: true,
        nextStepNumber: null,
        nextApprovers: [],
        completed: true,
        reason: "No workflow steps - auto-approved"
      };
    }

    const isAuthorized = await this.isApproverAuthorized(expense, approverId);
    if (!isAuthorized) {
      return {
        approved: false,
        nextStepNumber: null,
        nextApprovers: [],
        completed: false,
        reason: "Unauthorized: You are not an authorized approver for this step"
      };
    }

    switch (workflow.ruleType) {
      case "SEQUENTIAL":
        return await this.processSequential(expense, workflow, steps);
      case "PERCENTAGE":
        return await this.processPercentage(expense, workflow, steps, approverId);
      case "SPECIFIC_APPROVER":
        return await this.processSpecificApprover(expense, workflow, steps, approverId);
      case "HYBRID":
        return await this.processHybrid(expense, workflow, steps, approverId);
      default:
        return {
          approved: true,
          nextStepNumber: null,
          nextApprovers: [],
          completed: true,
          reason: "Unknown rule type - auto-approved"
        };
    }
  }

  private async processSequential(
    expense: Expense,
    workflow: ApprovalWorkflow,
    steps: WorkflowStep[]
  ): Promise<ApprovalDecision> {
    const currentStep = expense.currentStepNumber || 1;
    const nextStepNumber = currentStep + 1;

    if (nextStepNumber > steps.length) {
      return {
        approved: true,
        nextStepNumber: null,
        nextApprovers: [],
        completed: true,
        reason: "All steps completed"
      };
    }

    const nextStep = steps[nextStepNumber - 1];
    const nextApprovers = await this.getApproversForStep(nextStep, expense.userId);

    return {
      approved: false,
      nextStepNumber,
      nextApprovers,
      completed: false,
      reason: `Moving to step ${nextStepNumber}`
    };
  }

  private async processPercentage(
    expense: Expense,
    workflow: ApprovalWorkflow,
    steps: WorkflowStep[],
    approverId: string
  ): Promise<ApprovalDecision> {
    const config = workflow.ruleConfig as any;
    const requiredPercentage = config?.requiredPercentage || 50;

    const approvalHistory = await storage.getApprovalHistoryByExpense(expense.id);
    const approvedCount = approvalHistory.filter(h => h.status === "APPROVED").length + 1;
    const totalApprovers = steps.reduce(async (total, step) => {
      const approvers = await this.getApproversForStep(step, expense.userId);
      return (await total) + approvers.length;
    }, Promise.resolve(0));

    const totalApproversCount = await totalApprovers;
    
    if (totalApproversCount === 0) {
      return {
        approved: false,
        nextStepNumber: null,
        nextApprovers: [],
        completed: true,
        reason: "No approvers available - workflow cannot proceed"
      };
    }

    const currentPercentage = (approvedCount / totalApproversCount) * 100;

    if (currentPercentage >= requiredPercentage) {
      return {
        approved: true,
        nextStepNumber: null,
        nextApprovers: [],
        completed: true,
        reason: `${currentPercentage}% approval threshold met`
      };
    }

    const currentStep = expense.currentStepNumber || 1;
    const nextStepNumber = currentStep + 1;

    if (nextStepNumber > steps.length) {
      return {
        approved: currentPercentage >= requiredPercentage,
        nextStepNumber: null,
        nextApprovers: [],
        completed: true,
        reason: `Final percentage: ${currentPercentage}%`
      };
    }

    const nextStep = steps[nextStepNumber - 1];
    const nextApprovers = await this.getApproversForStep(nextStep, expense.userId);

    return {
      approved: false,
      nextStepNumber,
      nextApprovers,
      completed: false,
      reason: `Current approval: ${currentPercentage}%, need ${requiredPercentage}%`
    };
  }

  private async processSpecificApprover(
    expense: Expense,
    workflow: ApprovalWorkflow,
    steps: WorkflowStep[],
    approverId: string
  ): Promise<ApprovalDecision> {
    const config = workflow.ruleConfig as any;
    const specificApproverId = config?.specificApproverId;

    if (approverId === specificApproverId) {
      return {
        approved: true,
        nextStepNumber: null,
        nextApprovers: [],
        completed: true,
        reason: "Approved by specific approver"
      };
    }

    const currentStep = expense.currentStepNumber || 1;
    const nextStepNumber = currentStep + 1;

    if (nextStepNumber > steps.length) {
      return {
        approved: false,
        nextStepNumber: null,
        nextApprovers: [],
        completed: true,
        reason: "Specific approver did not approve"
      };
    }

    const nextStep = steps[nextStepNumber - 1];
    const nextApprovers = await this.getApproversForStep(nextStep, expense.userId);

    return {
      approved: false,
      nextStepNumber,
      nextApprovers,
      completed: false,
      reason: `Waiting for specific approver (User ID: ${specificApproverId})`
    };
  }

  private async processHybrid(
    expense: Expense,
    workflow: ApprovalWorkflow,
    steps: WorkflowStep[],
    approverId: string
  ): Promise<ApprovalDecision> {
    const config = workflow.ruleConfig as any;
    const usePercentage = config?.usePercentage || false;
    const specificApproverId = config?.specificApproverId;

    if (specificApproverId && approverId === specificApproverId) {
      return {
        approved: true,
        nextStepNumber: null,
        nextApprovers: [],
        completed: true,
        reason: "Approved by specific approver (hybrid rule)"
      };
    }

    const approvalHistory = await storage.getApprovalHistoryByExpense(expense.id);
    const specificApproverApproved = specificApproverId && 
      approvalHistory.some(h => h.approverId === specificApproverId && h.status === "APPROVED");

    if (specificApproverId && !specificApproverApproved) {
      const currentStep = expense.currentStepNumber || 1;
      const nextStepNumber = currentStep + 1;

      if (nextStepNumber > steps.length) {
        return {
          approved: false,
          nextStepNumber: null,
          nextApprovers: [],
          completed: true,
          reason: "Workflow complete but specific approver has not approved - rejected"
        };
      }

      const nextStep = steps[nextStepNumber - 1];
      const nextApprovers = await this.getApproversForStep(nextStep, expense.userId);

      return {
        approved: false,
        nextStepNumber,
        nextApprovers,
        completed: false,
        reason: `Waiting for specific approver (User ID: ${specificApproverId}) in hybrid workflow`
      };
    }

    if (usePercentage) {
      return await this.processPercentage(expense, workflow, steps, approverId);
    }

    return await this.processSequential(expense, workflow, steps);
  }

  private async getApproversForStep(step: WorkflowStep, expenseUserId: string): Promise<User[]> {
    if (step.approverUserId) {
      const user = await storage.getUser(step.approverUserId);
      return user ? [user] : [];
    }

    if (step.approverRole) {
      const expenseUser = await storage.getUser(expenseUserId);
      if (!expenseUser) return [];

      if (step.approverRole === "MANAGER") {
        if (expenseUser.managerId) {
          const manager = await storage.getUser(expenseUser.managerId);
          return manager ? [manager] : [];
        }
        return [];
      }

      const companyUsers = await storage.getUsersByCompany(expenseUser.companyId);
      return companyUsers.filter(u => u.role === step.approverRole);
    }

    return [];
  }

  async getNextApprovers(expense: Expense): Promise<User[]> {
    if (!expense.workflowId || !expense.currentStepNumber) {
      return [];
    }

    const steps = await storage.getWorkflowSteps(expense.workflowId);
    const currentStep = steps.find(s => s.stepNumber === expense.currentStepNumber);

    if (!currentStep) return [];

    return await this.getApproversForStep(currentStep, expense.userId);
  }
}

export const ruleEngine = new RuleEngine();
