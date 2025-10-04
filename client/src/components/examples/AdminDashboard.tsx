import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "../AppSidebar";
import AdminDashboard from "../../pages/AdminDashboard";
import { ThemeProvider } from "../ThemeProvider";
import { ThemeToggle } from "../ThemeToggle";

export default function AdminDashboardExample() {
  const style = {
    "--sidebar-width": "16rem",
  };

  return (
    <ThemeProvider>
      <SidebarProvider style={style as React.CSSProperties}>
        <div className="flex h-screen w-full">
          <AppSidebar />
          <div className="flex flex-col flex-1">
            <header className="flex items-center justify-between p-2 border-b">
              <SidebarTrigger />
              <ThemeToggle />
            </header>
            <main className="flex-1 overflow-hidden">
              <AdminDashboard />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </ThemeProvider>
  );
}
