import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Redirect } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, getColorForCategory } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from "recharts";

type User = {
  id: number;
  name: string;
  email: string;
  currency: string;
  monthlySalary: number | null;
};

type CategoryExpense = {
  category: string;
  total: number;
};

export default function Analytics() {
  const { toast } = useToast();
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString());
  const [selectedMonth, setSelectedMonth] = useState<string>((new Date().getMonth() + 1).toString());

  // Check if user is authenticated
  const { data: user, isLoading: userLoading, isError: userError } = useQuery<User>({
    queryKey: ['/api/auth/me'],
  });

  // Get monthly expenses by category
  const { data: categoryExpenses = [], isLoading: expensesLoading } = useQuery<CategoryExpense[]>({
    queryKey: [`/api/analytics/expenses-by-category?year=${selectedYear}&month=${selectedMonth}`],
    enabled: !!user,
  });
  
  // Calculate monthly stats
  const currentDate = new Date();
  const firstDayOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  // Format dates for API call
  const startDate = firstDayOfCurrentMonth.toISOString().split('T')[0];
  const endDate = lastDayOfCurrentMonth.toISOString().split('T')[0];
  
  const { data: monthlyStats, isLoading: statsLoading } = useQuery({
    queryKey: [`/api/analytics/income-vs-expenses?startDate=${startDate}&endDate=${endDate}`],
    enabled: !!user,
  });

  // Generate past 6 months for trend chart
  const generatePastMonthsData = () => {
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        name: month.toLocaleString('default', { month: 'short' }),
        year: month.getFullYear(),
        month: month.getMonth() + 1,
        income: 0,
        expenses: 0
      });
    }
    
    return months;
  };
  
  const monthsData = generatePastMonthsData();
  
  // If authentication failed, redirect to login
  if (userError) {
    toast({
      title: "Authentication required",
      description: "Please log in to access your analytics.",
      variant: "destructive",
    });
    return <Redirect to="/login" />;
  }

  // Main loading state
  if (userLoading || expensesLoading || statsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }
  
  // Total expenses for the month
  const totalExpenses = categoryExpenses.reduce((total, item) => total + item.total, 0);
  
  // Prepare data for charts
  const pieChartData = categoryExpenses.map(item => ({
    name: item.category || "Uncategorized",
    value: item.total,
    color: getColorForCategory(item.category || "Other")
  }));
  
  // Custom tooltip for pie chart
  const PieCustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border p-2 rounded-md shadow-sm">
          <p className="font-medium">{data.name}</p>
          <p>{formatCurrency(data.value, user?.currency || 'INR')}</p>
          <p className="text-xs text-muted-foreground">
            {((data.value / totalExpenses) * 100).toFixed(1)}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Monthly Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Income</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(monthlyStats?.income || 0, user?.currency)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Expenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(monthlyStats?.expenses || 0, user?.currency)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Savings Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {monthlyStats?.savingsRate?.toFixed(1) || 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>
        </div>
        
        {/* Income vs Expenses Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Income vs Expenses Trend</CardTitle>
            <CardDescription>View your financial performance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis 
                    tickFormatter={(value) => 
                      formatCurrency(value, user?.currency || 'INR').split('.')[0]
                    } 
                  />
                  <Tooltip 
                    formatter={(value) => [formatCurrency(value as number, user?.currency || 'INR'), '']} 
                    labelFormatter={(label) => `${label}`}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="income"
                    stroke="#3DD598"
                    strokeWidth={2}
                    activeDot={{ r: 8 }}
                    name="Income"
                  />
                  <Line
                    type="monotone"
                    dataKey="expenses"
                    stroke="#FF6B6B"
                    strokeWidth={2}
                    name="Expenses"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        {/* Category Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Spending by Category</CardTitle>
                <CardDescription>Breakdown of your monthly expenses</CardDescription>
              </div>
              <div className="flex items-center space-x-2">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-[110px]">
                    <SelectValue placeholder="Month" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <SelectItem key={month} value={month.toString()}>
                        {new Date(0, month - 1).toLocaleString('default', { month: 'long' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[90px]">
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {categoryExpenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px]">
                  <p className="text-muted-foreground">No expense data available for this period</p>
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieCustomTooltip />} />
                      <Legend 
                        layout="vertical" 
                        verticalAlign="middle" 
                        align="right"
                        formatter={(value) => <span className="text-xs">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Top Expense Categories</CardTitle>
              <CardDescription>Your highest spending areas</CardDescription>
            </CardHeader>
            <CardContent>
              {categoryExpenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px]">
                  <p className="text-muted-foreground">No expense data available for this period</p>
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={categoryExpenses.slice(0, 5).map(item => ({
                        name: item.category || "Uncategorized",
                        amount: item.total,
                        color: getColorForCategory(item.category || "Other")
                      }))}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis
                        type="number"
                        tickFormatter={(value) => 
                          formatCurrency(value, user?.currency || 'INR').split('.')[0]
                        }
                      />
                      <YAxis dataKey="name" type="category" />
                      <Tooltip 
                        formatter={(value) => [formatCurrency(value as number, user?.currency || 'INR'), 'Amount']} 
                        labelFormatter={(label) => `Category: ${label}`}
                      />
                      <Bar dataKey="amount" radius={[0, 4, 4, 0]}>
                        {categoryExpenses.slice(0, 5).map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={getColorForCategory(entry.category || "Other")} 
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}