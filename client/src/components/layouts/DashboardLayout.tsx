import { ReactNode, useState } from 'react';
import Header from "@/components/dashboard/Header";
import Sidebar from "@/components/dashboard/Sidebar";
import Footer from "@/components/dashboard/Footer";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen flex flex-col">
      <Header />

      <div className="flex flex-grow relative">
        {/* Sidebar Container with transition */}
        <div 
          className={cn(
            "transition-all duration-300 ease-in-out fixed lg:relative z-20 h-[calc(100vh-8rem)]",
            sidebarCollapsed ? "w-0 -translate-x-full lg:w-14 lg:translate-x-0" : "w-64"
          )}
        >
          <div className="h-full overflow-y-auto bg-card dark:bg-card rounded-xl shadow-sm">
            <Sidebar collapsed={sidebarCollapsed} />
          </div>
        </div>

        {/* Toggle Button */}
        <Button
          variant="outline"
          size="icon"
          className="absolute left-0 top-0 lg:left-64 z-30 rounded-l-none shadow-md hover:bg-primary/10"
          onClick={toggleSidebar}
        >
          {sidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>

        {/* Main Content */}
        <div 
          className={cn(
            "transition-all duration-300 ease-in-out ml-0 lg:ml-4 flex-grow",
            sidebarCollapsed ? "lg:ml-20" : "lg:ml-72"
          )}
        >
          <div className="space-y-6 p-4">
            {children}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}