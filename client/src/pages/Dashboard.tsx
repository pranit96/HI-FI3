import { useQuery } from "@tanstack/react-query";
import Header from "@/components/dashboard/Header";
import Sidebar from "@/components/dashboard/Sidebar";
import FinancialOverview from "@/components/dashboard/FinancialOverview";
import SpendingChart from "@/components/dashboard/SpendingChart";
import AIInsights from "@/components/dashboard/AIInsights";
import CategoryChart from "@/components/dashboard/CategoryChart";
import GoalsList from "@/components/dashboard/GoalsList";
import TransactionsList from "@/components/dashboard/TransactionsList";
import Footer from "@/components/dashboard/Footer";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";

export default function Dashboard() {
  const { toast } = useToast();

  // Check if user is authenticated
  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['/api/auth/me'],
  });

  // If authentication failed, redirect to login
  if (isError) {
    toast({
      title: "Authentication required",
      description: "Please log in to access your dashboard.",
      variant: "destructive",
    });
    return <Redirect to="/login" />;
  }

  // If still loading, show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <svg className="animate-spin h-8 w-8 mx-auto text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-2 text-foreground">Loading your dashboard...</p>
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
          <FinancialOverview />

          <div className="grid grid-cols-1 lg:grid-cols-1 gap-4">
            <SpendingChart />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <AIInsights />
            </div>
            <div className="lg:col-span-1">
              <CategoryChart />
            </div>
          </div>

          <GoalsList />
          <TransactionsList />
        </div>
      </div>

      <Footer />
    </div>
  );
}
