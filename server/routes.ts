import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { insertUserSchema, insertExpenseSchema } from "@shared/schema";

if (!process.env.SESSION_SECRET) {
  throw new Error("SESSION_SECRET environment variable is required for JWT signing");
}
const JWT_SECRET = process.env.SESSION_SECRET;

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
    companyId: string;
  };
}

async function fetchCurrencyByCountry(country: string): Promise<string> {
  try {
    const response = await fetch(`https://restcountries.com/v3.1/name/${country}?fullText=true`);
    if (!response.ok) throw new Error("Country not found");
    const data = await response.json();
    const currencies = data[0]?.currencies;
    if (currencies) {
      const currencyCode = Object.keys(currencies)[0];
      return currencyCode;
    }
    return "USD";
  } catch (error) {
    console.error("Error fetching currency:", error);
    return "USD";
  }
}

async function convertCurrency(amount: string, fromCurrency: string, toCurrency: string): Promise<number> {
  try {
    if (fromCurrency === toCurrency) {
      return parseFloat(amount);
    }
    const response = await fetch(`https://api.exchangerate-api.com/v4/latest/${fromCurrency}`);
    if (!response.ok) throw new Error("Currency conversion failed");
    const data = await response.json();
    const rate = data.rates[toCurrency];
    if (!rate) throw new Error(`No rate found for ${toCurrency}`);
    return parseFloat(amount) * rate;
  } catch (error) {
    console.error("Error converting currency:", error);
    return parseFloat(amount);
  }
}

function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid token" });
    req.user = user as any;
    next();
  });
}

function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
}

export async function registerRoutes(app: Express): Promise<Server> {
  const signupSchema = z.object({
    companyName: z.string().min(2),
    adminName: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(6),
    country: z.string().min(2),
  });

  app.post("/api/auth/signup", async (req: Request, res: Response) => {
    try {
      const { companyName, adminName, email, password, country } = signupSchema.parse(req.body);

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const currency = await fetchCurrencyByCountry(country);
      const passwordHash = await bcrypt.hash(password, 10);
      
      let company, user;
      try {
        company = await storage.createCompany({
          name: companyName,
          defaultCurrency: currency,
        });

        user = await storage.createUser({
          name: adminName,
          email,
          passwordHash,
          role: "ADMIN",
          companyId: company.id,
          managerId: null,
        });
      } catch (dbError) {
        if (company) {
          await storage.deleteCompany(company.id).catch((err: Error) => 
            console.error("Failed to cleanup orphaned company:", err)
          );
        }
        throw dbError;
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, companyId: user.companyId },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Signup error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(password, user.passwordHash);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, companyId: user.companyId },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.json({
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          companyId: user.companyId,
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/users", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const users = await storage.getUsersByCompany(req.user!.companyId);
      res.json(users.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        managerId: u.managerId,
      })));
    } catch (error) {
      console.error("Get users error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const createUserSchema = insertUserSchema.omit({ companyId: true });

  app.post("/api/users", authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const userData = createUserSchema.parse(req.body);
      const passwordHash = await bcrypt.hash(userData.password, 10);
      
      const user = await storage.createUser({
        name: userData.name,
        email: userData.email,
        passwordHash,
        role: userData.role,
        companyId: req.user!.companyId,
        managerId: userData.managerId || null,
      });

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        managerId: user.managerId,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/users/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      if (updates.password) {
        updates.passwordHash = await bcrypt.hash(updates.password, 10);
        delete updates.password;
      }

      const user = await storage.updateUser(id, updates);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        managerId: user.managerId,
      });
    } catch (error) {
      console.error("Update user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/users/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const success = await storage.deleteUser(id);
      if (!success) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete user error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/expenses", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const expenseData = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense({
        ...expenseData,
        userId: req.user!.id,
      } as any);
      res.json(expense);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create expense error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/expenses/my", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      const expenses = await storage.getExpensesByUser(req.user!.id);
      res.json(expenses);
    } catch (error) {
      console.error("Get expenses error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/expenses/team", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "MANAGER" && req.user!.role !== "ADMIN") {
        return res.status(403).json({ error: "Manager access required" });
      }

      const expenses = await storage.getExpensesByManager(req.user!.id);
      const company = await storage.getCompany(req.user!.companyId);
      const companyCurrency = company?.defaultCurrency || "USD";

      const expensesWithConversion = await Promise.all(
        expenses.map(async (expense) => {
          const convertedAmount = await convertCurrency(
            expense.amount,
            expense.currency,
            companyCurrency
          );
          const user = await storage.getUser(expense.userId);
          return {
            ...expense,
            convertedAmount,
            convertedCurrency: companyCurrency,
            employeeName: user?.name || "Unknown",
          };
        })
      );

      res.json(expensesWithConversion);
    } catch (error) {
      console.error("Get team expenses error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/expenses/:id/approve", authenticateToken, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "MANAGER" && req.user!.role !== "ADMIN") {
        return res.status(403).json({ error: "Manager access required" });
      }

      const { id } = req.params;
      const { status, comment } = req.body;

      if (!status || !["APPROVED", "REJECTED"].includes(status)) {
        return res.status(400).json({ error: "Valid status required (APPROVED or REJECTED)" });
      }

      if (status === "REJECTED" && !comment) {
        return res.status(400).json({ error: "Comment required for rejection" });
      }

      const expense = await storage.getExpense(id);
      if (!expense) {
        return res.status(404).json({ error: "Expense not found" });
      }

      const teamMembers = await storage.getUsersByManager(req.user!.id);
      const isTeamExpense = teamMembers.some(member => member.id === expense.userId);

      if (!isTeamExpense && req.user!.role !== "ADMIN") {
        return res.status(403).json({ error: "Cannot approve expenses outside your team" });
      }

      const updatedExpense = await storage.updateExpenseStatus(id, status);
      await storage.createApprovalHistory({
        expenseId: id,
        approverId: req.user!.id,
        status,
        comment: comment || null,
      });

      res.json(updatedExpense);
    } catch (error) {
      console.error("Approve expense error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
