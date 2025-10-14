import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Analytics from "@/components/Analytics";
import CookieConsent from "@/components/CookieConsent";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import EmailVerified from "./pages/EmailVerified";
import DocumentPage from "./pages/DocumentPage";
import ChapterPage from "./pages/ChapterPage";
import ChapterDetailPage from "./pages/ChapterDetailPage";
import AllChaptersView from "./pages/AllChaptersView";
import AdminPanel from "./pages/AdminPanel";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <CookieConsent />
      <BrowserRouter>
        <Analytics />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/verify-email" element={<EmailVerified />} />
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
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
