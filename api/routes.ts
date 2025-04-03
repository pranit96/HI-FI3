import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import cors from 'cors';
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
import bcrypt from "bcrypt";
import session from "express-session";
import MemoryStore from "memorystore";
import { z } from "zod";
import { ValidationError } from "zod-validation-error";
import jwt from 'jsonwebtoken';
import { Request } from 'express';


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

// Define session interface extension
declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function registerRoutes(app: Express): Promise<Server> {
  // CORS configuration for credentials
  app.use(cors({
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  }));

  // Middleware to check if user is authenticated
  const isAuthenticated = async (req: Request, res: Response, next: Function) => {
    try {
      const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
      const user = await storage.getUser(decoded.id);

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      req.session = req.session || {};
      req.session.userId = decoded.id;
      next();
    } catch (error) {
      console.error("Auth middleware error:", error);
      res.status(401).json({ message: "Invalid or expired token" });
    }
  };

  // Logging middleware
  const loggingMiddleware = (req: Request, res: Response, next: Function) => {
    const startTime = Date.now();
    const originalSend = res.send;
    let capturedJsonResponse: any;

    res.send = (body: any) => {
      const endTime = Date.now();
      const duration = endTime - startTime;
      const path = req.path;

      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (typeof body === 'object') {
          capturedJsonResponse = body;
          // Only log non-sensitive routes
          if (!path.includes("/auth/") && !path.includes("/bank-statements/")) {
            // Remove sensitive fields
            const sanitizedResponse = { ...capturedJsonResponse };
            delete sanitizedResponse.token;
            delete sanitizedResponse.user;
            delete sanitizedResponse.password;
            delete sanitizedResponse.email;
            delete sanitizedResponse.confirmPassword;


            logLine += ` :: ${JSON.stringify(sanitizedResponse)}`;
          }
        }

        if (logLine.length > 80) {
          logLine = logLine.slice(0, 79) + "…";
        }

        console.log(logLine); // Use console.log for demonstration; replace with your preferred logging method
      }
      originalSend.call(res, body);
    }
    next();
  }
  app.use(loggingMiddleware);


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

  // Login - support both /api/auth/login and /login paths
  const handleLogin = async (req: Request, res: Response) => {
    try {
      const { email, password } = z.object({
        email: z.string().email(),
        password: z.string().min(6)
      }).parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '7d' });
      const { password: _, ...userWithoutPassword } = user;

      res.setHeader('Set-Cookie', `token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=604800`);
      return res.status(200).json({
        user: userWithoutPassword,
        token
      });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Login failed" });
    }
  };

  // Handle both GET and POST for login
  app.route(["/api/auth/login", "/login"])
    .get((req: Request, res: Response) => {
      res.status(405).json({ message: "Please use POST method for login" });
    })
    .post(handleLogin);

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
      const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];

      if (!token) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
      const user = await storage.getUser(decoded.id);

      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // Return user without password
      const { password, ...userWithoutPassword } = user;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(401).json({ message: "Invalid or expired token" });
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
    async (req: Request, res: Response, next: Function) => {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      next();
    },
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ message: "No file uploaded" });
        }

        const userId = req.session.userId!;

        // Parse bank statement (without requiring bankAccountId)
        const parsedStatement = await parseBankStatement(req.file.path, userId);

        // Get or create bank account based on the parsed statement
        let bankAccount = await storage.getBankAccountByAccountNumber(parsedStatement.accountNumber);

        if (!bankAccount) {
          // Create a new bank account if one doesn't exist with this account number
          bankAccount = await storage.createBankAccount({
            userId,
            name: `${parsedStatement.bankType} Account`,
            accountNumber: parsedStatement.accountNumber,
            balance: 0, // Will be updated with the latest transaction balance
            type: 'checking',
            color: '#4CAF50', // Default green color
            shortCode: parsedStatement.bankType.substring(0, 2),
            institution: parsedStatement.bankType
          });
        } else if (bankAccount.userId !== userId) {
          // Security check: Ensure account belongs to current user
          await fs.unlink(req.file.path);
          return res.status(403).json({ message: "You don't have permission to access this account" });
        }

        // Create bank statement record
        const statementData = {
          userId,
          bankAccountId: bankAccount.id,
          fileName: req.file.originalname,
          startDate: parsedStatement.startDate.toISOString().split('T')[0], // Convert to YYYY-MM-DD
          endDate: parsedStatement.endDate.toISOString().split('T')[0],     // Convert to YYYY-MM-DD
          processed: false
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
            await storage.updateTransaction(transaction.id, {
              category: transaction.category
            });
          }
        }

        // Generate insights
        const twoMonthsAgo = new Date();
        twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

        const previousTransactions = await storage.getTransactions(userId, {
          startDate: twoMonthsAgo,
          endDate: new Date(parsedStatement.startDate)
        });

        const insights = await generateSpendingInsights(transactions, previousTransactions);

        // Save insights
        for (const insight of insights) {
          await storage.createInsight(insight);
        }

        // Mark bank statement as processed
        await storage.updateBankStatement(bankStatement.id, { processed: true });

        // Delete the PDF file for security after processing
        await fs.unlink(req.file.path).catch(err => {
          console.error("Failed to delete PDF file:", err);
        });

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
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Validate numeric fields
      const { targetAmount, currentAmount = 0 } = req.body;
      if (!targetAmount || isNaN(parseFloat(targetAmount))) {
        return res.status(400).json({ message: "Invalid target amount" });
      }

      const goal = await storage.createGoal({ 
        ...req.body,
        userId,
        targetAmount: parseFloat(targetAmount),
        currentAmount: parseFloat(currentAmount) || 0
      });
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
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Parse and validate query parameters
      const { year, month } = z.object({
        year: z.string().regex(/^\d{4}$/).transform(val => parseInt(val)),
        month: z.string().regex(/^([1-9]|1[0-2])$/).transform(val => parseInt(val))
      }).parse(req.query);

      // Validate date range
      const currentDate = new Date();
      if (year > currentDate.getFullYear() + 1) {
        return res.status(400).json({ message: "Invalid year - cannot be more than 1 year in future" });
      }

      const expenses = await storage.getMonthlyExpensesByCategory(userId, year, month);

      // Return empty array if no data instead of error
      res.status(200).json(expenses || []);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationError = new ValidationError(error);
        return res.status(400).json({ message: validationError.message });
      }
      console.error("Get expense analytics error:", error);
      res.status(500).json({ message: "Failed to fetch expense analytics" });
    }
  });

  // Get income vs expenses for a date range
  app.get("/api/analytics/income-vs-expenses", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // If no dates provided, default to current month
      const today = new Date();
      const defaultStartDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const defaultEndDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      // Parse query parameters with defaults
      const { startDate = defaultStartDate.toISOString().split('T')[0], 
              endDate = defaultEndDate.toISOString().split('T')[0] } = req.query;

      // Validate dates
      const schema = z.object({
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform(val => new Date(val)),
        endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).transform(val => new Date(val))
      }).refine(data => data.startDate <= data.endDate, {
        message: "Start date must be before or equal to end date"
      });

      const dates = schema.parse({ startDate, endDate });
      const result = await storage.getTotalIncomeAndExpenses(userId, dates.startDate, dates.endDate);
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
      if(error instanceof z.ZodError) {
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

      // Test email with Gmail SMTP
      let emailResult = false;
      try {
        await emailService.sendTestEmail(user.email);
        emailResult = true;
      } catch (error) {
        console.error("Gmail SMTP email error:", error);
        emailResult = false;
      }

      if (!emailResult) {
        return res.status(500).json({ 
          message: "Email test failed with Gmail SMTP",
          success: emailResult
        });
      }

      res.status(200).json({ 
        message: "Email test completed", 
        success: emailResult,
        configured: !!(process.env.EMAIL_USER && process.env.EMAIL_PASS)
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

  // DATA MANAGEMENT ROUTES

  // Delete all user transactions
  app.delete("/api/user-data/transactions", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;

      // Get all user transactions
      const transactions = await storage.getTransactions(userId);

      // Delete each transaction
      let deletedCount = 0;
      for (const transaction of transactions) {
        await storage.deleteTransaction(transaction.id);
        deletedCount++;
      }

      res.status(200).json({ 
        message: `Successfully deleted ${deletedCount} transactions`, 
        count: deletedCount 
      });
    } catch (error) {
      console.error("Delete transactions error:", error);
      res.status(500).json({ message: "Failed to delete transactions" });
    }
  });

  // Delete all bank statements
  app.delete("/api/user-data/statements", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;

      // Get all user bank statements
      const statements = await storage.getBankStatements(userId);

      // Delete each statement
      let deletedCount = 0;
      for (const statement of statements) {
        await storage.deleteBankStatement(statement.id);
        deletedCount++;
      }

      res.status(200).json({ 
        message: `Successfully deleted ${deletedCount} bank statements`, 
        count: deletedCount 
      });
    } catch (error) {
      console.error("Delete bank statements error:", error);
      res.status(500).json({ message: "Failed to delete bank statements" });
    }
  });

  // Delete all user financial data
  app.delete("/api/user-data/all", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.session.userId!;

      // Delete transactions
      const transactions = await storage.getTransactions(userId);
      for (const transaction of transactions) {
        await storage.deleteTransaction(transaction.id);
      }

      // Delete bank statements
      const statements = await storage.getBankStatements(userId);
      for (const statement of statements) {
        await storage.deleteBankStatement(statement.id);
      }

      // Delete insights
      const insights = await storage.getInsights(userId);
      for (const insight of insights) {
        await storage.deleteInsight(insight.id);
      }

      // Delete goals
      const goals = await storage.getGoals(userId);
      for (const goal of goals) {
        await storage.deleteGoal(goal.id);
      }

      // Delete budgets and budget categories
      const budgets = await storage.getBudgets(userId);
      for (const budget of budgets) {
        const budgetCategories = await storage.getBudgetCategories(budget.id);
        for (const category of budgetCategories) {
          await storage.deleteBudgetCategory(category.id);
        }
        await storage.deleteBudget(budget.id);
      }

      // Reset user's monthly salary to null
      await storage.updateUser(userId, { monthlySalary: null });

      res.status(200).json({ 
        message: "Successfully deleted all financial data",
        details: {
          transactions: transactions.length,
          statements: statements.length,
          insights: insights.length,
          goals: goals.length,
          budgets: budgets.length
        }
      });
    } catch (error) {
      console.error("Delete all financial data error:", error);
      res.status(500).json({ message: "Failed to delete financial data" });
    }
  });

  return createServer(app);
}