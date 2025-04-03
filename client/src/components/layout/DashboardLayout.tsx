import { useState, useEffect, ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Home, 
  BarChart2, 
  CreditCard, 
  Target, 
  Settings, 
  LogOut,
  Menu,
  X,
  Shield
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';

type User = {
  id: number;
  name: string;
  email: string;
  currency: string;
  monthlySalary: number | null;
  createdAt: string;
};

type NavigationItem = {
  name: string;
  path: string;
  icon: JSX.Element;
};

type DashboardLayoutProps = {
  children: ReactNode;
};

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [location, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const queryClient = useQueryClient();
  
  // Get user data from query cache
  const { data: user } = useQuery<User | null>({
    queryKey: ['/api/auth/me'],
    retry: false,
    refetchOnWindowFocus: false,
  });

  // Handle sidebar navigation items
  const navigationItems: NavigationItem[] = [
    { name: 'Dashboard', path: '/dashboard', icon: <Home className="h-5 w-5" /> },
    { name: 'Transactions', path: '/transactions', icon: <CreditCard className="h-5 w-5" /> },
    { name: 'Analytics', path: '/analytics', icon: <BarChart2 className="h-5 w-5" /> },
    { name: 'Goals', path: '/goals', icon: <Target className="h-5 w-5" /> },
    { name: 'Settings', path: '/settings', icon: <Settings className="h-5 w-5" /> },
    { name: 'Admin', path: '/admin', icon: <Shield className="h-5 w-5" /> },
  ];
  
  // Handle logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      // Clear query cache and redirect to login
      queryClient.clear();
      setLocation('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user?.name) return 'U';
    
    const nameParts = user.name.split(' ');
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();
    
    return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
  };
  
  // Close mobile menu on location change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location]);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 p-6 border-r border-border bg-card-bg">
        <div className="flex items-center mb-10">
          <h1 className="text-2xl font-bold">Fin<span className="text-primary">vue</span></h1>
        </div>
        
        <nav className="flex-1 space-y-1">
          {navigationItems.map((item) => (
            <Link
              key={item.path}
              href={item.path}
              className={cn(
                "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 group interactive-hover",
                location === item.path
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
              )}
            >
              <span className="mr-3">{item.icon}</span>
              {item.name}
              
              {location === item.path && (
                <span className="ml-auto w-1 h-5 rounded-full bg-primary" />
              )}
            </Link>
          ))}
        </nav>
        
        {user && (
          <div className="mt-auto pt-6 border-t border-border">
            <div className="flex items-center mb-4 px-4">
              <Avatar className="h-10 w-10 border border-border">
                <AvatarFallback className="bg-secondary text-foreground">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          </div>
        )}
      </aside>
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 flex items-center justify-between p-4 bg-card-bg border-b border-border z-50">
        <h1 className="text-xl font-bold">Fin<span className="text-primary">vue</span></h1>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="h-9 w-9"
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>
      
      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-background z-40 flex flex-col pt-16">
          <nav className="flex-1 p-4 space-y-1">
            {navigationItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200",
                  location === item.path
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
                )}
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>
          
          {user && (
            <div className="p-4 mt-auto border-t border-border">
              <div className="flex items-center mb-4">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarFallback className="bg-secondary text-foreground">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <p className="text-sm font-medium">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              
              <Button
                variant="outline"
                className="w-full flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4" />
                <span>Logout</span>
              </Button>
            </div>
          )}
        </div>
      )}
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden md:py-0 pt-16">
        <div className="flex-1 overflow-auto p-6 fade-up">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;