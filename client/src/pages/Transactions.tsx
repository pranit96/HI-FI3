import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

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
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";

import {
  CalendarIcon,
  InfoIcon,
  LightbulbIcon,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";

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

// Helper: Always use multiple mode for file uploads.
// This means the client will always use the field name "statements"
// and add the header x-upload-type: "multiple", and the backend should be set to use upload.array("statements", 5).
function UploadBankStatementForm() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Use an array for selected files even if user selects one.
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // Always add the header and use the same field name "statements"
      const token = localStorage.getItem("auth-token");
      if (!token) throw new Error("Authentication token missing");
      const response = await fetch("/api/bank-statements/upload", {
        method: "POST",
        body: formData,
        headers: {
          "Authorization": `Bearer ${token}`,
          "x-upload-type": "multiple",
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to upload statement");
      }
      return await response.json();
    },
    onMutate: () => {
      setUploading(true);
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 5;
        });
      }, 300);
      return () => clearInterval(progressInterval);
    },
    onSuccess: () => {
      setUploadProgress(100);
      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
        setSelectedFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/bank-statements"] });
        queryClient.invalidateQueries({ queryKey: ["/api/analytics/income-vs-expenses"] });
        queryClient.invalidateQueries({ queryKey: ["/api/analytics/expenses-by-category"] });
        toast({
          title: "Statement processed",
          description:
            "Your bank statement has been uploaded and transactions imported.",
        });
      }, 1000);
    },
    onError: (error) => {
      setUploading(false);
      setUploadProgress(0);
      toast({
        title: "Upload failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).filter(
        (file) => file.type === "application/pdf"
      );
      if (files.length === 0) {
        toast({
          title: "Invalid file format",
          description: "Please select only PDF files.",
          variant: "destructive",
        });
        return;
      }
      setSelectedFiles(files);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      toast({
        title: "No file selected",
        description: "Please select at least one PDF bank statement to upload",
        variant: "destructive",
      });
      return;
    }
    const formData = new FormData();
    // Always use "statements" as the field name
    selectedFiles.forEach((file) => formData.append("statements", file));
    uploadMutation.mutate(formData);
  };

  return (
    <div className="p-4 rounded-lg border">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium block">
            Upload Bank Statement (PDF)
          </label>
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg px-6 py-8 text-center hover:border-primary/50 transition-colors">
            <div className="flex flex-col items-center space-y-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">
                {selectedFiles.length > 0
                  ? selectedFiles.map((f) => f.name).join(", ")
                  : "Drag & drop your PDF here"}
              </p>
              <p className="text-xs text-muted-foreground">
                Supported format: PDF
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="bank-statement-upload"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                Choose File(s)
              </Button>
            </div>
          </div>
        </div>

        {uploading && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span>Uploading and processing...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="h-1" />
          </div>
        )}

        <div className="flex justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!selectedFiles.length || uploading || uploadMutation.isPending}
              >
                Cancel
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel Upload?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to cancel uploading these bank statements?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Continue Upload</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    setSelectedFiles([]);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                >
                  Cancel Upload
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            type="submit"
            disabled={!selectedFiles.length || uploading || uploadMutation.isPending}
          >
            {uploadMutation.isPending || uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              "Upload & Process"
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Your PDF will be securely processed and then permanently deleted to protect your privacy.
        </p>
      </form>
    </div>
  );
}

// The rest of your page remains largely the same.
// For brevity, here is the complete Goals page with the dialog for creating goals and the upload component.

export default function Goals() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);

  const { data: user, isLoading: userLoading, isError: userError } = useQuery<User>({
    queryKey: ["/api/auth/me"],
  });
  const { data: goals = [], isLoading: goalsLoading } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
    enabled: !!user,
  });
  const { data: suggestedGoals = [], isLoading: suggestionsLoading } = useQuery<Goal[]>({
    queryKey: ["/api/goals/suggest"],
    enabled: false,
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      targetAmount: "",
      deadline: null,
      description: "",
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
      setIsAddDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create goal",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

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
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete goal",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const addSuggestedGoalMutation = useMutation({
    mutationFn: async (goal: Omit<Goal, "id" | "createdAt">) => {
      return apiRequest("POST", "/api/goals", goal);
    },
    onSuccess: () => {
      toast({
        title: "Goal added",
        description: "The suggested goal has been added to your goals.",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add goal",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  const loadSuggestions = () => {
    queryClient.refetchQueries({ queryKey: ["/api/goals/suggest"] });
  };

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    createGoalMutation.mutate(values);
  };

  const handleDeleteGoal = (goalId: number) => {
    deleteGoalMutation.mutate(goalId);
  };

  const handleAddSuggestedGoal = (goal: Goal) => {
    const { id, createdAt, ...goalData } = goal;
    addSuggestedGoalMutation.mutate(goalData);
  };

  if (userError) {
    toast({
      title: "Authentication required",
      description: "Please log in to access your financial goals.",
      variant: "destructive",
    });
    return <Redirect to="/login" />;
  }

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
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Goal
            </Button>
          </div>

          {goals.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-primary/10 p-6 mb-4">
                  <InfoIcon className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-medium mb-2">No goals yet</h3>
                <p className="text-muted-foreground text-center max-w-md mb-6">
                  Setting financial goals is a great way to stay motivated and track your progress.
                </p>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  Create Your First Goal
                </Button>
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
                          style={{
                            width: `${calculatePercentage(goal.currentAmount, goal.targetAmount)}%`,
                          }}
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

          {/* Single Dialog used for both Add Goal buttons */}
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
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
                                variant="outline"
                                className={`w-full pl-3 text-left font-normal ${
                                  !field.value ? "text-muted-foreground" : ""
                                }`}
                              >
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
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
                          <Textarea placeholder="Add details about your goal..." {...field} />
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

          {/* Upload Bank Statement Form */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span>Statement Upload</span>
              </CardTitle>
              <CardDescription>
                Upload bank statements to automatically import transactions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <UploadBankStatementForm />
                <div className="bg-muted/50 p-4 rounded-lg border border-border">
                  <h3 className="text-sm font-medium mb-2">Benefits of Statement Upload</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <div className="rounded-full bg-green-500/20 p-1">
                        <LightbulbIcon className="h-3 w-3 text-green-500" />
                      </div>
                      Automatic transaction categorization
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="rounded-full bg-green-500/20 p-1">
                        <LightbulbIcon className="h-3 w-3 text-green-500" />
                      </div>
                      Personalized spending insights
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="rounded-full bg-green-500/20 p-1">
                        <LightbulbIcon className="h-3 w-3 text-green-500" />
                      </div>
                      Accurate financial forecasting
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="rounded-full bg-green-500/20 p-1">
                        <LightbulbIcon className="h-3 w-3 text-green-500" />
                      </div>
                      Secure, encrypted processing
                    </li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-4">
                    Your data is securely processed and bank statement files are deleted after analysis to protect your privacy.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
