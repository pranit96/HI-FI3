import { Switch, Route } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Dashboard from "@/pages/Dashboard";
import Transactions from "@/pages/Transactions";
import Analytics from "@/pages/Analytics";
import Goals from "@/pages/Goals";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import NotFound from "@/pages/not-found";
import { useState, useEffect } from "react";
import OnboardingForm from "@/components/onboarding/OnboardingForm";

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

  // Check if user is authenticated
  const { data: user, isLoading, isError } = useQuery<User | null>({
    queryKey: ['/api/auth/me'],
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    // If user has monthly salary set, consider onboarding complete
    if (user && user.monthlySalary) {
      setOnboardingComplete(true);
    }
  }, [user]);

  // Handle onboarding completion
  const handleOnboardingComplete = () => {
    setOnboardingComplete(true);
  };

  // If user is authenticated but onboarding is not complete, show onboarding form
  if (user && !onboardingComplete) {
    return <OnboardingForm userId={user.id} onComplete={handleOnboardingComplete} />;
  }

  return (
    <Switch>
      <Route path="/" component={user ? Dashboard : Login} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/dashboard">
        {user ? <Dashboard /> : <Login />}
      </Route>
      <Route path="/transactions">
        {user ? <Transactions /> : <Login />}
      </Route>
      <Route path="/analytics">
        {user ? <Analytics /> : <Login />}
      </Route>
      <Route path="/goals">
        {user ? <Goals /> : <Login />}
      </Route>
      <Route path="/settings">
        {user ? <Settings /> : <Login />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

export default App;
