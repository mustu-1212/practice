import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, numeric, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  defaultCurrency: text("default_currency").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().$type<"ADMIN" | "MANAGER" | "EMPLOYEE">(),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  managerId: varchar("manager_id"),
});

export const approvalWorkflows = pgTable("approval_workflows", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  companyId: varchar("company_id").notNull().references(() => companies.id),
  ruleType: text("rule_type").notNull().$type<"SEQUENTIAL" | "PERCENTAGE" | "SPECIFIC_APPROVER" | "HYBRID">(),
  ruleConfig: jsonb("rule_config"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const workflowSteps = pgTable("workflow_steps", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workflowId: varchar("workflow_id").notNull().references(() => approvalWorkflows.id, { onDelete: "cascade" }),
  stepNumber: integer("step_number").notNull(),
  approverRole: text("approver_role").$type<"ADMIN" | "MANAGER" | "EMPLOYEE">(),
  approverUserId: varchar("approver_user_id").references(() => users.id),
});

export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().$type<"PENDING" | "APPROVED" | "REJECTED">().default("PENDING"),
  workflowId: varchar("workflow_id").references(() => approvalWorkflows.id),
  currentStepNumber: integer("current_step_number"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const approvalHistory = pgTable("approval_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  expenseId: varchar("expense_id").notNull().references(() => expenses.id),
  approverId: varchar("approver_id").notNull().references(() => users.id),
  status: text("status").notNull().$type<"APPROVED" | "REJECTED">(),
  comment: text("comment"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  passwordHash: true,
}).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  createdAt: true,
  status: true,
  userId: true,
});

export const insertApprovalHistorySchema = createInsertSchema(approvalHistory).omit({
  id: true,
  timestamp: true,
});

export const insertApprovalWorkflowSchema = createInsertSchema(approvalWorkflows).omit({
  id: true,
  createdAt: true,
});

export const insertWorkflowStepSchema = createInsertSchema(workflowSteps).omit({
  id: true,
}).refine(
  (data) => data.approverRole || data.approverUserId,
  { message: "Either approverRole or approverUserId must be specified" }
);

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type ApprovalHistory = typeof approvalHistory.$inferSelect;
export type InsertApprovalHistory = z.infer<typeof insertApprovalHistorySchema>;
export type ApprovalWorkflow = typeof approvalWorkflows.$inferSelect;
export type InsertApprovalWorkflow = z.infer<typeof insertApprovalWorkflowSchema>;
export type WorkflowStep = typeof workflowSteps.$inferSelect;
export type InsertWorkflowStep = z.infer<typeof insertWorkflowStepSchema>;
