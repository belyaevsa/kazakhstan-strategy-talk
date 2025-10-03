import { ReactNode, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, LogOut, User, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface DocumentLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  comments?: ReactNode;
}

const DocumentLayout = ({ children, sidebar, comments }: DocumentLayoutProps) => {
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();
      return data;
    },
    enabled: !!session?.user?.id,
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold text-lg hover:text-primary transition-colors">
            <FileText className="h-6 w-6" />
            <span>IT Development Strategy</span>
          </Link>
          
          <div className="flex items-center gap-3">
            {session ? (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{profile?.username}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </>
            ) : (
              <Button variant="default" size="sm" onClick={() => navigate("/auth")}>
                Sign In
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-8 overflow-x-hidden">
        <div className="relative">
          <div className="flex gap-6">
            {/* Left Sidebar - Document Structure */}
            {sidebar && (
              <>
                <aside 
                  className={cn(
                    "hidden md:block transition-all duration-300 ease-in-out shrink-0 overflow-hidden",
                    isSidebarCollapsed ? "w-0" : "w-[250px] xl:w-[280px]"
                  )}
                >
                  <div className={cn(
                    "sticky top-24 space-y-4 transition-opacity duration-200 w-[250px] xl:w-[280px]",
                    isSidebarCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
                  )}>
                    {sidebar}
                  </div>
                </aside>
                
                {/* Toggle Button */}
                <Button
                  variant="outline"
                  size="icon"
                  className={cn(
                    "hidden md:flex fixed top-24 z-50 transition-all duration-300 bg-card shadow-md hover:shadow-lg",
                    isSidebarCollapsed ? "left-4" : "left-[270px] xl:left-[300px]"
                  )}
                  onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                >
                  {isSidebarCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </Button>
              </>
            )}

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              {children}
            </main>

            {/* Right Sidebar - Comments */}
            {comments && (
              <aside className="hidden xl:block w-[320px] shrink-0">
                <div className="sticky top-24">
                  {comments}
                </div>
              </aside>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentLayout;
