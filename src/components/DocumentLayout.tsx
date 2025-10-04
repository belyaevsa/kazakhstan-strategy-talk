import { ReactNode, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileText, LogOut, User, ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { authService } from "@/services/authService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import LanguageSelector from "@/components/LanguageSelector";
import { useTranslation } from "@/hooks/useTranslation";

interface DocumentLayoutProps {
  children: ReactNode;
  sidebar?: ReactNode;
  comments?: ReactNode;
}

const DocumentLayout = ({ children, sidebar, comments }: DocumentLayoutProps) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [userState, setUserState] = useState(authService.getUser());

  const isAuthenticated = authService.isAuthenticated();

  // Listen for localStorage changes to update user state
  useEffect(() => {
    const handleStorageChange = () => {
      setUserState(authService.getUser());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Periodically refresh user data from server to check for frozen status
  useEffect(() => {
    if (!isAuthenticated) return;

    const refreshUserData = async () => {
      await authService.getCurrentUser();
      setUserState(authService.getUser());
    };

    // Refresh immediately on mount
    refreshUserData();

    // Then refresh every 30 seconds
    const interval = setInterval(refreshUserData, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const user = userState;
  const isFrozen = user?.frozenUntil && new Date(user.frozenUntil) > new Date();
  const isEditorOrAdmin = user?.roles.includes("Editor") || user?.roles.includes("Admin");
  const isAdmin = user?.roles.includes("Admin");

  const handleLogout = () => {
    authService.logout();
    toast.success("Logged out successfully");
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold text-lg hover:text-primary transition-colors">
            <img src="/main-icon.webp" alt="IT Strategy" className="h-6 w-6" />
          <span>{t('app.title')}</span>
          </Link>

          <div className="flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {isFrozen && !isEditorOrAdmin && user?.frozenUntil && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-950/30 text-red-800 dark:text-red-200 rounded-md text-xs font-medium border border-red-200 dark:border-red-800">
                    <span>🔒 {t('comments.accountFrozen')} {new Date(user.frozenUntil).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">{user?.username}</span>
                </div>
                {isAdmin && (
                  <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
                    <Shield className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">{t('nav.admin')}</span>
                  </Button>
                )}
                <LanguageSelector />
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">{t('nav.logout')}</span>
                </Button>
              </>
            ) : (
              <>
                <LanguageSelector />
                <Button variant="default" size="sm" onClick={() => navigate("/auth")}>
                  {t('nav.signIn')}
                </Button>
              </>
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
                    "sticky top space-y-4 transition-opacity duration-200 w-[250px] xl:w-[280px]",
                    isSidebarCollapsed ? "opacity-0 pointer-events-none" : "opacity-100"
                  )}>
                    {sidebar}
                  </div>
                </aside>

                {/* Toggle Button */}
                <div className="hidden md:block">
                  <div className="sticky top -ml-5">
                    <Button
                      variant="outline"
                      size="icon"
                      className="bg-card shadow-md hover:shadow-lg"
                      onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    >
                      {isSidebarCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                      ) : (
                        <ChevronLeft className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              {children}
            </main>

            {/* Right Sidebar - Comments */}
            {comments && (
              <aside className="hidden xl:block w-[320px] shrink-0">
                <div className="sticky top">
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
