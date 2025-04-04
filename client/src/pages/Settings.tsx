import { useEffect } from "react";
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

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

type User = {
  id: number;
  name: string;
  email: string;
  currency: string;
  monthlySalary: string | null; // Changed to string to match form
};

type NotificationPreference = {
  id: number;
  userId: number;
  weeklyReport: boolean;
  bankStatementReminder: boolean;
  goalProgress: boolean;
  insights: boolean;
};

const profileFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  monthlySalary: z
    .string() // Keep as string for form handling
    .min(1, "Monthly salary is required"),
  currency: z.string().min(1, "Currency is required"),
});

const passwordFormSchema = z.object({
  currentPassword: z.string().min(6, "Current password is required"),
  newPassword: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm password is required"),
}).refine(data => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const notificationFormSchema = z.object({
  weeklyReport: z.boolean(),
  bankStatementReminder: z.boolean(),
  goalProgress: z.boolean(),
  insights: z.boolean(),
});

export default function Settings() {
  const { toast } = useToast();

  // Check if user is authenticated
  const { data: user, isLoading: userLoading, isError: userError } = useQuery<User>({
    queryKey: ['/api/auth/me'],
  });

  // Get notification preferences
  const { data: notificationPreferences, isLoading: preferencesLoading } = useQuery<NotificationPreference>({
    queryKey: ['/api/notification-preferences'],
    enabled: !!user,
  });

  // Profile form
  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: "",
      email: "",
      monthlySalary: "0", // Changed from empty string to "0" to match type
      currency: "",
    },
  });

  // Update profile form when user data is loaded
  useEffect(() => {
    if (user) {
      profileForm.reset({
        name: user.name,
        email: user.email,
        monthlySalary: user.monthlySalary?.toString() || "",
        currency: user.currency,
      });
    }
  }, [user, profileForm]);

  // Password form
  const passwordForm = useForm<z.infer<typeof passwordFormSchema>>({
    resolver: zodResolver(passwordFormSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Notification form
  const notificationForm = useForm<z.infer<typeof notificationFormSchema>>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      weeklyReport: true,
      bankStatementReminder: true,
      goalProgress: true,
      insights: true,
    },
  });

  // Update notification form when preferences are loaded
  useEffect(() => {
    if (notificationPreferences) {
      notificationForm.reset({
        weeklyReport: notificationPreferences.weeklyReport,
        bankStatementReminder: notificationPreferences.bankStatementReminder,
        goalProgress: notificationPreferences.goalProgress,
        insights: notificationPreferences.insights,
      });
    }
  }, [notificationPreferences, notificationForm]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (values: z.infer<typeof profileFormSchema>) => {
      return apiRequest("PATCH", "/api/users/me", values);
    },
    onSuccess: () => {
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to update profile",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (values: z.infer<typeof passwordFormSchema>) => {
      return apiRequest("PATCH", "/api/users/me", {
        password: values.newPassword,
      });
    },
    onSuccess: () => {
      toast({
        title: "Password updated",
        description: "Your password has been updated successfully.",
        variant: "success",
      });
      passwordForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Failed to update password",
        description: error.message || "Current password incorrect or something went wrong.",
        variant: "destructive",
      });
    },
  });

  // Update notification preferences mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: async (values: z.infer<typeof notificationFormSchema>) => {
      return apiRequest("PATCH", "/api/notification-preferences", values);
    },
    onSuccess: () => {
      toast({
        title: "Preferences updated",
        description: "Your notification preferences have been updated successfully.",
        variant: "success",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/notification-preferences'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to update preferences",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete user data mutation
  const deleteDataMutation = useMutation({
    mutationFn: async (type: 'transactions' | 'statements' | 'all') => {
      return apiRequest("DELETE", `/api/user-data/${type}`);
    },
    onSuccess: (_, type) => {
      // Define different success messages based on what was deleted
      const messages = {
        transactions: "All transaction data has been deleted",
        statements: "All bank statements have been deleted",
        all: "All your financial data has been deleted"
      };

      toast({
        title: "Data deleted",
        description: messages[type],
        variant: "success",
      });

      // Invalidate relevant queries
      if (type === 'transactions' || type === 'all') {
        queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/income-vs-expenses'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/expenses-by-category'] });
      }

      if (type === 'statements' || type === 'all') {
        queryClient.invalidateQueries({ queryKey: ['/api/bank-statements'] });
      }

      if (type === 'all') {
        queryClient.invalidateQueries({ queryKey: ['/api/goals'] });
        queryClient.invalidateQueries({ queryKey: ['/api/insights'] });
        queryClient.invalidateQueries({ queryKey: ['/api/budgets'] });
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to delete data",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle profile form submission
  const onProfileSubmit = (values: z.infer<typeof profileFormSchema>) => {
    updateProfileMutation.mutate(values);
  };

  // Handle password form submission
  const onPasswordSubmit = (values: z.infer<typeof passwordFormSchema>) => {
    updatePasswordMutation.mutate(values);
  };

  // Handle notification form submission
  const onNotificationSubmit = (values: z.infer<typeof notificationFormSchema>) => {
    updateNotificationsMutation.mutate(values);
  };

  // If authentication failed, redirect to login
  if (userError) {
    toast({
      title: "Authentication required",
      description: "Please log in to access your settings.",
      variant: "destructive",
    });
    return <Redirect to="/login" />;
  }

  // Main loading state
  if (userLoading || preferencesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-foreground">Loading settings...</p>
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
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold font-heading">Settings</h1>
              <p className="text-muted-foreground">
                Manage your account settings and preferences
              </p>
            </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="privacy">Data & Privacy</TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>
                  Update your personal information and preferences
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...profileForm}>
                  <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" />
                          </FormControl>
                          <FormDescription>
                            This email will be used for notifications and account recovery
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={profileForm.control}
                        name="monthlySalary"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Monthly Salary</FormLabel>
                            <FormControl>
                              <Input {...field} type="number" min="0" step="0.01" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={profileForm.control}
                        name="currency"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Currency</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a currency" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="INR">Indian Rupee (₹)</SelectItem>
                                <SelectItem value="USD">US Dollar ($)</SelectItem>
                                <SelectItem value="EUR">Euro (€)</SelectItem>
                                <SelectItem value="GBP">British Pound (£)</SelectItem>
                                <SelectItem value="JPY">Japanese Yen (¥)</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>
                  Update your password and security settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
                    <FormField
                      control={passwordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Password</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>New Password</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" />
                          </FormControl>
                          <FormDescription>
                            Password must be at least 6 characters long
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm New Password</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      disabled={updatePasswordMutation.isPending}
                    >
                      {updatePasswordMutation.isPending ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Updating...
                        </>
                      ) : (
                        "Update Password"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>
                  Configure which notifications you receive via email
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...notificationForm}>
                  <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)} className="space-y-6">
                    <div className="space-y-4">
                      <FormField
                        control={notificationForm.control}
                        name="weeklyReport"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Weekly Financial Report</FormLabel>
                              <FormDescription>
                                Receive a summary of your financial activities every week
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={notificationForm.control}
                        name="bankStatementReminder"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Bank Statement Reminders</FormLabel>
                              <FormDescription>
                                Get reminded to upload your bank statements weekly
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={notificationForm.control}
                        name="goalProgress"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Goal Progress Updates</FormLabel>
                              <FormDescription>
                                Receive updates when you make significant progress on your goals
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={notificationForm.control}
                        name="insights"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">AI Financial Insights</FormLabel>
                              <FormDescription>
                                Get notified when new AI-generated insights are available
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <Button 
                      type="submit" 
                      disabled={updateNotificationsMutation.isPending}
                    >
                      {updateNotificationsMutation.isPending ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Saving...
                        </>
                      ) : (
                        "Save Preferences"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Data & Privacy Tab */}
          <TabsContent value="privacy">
            <Card>
              <CardHeader>
                <CardTitle>Data & Privacy</CardTitle>
                <CardDescription>
                  Manage your data and understand our privacy practices
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium mb-2">Data Management</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    You can delete various parts of your data from our system. This action cannot be undone.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="border rounded-lg p-4 space-y-3">
                      <h4 className="font-medium">Transaction Data</h4>
                      <p className="text-sm text-muted-foreground">
                        Delete all your transactions, but keep other data (statements, goals, etc.)
                      </p>
                      <Button 
                        variant="destructive" 
                        onClick={() => deleteDataMutation.mutate('transactions')}
                        disabled={deleteDataMutation.isPending}
                        className="w-full"
                      >
                        {deleteDataMutation.isPending ? "Deleting..." : "Delete Transactions"}
                      </Button>
                    </div>

                    <div className="border rounded-lg p-4 space-y-3">
                      <h4 className="font-medium">Statement Data</h4>
                      <p className="text-sm text-muted-foreground">
                        Delete all your uploaded bank statements and their processed data
                      </p>
                      <Button 
                        variant="destructive" 
                        onClick={() => deleteDataMutation.mutate('statements')}
                        disabled={deleteDataMutation.isPending}
                        className="w-full"
                      >
                        {deleteDataMutation.isPending ? "Deleting..." : "Delete Statements"}
                      </Button>
                    </div>

                    <div className="border rounded-lg p-4 space-y-3">
                      <h4 className="font-medium">All Financial Data</h4>
                      <p className="text-sm text-muted-foreground">
                        Delete all your financial data including transactions, statements, goals, etc.
                      </p>
                      <Button 
                        variant="destructive" 
                        onClick={() => {
                          const confirmed = window.confirm(
                            "Are you sure you want to delete ALL your data? This action cannot be undone and will delete:\n\n" +
                            "- All transactions\n" +
                            "- All bank statements\n" +
                            "- All financial goals\n" +
                            "- All insights and analytics\n\n" +
                            "Please type 'DELETE' to confirm."
                          );

                          if (confirmed) {
                            const userInput = window.prompt("Type 'DELETE' to confirm:");
                            if (userInput === 'DELETE') {
                              deleteDataMutation.mutate('all');
                            }
                          }
                        }}
                        disabled={deleteDataMutation.isPending}
                        className="w-full"
                      >
                        {deleteDataMutation.isPending ? "Deleting..." : "Delete All Data"}
                      </Button>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-medium mb-2">Privacy Policy</h3>
                  <div className="rounded-lg border p-4 bg-muted/50 max-h-64 overflow-y-auto">
                    <h4 className="font-semibold mb-2">How We Handle Your Data</h4>
                    <p className="text-sm mb-3">
                      At Finvue, we take your privacy and data security seriously. Here's how we handle your financial information:
                    </p>

                    <h5 className="font-medium text-sm mb-1">Data Collection</h5>
                    <p className="text-sm mb-2">
                      We collect information you explicitly provide, such as bank statements, financial goals, and account details.
                      PDF bank statements are processed securely and then immediately deleted from our servers once the processing is complete.
                    </p>

                    <h5 className="font-medium text-sm mb-1">Data Storage</h5>
                    <p className="text-sm mb-2">
                      All your financial data is stored in encrypted format. We employ industry-standard security measures
                      to protect against unauthorized access, alteration, disclosure, or destruction of your personal information.
                    </p>

                    <h5 className="font-medium text-sm mb-1">Data Processing</h5>
<div className="mt-4 space-y-4">
  <Button variant="destructive" onClick={() => deleteTransactions()}>
    Delete Transaction History
  </Button>
  <Button variant="destructive" onClick={() => deleteGoals()}>
    Delete Goals
  </Button>
  <Button variant="destructive" onClick={() => deleteInsights()}>
    Delete AI Insights
  </Button>
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button variant="destructive">Delete Account</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
        <AlertDialogDescription>
          This action cannot be undone. This will permanently delete your account
          and remove your data from our servers.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction onClick={() => deleteAccount()}>
          Delete Account
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</div>
                    <p className="text-sm mb-2">
                      We use AI technologies to analyze your financial data solely for the purpose of providing 
                      insights, recommendations, and reports to you. This processing is performed securely
                      and in compliance with applicable regulations.
                    </p>

                    <h5 className="font-medium text-sm mb-1">Third-Party Services</h5>
                    <p className="text-sm mb-2">
                      We use certain third-party services like Groq AI for data processing and SendGrid for email
                      communication. These providers have strict data protection policies and do not store your financial data.
                    </p>

                    <h5 className="font-medium text-sm mb-1">Regulatory Compliance</h5>
                    <p className="text-sm mb-2">
                      Our financial data handling practices comply with relevant financial regulations and data protection laws.
                      We are committed to maintaining the highest standards of security and privacy.
                    </p>

                    <h5 className="font-medium text-sm mb-1">Your Rights</h5>
                    <p className="text-sm">
                      You have the right to access, modify, and delete your personal data at any time using the tools provided
                      in this settings panel. If you have questions or concerns about our data practices, please contact our support team.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Accessibility Settings</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Text Size</Label>
              <p className="text-sm text-muted-foreground">Adjust the size of text throughout the app</p>
            </div>
            <Select onValueChange={(value) => updateAccessibilitySettings({ textSize: value })}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Normal" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Small</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="large">Large</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>High Contrast</Label>
              <p className="text-sm text-muted-foreground">Increase contrast for better visibility</p>
            </div>
            <Switch />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Reduce Motion</Label>
              <p className="text-sm text-muted-foreground">Minimize animations and transitions</p>
            </div>
            <Switch />
          </div>
        </div>
      </div>
