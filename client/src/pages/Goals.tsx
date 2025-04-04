import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Header from "@/components/dashboard/Header";
import Sidebar from "@/components/dashboard/Sidebar";
import Footer from "@/components/dashboard/Footer";
import { Redirect } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency, calculatePercentage } from "@/lib/utils";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon, InfoIcon, LightbulbIcon, PlusCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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

const formSchema = z.object({
  name: z.string().min(1, "Goal name is required"),
  targetAmount: z
    .string()
    .min(1, "Target amount is required")
    .transform((val) => parseFloat(val))
    .refine((val) => !isNaN(val) && val > 0, {
      message: "Target amount must be a positive number",
    }),
  deadline: z.date().nullable(),
  description: z.string().nullable(),
});

export default function Goals() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);

  // Check if user is authenticated
  const { data: user, isLoading: userLoading, isError: userError } = useQuery<User>({
    queryKey: ['/api/auth/me'],
  });

  // Get goals
  const { data: goals = [], isLoading: goalsLoading } = useQuery<Goal[]>({
    queryKey: ['/api/goals'],
    enabled: !!user,
  });

  // Get AI-suggested goals
  const { data: suggestedGoals = [], isLoading: suggestionsLoading } = useQuery<Goal[]>({
    queryKey: ['/api/goals/suggest'],
    enabled: false, // Only load on demand
  });

  // Form for adding new goal
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      targetAmount: "",
      deadline: null,
      description: "",
    },
  });

  // Create goal mutation
  const createGoalMutation = useMutation({
    mutationFn: async (values: z.infer<typeof formSchema>) => {
      return apiRequest("POST", "/api/goals", values);
    },
    onSuccess: () => {
      toast({
        title: "Goal created",
        description: "Your financial goal has been created successfully.",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to create goal",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete goal mutation
  const deleteGoalMutation = useMutation({
    mutationFn: async (goalId: number) => {
      return apiRequest("DELETE", `/api/goals/${goalId}`, {});
    },
    onSuccess: () => {
      toast({
        title: "Goal deleted",
        description: "Your financial goal has been deleted successfully.",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to delete goal",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Add suggested goal mutation
  const addSuggestedGoalMutation = useMutation({
    mutationFn: async (goal: Omit<Goal, 'id' | 'createdAt'>) => {
      return apiRequest("POST", "/api/goals", goal);
    },
    onSuccess: () => {
      toast({
        title: "Goal added",
        description: "The suggested goal has been added to your goals.",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to add goal",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Get AI suggestions
  const loadSuggestions = () => {
    queryClient.refetchQueries({ queryKey: ['/api/goals/suggest'] });
  };

  // Handle form submission
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createGoalMutation.mutate(values);
  };

  // Delete goal handler
  const handleDeleteGoal = (goalId: number) => {
    deleteGoalMutation.mutate(goalId);
  };

  // Add suggested goal handler
  const handleAddSuggestedGoal = (goal: Goal) => {
    const { id, createdAt, ...goalData } = goal;
    addSuggestedGoalMutation.mutate(goalData);
  };

  // If authentication failed, redirect to login
  if (userError) {
    toast({
      title: "Authentication required",
      description: "Please log in to access your financial goals.",
      variant: "destructive",
    });
    return <Redirect to="/login" />;
  }

  // Main loading state
  if (userLoading || goalsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-foreground">Loading your goals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen flex flex-col">
      <Header />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow">
        <div className="lg:col-span-3 xl:col-span-2">
          <Sidebar />
        </div>

        <div className="lg:col-span-9 xl:col-span-10 space-y-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold font-heading">Financial Goals</h1>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={loadSuggestions}
                disabled={suggestionsLoading}
              >
                <LightbulbIcon className="h-4 w-4 mr-2" />
                Get AI Suggestions
              </Button>

              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Goal
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create a New Financial Goal</DialogTitle>
                    <DialogDescription>
                      Set a clear target to help you save and track your progress.
                    </DialogDescription>
                  </DialogHeader>

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Goal Name</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g., Emergency Fund" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="targetAmount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Amount</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="e.g., 50000" 
                                type="number" 
                                min="1" 
                                step="any" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              How much do you want to save in {user?.currency || "INR"}?
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="deadline"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Target Date (Optional)</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={`w-full pl-3 text-left font-normal ${
                                      !field.value ? "text-muted-foreground" : ""
                                    }`}
                                  >
                                    {field.value ? (
                                      format(field.value, "PPP")
                                    ) : (
                                      <span>Pick a date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value || undefined}
                                  onSelect={field.onChange}
                                  disabled={(date) =>
                                    date < new Date() || date < new Date("1900-01-01")
                                  }
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormDescription>
                              When do you aim to reach this goal?
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Description (Optional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Add details about your goal..." 
                                {...field} 
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <DialogFooter>
                        <Button 
                          type="submit" 
                          disabled={createGoalMutation.isPending}
                        >
                          {createGoalMutation.isPending ? (
                            <>
                              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Creating...
                            </>
                          ) : (
                            "Create Goal"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* AI Suggestions */}
          {suggestedGoals.length > 0 && (
            <Card className="border-dashed border-2 border-primary/50 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <LightbulbIcon className="h-5 w-5 mr-2 text-primary" />
                  AI-Suggested Goals
                </CardTitle>
                <CardDescription>
                  Based on your financial data, these goals might help you on your financial journey
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {suggestedGoals.map((goal) => (
                    <Card key={`suggestion-${goal.id}`} className="bg-card/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base">{goal.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="pb-2">
                        <p className="text-sm text-muted-foreground mb-2">{goal.description}</p>
                        <p className="font-semibold">{formatCurrency(goal.targetAmount, user?.currency)}</p>
                        {goal.deadline && (
                          <p className="text-xs text-muted-foreground">
                            Target date: {new Date(goal.deadline).toLocaleDateString()}
                          </p>
                        )}
                      </CardContent>
                      <CardFooter>
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="w-full"
                          onClick={() => handleAddSuggestedGoal(goal)}
                          disabled={addSuggestedGoalMutation.isPending}
                        >
                          Add This Goal
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* User's Goals */}
          {goals.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-primary/10 p-6 mb-4">
                  <InfoIcon className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-medium mb-2">No goals yet</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  Setting financial goals is a great way to stay motivated and track your progress towards financial independence.
                </p>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>Create Your First Goal</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create a New Financial Goal</DialogTitle>
                      <DialogDescription>
                        Set a clear target to help you save and track your progress.
                      </DialogDescription>
                    </DialogHeader>

                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Goal Name</FormLabel>
                              <FormControl>
                                <Input placeholder="e.g., Emergency Fund" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="targetAmount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Target Amount</FormLabel>
                              <FormControl>
                                <Input type="number" min="1" step="any" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <DialogFooter>
                          <Button type="submit" disabled={createGoalMutation.isPending}>
                            {createGoalMutation.isPending ? "Creating..." : "Create Goal"}
                          </Button>
                        </DialogFooter>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {goals.map((goal) => (
                <Card key={goal.id} className="transition-all duration-300 hover:translate-y-[-5px] hover:shadow-md">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base">{goal.name}</CardTitle>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this goal? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDeleteGoal(goal.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    {goal.isAIGenerated && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100 text-xs rounded-full inline-flex items-center mt-1">
                        <LightbulbIcon className="h-3 w-3 mr-1" />
                        AI Suggested
                      </span>
                    )}
                  </CardHeader>
                  <CardContent>
                    {goal.description && (
                      <p className="text-sm text-muted-foreground mb-3">{goal.description}</p>
                    )}

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

                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {formatCurrency(goal.currentAmount, user?.currency)} of {formatCurrency(goal.targetAmount, user?.currency)}
                      </span>
                      {goal.deadline && (
                        <span className="text-muted-foreground">
                          {new Date(goal.deadline).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}