import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string = "INR"): string {
  const formatter = new Intl.NumberFormat(getCurrencyLocale(currency), {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(amount);
}

function getCurrencyLocale(currency: string): string {
  const localeMap: {[key: string]: string} = {
    "INR": "en-IN",
    "USD": "en-US",
    "EUR": "en-EU",
    "GBP": "en-GB",
    "JPY": "ja-JP"
  };
  
  return localeMap[currency] || "en-US";
}

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return dateObj.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function calculatePercentage(value: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((value / total) * 100);
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function getColorForCategory(category: string): string {
  const categoryColors: {[key: string]: string} = {
    "Groceries": "#3DD598",
    "Dining": "#4A56E2",
    "Transport": "#FF6B6B",
    "Entertainment": "#EAB308",
    "Shopping": "#8B5CF6",
    "Utilities": "#0EA5E9",
    "Healthcare": "#EC4899",
    "Education": "#10B981",
    "Housing": "#F97316",
    "Income": "#059669",
    "Transfer": "#6366F1",
    "Savings": "#0369A1",
    "Investment": "#4F46E5",
    "Travel": "#D946EF",
    "Subscription": "#DC2626",
    "Other": "#71717A"
  };
  
  return categoryColors[category] || "#71717A";
}

export function getCategoryIcon(category: string) {
  // Return the name of a Lucide icon based on the category
  const categoryIcons: {[key: string]: string} = {
    "Groceries": "ShoppingCart",
    "Dining": "Utensils",
    "Transport": "Car",
    "Entertainment": "Film",
    "Shopping": "ShoppingBag",
    "Utilities": "Lightbulb",
    "Healthcare": "Heart",
    "Education": "GraduationCap",
    "Housing": "Home",
    "Income": "DollarSign",
    "Transfer": "ArrowRightLeft",
    "Savings": "Piggy",
    "Investment": "TrendingUp",
    "Travel": "Plane",
    "Subscription": "Repeat",
    "Other": "MoreHorizontal"
  };
  
  return categoryIcons[category] || "Circle";
}
