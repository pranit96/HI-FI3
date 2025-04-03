import { 
  users, type User, type InsertUser,
  bankAccounts, type BankAccount, type InsertBankAccount,
  bankStatements, type BankStatement, type InsertBankStatement,
  transactions, type Transaction, type InsertTransaction,
  categories, type Category, type InsertCategory,
  goals, type Goal, type InsertGoal,
  insights, type Insight, type InsertInsight,
  notificationPreferences, type NotificationPreference, type InsertNotificationPreference,
  budgets, type Budget, type InsertBudget,
  budgetCategories, type BudgetCategory, type InsertBudgetCategory
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql, SQL } from "drizzle-orm";
import { 
  encryptionService, 
  sensitiveUserFields,
  sensitiveBankAccountFields,
  sensitiveTransactionFields,
  sensitiveGoalFields,
  sensitiveBudgetFields
} from "./services/encryptionService";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  
  // Bank account methods
  getBankAccounts(userId: number): Promise<BankAccount[]>;
  getBankAccount(id: number): Promise<BankAccount | undefined>;
  getBankAccountByAccountNumber(accountNumber: string): Promise<BankAccount | undefined>;
  createBankAccount(account: InsertBankAccount): Promise<BankAccount>;
  updateBankAccount(id: number, account: Partial<InsertBankAccount>): Promise<BankAccount | undefined>;
  deleteBankAccount(id: number): Promise<boolean>;
  
  // Bank statement methods
  getBankStatements(userId: number): Promise<BankStatement[]>;
  getBankStatement(id: number): Promise<BankStatement | undefined>;
  createBankStatement(statement: InsertBankStatement): Promise<BankStatement>;
  updateBankStatement(id: number, statement: Partial<InsertBankStatement>): Promise<BankStatement | undefined>;
  deleteBankStatement(id: number): Promise<boolean>;
  
  // Transaction methods
  getTransactions(userId: number, filters?: { 
    startDate?: Date; 
    endDate?: Date; 
    category?: string;
    type?: string;
    bankAccountId?: number;
  }): Promise<Transaction[]>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, transaction: Partial<InsertTransaction>): Promise<Transaction | undefined>;
  createManyTransactions(transactions: InsertTransaction[]): Promise<Transaction[]>;
  deleteTransaction(id: number): Promise<boolean>;
  
  // Category methods
  getCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Goal methods
  getGoals(userId: number): Promise<Goal[]>;
  getGoal(id: number): Promise<Goal | undefined>;
  createGoal(goal: InsertGoal): Promise<Goal>;
  updateGoal(id: number, goal: Partial<InsertGoal>): Promise<Goal | undefined>;
  deleteGoal(id: number): Promise<boolean>;
  
  // Insight methods
  getInsights(userId: number): Promise<Insight[]>;
  createInsight(insight: InsertInsight): Promise<Insight>;
  deleteInsight(id: number): Promise<boolean>;
  
  // Notification preference methods
  getNotificationPreferences(userId: number): Promise<NotificationPreference | undefined>;
  createNotificationPreferences(preferences: InsertNotificationPreference): Promise<NotificationPreference>;
  updateNotificationPreferences(userId: number, preferences: Partial<InsertNotificationPreference>): Promise<NotificationPreference | undefined>;
  
  // Budget methods
  getBudgets(userId: number): Promise<Budget[]>;
  getBudget(id: number): Promise<Budget | undefined>;
  createBudget(budget: InsertBudget): Promise<Budget>;
  updateBudget(id: number, budget: Partial<InsertBudget>): Promise<Budget | undefined>;
  deleteBudget(id: number): Promise<boolean>;
  
  // Budget category methods
  getBudgetCategories(budgetId: number): Promise<BudgetCategory[]>;
  getBudgetCategory(id: number): Promise<BudgetCategory | undefined>;
  createBudgetCategory(budgetCategory: InsertBudgetCategory): Promise<BudgetCategory>;
  updateBudgetCategory(id: number, budgetCategory: Partial<InsertBudgetCategory>): Promise<BudgetCategory | undefined>;
  deleteBudgetCategory(id: number): Promise<boolean>;
  getBudgetProgress(budgetId: number): Promise<{ category: string; budgeted: number; spent: number; remaining: number; progress: number }[]>;
  
  // Analytics methods
  getMonthlyExpensesByCategory(userId: number, year: number, month: number): Promise<{ category: string; total: number }[]>;
  getTotalIncomeAndExpenses(userId: number, startDate: Date, endDate: Date): Promise<{ income: number; expenses: number }>;
}

export class DatabaseStorage implements IStorage {
  /*** User methods ***/
  
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) return undefined;
    
    // Decrypt sensitive fields before returning
    return encryptionService.decryptObject(user, sensitiveUserFields);
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user) return undefined;
    
    // Decrypt sensitive fields before returning
    return encryptionService.decryptObject(user, sensitiveUserFields);
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    // Encrypt sensitive fields before storing
    const encryptedUserData = encryptionService.encryptObject(userData, sensitiveUserFields);
    const [user] = await db.insert(users).values(encryptedUserData).returning();
    
    // Decrypt sensitive fields before returning
    return encryptionService.decryptObject(user, sensitiveUserFields);
  }
  
  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  /*** Bank account methods ***/
  
  async getBankAccounts(userId: number): Promise<BankAccount[]> {
    return db.select().from(bankAccounts).where(eq(bankAccounts.userId, userId));
  }
  
  async getBankAccount(id: number): Promise<BankAccount | undefined> {
    const [account] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, id));
    return account;
  }
  
  async getBankAccountByAccountNumber(accountNumber: string): Promise<BankAccount | undefined> {
    const [account] = await db.select().from(bankAccounts).where(eq(bankAccounts.accountNumber, accountNumber));
    return account;
  }
  
  async createBankAccount(accountData: InsertBankAccount): Promise<BankAccount> {
    // Encrypt sensitive fields before storing
    const encryptedAccountData = encryptionService.encryptObject(accountData, sensitiveBankAccountFields);
    const [account] = await db.insert(bankAccounts).values(encryptedAccountData).returning();
    
    // Decrypt sensitive fields before returning
    return encryptionService.decryptObject(account, sensitiveBankAccountFields);
  }
  
  async updateBankAccount(id: number, accountData: Partial<InsertBankAccount>): Promise<BankAccount | undefined> {
    const [updatedAccount] = await db
      .update(bankAccounts)
      .set(accountData)
      .where(eq(bankAccounts.id, id))
      .returning();
    return updatedAccount;
  }
  
  async deleteBankAccount(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(bankAccounts)
      .where(eq(bankAccounts.id, id))
      .returning({ id: bankAccounts.id });
    return !!deleted;
  }

  /*** Bank statement methods ***/
  
  async getBankStatements(userId: number): Promise<BankStatement[]> {
    return db
      .select()
      .from(bankStatements)
      .where(eq(bankStatements.userId, userId))
      .orderBy(desc(bankStatements.uploadedAt));
  }
  
  async getBankStatement(id: number): Promise<BankStatement | undefined> {
    const [statement] = await db.select().from(bankStatements).where(eq(bankStatements.id, id));
    return statement;
  }
  
  async createBankStatement(statementData: InsertBankStatement): Promise<BankStatement> {
    const [statement] = await db.insert(bankStatements).values(statementData).returning();
    return statement;
  }
  
  async updateBankStatement(id: number, statementData: Partial<InsertBankStatement>): Promise<BankStatement | undefined> {
    const [updatedStatement] = await db
      .update(bankStatements)
      .set(statementData)
      .where(eq(bankStatements.id, id))
      .returning();
    return updatedStatement;
  }
  
  async deleteBankStatement(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(bankStatements)
      .where(eq(bankStatements.id, id))
      .returning({ id: bankStatements.id });
    return !!deleted;
  }

  /*** Transaction methods ***/
  
  async getTransactions(
    userId: number, 
    filters?: { 
      startDate?: Date; 
      endDate?: Date; 
      category?: string;
      type?: string;
      bankAccountId?: number;
    }
  ): Promise<Transaction[]> {
    let query = db.select().from(transactions).where(eq(transactions.userId, userId));
    
    if (filters) {
      if (filters.startDate) {
        // Ensure startDate is a Date object
        const startDate = typeof filters.startDate === 'string' ? new Date(filters.startDate) : filters.startDate;
        const dateString = startDate.toISOString().split('T')[0];
        query = query.where(sql`${transactions.date} >= ${dateString}`);
      }
      
      if (filters.endDate) {
        // Ensure endDate is a Date object
        const endDate = typeof filters.endDate === 'string' ? new Date(filters.endDate) : filters.endDate;
        const dateString = endDate.toISOString().split('T')[0];
        query = query.where(sql`${transactions.date} <= ${dateString}`);
      }
      
      if (filters.category) {
        query = query.where(eq(transactions.category, filters.category));
      }
      
      if (filters.type) {
        query = query.where(eq(transactions.type, filters.type));
      }
      
      if (filters.bankAccountId) {
        query = query.where(eq(transactions.bankAccountId, filters.bankAccountId));
      }
    }
    
    const result = await query.orderBy(desc(transactions.date));
    
    // Decrypt sensitive fields for each transaction before returning
    return encryptionService.decryptArray(result, sensitiveTransactionFields);
  }
  
  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    if (!transaction) return undefined;
    
    // Decrypt sensitive fields before returning
    return encryptionService.decryptObject(transaction, sensitiveTransactionFields);
  }
  
  async createTransaction(transactionData: InsertTransaction): Promise<Transaction> {
    // Encrypt sensitive fields before storing
    const encryptedTransactionData = encryptionService.encryptObject(transactionData, sensitiveTransactionFields);
    const [transaction] = await db.insert(transactions).values(encryptedTransactionData).returning();
    
    // Decrypt sensitive fields before returning
    return encryptionService.decryptObject(transaction, sensitiveTransactionFields);
  }
  
  async createManyTransactions(transactionsData: InsertTransaction[]): Promise<Transaction[]> {
    if (transactionsData.length === 0) return [];
    
    // Encrypt sensitive fields for each transaction before storing
    const encryptedTransactionsData = transactionsData.map(transaction => 
      encryptionService.encryptObject(transaction, sensitiveTransactionFields)
    );
    
    const insertedTransactions = await db.insert(transactions).values(encryptedTransactionsData).returning();
    
    // Decrypt sensitive fields before returning
    return encryptionService.decryptArray(insertedTransactions, sensitiveTransactionFields);
  }
  
  async updateTransaction(id: number, transactionData: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    // Encrypt sensitive fields in the update data if present
    const encryptedTransactionData = encryptionService.encryptObject(transactionData, sensitiveTransactionFields);
    
    const [updatedTransaction] = await db
      .update(transactions)
      .set(encryptedTransactionData)
      .where(eq(transactions.id, id))
      .returning();
    
    if (!updatedTransaction) return undefined;
    
    // Decrypt sensitive fields before returning
    return encryptionService.decryptObject(updatedTransaction, sensitiveTransactionFields);
  }
  
  async deleteTransaction(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(transactions)
      .where(eq(transactions.id, id))
      .returning({ id: transactions.id });
    return !!deleted;
  }

  /*** Category methods ***/
  
  async getCategories(): Promise<Category[]> {
    return db.select().from(categories);
  }
  
  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category;
  }
  
  async createCategory(categoryData: InsertCategory): Promise<Category> {
    const [category] = await db.insert(categories).values(categoryData).returning();
    return category;
  }

  /*** Goal methods ***/
  
  async getGoals(userId: number): Promise<Goal[]> {
    const results = await db.select().from(goals).where(eq(goals.userId, userId));
    
    // Decrypt sensitive fields for each goal before returning
    return encryptionService.decryptArray(results, sensitiveGoalFields);
  }
  
  async getGoal(id: number): Promise<Goal | undefined> {
    const [goal] = await db.select().from(goals).where(eq(goals.id, id));
    if (!goal) return undefined;
    
    // Decrypt sensitive fields before returning
    return encryptionService.decryptObject(goal, sensitiveGoalFields);
  }
  
  async createGoal(goalData: InsertGoal): Promise<Goal> {
    // Encrypt sensitive fields before storing
    const encryptedGoalData = encryptionService.encryptObject(goalData, sensitiveGoalFields);
    const [goal] = await db.insert(goals).values(encryptedGoalData).returning();
    
    // Decrypt sensitive fields before returning
    return encryptionService.decryptObject(goal, sensitiveGoalFields);
  }
  
  async updateGoal(id: number, goalData: Partial<InsertGoal>): Promise<Goal | undefined> {
    // Encrypt sensitive fields in the update data if present
    const encryptedGoalData = encryptionService.encryptObject(goalData, sensitiveGoalFields);
    
    const [updatedGoal] = await db
      .update(goals)
      .set(encryptedGoalData)
      .where(eq(goals.id, id))
      .returning();
    
    if (!updatedGoal) return undefined;
    
    // Decrypt sensitive fields before returning
    return encryptionService.decryptObject(updatedGoal, sensitiveGoalFields);
  }
  
  async deleteGoal(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(goals)
      .where(eq(goals.id, id))
      .returning({ id: goals.id });
    return !!deleted;
  }

  /*** Insight methods ***/
  
  async getInsights(userId: number): Promise<Insight[]> {
    return db
      .select()
      .from(insights)
      .where(eq(insights.userId, userId))
      .orderBy(desc(insights.createdAt));
  }
  
  async createInsight(insightData: InsertInsight): Promise<Insight> {
    const [insight] = await db.insert(insights).values(insightData).returning();
    return insight;
  }
  
  async deleteInsight(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(insights)
      .where(eq(insights.id, id))
      .returning({ id: insights.id });
    return !!deleted;
  }

  /*** Notification preference methods ***/
  
  async getNotificationPreferences(userId: number): Promise<NotificationPreference | undefined> {
    const [preferences] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
    return preferences;
  }
  
  async createNotificationPreferences(preferencesData: InsertNotificationPreference): Promise<NotificationPreference> {
    const [preferences] = await db
      .insert(notificationPreferences)
      .values(preferencesData)
      .returning();
    return preferences;
  }
  
  async updateNotificationPreferences(userId: number, preferencesData: Partial<InsertNotificationPreference>): Promise<NotificationPreference | undefined> {
    const [updatedPreferences] = await db
      .update(notificationPreferences)
      .set(preferencesData)
      .where(eq(notificationPreferences.userId, userId))
      .returning();
    return updatedPreferences;
  }

  /*** Budget methods ***/
  
  async getBudgets(userId: number): Promise<Budget[]> {
    const results = await db
      .select()
      .from(budgets)
      .where(eq(budgets.userId, userId))
      .orderBy(desc(budgets.createdAt));
      
    // Decrypt sensitive fields for each budget before returning
    return encryptionService.decryptArray(results, sensitiveBudgetFields);
  }
  
  async getBudget(id: number): Promise<Budget | undefined> {
    const [budget] = await db.select().from(budgets).where(eq(budgets.id, id));
    if (!budget) return undefined;
    
    // Decrypt sensitive fields before returning
    return encryptionService.decryptObject(budget, sensitiveBudgetFields);
  }
  
  async createBudget(budgetData: InsertBudget): Promise<Budget> {
    // Encrypt sensitive fields before storing
    const encryptedBudgetData = encryptionService.encryptObject(budgetData, sensitiveBudgetFields);
    const [budget] = await db.insert(budgets).values(encryptedBudgetData).returning();
    
    // Decrypt sensitive fields before returning
    return encryptionService.decryptObject(budget, sensitiveBudgetFields);
  }
  
  async updateBudget(id: number, budgetData: Partial<InsertBudget>): Promise<Budget | undefined> {
    // Encrypt sensitive fields in the update data if present
    const encryptedBudgetData = encryptionService.encryptObject(budgetData, sensitiveBudgetFields);
    
    const [updatedBudget] = await db
      .update(budgets)
      .set(encryptedBudgetData)
      .where(eq(budgets.id, id))
      .returning();
    
    if (!updatedBudget) return undefined;
    
    // Decrypt sensitive fields before returning
    return encryptionService.decryptObject(updatedBudget, sensitiveBudgetFields);
  }
  
  async deleteBudget(id: number): Promise<boolean> {
    // Delete associated budget categories first
    await db.delete(budgetCategories).where(eq(budgetCategories.budgetId, id));
    
    // Then delete the budget
    const [deleted] = await db
      .delete(budgets)
      .where(eq(budgets.id, id))
      .returning({ id: budgets.id });
    return !!deleted;
  }
  
  /*** Budget category methods ***/
  
  async getBudgetCategories(budgetId: number): Promise<BudgetCategory[]> {
    const results = await db
      .select()
      .from(budgetCategories)
      .where(eq(budgetCategories.budgetId, budgetId));
      
    // Decrypt sensitive fields for each budget category before returning
    return encryptionService.decryptArray(results, sensitiveBudgetFields);
  }
  
  async getBudgetCategory(id: number): Promise<BudgetCategory | undefined> {
    const [budgetCategory] = await db.select().from(budgetCategories).where(eq(budgetCategories.id, id));
    if (!budgetCategory) return undefined;
    
    // Decrypt sensitive fields before returning
    return encryptionService.decryptObject(budgetCategory, sensitiveBudgetFields);
  }
  
  async createBudgetCategory(budgetCategoryData: InsertBudgetCategory): Promise<BudgetCategory> {
    // Encrypt sensitive fields before storing
    const encryptedBudgetCategoryData = encryptionService.encryptObject(budgetCategoryData, sensitiveBudgetFields);
    const [budgetCategory] = await db.insert(budgetCategories).values(encryptedBudgetCategoryData).returning();
    
    // Decrypt sensitive fields before returning
    return encryptionService.decryptObject(budgetCategory, sensitiveBudgetFields);
  }
  
  async updateBudgetCategory(id: number, budgetCategoryData: Partial<InsertBudgetCategory>): Promise<BudgetCategory | undefined> {
    // Encrypt sensitive fields in the update data if present
    const encryptedBudgetCategoryData = encryptionService.encryptObject(budgetCategoryData, sensitiveBudgetFields);
    
    const [updatedBudgetCategory] = await db
      .update(budgetCategories)
      .set(encryptedBudgetCategoryData)
      .where(eq(budgetCategories.id, id))
      .returning();
    
    if (!updatedBudgetCategory) return undefined;
    
    // Decrypt sensitive fields before returning
    return encryptionService.decryptObject(updatedBudgetCategory, sensitiveBudgetFields);
  }
  
  async deleteBudgetCategory(id: number): Promise<boolean> {
    const [deleted] = await db
      .delete(budgetCategories)
      .where(eq(budgetCategories.id, id))
      .returning({ id: budgetCategories.id });
    return !!deleted;
  }
  
  async getBudgetProgress(budgetId: number): Promise<{ category: string; budgeted: number; spent: number; remaining: number; progress: number }[]> {
    // First, get the budget to determine date range
    const budget = await this.getBudget(budgetId);
    if (!budget) {
      return [];
    }
    
    // Get all budget categories for this budget
    const budgetCategoriesData = await this.getBudgetCategories(budgetId);
    
    // Extract category IDs
    const categoryIds = budgetCategoriesData.map(bc => bc.categoryId);
    
    // Get category names
    const categoryList = await db
      .select()
      .from(categories)
      .where(sql`${categories.id} IN (${categoryIds.join(',')})`);
    
    const categoryMap = new Map<number, string>();
    categoryList.forEach(cat => {
      categoryMap.set(cat.id, cat.name);
    });
    
    // Create a map of category ID to max amount
    const categoryBudgetMap = new Map<number, number>();
    budgetCategoriesData.forEach(bc => {
      categoryBudgetMap.set(bc.categoryId, bc.maxAmount);
    });
    
    // Format dates for query
    // Ensure budget.startDate is a Date object
    const startDate = typeof budget.startDate === 'string' ? new Date(budget.startDate) : budget.startDate;
    const startDateStr = startDate.toISOString().split('T')[0];
    
    // Handle budget.endDate which might be a string or a Date or null
    let endDate = new Date();
    if (budget.endDate) {
      endDate = typeof budget.endDate === 'string' ? new Date(budget.endDate) : budget.endDate;
    }
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Get transactions for each category in the date range
    const result = await Promise.all(
      categoryIds.map(async (categoryId) => {
        const categoryName = categoryMap.get(categoryId) || 'Unknown';
        const budgetedAmount = categoryBudgetMap.get(categoryId) || 0;
        
        // Get the transactions for this category
        const categoryTransactions = await db.execute<{ total: string }>(sql`
          SELECT 
            COALESCE(SUM(amount), 0) as total 
          FROM 
            ${transactions} 
          WHERE 
            user_id = ${budget.userId} 
            AND category = ${categoryName}
            AND type = 'debit' 
            AND date >= ${startDateStr} 
            AND date <= ${endDateStr}
        `);
        
        const spentAmount = parseFloat(categoryTransactions.rows[0]?.total || '0');
        const remainingAmount = Math.max(0, budgetedAmount - spentAmount);
        const progressPercentage = budgetedAmount > 0 ? Math.min(100, (spentAmount / budgetedAmount) * 100) : 0;
        
        return {
          category: categoryName,
          budgeted: budgetedAmount,
          spent: spentAmount,
          remaining: remainingAmount,
          progress: progressPercentage
        };
      })
    );
    
    return result;
  }

  /*** Analytics methods ***/
  
  async getMonthlyExpensesByCategory(userId: number, year: number, month: number): Promise<{ category: string; total: number }[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Group by category and calculate sum
    const result = await db.execute<{ category: string; total: number }>(sql`
      SELECT 
        category, 
        SUM(amount) as total 
      FROM 
        ${transactions} 
      WHERE 
        user_id = ${userId} 
        AND type = 'debit' 
        AND date >= ${startDateStr} 
        AND date <= ${endDateStr}
        AND category IS NOT NULL
      GROUP BY 
        category 
      ORDER BY 
        total DESC
    `);
    
    return result.rows;
  }
  
  async getTotalIncomeAndExpenses(userId: number, startDate: Date, endDate: Date): Promise<{ income: number; expenses: number }> {
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    // Get total income (credit transactions)
    const incomeResult = await db.execute<{ total: string }>(sql`
      SELECT 
        COALESCE(SUM(amount), 0) as total 
      FROM 
        ${transactions} 
      WHERE 
        user_id = ${userId} 
        AND type = 'credit' 
        AND date >= ${startDateStr} 
        AND date <= ${endDateStr}
    `);
    
    // Get total expenses (debit transactions)
    const expensesResult = await db.execute<{ total: string }>(sql`
      SELECT 
        COALESCE(SUM(amount), 0) as total 
      FROM 
        ${transactions} 
      WHERE 
        user_id = ${userId} 
        AND type = 'debit' 
        AND date >= ${startDateStr} 
        AND date <= ${endDateStr}
    `);
    
    return {
      income: parseFloat(incomeResult.rows[0]?.total || '0'),
      expenses: parseFloat(expensesResult.rows[0]?.total || '0')
    };
  }
}

export const storage = new DatabaseStorage();