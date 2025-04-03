import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, getColorForCategory } from "@/lib/utils";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
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

export default function CategoryChart() {
  // Get current date for the month and year
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // JS months are 0-indexed
  const currentYear = currentDate.getFullYear();

  // Get current user for currency
  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/me'],
  });

  // Get expenses by category
  const { data: categoryExpenses = [], isLoading: expensesLoading } = useQuery<CategoryExpense[]>({
    queryKey: [`/api/analytics/expenses-by-category?year=${currentYear}&month=${currentMonth}`],
    enabled: !!user,
  });

  // Prepare data for the pie chart
  const pieData = categoryExpenses.map(item => ({
    name: item.category || "Uncategorized",
    value: item.total,
    color: getColorForCategory(item.category || "Other")
  }));

  // Calculate total expenses
  const totalExpenses = categoryExpenses.reduce((sum, item) => sum + item.total, 0);

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card border p-2 rounded-md shadow-sm">
          <p className="font-medium">{data.name}</p>
          <p className="text-sm">
            {formatCurrency(data.value, user?.currency || 'INR')}
          </p>
          <p className="text-xs text-muted-foreground">
            {Math.round((data.value / totalExpenses) * 100)}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  // Loading state
  if (expensesLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-lg font-medium">Spending by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full mb-4" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg font-medium">Spending by Category</CardTitle>
      </CardHeader>
      <CardContent>
        {pieData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64">
            <p className="text-muted-foreground">No category data available</p>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={1}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="mt-4 space-y-2">
          {pieData.slice(0, 5).map((category, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center">
                <span 
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: category.color }}
                ></span>
                <span className="text-sm">{category.name}</span>
              </div>
              <span className="text-sm font-medium">
                {formatCurrency(category.value, user?.currency || 'INR')}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
