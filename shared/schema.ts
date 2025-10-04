import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, numeric } from "drizzle-orm/pg-core";
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

export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  currency: text("currency").notNull(),
  description: text("description").notNull(),
  date: timestamp("date").notNull(),
  category: text("category").notNull(),
  status: text("status").notNull().$type<"PENDING" | "APPROVED" | "REJECTED">().default("PENDING"),
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

export type Company = typeof companies.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type ApprovalHistory = typeof approvalHistory.$inferSelect;
export type InsertApprovalHistory = z.infer<typeof insertApprovalHistorySchema>;
