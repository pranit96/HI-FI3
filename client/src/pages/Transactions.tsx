import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Header from "@/components/dashboard/Header";
import Sidebar from "@/components/dashboard/Sidebar";
import Footer from "@/components/dashboard/Footer";
import { Redirect } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { queryClient, apiRequest } from "@/lib/queryClient";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { 
  Calendar as CalendarIcon, 
  Filter, 
  Search, 
  Upload, 
  FileText, 
  Loader2,
  PlusCircle,
  Save,
  TrendingUp,
  Coins,
  X
} from "lucide-react";
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
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth-simple";

type Transaction = {
  id: number;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: string;
  bankAccountId: number;
};

type BankAccount = {
  id: number;
  name: string;
  shortCode: string;
  color: string;
};

type Category = {
  id: number;
  name: string;
};

function MonthlySalaryInput() {
  const { toast } = useToast();
  const { data: user } = useQuery({ queryKey: ['/api/auth/me'] });
  const [salary, setSalary] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  
  useEffect(() => {
    if (user?.monthlySalary) {
      setSalary(user.monthlySalary.toString());
    }
  }, [user?.monthlySalary]);
  
  const updateMutation = useMutation({
    mutationFn: async (data: { monthlySalary: number }) => {
      const response = await apiRequest('PATCH', '/api/users/me', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/analytics/income-vs-expenses'] });
      toast({
        title: "Salary updated",
        description: "Your monthly salary has been updated successfully",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update salary: " + (error as Error).message,
        variant: "destructive",
      });
    }
  });
  
const handleSave = () => {
  const salaryValue = parseFloat(salary);
  if (isNaN(salaryValue)) {  // Added missing parenthesis
    toast({
      title: "Invalid amount",
      description: "Please enter a valid number",
      variant: "destructive",
    });
    return;
  }
  
  if (salaryValue < 0) {
    toast({
      title: "Invalid amount",
      description: "Salary cannot be negative",
      variant: "destructive",
    });
    return;
  }
  
  updateMutation.mutate({ monthlySalary: salaryValue });
};

  
  return (
    <div className="p-4 rounded-lg border">
      <h3 className="text-sm font-semibold mb-2">Monthly Income</h3>
      {isEditing ? (
        <div className="space-y-2">
          <div className="flex">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-muted-foreground">
                {user?.currency || '₹'}
              </span>
              <Input
                type="number"
                className="pl-8"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <Button
              className="ml-2"
              size="sm"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => {
              setSalary(user?.monthlySalary?.toString() || '');
              setIsEditing(false);
            }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold">
              {formatCurrency(user?.monthlySalary || 0, user?.currency)}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Your monthly salary is used to calculate savings rate
          </p>
        </div>
      )}
    </div>
  );
}

function SavingsGoalInput() {
  const { toast } = useToast();
  const [savingsGoal, setSavingsGoal] = useState<string>('');
  const [isEditing, setIsEditing] = useState(false);
  
  const { data: user } = useQuery({ queryKey: ['/api/auth/me'] });
  const { data: settings } = useQuery({
    queryKey: ['/api/settings/savings-goal'],
    onSuccess: (data) => {
      if (data?.savingsGoal) {
        setSavingsGoal(data.savingsGoal.toString());
      }
    }
  });
  
  const updateMutation = useMutation({
    mutationFn: async (data: { savingsGoal: number }) => {
      const response = await apiRequest('PATCH', '/api/settings/savings-goal', data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/settings/savings-goal'] });
      toast({
        title: "Savings goal updated",
        description: "Your monthly savings goal has been updated",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update savings goal: " + (error as Error).message,
        variant: "destructive",
      });
    }
  });
  
const handleSave = () => {
  const goalValue = parseFloat(savingsGoal);
  if (isNaN(goalValue)) {  // Fixed syntax
    toast({
      title: "Invalid amount",
      description: "Please enter a valid number",
      variant: "destructive",
    });
    return;
  }
  
  if (goalValue < 0) {
    toast({
      title: "Invalid amount",
      description: "Savings goal cannot be negative",
      variant: "destructive",
    });
    return;
  }
  
  updateMutation.mutate({ savingsGoal: goalValue });
};
  
  return (
    <div className="p-4 rounded-lg border">
      <h3 className="text-sm font-semibold mb-2">Monthly Savings Goal</h3>
      {isEditing ? (
        <div className="space-y-2">
          <div className="flex">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-muted-foreground">
                {user?.currency || '₹'}
              </span>
              <Input
                type="number"
                className="pl-8"
                value={savingsGoal}
                onChange={(e) => setSavingsGoal(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
              />
            </div>
            <Button
              className="ml-2"
              size="sm"
              onClick={handleSave}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => {
              setSavingsGoal(settings?.savingsGoal?.toString() || '');
              setIsEditing(false);
            }}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <div>
          <div className="flex items-baseline justify-between">
            <p className="text-2xl font-bold">
              {formatCurrency(settings?.savingsGoal || 0, user?.currency)}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Set a target for your monthly savings
          </p>
        </div>
      )}
    </div>
  );
}

function SavingsTracker() {
  const { data: user } = useQuery({ queryKey: ['/api/auth/me'] });
  const { data: settings } = useQuery({ queryKey: ['/api/settings/savings-goal'] });
  const { data: monthlyData } = useQuery({ queryKey: ['/api/analytics/income-vs-expenses'] });
  
  const actualSavings = (monthlyData?.income || 0) - (monthlyData?.expenses || 0);
  const savingsGoal = settings?.savingsGoal || 0;
  
  let progressPercentage = 0;
  if (savingsGoal > 0 && actualSavings > 0) {
    progressPercentage = Math.min(Math.round((actualSavings / savingsGoal) * 100), 100);
  }
  
  return (
    <div className="p-4 rounded-lg border">
      <h3 className="text-sm font-semibold mb-2">Current Savings Progress</h3>
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span>
            {formatCurrency(actualSavings, user?.currency)}
          </span>
          <span>
            {formatCurrency(savingsGoal, user?.currency)}
          </span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>
      <div className="flex justify-between items-baseline">
        <p className="text-xl font-semibold">
          {progressPercentage}%
        </p>
        <p className="text-xs text-muted-foreground">
          of monthly goal
        </p>
      </div>
    </div>
  );
}

function UploadBankStatementForm() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).slice(0, 5); // Limit to 5 files
      setSelectedFiles(files);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);
  };

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const token = await getAccessToken(); // Get the current auth token
      const response = await fetch('/api/bank-statements/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'x-upload-type': 'multiple',
          'Authorization': `Bearer ${token}`, // Add authorization header
        },
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload statements');
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
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
        queryClient.invalidateQueries({ queryKey: ['/api/bank-statements'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/income-vs-expenses'] });
        queryClient.invalidateQueries({ queryKey: ['/api/analytics/expenses-by-category'] });
        toast({
          title: "Statements processed",
          description: "Your bank statements have been uploaded and transactions imported.",
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
    }
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select PDF bank statements to upload",
        variant: "destructive",
      });
      return;
    }
    
    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('statements', file);
    });
    
    uploadMutation.mutate(formData);
  };
  
  return (
    <div className="p-4 rounded-lg border">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium block">
            Upload Bank Statements (PDF)
          </label>
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg px-6 py-8 text-center hover:border-primary/50 transition-colors">
            <div className="flex flex-col items-center space-y-2">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">
                {selectedFiles.length > 0 
                  ? `${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''} selected` 
                  : "Drag & drop your PDFs here"}
              </p>
              <p className="text-xs text-muted-foreground">
                Supported format: PDF (up to 5 files)
              </p>
              <input 
                ref={fileInputRef}
                type="file" 
                accept=".pdf" 
                onChange={handleFileChange}
                className="hidden" 
                id="bank-statement-upload"
                multiple
              />
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                Choose Files
              </Button>
            </div>
          </div>
        </div>

        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Selected files:</h4>
            <ul className="space-y-2">
              {selectedFiles.map((file, index) => (
                <li key={index} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm truncate max-w-xs">{file.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => removeFile(index)}
                    disabled={uploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}
        
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
                disabled={selectedFiles.length === 0 || uploading}
              >
                Cancel
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancel Upload?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to cancel uploading these statements?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Continue Upload</AlertDialogCancel>
                <AlertDialogAction onClick={() => {
                  setSelectedFiles([]);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                }}>
                  Cancel Upload
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          
          <Button 
            type="submit" 
            disabled={selectedFiles.length === 0 || uploading}
          >
            {uploadMutation.isPending || uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : "Upload & Process"}
          </Button>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Your PDFs will be securely processed and then permanently deleted to protect your privacy.
        </p>
      </form>
    </div>
  );
}

export default function Transactions() {
  const { toast } = useToast();
  const [categoryFilter, setCategoryFilter] = useState<string>("all-categories");
  const [accountFilter, setAccountFilter] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all-types");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  const { data: user, isLoading: userLoading, isError: userError } = useQuery({
    queryKey: ['/api/auth/me'],
  });

  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
    enabled: !!user,
  });

  const { data: bankAccounts = [], isLoading: accountsLoading } = useQuery<BankAccount[]>({
    queryKey: ['/api/bank-accounts'],
    enabled: !!user,
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
  });

  if (userError) {
    toast({
      title: "Authentication required",
      description: "Please log in to access your transactions.",
      variant: "destructive",
    });
    return <Redirect to="/login" />;
  }

  const filteredTransactions = transactions.filter(transaction => {
    if (categoryFilter !== "all-categories" && transaction.category !== categoryFilter) {
      return false;
    }
    
    if (accountFilter !== null && transaction.bankAccountId !== accountFilter) {
      return false;
    }
    
    if (typeFilter !== "all-types" && transaction.type !== typeFilter) {
      return false;
    }
    
    if (searchTerm && !transaction.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    const transactionDate = new Date(transaction.date);
    if (startDate && transactionDate < startDate) {
      return false;
    }
    
    if (endDate && transactionDate > endDate) {
      return false;
    }
    
    return true;
  });

  const getBankName = (bankAccountId: number) => {
    const account = bankAccounts.find(acc => acc.id === bankAccountId);
    return account ? account.name : "Unknown";
  };

  if (userLoading || transactionsLoading || accountsLoading || categoriesLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-foreground">Loading transactions...</p>
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
          {/* Monthly Salary and Savings Input Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-primary" />
                <span>Monthly Income & Savings</span>
              </CardTitle>
              <CardDescription>Track your monthly salary and set savings goals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MonthlySalaryInput />
                <SavingsGoalInput />
                <SavingsTracker />
              </div>
            </CardContent>
          </Card>
          
          {/* PDF Upload Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span>Statement Upload</span>
              </CardTitle>
              <CardDescription>Upload bank statements to automatically import transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <UploadBankStatementForm />
                <div className="bg-muted/50 p-4 rounded-lg border border-border">
                  <h3 className="text-sm font-medium mb-2">Benefits of Statement Upload</h3>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <div className="rounded-full bg-green-500/20 p-1">
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      </div>
                      Automatic transaction categorization
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="rounded-full bg-green-500/20 p-1">
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      </div>
                      Personalized spending insights
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="rounded-full bg-green-500/20 p-1">
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      </div>
                      Accurate financial forecasting
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="rounded-full bg-green-500/20 p-1">
                        <TrendingUp className="h-3 w-3 text-green-500" />
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
          
          {/* Transactions List Card */}
          <Card>
            <CardHeader>
              <CardTitle>Transactions</CardTitle>
              <CardDescription>View and manage all your financial transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-col lg:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by description..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="flex items-center gap-2">
                        <CalendarIcon className="h-4 w-4" />
                        <span>Date Range</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="end">
                      <Calendar
                        mode="range"
                        selected={{
                          from: startDate,
                          to: endDate,
                        }}
                        onSelect={(range) => {
                          setStartDate(range?.from);
                          setEndDate(range?.to);
                        }}
                        initialFocus
                      />
                      <div className="p-3 border-t flex justify-between">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setStartDate(undefined);
                            setEndDate(undefined);
                          }}
                        >
                          Clear
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => {}}
                        >
                          Apply
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>

                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-categories">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.name}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select 
                    value={accountFilter?.toString() || "all-accounts"} 
                    onValueChange={(val) => setAccountFilter(val === "all-accounts" ? null : parseInt(val))}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Bank Account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-accounts">All Accounts</SelectItem>
                      {bankAccounts.map((account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Transaction Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-types">All Types</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                      <SelectItem value="debit">Debit</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={() => {
                      setSearchTerm("");
                      setCategoryFilter("all-categories");
                      setAccountFilter(null);
                      setTypeFilter("all-types");
                      setStartDate(undefined);
                      setEndDate(undefined);
                    }}
                  >
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          No transactions found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{formatDate(transaction.date)}</TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400">
                              {transaction.category || "Uncategorized"}
                            </span>
                          </TableCell>
                          <TableCell>{getBankName(transaction.bankAccountId)}</TableCell>
                          <TableCell className={`text-right ${transaction.type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {transaction.type === 'credit' ? '+' : '-'}
                            {formatCurrency(Math.abs(transaction.amount), user?.currency)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <Footer />
    </div>
  );
}
