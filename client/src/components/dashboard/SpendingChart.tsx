import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";

type User = {
  id: number;
  name: string;
  email: string;
  currency: string;
  monthlySalary: number | null;
};

type Transaction = {
  id: number;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: string;
};

export default function SpendingChart() {
  const [timeRange, setTimeRange] = useState("7");

  // Get current user for currency
  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/me'],
  });

  // Get transactions
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });

  // Prepare data for the chart based on selected time range
  const prepareChartData = () => {
    const days = parseInt(timeRange);
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - days);

    // Filter transactions by date range and only include expenses (debit)
    const filteredTransactions = transactions.filter(
      (txn) => 
        new Date(txn.date) >= startDate && 
        new Date(txn.date) <= today &&
        txn.type === 'debit'
    );

    // Group transactions by day
    const dailyExpenses = new Map<string, number>();
    
    // Initialize all days in the range with 0
    for (let i = 0; i <= days; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      dailyExpenses.set(dateStr, 0);
    }
    
    // Sum expenses for each day
    filteredTransactions.forEach((txn) => {
      const dateStr = txn.date.split('T')[0];
      const currentAmount = dailyExpenses.get(dateStr) || 0;
      dailyExpenses.set(dateStr, currentAmount + Math.abs(txn.amount));
    });
    
    // Convert to chart data format
    const chartData = Array.from(dailyExpenses.entries()).map(([date, amount]) => {
      const displayDate = new Date(date);
      return {
        date,
        name: displayDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
        amount,
      };
    });
    
    // Sort by date
    return chartData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const chartData = prepareChartData();
  
  // Calculate average spending
  const totalSpending = chartData.reduce((total, day) => total + day.amount, 0);
  const averageSpending = chartData.length > 0 ? totalSpending / chartData.length : 0;

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border p-2 rounded-md shadow-sm">
          <p className="font-medium">{payload[0].payload.name}</p>
          <p className="text-primary font-semibold">
            {formatCurrency(payload[0].value, user?.currency || 'INR')}
          </p>
        </div>
      );
    }
    return null;
  };

  // Loading state
  if (transactionsLoading) {
    return (
      <Card className="h-full">
        <CardHeader className="pb-0 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-medium">Weekly Spending</CardTitle>
          <Skeleton className="h-10 w-32" />
        </CardHeader>
        <CardContent className="pt-4">
          <Skeleton className="h-[260px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-0 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium">Daily Spending</CardTitle>
        <div className="relative">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="14">Last 14 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[260px]">
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-muted-foreground">No spending data available for this period</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  tickFormatter={(value) => formatCurrency(value, user?.currency || 'INR').split('.')[0]}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine 
                  y={averageSpending} 
                  label={{ 
                    value: "Average", 
                    position: "right",
                    style: { fontSize: '12px' } 
                  }} 
                  stroke="#8884d8" 
                  strokeDasharray="3 3" 
                />
                <Line
                  type="monotone"
                  dataKey="amount"
                  stroke="#3DD598"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
