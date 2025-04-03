import { 
  users, type User, type InsertUser,
  bankAccounts, type BankAccount, type InsertBankAccount,
  bankStatements, type BankStatement, type InsertBankStatement,
  transactions, type Transaction, type InsertTransaction,
  categories, type Category, type InsertCategory,
  goals, type Goal, type InsertGoal,
  insights, type Insight, type InsertInsight,
  notificationPreferences, type NotificationPreference, type InsertNotificationPreference,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, desc, sql, SQL } from "drizzle-orm";
import { PostgresDate } from "drizzle-orm/pg-core";

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
      .orderBy(desc(bankStatements.createdAt));
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