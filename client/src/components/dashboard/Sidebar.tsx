import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Home,
  BarChart3,
  List,
  Clock,
  Settings,
  PlusCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

type BankAccount = {
  id: number;
  name: string;
  shortCode: string;
  color: string;
};

type SidebarProps = {
  collapsed?: boolean;
};

export default function Sidebar({ collapsed = false }: SidebarProps) {
  const [location] = useLocation();

  const { data: bankAccounts = [] } = useQuery<BankAccount[]>({
    queryKey: ['/api/bank-accounts'],
  });

  const navItems = [
    {
      label: "Dashboard",
      icon: <Home className={cn("h-6 w-6", collapsed ? "" : "mr-3")} />,
      href: "/dashboard",
    },
    {
      label: "Transactions",
      icon: <List className={cn("h-6 w-6", collapsed ? "" : "mr-3")} />,
      href: "/transactions",
    },
    {
      label: "Analytics",
      icon: <BarChart3 className={cn("h-6 w-6", collapsed ? "" : "mr-3")} />,
      href: "/analytics",
    },
    {
      label: "Goals",
      icon: <Clock className={cn("h-6 w-6", collapsed ? "" : "mr-3")} />,
      href: "/goals",
    },
    {
      label: "Settings",
      icon: <Settings className={cn("h-6 w-6", collapsed ? "" : "mr-3")} />,
      href: "/settings",
    },
    // Admin page intentionally removed from sidebar navigation
  ];

  if (collapsed) {
    return (
      <div className="bg-card dark:bg-card rounded-xl py-4 shadow-sm h-full">
        <nav className="flex flex-col items-center space-y-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center justify-center p-2 rounded-lg transition-colors w-10 h-10",
                location === item.href
                  ? "bg-primary-50 text-primary dark:bg-primary/10 dark:text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title={item.label}
            >
              {item.icon}
            </Link>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <div className="bg-card dark:bg-card rounded-xl p-4 shadow-sm h-full w-64">
      <nav className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
              location === item.href
                ? "bg-primary-50 text-primary dark:bg-primary/10 dark:text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
      
      <div className="mt-8">
        <h3 className="px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Connected Banks
        </h3>
        <div className="mt-2 space-y-2">
          {bankAccounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-muted-foreground hover:bg-muted"
            >
              <div
                className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold mr-3"
                style={{ backgroundColor: account.color }}
              >
                {account.shortCode}
              </div>
              {account.name}
            </div>
          ))}
          <button className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-primary hover:bg-muted w-full">
            <PlusCircle className="mr-3 h-6 w-6" />
            Add Bank
          </button>
        </div>
      </div>
    </div>
  );
}
