import { ReactNode } from 'react';
import Header from "@/components/dashboard/Header";
import Sidebar from "@/components/dashboard/Sidebar";
import Footer from "@/components/dashboard/Footer";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen flex flex-col">
      <Header />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-grow">
        <div className="lg:col-span-3 xl:col-span-2">
          <Sidebar />
        </div>

        <div className="lg:col-span-9 xl:col-span-10 space-y-6">
          {children}
        </div>
      </div>

      <Footer />
    </div>
  );
}