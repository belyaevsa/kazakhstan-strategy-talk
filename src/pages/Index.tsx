import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { chapterService } from "@/services/chapterService";
import { authService } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, MessageSquare, Users, ArrowRight, BookOpen } from "lucide-react";
import DocumentLayout from "@/components/DocumentLayout";

const Index = () => {
  const navigate = useNavigate();
  const isAuthenticated = authService.isAuthenticated();
  const isEditor = authService.isEditor();

  const { data: chapters } = useQuery({
    queryKey: ["chapters", isEditor],
    queryFn: async () => {
      return chapterService.getAll(isEditor);
    },
  });

  const handleGetStarted = () => {
    if (chapters && chapters.length > 0 && chapters[0].pages.length > 0) {
      navigate(`/document/${chapters[0].pages[0].slug}`);
    }
  };

  return (
    <DocumentLayout>
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <section className="text-center py-12 mb-12">
          <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-6">
            <FileText className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 leading-tight">
            Open Letter on IT Development Strategy
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            A comprehensive analytical document exploring the future of information technology development in Kazakhstan
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={handleGetStarted}>
              Start Reading
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            {!isAuthenticated && (
              <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
                Sign In to Comment
              </Button>
            )}
          </div>
        </section>

        {/* Chapters Section */}
        {chapters && chapters.length > 0 && (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-center">Document Chapters</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {chapters.map((chapter) => (
                <Card key={chapter.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => {
                  if (chapter.pages.length > 0) {
                    navigate(`/document/${chapter.pages[0].slug}`);
                  }
                }}>
                  <CardHeader>
                    <BookOpen className="h-8 w-8 text-primary mb-2" />
                    <CardTitle className="flex items-center justify-between">
                      <span>{chapter.title}</span>
                      {chapter.isDraft && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded font-normal">
                          Draft
                        </span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-3">
                      {chapter.description || "Explore this chapter of the strategy document"}
                    </CardDescription>
                    {chapter.pages.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        <FileText className="h-4 w-4 inline mr-1" />
                        {chapter.pages.length} {chapter.pages.length === 1 ? 'page' : 'pages'}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* About Section */}
        <section className="bg-card rounded-lg shadow-sm border p-8">
          <h2 className="text-2xl font-bold mb-4">About This Document</h2>
          <div className="document-content space-y-4">
            <p>
              This open letter presents a detailed analysis of IT development strategy in Kazakhstan.
              The document is designed to foster discussion and collaboration among stakeholders,
              experts, and interested parties.
            </p>
            <p>
              Each paragraph is open for commentary, allowing readers to provide targeted feedback,
              share expertise, and engage in constructive dialogue. Your participation helps refine
              and strengthen the strategic vision outlined in this document.
            </p>
            <p className="font-semibold text-primary">
              {isAuthenticated ? "You're signed in and ready to participate!" : "Sign in to join the discussion and share your insights."}
            </p>
          </div>
        </section>
      </div>
    </DocumentLayout>
  );
};

export default Index;
