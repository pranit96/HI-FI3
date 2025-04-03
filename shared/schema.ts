import { pgTable, text, serial, integer, boolean, date, timestamp, doublePrecision, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  currency: text("currency").default("INR").notNull(),
  monthlySalary: doublePrecision("monthly_salary"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

// Bank accounts model
export const bankAccounts = pgTable("bank_accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  type: text("type").notNull(),
  accountNumber: text("account_number").notNull(),
  balance: doublePrecision("balance").default(0).notNull(),
  color: text("color").notNull(),
  shortCode: text("short_code").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBankAccountSchema = createInsertSchema(bankAccounts).omit({
  id: true,
  createdAt: true,
});

// Bank statements model
export const bankStatements = pgTable("bank_statements", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  bankAccountId: integer("bank_account_id").references(() => bankAccounts.id),
  fileName: text("file_name").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  processed: boolean("processed").default(false).notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
});

export const insertBankStatementSchema = createInsertSchema(bankStatements).omit({
  id: true,
  processed: true,
  uploadedAt: true,
});

// Transactions model
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  bankAccountId: integer("bank_account_id").references(() => bankAccounts.id),
  bankStatementId: integer("bank_statement_id").references(() => bankStatements.id),
  date: date("date").notNull(),
  description: text("description").notNull(),
  category: text("category"),
  amount: doublePrecision("amount").notNull(),
  type: text("type").notNull(), // credit or debit
  reference: text("reference"),
  balance: doublePrecision("balance"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

// Categories model
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull(),
  icon: text("icon"),
  isDefault: boolean("is_default").default(false).notNull(),
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

// Financial goals model
export const goals = pgTable("goals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  targetAmount: doublePrecision("target_amount").notNull(),
  currentAmount: doublePrecision("current_amount").default(0).notNull(),
  deadline: date("deadline"),
  description: text("description"),
  isAIGenerated: boolean("is_ai_generated").default(false).notNull(),
  status: text("status").default("active").notNull(), // active, completed, cancelled
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGoalSchema = createInsertSchema(goals).omit({
  id: true,
  currentAmount: true,
  createdAt: true,
});

// AI insights model
export const insights = pgTable("insights", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  type: text("type").notNull(), // info, warning, success
  category: text("category"),
  relevantTransactions: jsonb("relevant_transactions"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertInsightSchema = createInsertSchema(insights).omit({
  id: true,
  createdAt: true,
});

// User notification preferences
export const notificationPreferences = pgTable("notification_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id).unique(),
  weeklyReport: boolean("weekly_report").default(true).notNull(),
  bankStatementReminder: boolean("bank_statement_reminder").default(true).notNull(),
  goalProgress: boolean("goal_progress").default(true).notNull(),
  insights: boolean("insights").default(true).notNull(),
});

export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertBankAccount = z.infer<typeof insertBankAccountSchema>;

export type BankStatement = typeof bankStatements.$inferSelect;
export type InsertBankStatement = z.infer<typeof insertBankStatementSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type Goal = typeof goals.$inferSelect;
export type InsertGoal = z.infer<typeof insertGoalSchema>;

export type Insight = typeof insights.$inferSelect;
export type InsertInsight = z.infer<typeof insertInsightSchema>;

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;
