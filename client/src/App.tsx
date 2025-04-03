import { Switch, Route } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Dashboard from "@/pages/Dashboard";
import Transactions from "@/pages/Transactions";
import Analytics from "@/pages/Analytics";
import Goals from "@/pages/Goals";
import Settings from "@/pages/Settings";
import Admin from "@/pages/Admin";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import NotFound from "@/pages/not-found";
import { useState, useEffect } from "react";
import OnboardingForm from "@/components/onboarding/OnboardingForm";
import IntroScreen from "@/components/intro/IntroScreen";
import { Toaster } from "@/components/ui/toaster";
import DashboardLayout from "@/components/layout/DashboardLayout";

type User = {
  id: number;
  name: string;
  email: string;
  currency: string;
  monthlySalary: number | null;
  createdAt: string;
};

function App() {
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(false);
  const [firstVisit, setFirstVisit] = useState<boolean>(true);

  // Check if user is authenticated
  const { data: user, isLoading, isError } = useQuery<User | null>({
    queryKey: ['/api/auth/me'],
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    // Check if this is the first visit
    const hasVisitedBefore = localStorage.getItem('hasVisitedBefore');
    if (hasVisitedBefore) {
      setFirstVisit(false);
    }

    // If user has monthly salary set, consider onboarding complete
    if (user && user.monthlySalary) {
      setOnboardingComplete(true);
    }
  }, [user]);

  // Handle intro screen completion
  const handleIntroComplete = () => {
    setFirstVisit(false);
    localStorage.setItem('hasVisitedBefore', 'true');
  };

  // Handle onboarding completion
  const handleOnboardingComplete = () => {
    setOnboardingComplete(true);
  };

  // Show intro screen on first visit
  if (firstVisit && !user) {
    return <IntroScreen />;
  }

  // If user is authenticated but onboarding is not complete, show onboarding form
  if (user && !onboardingComplete) {
    return <OnboardingForm userId={user.id} onComplete={handleOnboardingComplete} />;
  }

  return (
    <>
      <Switch>
        <Route path="/">
          {user ? (
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          ) : <Login />}
        </Route>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/dashboard">
          {user ? (
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          ) : <Login />}
        </Route>
        <Route path="/transactions">
          {user ? (
            <DashboardLayout>
              <Transactions />
            </DashboardLayout>
          ) : <Login />}
        </Route>
        <Route path="/analytics">
          {user ? (
            <DashboardLayout>
              <Analytics />
            </DashboardLayout>
          ) : <Login />}
        </Route>
        <Route path="/goals">
          {user ? (
            <DashboardLayout>
              <Goals />
            </DashboardLayout>
          ) : <Login />}
        </Route>
        <Route path="/settings">
          {user ? (
            <DashboardLayout>
              <Settings />
            </DashboardLayout>
          ) : <Login />}
        </Route>
        <Route path="/admin">
          {user ? (
            <DashboardLayout>
              <Admin />
            </DashboardLayout>
          ) : <Login />}
        </Route>
        <Route component={NotFound} />
      </Switch>
      
      {/* Global Toast Notifications */}
      <Toaster />
    </>
  );
}

export default App;
