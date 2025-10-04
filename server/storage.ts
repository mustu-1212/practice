import { type User, type Company, type InsertUser, type InsertCompany, type Expense, type InsertExpense, type ApprovalHistory, type InsertApprovalHistory, users, companies, expenses, approvalHistory } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  // Company methods
  createCompany(company: InsertCompany): Promise<Company>;
  getCompany(id: string): Promise<Company | undefined>;
  deleteCompany(id: string): Promise<boolean>;

  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUsersByCompany(companyId: string): Promise<User[]>;
  getUsersByManager(managerId: string): Promise<User[]>;
  createUser(user: Omit<InsertUser, 'password'> & { passwordHash: string }): Promise<User>;
  updateUser(id: string, data: Partial<Omit<User, 'id' | 'companyId'>>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // Expense methods
  createExpense(expense: InsertExpense): Promise<Expense>;
  getExpense(id: string): Promise<Expense | undefined>;
  getExpensesByUser(userId: string): Promise<Expense[]>;
  getExpensesByManager(managerId: string): Promise<Expense[]>;
  updateExpenseStatus(id: string, status: "PENDING" | "APPROVED" | "REJECTED"): Promise<Expense | undefined>;

  // Approval history methods
  createApprovalHistory(approval: InsertApprovalHistory): Promise<ApprovalHistory>;
  getApprovalHistoryByExpense(expenseId: string): Promise<ApprovalHistory[]>;
}

export class DatabaseStorage implements IStorage {
  // Company methods
  async createCompany(company: InsertCompany): Promise<Company> {
    const [newCompany] = await db.insert(companies).values(company).returning();
    return newCompany;
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const [company] = await db.select().from(companies).where(eq(companies.id, id));
    return company;
  }

  async deleteCompany(id: string): Promise<boolean> {
    const result = await db.delete(companies).where(eq(companies.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUsersByCompany(companyId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.companyId, companyId));
  }

  async createUser(user: Omit<InsertUser, 'password'> & { passwordHash: string }): Promise<User> {
    const userData = {
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
      role: user.role,
      companyId: user.companyId,
      managerId: user.managerId || null,
    };
    const [newUser] = await db.insert(users).values(userData as any).returning();
    return newUser;
  }

  async updateUser(id: string, data: Partial<Omit<User, 'id' | 'companyId'>>): Promise<User | undefined> {
    const [updatedUser] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updatedUser;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount !== null && result.rowCount > 0;
  }

  async getUsersByManager(managerId: string): Promise<User[]> {
    return await db.select().from(users).where(eq(users.managerId, managerId));
  }

  // Expense methods
  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db.insert(expenses).values(expense as any).returning();
    return newExpense;
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense;
  }

  async getExpensesByUser(userId: string): Promise<Expense[]> {
    return await db.select().from(expenses).where(eq(expenses.userId, userId));
  }

  async getExpensesByManager(managerId: string): Promise<Expense[]> {
    const teamMembers = await this.getUsersByManager(managerId);
    const teamMemberIds = teamMembers.map(u => u.id);
    
    if (teamMemberIds.length === 0) {
      return [];
    }

    const allExpenses = await db.select().from(expenses);
    return allExpenses.filter(e => teamMemberIds.includes(e.userId));
  }

  async updateExpenseStatus(id: string, status: "PENDING" | "APPROVED" | "REJECTED"): Promise<Expense | undefined> {
    const [updatedExpense] = await db.update(expenses).set({ status }).where(eq(expenses.id, id)).returning();
    return updatedExpense;
  }

  // Approval history methods
  async createApprovalHistory(approval: InsertApprovalHistory): Promise<ApprovalHistory> {
    const [newApproval] = await db.insert(approvalHistory).values(approval as any).returning();
    return newApproval;
  }

  async getApprovalHistoryByExpense(expenseId: string): Promise<ApprovalHistory[]> {
    return await db.select().from(approvalHistory).where(eq(approvalHistory.expenseId, expenseId));
  }
}

export const storage = new DatabaseStorage();
