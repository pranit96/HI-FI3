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

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  
  // Bank account methods
  getBankAccounts(userId: number): Promise<BankAccount[]>;
  getBankAccount(id: number): Promise<BankAccount | undefined>;
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
    return user;
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }
  
  async createUser(userData: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
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
  
  async createBankAccount(accountData: InsertBankAccount): Promise<BankAccount> {
    const [account] = await db.insert(bankAccounts).values(accountData).returning();
    return account;
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
        const dateString = filters.startDate.toISOString().split('T')[0];
        query = query.where(sql`${transactions.date} >= ${dateString}`);
      }
      
      if (filters.endDate) {
        const dateString = filters.endDate.toISOString().split('T')[0];
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
    
    return query.orderBy(desc(transactions.date));
  }
  
  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db.select().from(transactions).where(eq(transactions.id, id));
    return transaction;
  }
  
  async createTransaction(transactionData: InsertTransaction): Promise<Transaction> {
    const [transaction] = await db.insert(transactions).values(transactionData).returning();
    return transaction;
  }
  
  async createManyTransactions(transactionsData: InsertTransaction[]): Promise<Transaction[]> {
    if (transactionsData.length === 0) return [];
    
    const insertedTransactions = await db.insert(transactions).values(transactionsData).returning();
    return insertedTransactions;
  }
  
  async updateTransaction(id: number, transactionData: Partial<InsertTransaction>): Promise<Transaction | undefined> {
    const [updatedTransaction] = await db
      .update(transactions)
      .set(transactionData)
      .where(eq(transactions.id, id))
      .returning();
    return updatedTransaction;
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
    return db.select().from(goals).where(eq(goals.userId, userId));
  }
  
  async getGoal(id: number): Promise<Goal | undefined> {
    const [goal] = await db.select().from(goals).where(eq(goals.id, id));
    return goal;
  }
  
  async createGoal(goalData: InsertGoal): Promise<Goal> {
    const [goal] = await db.insert(goals).values(goalData).returning();
    return goal;
  }
  
  async updateGoal(id: number, goalData: Partial<InsertGoal>): Promise<Goal | undefined> {
    const [updatedGoal] = await db
      .update(goals)
      .set(goalData)
      .where(eq(goals.id, id))
      .returning();
    return updatedGoal;
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
    return db
      .select()
      .from(budgets)
      .where(eq(budgets.userId, userId))
      .orderBy(desc(budgets.createdAt));
  }
  
  async getBudget(id: number): Promise<Budget | undefined> {
    const [budget] = await db.select().from(budgets).where(eq(budgets.id, id));
    return budget;
  }
  
  async createBudget(budgetData: InsertBudget): Promise<Budget> {
    const [budget] = await db.insert(budgets).values(budgetData).returning();
    return budget;
  }
  
  async updateBudget(id: number, budgetData: Partial<InsertBudget>): Promise<Budget | undefined> {
    const [updatedBudget] = await db
      .update(budgets)
      .set(budgetData)
      .where(eq(budgets.id, id))
      .returning();
    return updatedBudget;
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
    return db
      .select()
      .from(budgetCategories)
      .where(eq(budgetCategories.budgetId, budgetId));
  }
  
  async getBudgetCategory(id: number): Promise<BudgetCategory | undefined> {
    const [budgetCategory] = await db.select().from(budgetCategories).where(eq(budgetCategories.id, id));
    return budgetCategory;
  }
  
  async createBudgetCategory(budgetCategoryData: InsertBudgetCategory): Promise<BudgetCategory> {
    const [budgetCategory] = await db.insert(budgetCategories).values(budgetCategoryData).returning();
    return budgetCategory;
  }
  
  async updateBudgetCategory(id: number, budgetCategoryData: Partial<InsertBudgetCategory>): Promise<BudgetCategory | undefined> {
    const [updatedBudgetCategory] = await db
      .update(budgetCategories)
      .set(budgetCategoryData)
      .where(eq(budgetCategories.id, id))
      .returning();
    return updatedBudgetCategory;
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
    const startDateStr = budget.startDate.toISOString().split('T')[0];
    const endDateStr = budget.endDate ? budget.endDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
    
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