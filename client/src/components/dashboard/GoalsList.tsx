import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, calculatePercentage } from "@/lib/utils";
import { PlusCircle, LightbulbIcon } from "lucide-react";

type User = {
  id: number;
  name: string;
  email: string;
  currency: string;
  monthlySalary: number | null;
};

type Goal = {
  id: number;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  description: string | null;
  isAIGenerated: boolean;
  status: string;
  createdAt: string;
};

export default function GoalsList() {
  // Get current user for currency
  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/me'],
  });

  // Get goals
  const { data: goals = [], isLoading: goalsLoading } = useQuery<Goal[]>({
    queryKey: ['/api/goals'],
  });

  // Loading state
  if (goalsLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium">Financial Goals</CardTitle>
          <Skeleton className="h-10 w-24" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
            <Skeleton className="h-40" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (goals.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium">Financial Goals</CardTitle>
          <Link href="/goals">
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Goal
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground mb-4">You haven't set any financial goals yet</p>
            <Link href="/goals">
              <Button variant="secondary">Set Your First Goal</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Financial Goals</CardTitle>
        <Link href="/goals">
          <Button variant="ghost">View All</Button>
        </Link>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.slice(0, 3).map((goal) => (
            <div 
              key={goal.id} 
              className="border border-border rounded-lg p-4 transition-all duration-300 hover:translate-y-[-5px] hover:shadow-md"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-medium text-base">{goal.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {goal.description ? 
                      (goal.description.length > 30 ? goal.description.substring(0, 30) + '...' : goal.description) 
                      : ''}
                  </p>
                </div>
                {goal.isAIGenerated && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 text-xs rounded-full inline-flex items-center">
                    <LightbulbIcon className="h-3 w-3 mr-1" />
                    AI
                  </span>
                )}
              </div>
              <div className="mb-2">
                <div className="flex justify-between text-sm mb-1">
                  <span>Progress</span>
                  <span className="font-medium">
                    {calculatePercentage(goal.currentAmount, goal.targetAmount)}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-1000" 
                    style={{ width: `${calculatePercentage(goal.currentAmount, goal.targetAmount)}%` }}
                  ></div>
                </div>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">
                  {formatCurrency(goal.currentAmount, user?.currency)} of {formatCurrency(goal.targetAmount, user?.currency)}
                </span>
                {goal.deadline && (
                  <span className="text-muted-foreground">
                    {new Date(goal.deadline).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
