import { useQuery } from "@tanstack/react-query";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";

type User = {
  id: number;
  name: string;
  email: string;
  currency: string;
  monthlySalary: number | null;
  createdAt: string;
};

export default function Header() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: user } = useQuery<User>({
    queryKey: ['/api/auth/me'],
  });

  const handleLogout = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout', {});
      
      // Clear all queries from cache
      queryClient.clear();
      
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
        variant: "default",
      });
      
      // Redirect to home page which will show login form
      setLocation('/');
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
      <div className="flex items-center mb-4 md:mb-0">
        <svg className="w-9 h-9 text-primary" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z" />
        </svg>
        <h1 className="text-2xl font-bold font-heading ml-2">Finvue</h1>
      </div>
      
      <div className="flex items-center">
        <Button variant="ghost" size="icon" className="mr-2" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </Button>
        
        <ThemeToggle />
        
        <div className="flex items-center ml-4">
          <Avatar className="h-8 w-8">
            <AvatarImage src={`https://api.dicebear.com/6.x/initials/svg?seed=${user?.name || 'User'}`} alt={user?.name || 'User'} />
            <AvatarFallback>{user?.name?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <div className="ml-2">
            <p className="text-sm font-medium">{user?.name || 'User'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
