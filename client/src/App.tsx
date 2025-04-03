import { Switch, Route } from "wouter";
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
import { useAuth } from "@/hooks/use-auth-simple";
import { ProtectedRoute } from "@/lib/ProtectedRoute";

function App() {
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(false);
  const [firstVisit, setFirstVisit] = useState<boolean>(true);
  const { user } = useAuth();

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
    return <IntroScreen handleComplete={handleIntroComplete} />;
  }

  // If user is authenticated but onboarding is not complete, show onboarding form
  if (user && !onboardingComplete) {
    return <OnboardingForm userId={user.id} onComplete={handleOnboardingComplete} />;
  }

  return (
    <>
      <Switch>
        {/* Public routes */}
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        
        {/* Protected routes */}
        <ProtectedRoute path="/">
          <Dashboard />
        </ProtectedRoute>
        <ProtectedRoute path="/dashboard">
          <Dashboard />
        </ProtectedRoute>
        <ProtectedRoute path="/transactions">
          <Transactions />
        </ProtectedRoute>
        <ProtectedRoute path="/analytics">
          <Analytics />
        </ProtectedRoute>
        <ProtectedRoute path="/goals">
          <Goals />
        </ProtectedRoute>
        <ProtectedRoute path="/settings">
          <Settings />
        </ProtectedRoute>
        {/* Admin route is accessible only directly via URL and doesn't use DashboardLayout */}
        <Route path="/admin" component={Admin} />
        
        {/* 404 route */}
        <Route component={NotFound} />
      </Switch>
      
      {/* Global Toast Notifications */}
      <Toaster />
    </>
  );
}

export default App;
