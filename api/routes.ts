import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertUserSchema, 
  insertBankAccountSchema, 
  insertBankStatementSchema, 
  insertGoalSchema,
  insertTransactionSchema,
  insertInsightSchema,
  insertNotificationPreferenceSchema,
  insertBudgetSchema,
  insertBudgetCategorySchema
} from "@shared/schema";
import path from "path";
import multer from "multer";
import { promises as fs } from "fs";
import { parseBankStatement } from "./utils/pdfParser";
import { categorizeTransactions, generateSpendingInsights, suggestFinancialGoals, analyzeWithGroq } from "./utils/groqAI";
import { emailService } from "./utils/emailService";
import { sendgridService } from "./utils/sendgridService";
import bcrypt from "bcrypt";
import session from "express-session";
import MemoryStore from "memorystore";
import { z } from "zod";
import { ValidationError } from "zod-validation-error";

// Setup uploads directory
const uploadsDir = path.join(process.cwd(), "uploads");
fs.mkdir(uploadsDir, { recursive: true }).catch(console.error);

// Configure multer storage
const storage_config = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"));
  }
};

const upload = multer({ 
  storage: storage_config, 
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup session store
  const MemorySessionStore = MemoryStore(session);
  app.use(
    session({
      cookie: { maxAge: 86400000 }, // 24 hours
      store: new MemorySessionStore({
        checkPeriod: 86400000 // Prune expired entries every 24h
      }),
      resave: false,
      saveUninitialized: false,
      secret: process.env.SESSION_SECRET || "FinSavvy-secret-key"
    })
  );

  // Middleware to check if user is authenticated
  const isAuthenticated = (req: Request, res: Response, next: Function) => {
    if (req.session?.userId) {
      next();
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  };

  // AUTH ROUTES
  
  // Register
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.extend({
        confirmPassword: z.string()
      }).refine(data => data.password === data.confirmPassword, {
        message: "Passwords don't match",
        path: ["confirmPassword"]
      }).parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already in use" });
      }
      
      // Hash password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);
      
      // Create user
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      // Create default notification preferences
      await storage.createNotificationPreferences({
        userId: user.id,
        weeklyReport: true,
        bankStatementReminder: true,
        goalProgress: true,
        insights: true
      });
      
      // Send welcome email
      try {
        await emailService.sendWelcomeEmail(user);
      } catch (emailError) {
        console.error("Failed to send welcome email:", emailError);
      }
      
      // Login the user
      req.session.userId = user.id;
      
      // Return user without password
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Registration error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Login
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { email, password } = z.object({
        email: z.string().email(),
        password: z.string().min(6)
      }).parse(req.body);
      
      // Find user by email
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Compare passwords
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      
      // Set session
      req.session.userId = user.id;
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Logout
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Failed to logout" });
      }
      res.status(200).json({ message: "Logged out successfully" });
    });
  });
  
  // Check auth status
  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      const user = await storage.getUser(req.session.userId);
      if (!user) {
        req.session.destroy(() => {});
        return res.status(401).json({ message: "User not found" });
      }
      
      // Return user without password
      const { password, ...userWithoutPassword } = user;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // USER ROUTES
  
  // Update user
  app.patch("/api/users/me", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const updateData = insertUserSchema.partial().parse(req.body);
      
      // If updating password, hash it
      if (updateData.password) {
        const saltRounds = 10;
        updateData.password = await bcrypt.hash(updateData.password, saltRounds);
      }
      
      const updatedUser = await storage.updateUser(userId, updateData);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return user without password
      const { password, ...userWithoutPassword } = updatedUser;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("User update error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // BANK ACCOUNT ROUTES
  
  // Get all bank accounts
  app.get("/api/bank-accounts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const accounts = await storage.getBankAccounts(userId);
      res.status(200).json(accounts);
    } catch (error) {
      console.error("Get bank accounts error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Create bank account
  app.post("/api/bank-accounts", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const accountData = insertBankAccountSchema.parse({
        ...req.body,
        userId
      });
      
      const account = await storage.createBankAccount(accountData);
      res.status(201).json(account);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Create bank account error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Update bank account
  app.patch("/api/bank-accounts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const accountId = parseInt(req.params.id);
      
      // Verify account belongs to user
      const account = await storage.getBankAccount(accountId);
      if (!account || account.userId !== userId) {
        return res.status(404).json({ message: "Bank account not found" });
      }
      
      const updateData = insertBankAccountSchema.partial().parse(req.body);
      const updatedAccount = await storage.updateBankAccount(accountId, updateData);
      
      res.status(200).json(updatedAccount);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Update bank account error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Delete bank account
  app.delete("/api/bank-accounts/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const accountId = parseInt(req.params.id);
      
      // Verify account belongs to user
      const account = await storage.getBankAccount(accountId);
      if (!account || account.userId !== userId) {
        return res.status(404).json({ message: "Bank account not found" });
      }
      
      await storage.deleteBankAccount(accountId);
      res.status(200).json({ message: "Bank account deleted successfully" });
    } catch (error) {
      console.error("Delete bank account error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // BANK STATEMENT ROUTES
  
  // Get all bank statements
  app.get("/api/bank-statements", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const statements = await storage.getBankStatements(userId);
      res.status(200).json(statements);
    } catch (error) {
      console.error("Get bank statements error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Upload bank statement
  app.post(
    "/api/bank-statements/upload",
    isAuthenticated,
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }
        
        const userId = req.session.userId!;
        const { bankAccountId } = z.object({ 
          bankAccountId: z.string().transform(val => parseInt(val)) 
        }).parse(req.body);
        
        // Verify bank account belongs to user
        const account = await storage.getBankAccount(bankAccountId);
        if (!account || account.userId !== userId) {
          // Remove uploaded file
          await fs.unlink(req.file.path);
          return res.status(404).json({ message: "Bank account not found" });
        }
        
        // Parse bank statement
        const parsedStatement = await parseBankStatement(req.file.path, userId, bankAccountId);
        
        // Create bank statement record
        const statementData = {
          userId,
          bankAccountId,
          fileName: req.file.originalname,
          startDate: parsedStatement.startDate,
          endDate: parsedStatement.endDate,
        };
        
        const bankStatement = await storage.createBankStatement(statementData);
        
        // Update transactions with bank statement ID and categorize them
        const transactionsWithStmtId = parsedStatement.transactions.map(t => ({
          ...t,
          bankStatementId: bankStatement.id
        }));
        
        // Create transactions
        let transactions = await storage.createManyTransactions(transactionsWithStmtId);
        
        // Categorize transactions using AI
        transactions = await categorizeTransactions(transactions);
        
        // Update transactions with categories
        for (const transaction of transactions) {
          if (transaction.category) {
            await storage.createTransaction({
              ...transaction,
              id: undefined
            });
          }
        }
        
        // Generate insights
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
        
        const previousTransactions = await storage.getTransactions(userId, {
          startDate: twoMonthsAgo,
          endDate: parsedStatement.startDate
        });
        
        const insights = await generateSpendingInsights(transactions, previousTransactions);
        
        // Save insights
        for (const insight of insights) {
          await storage.createInsight(insight);
        }
        
        // Mark bank statement as processed
        await storage.updateBankStatement(bankStatement.id, { processed: true });
        
        // Send analysis complete email
        const user = await storage.getUser(userId);
        if (user) {
          try {
            await emailService.sendAnalysisComplete(user, bankStatement, insights);
          } catch (emailError) {
            console.error("Failed to send analysis email:", emailError);
          }
        }
        
        res.status(201).json({ 
          bankStatement,
          transactionCount: transactions.length,
          insightCount: insights.length
        });
      } catch (error) {
        console.error("Upload bank statement error:", error);
        if (req.file) {
          // Remove uploaded file on error
          await fs.unlink(req.file.path).catch(console.error);
        }
        res.status(500).json({ message: error.message || "Server error" });
      }
    }
  );
  
  // TRANSACTION ROUTES
  
  // Get transactions with filtering
  app.get("/api/transactions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      
      // Parse query parameters
      const { startDate, endDate, category, type, bankAccountId } = req.query;
      
      const filters: any = {};
      
      if (startDate) {
        filters.startDate = new Date(startDate as string);
      }
      
      if (endDate) {
        filters.endDate = new Date(endDate as string);
      }
      
      if (category) {
        filters.category = category as string;
      }
      
      if (type) {
        filters.type = type as string;
      }
      
      if (bankAccountId) {
        filters.bankAccountId = parseInt(bankAccountId as string);
      }
      
      const transactions = await storage.getTransactions(userId, filters);
      res.status(200).json(transactions);
    } catch (error) {
      console.error("Get transactions error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Update transaction (e.g., to change category)
  app.patch("/api/transactions/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const transactionId = parseInt(req.params.id);
      
      // Verify transaction belongs to user
      const transaction = await storage.getTransaction(transactionId);
      if (!transaction || transaction.userId !== userId) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      const updateData = insertTransactionSchema.partial().parse(req.body);
      const updatedTransaction = await storage.updateTransaction(transactionId, updateData);
      
      res.status(200).json(updatedTransaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Update transaction error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // CATEGORY ROUTES
  
  // Get all categories
  app.get("/api/categories", async (req: Request, res: Response) => {
    try {
      const categories = await storage.getCategories();
      res.status(200).json(categories);
    } catch (error) {
      console.error("Get categories error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // INSIGHT ROUTES
  
  // Get all insights
  app.get("/api/insights", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const insights = await storage.getInsights(userId);
      res.status(200).json(insights);
    } catch (error) {
      console.error("Get insights error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // GOAL ROUTES
  
  // Get all goals
  app.get("/api/goals", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const goals = await storage.getGoals(userId);
      res.status(200).json(goals);
    } catch (error) {
      console.error("Get goals error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Create goal
  app.post("/api/goals", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const goalData = insertGoalSchema.parse({
        ...req.body,
        userId
      });
      
      const goal = await storage.createGoal(goalData);
      res.status(201).json(goal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Create goal error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Update goal
  app.patch("/api/goals/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const goalId = parseInt(req.params.id);
      
      // Verify goal belongs to user
      const goal = await storage.getGoal(goalId);
      if (!goal || goal.userId !== userId) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      const updateData = insertGoalSchema.partial().parse(req.body);
      const updatedGoal = await storage.updateGoal(goalId, updateData);
      
      res.status(200).json(updatedGoal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Update goal error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Delete goal
  app.delete("/api/goals/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const goalId = parseInt(req.params.id);
      
      // Verify goal belongs to user
      const goal = await storage.getGoal(goalId);
      if (!goal || goal.userId !== userId) {
        return res.status(404).json({ message: "Goal not found" });
      }
      
      await storage.deleteGoal(goalId);
      res.status(200).json({ message: "Goal deleted successfully" });
    } catch (error) {
      console.error("Delete goal error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Suggest financial goals based on transaction history
  app.post("/api/goals/suggest", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      
      // Get recent transactions (last 3 months)
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      
      const transactions = await storage.getTransactions(userId, {
        startDate: threeMonthsAgo
      });
      
      if (transactions.length === 0) {
        return res.status(400).json({ message: "Not enough transaction history to suggest goals" });
      }
      
      // Generate goal suggestions using AI
      const suggestedGoals = await suggestFinancialGoals(transactions);
      
      res.status(200).json(suggestedGoals);
    } catch (error) {
      console.error("Goal suggestion error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // NOTIFICATION PREFERENCES ROUTES
  
  // Get notification preferences
  app.get("/api/notification-preferences", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      
      // Get preferences or create default ones if not found
      let preferences = await storage.getNotificationPreferences(userId);
      
      if (!preferences) {
        preferences = await storage.createNotificationPreferences({
          userId,
          weeklyReport: true,
          bankStatementReminder: true,
          goalProgress: true,
          insights: true
        });
      }
      
      res.status(200).json(preferences);
    } catch (error) {
      console.error("Get notification preferences error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Update notification preferences
  app.patch("/api/notification-preferences", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      
      const updateData = insertNotificationPreferenceSchema.partial().parse({
        ...req.body,
        userId
      });
      
      // Check if preferences exist
      let preferences = await storage.getNotificationPreferences(userId);
      
      if (!preferences) {
        // Create if not exists
        preferences = await storage.createNotificationPreferences({
          userId,
          weeklyReport: updateData.weeklyReport ?? true,
          bankStatementReminder: updateData.bankStatementReminder ?? true,
          goalProgress: updateData.goalProgress ?? true,
          insights: updateData.insights ?? true
        });
      } else {
        // Otherwise update
        preferences = await storage.updateNotificationPreferences(userId, updateData);
      }
      
      res.status(200).json(preferences);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Update notification preferences error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // ANALYTICS ROUTES
  
  // Get monthly expenses by category
  app.get("/api/analytics/expenses-by-category", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      
      // Parse query parameters
      const { year, month } = z.object({
        year: z.string().regex(/^\d{4}$/).transform(val => parseInt(val)),
        month: z.string().regex(/^([1-9]|1[0-2])$/).transform(val => parseInt(val))
      }).parse(req.query);
      
      const expenses = await storage.getMonthlyExpensesByCategory(userId, year, month);
      res.status(200).json(expenses);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Get expense analytics error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Get income vs expenses for a date range
  app.get("/api/analytics/income-vs-expenses", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      
      // Parse query parameters
      const { startDate, endDate } = z.object({
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform(val => new Date(val)),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform(val => new Date(val))
      }).parse(req.query);
      
      const result = await storage.getTotalIncomeAndExpenses(userId, startDate, endDate);
      res.status(200).json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Get income/expense analytics error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // BUDGET ROUTES
  
  // Get all budgets
  app.get("/api/budgets", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const budgets = await storage.getBudgets(userId);
      res.status(200).json(budgets);
    } catch (error) {
      console.error("Get budgets error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Get a single budget
  app.get("/api/budgets/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const budgetId = parseInt(req.params.id);
      
      // Verify budget belongs to user
      const budget = await storage.getBudget(budgetId);
      if (!budget || budget.userId !== userId) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      res.status(200).json(budget);
    } catch (error) {
      console.error("Get budget error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Create a new budget
  app.post("/api/budgets", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const budgetData = insertBudgetSchema.parse({
        ...req.body,
        userId
      });
      
      const budget = await storage.createBudget(budgetData);
      res.status(201).json(budget);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Create budget error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Update a budget
  app.patch("/api/budgets/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const budgetId = parseInt(req.params.id);
      
      // Verify budget belongs to user
      const budget = await storage.getBudget(budgetId);
      if (!budget || budget.userId !== userId) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      const updateData = insertBudgetSchema.partial().parse(req.body);
      const updatedBudget = await storage.updateBudget(budgetId, updateData);
      
      res.status(200).json(updatedBudget);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Update budget error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Delete a budget
  app.delete("/api/budgets/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const budgetId = parseInt(req.params.id);
      
      // Verify budget belongs to user
      const budget = await storage.getBudget(budgetId);
      if (!budget || budget.userId !== userId) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      await storage.deleteBudget(budgetId);
      res.status(200).json({ message: "Budget deleted successfully" });
    } catch (error) {
      console.error("Delete budget error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Get budget categories
  app.get("/api/budgets/:id/categories", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const budgetId = parseInt(req.params.id);
      
      // Verify budget belongs to user
      const budget = await storage.getBudget(budgetId);
      if (!budget || budget.userId !== userId) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      const budgetCategories = await storage.getBudgetCategories(budgetId);
      res.status(200).json(budgetCategories);
    } catch (error) {
      console.error("Get budget categories error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Add a category to a budget
  app.post("/api/budgets/:id/categories", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const budgetId = parseInt(req.params.id);
      
      // Verify budget belongs to user
      const budget = await storage.getBudget(budgetId);
      if (!budget || budget.userId !== userId) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      const categoryData = insertBudgetCategorySchema.parse({
        ...req.body,
        budgetId
      });
      
      const budgetCategory = await storage.createBudgetCategory(categoryData);
      res.status(201).json(budgetCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Create budget category error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Update a budget category
  app.patch("/api/budget-categories/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const categoryId = parseInt(req.params.id);
      
      // Get the category
      const category = await storage.getBudgetCategory(categoryId);
      if (!category) {
        return res.status(404).json({ message: "Budget category not found" });
      }
      
      // Verify budget belongs to user
      const budget = await storage.getBudget(category.budgetId);
      if (!budget || budget.userId !== userId) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      const updateData = insertBudgetCategorySchema.partial().parse(req.body);
      const updatedCategory = await storage.updateBudgetCategory(categoryId, updateData);
      
      res.status(200).json(updatedCategory);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Update budget category error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Delete a budget category
  app.delete("/api/budget-categories/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const categoryId = parseInt(req.params.id);
      
      // Get the category
      const category = await storage.getBudgetCategory(categoryId);
      if (!category) {
        return res.status(404).json({ message: "Budget category not found" });
      }
      
      // Verify budget belongs to user
      const budget = await storage.getBudget(category.budgetId);
      if (!budget || budget.userId !== userId) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      await storage.deleteBudgetCategory(categoryId);
      res.status(200).json({ message: "Budget category deleted successfully" });
    } catch (error) {
      console.error("Delete budget category error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Get budget progress
  app.get("/api/budgets/:id/progress", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const budgetId = parseInt(req.params.id);
      
      // Verify budget belongs to user
      const budget = await storage.getBudget(budgetId);
      if (!budget || budget.userId !== userId) {
        return res.status(404).json({ message: "Budget not found" });
      }
      
      const progress = await storage.getBudgetProgress(budgetId);
      res.status(200).json(progress);
    } catch (error) {
      console.error("Get budget progress error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // ADMIN ROUTES
  
  // Test email
  app.post("/api/admin/test-email", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Test email with SendGrid if API key is available
      let sendgridResult = false;
      if (process.env.SENDGRID_API_KEY) {
        try {
          await sendgridService.sendTestEmail(user.email);
          sendgridResult = true;
        } catch (error) {
          console.error("SendGrid test email error:", error);
          sendgridResult = false;
        }
      }
      
      // Test email with nodemailer as fallback
      let nodemailerResult = false;
      try {
        await emailService.sendTestEmail(user.email);
        nodemailerResult = true;
      } catch (error) {
        console.error("Nodemailer test email error:", error);
        nodemailerResult = false;
      }
      
      if (!sendgridResult && !nodemailerResult) {
        return res.status(500).json({ 
          message: "Email test failed with both SendGrid and nodemailer",
          sendgrid: { success: sendgridResult },
          nodemailer: { success: nodemailerResult }
        });
      }
      
      res.status(200).json({ 
        message: "Email test completed", 
        sendgrid: { success: sendgridResult, configured: !!process.env.SENDGRID_API_KEY },
        nodemailer: { success: nodemailerResult }
      });
    } catch (error) {
      console.error("Test email error:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  // Test Groq AI
  app.post("/api/admin/test-groq", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Check if GROQ_API_KEY is available
      if (!process.env.GROQ_API_KEY) {
        return res.status(400).json({ 
          message: "GROQ_API_KEY is not configured in environment variables",
          success: false
        });
      }
      
      // Test with a simple query
      const prompt = "Generate a short finance tip for saving money.";
      
      const response = await analyzeWithGroq(prompt);
      
      if (!response) {
        return res.status(500).json({ 
          message: "Failed to get response from Groq AI",
          success: false
        });
      }
      
      res.status(200).json({
        message: "Groq AI test successful",
        success: true,
        response
      });
    } catch (error) {
      console.error("Test Groq AI error:", error);
      res.status(500).json({ 
        message: "Failed to test Groq AI", 
        error: error.message,
        success: false
      });
    }
  });
  
  // Test database
  app.get("/api/admin/test-database", isAuthenticated, async (req: Request, res: Response) => {
    try {
      // Perform a simple query to check database connection
      const categoriesCount = await storage.getCategories();
      
      res.status(200).json({
        message: "Database connection successful",
        success: true,
        details: {
          categoriesCount: categoriesCount.length
        }
      });
    } catch (error) {
      console.error("Test database error:", error);
      res.status(500).json({ 
        message: "Database connection failed", 
        error: error.message,
        success: false
      });
    }
  });

  return createServer(app);
}