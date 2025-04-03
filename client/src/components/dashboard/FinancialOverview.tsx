import { useQuery } from "@tanstack/react-query";
import { formatCurrency } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowUp, ArrowDown } from "lucide-react";

type User = {
  id: number;
  name: string;
  email: string;
  currency: string;
  monthlySalary: number | null;
  createdAt: string;
};

type AnalyticsResponse = {
  income: number;
  expenses: number;
  savings: number;
  savingsRate: number;
};

export default function FinancialOverview() {
  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/me'],
  });

  // Get current date for analytics query
  const currentDate = new Date();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  // Format dates for API call
  const startDate = firstDayOfMonth.toISOString().split('T')[0];
  const endDate = lastDayOfMonth.toISOString().split('T')[0];

  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsResponse>({
    queryKey: [`/api/analytics/income-vs-expenses?startDate=${startDate}&endDate=${endDate}`],
    enabled: !!user,
  });

  // Get bank accounts to determine available balance
  const { data: bankAccounts, isLoading: accountsLoading } = useQuery({
    queryKey: ['/api/bank-accounts'],
    enabled: !!user,
  });

  // Calculate total balance from bank accounts
  const totalBalance = Array.isArray(bankAccounts) 
    ? bankAccounts.reduce((total, account) => total + (account.balance || 0), 0)
    : 0;

  // Sample data for first-time users without transaction history
  const currency = user?.currency || 'INR';
  const monthlyIncome = user?.monthlySalary || 0;
  const monthlyExpenses = analytics?.expenses || 0;
  const monthlySavings = analytics?.savings || (monthlyIncome - monthlyExpenses);
  const savingsRate = analytics?.savingsRate || ((monthlySavings / monthlyIncome) * 100 || 0);

  const isFirstMonth = !analytics || (analytics.income === 0 && analytics.expenses === 0);

  const cards = [
    {
      title: "Monthly Income",
      badge: "Salary",
      badgeColor: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
      amount: monthlyIncome,
      trend: {
        value: isFirstMonth ? 0 : 3.2,
        direction: "up",
        text: "from last month",
      },
    },
    {
      title: "Total Expenses",
      badge: currentDate.toLocaleString('default', { month: 'long' }),
      badgeColor: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100",
      amount: monthlyExpenses,
      trend: {
        value: isFirstMonth ? 0 : monthlyExpenses > monthlyIncome * 0.7 ? 12.5 : -5.3,
        direction: monthlyExpenses > monthlyIncome * 0.7 ? "up" : "down",
        text: "from last month",
      },
    },
    {
      title: "Savings",
      badge: currentDate.toLocaleString('default', { month: 'long' }),
      badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
      amount: monthlySavings,
      trend: {
        value: savingsRate,
        direction: "up",
        text: "of income",
      },
    },
    {
      title: "Available Balance",
      badge: "Current",
      badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
      amount: totalBalance,
      trend: {
        value: 0,
        direction: "none",
        text: "Last updated: Today",
      },
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <div 
          key={index} 
          className="bg-card dark:bg-card rounded-xl p-6 shadow-sm transition-all duration-300 hover:translate-y-[-5px] hover:shadow-md flex flex-col"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">{card.title}</h3>
            <span className={`px-2 py-1 ${card.badgeColor} text-xs rounded-full`}>{card.badge}</span>
          </div>
          
          {analyticsLoading || accountsLoading ? (
            <Skeleton className="h-8 w-3/4 mb-2" />
          ) : (
            <div className="text-2xl font-bold mb-2">
              {formatCurrency(card.amount, currency)}
            </div>
          )}
          
          <div className={`flex items-center text-sm ${
            card.trend.direction === "up" ? "text-green-600 dark:text-green-400" : 
            card.trend.direction === "down" ? "text-red-600 dark:text-red-400" : 
            "text-muted-foreground"
          }`}>
            {card.trend.direction === "up" && (
              <ArrowUp className="w-4 h-4 mr-1" />
            )}
            {card.trend.direction === "down" && (
              <ArrowDown className="w-4 h-4 mr-1" />
            )}
            <span>
              {card.trend.direction !== "none" ? `${card.trend.value.toFixed(1)}% ` : ""}
              {card.trend.text}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
