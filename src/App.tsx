import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import { Loader2 } from "lucide-react";
import Analytics from "@/components/Analytics";
import CookieConsent from "@/components/CookieConsent";

// Route-level code splitting: each page ships in its own chunk
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const EmailVerified = lazy(() => import("./pages/EmailVerified"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const DocumentPage = lazy(() => import("./pages/DocumentPage"));
const ChapterPage = lazy(() => import("./pages/ChapterPage"));
const ChapterDetailPage = lazy(() => import("./pages/ChapterDetailPage"));
const AllChaptersView = lazy(() => import("./pages/AllChaptersView"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));
const Profile = lazy(() => import("./pages/Profile"));
const Notifications = lazy(() => import("./pages/Notifications"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex min-h-screen items-center justify-center">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <CookieConsent />
      <BrowserRouter>
        <Analytics />
        <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/verify-email" element={<EmailVerified />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/profile/:userId" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
          {/* Language-based routes */}
          <Route path="/:lang" element={<Index />} />
          <Route path="/:lang/notifications" element={<Notifications />} />
          <Route path="/:lang/chapters" element={<AllChaptersView />} />
          <Route path="/:lang/:chapterSlug/:pageSlug" element={<DocumentPage />} />
          <Route path="/:lang/:chapterSlug" element={<ChapterDetailPage />} />
          {/* Legacy routes for backwards compatibility */}
          <Route path="/:lang/chapter/:chapterIdOrSlug" element={<ChapterPage />} />
          <Route path="/:lang/:slug" element={<DocumentPage />} />
          <Route path="/chapter/:chapterIdOrSlug" element={<ChapterPage />} />
          <Route path="/document/:slug" element={<DocumentPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
