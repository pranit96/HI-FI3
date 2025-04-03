import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate, getColorForCategory } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  category: string | null;
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

export default function TransactionsList() {
  // Get current user for currency
  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/me'],
  });

  // Get transactions
  const { data: transactions = [], isLoading: transactionsLoading } = useQuery<Transaction[]>({
    queryKey: ['/api/transactions'],
  });

  // Get bank accounts
  const { data: bankAccounts = [], isLoading: accountsLoading } = useQuery<BankAccount[]>({
    queryKey: ['/api/bank-accounts'],
  });

  // Get bank account name by ID
  const getBankAccountName = (bankAccountId: number): string => {
    const account = bankAccounts.find(acc => acc.id === bankAccountId);
    return account ? account.name : "Unknown";
  };

  // Loading state
  if (transactionsLoading || accountsLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium">Recent Transactions</CardTitle>
          <Skeleton className="h-10 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (transactions.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <p className="text-muted-foreground">
              No transactions found. Upload a bank statement to see your transactions.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort transactions by date (most recent first)
  const sortedTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5); // Only show the 5 most recent transactions

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-medium">Recent Transactions</CardTitle>
        <Link href="/transactions">
          <Button variant="ghost">View All</Button>
        </Link>
      </CardHeader>
      <CardContent>
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
              {sortedTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>{formatDate(transaction.date)}</TableCell>
                  <TableCell>
                    {transaction.description.length > 30 
                      ? transaction.description.substring(0, 30) + '...' 
                      : transaction.description}
                  </TableCell>
                  <TableCell>
                    <span 
                      className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full"
                      style={{
                        backgroundColor: `${getColorForCategory(transaction.category || 'Other')}20`,
                        color: getColorForCategory(transaction.category || 'Other'),
                      }}
                    >
                      {transaction.category || "Uncategorized"}
                    </span>
                  </TableCell>
                  <TableCell>{getBankAccountName(transaction.bankAccountId)}</TableCell>
                  <TableCell 
                    className={`text-right ${
                      transaction.type === 'credit' 
                        ? 'text-green-600 dark:text-green-400' 
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {transaction.type === 'credit' ? '+' : '-'}
                    {formatCurrency(Math.abs(transaction.amount), user?.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
