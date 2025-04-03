import { 
  users, type User, type InsertUser,
  bankAccounts, type BankAccount, type InsertBankAccount,
  bankStatements, type BankStatement, type InsertBankStatement,
  transactions, type Transaction, type InsertTransaction,
  categories, type Category, type InsertCategory,
  goals, type Goal, type InsertGoal,
  insights, type Insight, type InsertInsight,
  notificationPreferences, type NotificationPreference, type InsertNotificationPreference
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

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
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [createdUser] = await db.insert(users).values(user).returning();
    return createdUser;
  }

  async updateUser(id: number, userData: Partial<InsertUser>): Promise<User | undefined> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Bank account methods
  async getBankAccounts(userId: number): Promise<BankAccount[]> {
    return await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.userId, userId));
  }

  async getBankAccount(id: number): Promise<BankAccount | undefined> {
    const [account] = await db
      .select()
      .from(bankAccounts)
      .where(eq(bankAccounts.id, id));
    return account;
  }

  async createBankAccount(account: InsertBankAccount): Promise<BankAccount> {
    const [createdAccount] = await db
      .insert(bankAccounts)
      .values(account)
      .returning();
    return createdAccount;
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
    const result = await db
      .delete(bankAccounts)
      .where(eq(bankAccounts.id, id))
      .returning({ id: bankAccounts.id });
    
    return result.length > 0;
  }

  // Bank statement methods
  async getBankStatements(userId: number): Promise<BankStatement[]> {
    return await db
      .select()
      .from(bankStatements)
      .where(eq(bankStatements.userId, userId))
      .orderBy(desc(bankStatements.uploadedAt));
  }

  async getBankStatement(id: number): Promise<BankStatement | undefined> {
    const [statement] = await db
      .select()
      .from(bankStatements)
      .where(eq(bankStatements.id, id));
    return statement;
  }

  async createBankStatement(statement: InsertBankStatement): Promise<BankStatement> {
    const [createdStatement] = await db
      .insert(bankStatements)
      .values(statement)
      .returning();
    return createdStatement;
  }

  async updateBankStatement(id: number, statementData: Partial<InsertBankStatement>): Promise<BankStatement | undefined> {
    const [updatedStatement] = await db
      .update(bankStatements)
      .set(statementData)
      .where(eq(bankStatements.id, id))
      .returning();
    return updatedStatement;
  }

  // Transaction methods
  async getTransactions(userId: number, filters?: { 
    startDate?: Date; 
    endDate?: Date; 
    category?: string;
    type?: string;
    bankAccountId?: number;
  }): Promise<Transaction[]> {
    let query = db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date));
    
    if (filters) {
      if (filters.startDate) {
        query = query.where(gte(transactions.date, filters.startDate));
      }
      
      if (filters.endDate) {
        query = query.where(lte(transactions.date, filters.endDate));
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
    
    return await query;
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));
    return transaction;
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [createdTransaction] = await db
      .insert(transactions)
      .values(transaction)
      .returning();
    return createdTransaction;
  }

  async createManyTransactions(transactions: InsertTransaction[]): Promise<Transaction[]> {
    if (transactions.length === 0) return [];
    return await db
      .insert(transactions)
      .values(transactions)
      .returning();
  }

  // Category methods
  async getCategories(): Promise<Category[]> {
    return await db.select().from(categories);
  }

  async getCategory(id: number): Promise<Category | undefined> {
    const [category] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, id));
    return category;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [createdCategory] = await db
      .insert(categories)
      .values(category)
      .returning();
    return createdCategory;
  }

  // Goal methods
  async getGoals(userId: number): Promise<Goal[]> {
    return await db
      .select()
      .from(goals)
      .where(eq(goals.userId, userId))
      .orderBy(desc(goals.createdAt));
  }

  async getGoal(id: number): Promise<Goal | undefined> {
    const [goal] = await db
      .select()
      .from(goals)
      .where(eq(goals.id, id));
    return goal;
  }

  async createGoal(goal: InsertGoal): Promise<Goal> {
    const [createdGoal] = await db
      .insert(goals)
      .values(goal)
      .returning();
    return createdGoal;
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
    const result = await db
      .delete(goals)
      .where(eq(goals.id, id))
      .returning({ id: goals.id });
    
    return result.length > 0;
  }

  // Insight methods
  async getInsights(userId: number): Promise<Insight[]> {
    return await db
      .select()
      .from(insights)
      .where(eq(insights.userId, userId))
      .orderBy(desc(insights.createdAt));
  }

  async createInsight(insight: InsertInsight): Promise<Insight> {
    const [createdInsight] = await db
      .insert(insights)
      .values(insight)
      .returning();
    return createdInsight;
  }

  async deleteInsight(id: number): Promise<boolean> {
    const result = await db
      .delete(insights)
      .where(eq(insights.id, id))
      .returning({ id: insights.id });
    
    return result.length > 0;
  }

  // Notification preference methods
  async getNotificationPreferences(userId: number): Promise<NotificationPreference | undefined> {
    const [preferences] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
    return preferences;
  }

  async createNotificationPreferences(preferences: InsertNotificationPreference): Promise<NotificationPreference> {
    const [createdPreferences] = await db
      .insert(notificationPreferences)
      .values(preferences)
      .returning();
    return createdPreferences;
  }

  async updateNotificationPreferences(userId: number, preferencesData: Partial<InsertNotificationPreference>): Promise<NotificationPreference | undefined> {
    const [updatedPreferences] = await db
      .update(notificationPreferences)
      .set(preferencesData)
      .where(eq(notificationPreferences.userId, userId))
      .returning();
    return updatedPreferences;
  }

  // Analytics methods
  async getMonthlyExpensesByCategory(userId: number, year: number, month: number): Promise<{ category: string; total: number }[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const result = await db
      .select({
        category: transactions.category,
        total: sql<number>`sum(abs(${transactions.amount}))`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, 'debit'),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate)
        )
      )
      .groupBy(transactions.category);
    
    return result;
  }

  async getTotalIncomeAndExpenses(userId: number, startDate: Date, endDate: Date): Promise<{ income: number; expenses: number }> {
    const incomeResult = await db
      .select({
        total: sql<number>`sum(${transactions.amount})`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, 'credit'),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate)
        )
      );
    
    const expensesResult = await db
      .select({
        total: sql<number>`sum(abs(${transactions.amount}))`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, 'debit'),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate)
        )
      );
    
    return {
      income: incomeResult[0]?.total || 0,
      expenses: expensesResult[0]?.total || 0,
    };
  }
}

export const storage = new DatabaseStorage();
