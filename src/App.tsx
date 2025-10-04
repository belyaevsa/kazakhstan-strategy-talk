import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Analytics from "@/components/Analytics";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import DocumentPage from "./pages/DocumentPage";
import ChapterPage from "./pages/ChapterPage";
import AdminPanel from "./pages/AdminPanel";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Analytics />
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/admin" element={<AdminPanel />} />
          {/* Language-based routes */}
          <Route path="/:lang" element={<Index />} />
          <Route path="/:lang/chapter/:chapterId" element={<ChapterPage />} />
          {/* Exclude static assets - only match slugs without file extensions */}
          <Route
            path="/:lang/:slug"
            element={<DocumentPage />}
            loader={({ params }) => {
              // Don't match if slug has a file extension
              if (params.slug?.includes('.')) {
                throw new Response('Not Found', { status: 404 });
              }
              return null;
            }}
          />
          {/* Legacy routes for backwards compatibility */}
          <Route path="/chapter/:chapterId" element={<ChapterPage />} />
          <Route path="/document/:slug" element={<DocumentPage />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
