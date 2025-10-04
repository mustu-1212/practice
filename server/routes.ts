import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { ruleEngine } from "./ruleEngine";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import multer from "multer";
import { insertUserSchema, insertExpenseSchema, insertApprovalWorkflowSchema, insertWorkflowStepSchema } from "@shared/schema";

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
      
      if ((error as any).code === '23505') {
        return res.status(400).json({ error: "A user with this email already exists" });
      }
      
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
      
      const workflows = await storage.getWorkflowsByCompany(req.user!.companyId);
      const sequentialWorkflow = workflows.find(w => w.ruleType === "SEQUENTIAL");
      
      const expense = await storage.createExpense({
        ...expenseData,
        userId: req.user!.id,
        workflowId: sequentialWorkflow?.id || null,
        currentStepNumber: sequentialWorkflow ? 1 : null,
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

      if (expense.workflowId) {
        const decision = await ruleEngine.processApproval(expense, req.user!.id, status);
        
        if (decision.reason.includes("Unauthorized")) {
          return res.status(403).json({ error: decision.reason });
        }

        await storage.createApprovalHistory({
          expenseId: id,
          approverId: req.user!.id,
          status,
          comment: comment || null,
        });
        
        if (decision.completed) {
          await storage.updateExpenseStatus(id, decision.approved ? "APPROVED" : "REJECTED");
        } else if (decision.nextStepNumber) {
          await storage.updateExpenseWorkflow(id, expense.workflowId, decision.nextStepNumber);
        }

        res.json({
          expense: await storage.getExpense(id),
          decision,
        });
      } else {
        await storage.createApprovalHistory({
          expenseId: id,
          approverId: req.user!.id,
          status,
          comment: comment || null,
        });

        const updatedExpense = await storage.updateExpenseStatus(id, status);
        res.json({ expense: updatedExpense });
      }
    } catch (error) {
      console.error("Approve expense error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/workflows", authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const workflows = await storage.getWorkflowsByCompany(req.user!.companyId);
      res.json(workflows);
    } catch (error) {
      console.error("Get workflows error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const createWorkflowSchema = insertApprovalWorkflowSchema.omit({ companyId: true });

  app.post("/api/workflows", authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const workflowData = createWorkflowSchema.parse(req.body);
      const workflow = await storage.createWorkflow({
        ...workflowData,
        companyId: req.user!.companyId,
      });
      res.json(workflow);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create workflow error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/workflows/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const workflow = await storage.getWorkflow(id);
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      if (workflow.companyId !== req.user!.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(workflow);
    } catch (error) {
      console.error("Get workflow error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.patch("/api/workflows/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const workflow = await storage.getWorkflow(id);
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      if (workflow.companyId !== req.user!.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const updatedWorkflow = await storage.updateWorkflow(id, req.body);
      res.json(updatedWorkflow);
    } catch (error) {
      console.error("Update workflow error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/workflows/:id", authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const workflow = await storage.getWorkflow(id);
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      if (workflow.companyId !== req.user!.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      await storage.deleteWorkflow(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete workflow error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/workflows/:workflowId/steps", authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { workflowId } = req.params;
      const workflow = await storage.getWorkflow(workflowId);
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      if (workflow.companyId !== req.user!.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const stepData = insertWorkflowStepSchema.parse(req.body);
      const step = await storage.createWorkflowStep({
        ...stepData,
        workflowId,
      });
      res.json(step);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create workflow step error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/workflows/:workflowId/steps", authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { workflowId } = req.params;
      const workflow = await storage.getWorkflow(workflowId);
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      if (workflow.companyId !== req.user!.companyId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const steps = await storage.getWorkflowSteps(workflowId);
      res.json(steps);
    } catch (error) {
      console.error("Get workflow steps error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/workflows/steps/:stepId", authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
    try {
      const { stepId } = req.params;
      await storage.deleteWorkflowStep(stepId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete workflow step error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });

  app.post("/api/ocr/receipt", authenticateToken, upload.single('receipt'), async (req: AuthRequest, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const OCR_API_KEY = process.env.OCR_SPACE_API_KEY || 'K87899142388957';

      const formData = new FormData();
      const blob = new Blob([req.file.buffer], { type: req.file.mimetype });
      formData.append('file', blob, req.file.originalname);
      formData.append('apikey', OCR_API_KEY);
      formData.append('isTable', 'true');
      formData.append('OCREngine', '2');

      const response = await fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`OCR API error: ${response.statusText}`);
      }

      const ocrResult = await response.json();
      
      if (ocrResult.IsErroredOnProcessing) {
        throw new Error(ocrResult.ErrorMessage?.[0] || 'OCR processing failed');
      }

      const extractedText = ocrResult.ParsedResults?.[0]?.ParsedText || '';
      
      const parsedData = parseReceiptText(extractedText);

      res.json({
        success: true,
        rawText: extractedText,
        parsed: parsedData,
      });
    } catch (error) {
      console.error("OCR error:", error);
      res.status(500).json({ 
        error: error instanceof Error ? error.message : "Failed to process receipt" 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

function parseReceiptText(text: string): {
  merchantName?: string;
  amount?: string;
  date?: string;
} {
  const lines = text.split('\n').filter(line => line.trim());
  
  const merchantName = lines[0]?.trim() || undefined;
  
  const amountPattern = /(?:total|amount|sum)[:\s]*[$€£]?\s*(\d+[.,]\d{2})/i;
  const amountMatch = text.match(amountPattern);
  const amount = amountMatch ? amountMatch[1].replace(',', '.') : undefined;
  
  const datePattern = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/;
  const dateMatch = text.match(datePattern);
  let date = dateMatch ? dateMatch[1] : undefined;
  
  if (date) {
    const parts = date.split(/[\/\-\.]/);
    if (parts.length === 3) {
      const [day, month, year] = parts;
      const fullYear = year.length === 2 ? `20${year}` : year;
      date = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
  }

  return {
    merchantName,
    amount,
    date,
  };
}
