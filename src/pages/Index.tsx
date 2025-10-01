import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, MessageSquare, Users, ArrowRight } from "lucide-react";
import DocumentLayout from "@/components/DocumentLayout";

const Index = () => {
  const navigate = useNavigate();

  const { data: pages } = useQuery({
    queryKey: ["pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .order("order_index")
        .limit(1);
      if (error) throw error;
      return data;
    },
  });

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const handleGetStarted = () => {
    if (pages && pages.length > 0) {
      navigate(`/document/${pages[0].slug}`);
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
            {!session && (
              <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
                Sign In to Comment
              </Button>
            )}
          </div>
        </section>

        {/* Features */}
        <section className="grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <FileText className="h-8 w-8 text-primary mb-2" />
              <CardTitle>In-Depth Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Comprehensive strategic insights on IT development, broken down into digestible sections
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <MessageSquare className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Paragraph Comments</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Engage with specific sections through targeted comments and discussions
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Community Feedback</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Vote on comments and participate in meaningful dialogue about the strategy
              </CardDescription>
            </CardContent>
          </Card>
        </section>

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
              {session ? "You're signed in and ready to participate!" : "Sign in to join the discussion and share your insights."}
            </p>
          </div>
        </section>
      </div>
    </DocumentLayout>
  );
};

export default Index;
