import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/dashboard/Header";
import Sidebar from "@/components/dashboard/Sidebar";
import Footer from "@/components/dashboard/Footer";
import { Redirect } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";

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
import { Calendar as CalendarIcon, Filter, Search } from "lucide-react";

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

export default function Transactions() {
  const { toast } = useToast();
  const [categoryFilter, setCategoryFilter] = useState<string>("all-categories");
  const [accountFilter, setAccountFilter] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all-types");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Check if user is authenticated
  const { data: user, isLoading: userLoading, isError: userError } = useQuery({
    queryKey: ['/api/auth/me'],
  });

  // Get transactions
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
    enabled: !!user,
  });

  // Get bank accounts
  const { data: bankAccounts = [], isLoading: accountsLoading } = useQuery<BankAccount[]>({
    queryKey: ['/api/bank-accounts'],
    enabled: !!user,
  });

  // Get categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['/api/categories'],
  });

  // If authentication failed, redirect to login
  if (userError) {
    toast({
      title: "Authentication required",
      description: "Please log in to access your transactions.",
      variant: "destructive",
    });
    return <Redirect to="/login" />;
  }

  // Apply filters to transactions
  const filteredTransactions = transactions.filter(transaction => {
    // Filter by category
    if (categoryFilter && categoryFilter !== "all-categories" && transaction.category !== categoryFilter) {
      return false;
    }
    
    // Filter by bank account
    if (accountFilter !== null && transaction.bankAccountId !== accountFilter) {
      return false;
    }
    
    // Filter by transaction type
    if (typeFilter && typeFilter !== "all-types" && transaction.type !== typeFilter) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm && !transaction.description.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filter by date range
    if (startDate && new Date(transaction.date) < startDate) {
      return false;
    }
    
    if (endDate && new Date(transaction.date) > endDate) {
      return false;
    }
    
    return true;
  });

  // Get bank account name by ID
  const getBankName = (bankAccountId: number) => {
    const account = bankAccounts.find(acc => acc.id === bankAccountId);
    return account ? account.name : "Unknown";
  };

  // Main loading state
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
