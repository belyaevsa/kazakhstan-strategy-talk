import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import DocumentLayout from "@/components/DocumentLayout";
import DocumentStructure from "@/components/DocumentStructure";
import ParagraphWithComments from "@/components/ParagraphWithComments";
import CommentPanel from "@/components/CommentPanel";
import { Skeleton } from "@/components/ui/skeleton";

const DocumentPage = () => {
  const { slug } = useParams();
  const [activeParagraphId, setActiveParagraphId] = useState<string | null>(null);

  const { data: pages, isLoading: pagesLoading } = useQuery({
    queryKey: ["pages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .order("order_index");
      if (error) throw error;
      return data;
    },
  });

  const { data: currentPage, isLoading: pageLoading } = useQuery({
    queryKey: ["page", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .eq("slug", slug)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: paragraphs, isLoading: paragraphsLoading } = useQuery({
    queryKey: ["paragraphs", currentPage?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paragraphs")
        .select("*")
        .eq("page_id", currentPage!.id)
        .order("order_index");
      if (error) throw error;
      return data;
    },
    enabled: !!currentPage?.id,
  });

  if (pagesLoading || pageLoading || paragraphsLoading) {
    return (
      <DocumentLayout>
        <div className="space-y-4">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </DocumentLayout>
    );
  }

  if (!currentPage) {
    return (
      <DocumentLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Page not found</h2>
          <p className="text-muted-foreground">The requested document page could not be found.</p>
        </div>
      </DocumentLayout>
    );
  }

  return (
    <DocumentLayout
      sidebar={pages && <DocumentStructure pages={pages} />}
      comments={
        <CommentPanel
          paragraphId={activeParagraphId || undefined}
          pageId={!activeParagraphId ? currentPage.id : undefined}
          mode={activeParagraphId ? "paragraph" : "page"}
        />
      }
    >
      <article className="bg-card rounded-lg shadow-sm border p-8 lg:p-12">
        <header className="mb-8 pb-6 border-b">
          <h1 className="text-3xl lg:text-4xl font-bold mb-3">{currentPage.title}</h1>
          {currentPage.description && (
            <p className="text-lg text-muted-foreground">{currentPage.description}</p>
          )}
        </header>

        <div className="space-y-2">
          {paragraphs && paragraphs.length > 0 ? (
            paragraphs.map((paragraph) => (
              <ParagraphWithComments
                key={paragraph.id}
                paragraph={paragraph}
                isActive={activeParagraphId === paragraph.id}
                onClick={() =>
                  setActiveParagraphId(
                    activeParagraphId === paragraph.id ? null : paragraph.id
                  )
                }
              />
            ))
          ) : (
            <p className="text-muted-foreground italic">
              No content available for this page yet.
            </p>
          )}
        </div>

        {/* General Discussion Section */}
        <div className="mt-12 pt-8 border-t xl:hidden">
          <h2 className="text-xl font-semibold mb-4">General Discussion</h2>
          <CommentPanel pageId={currentPage.id} mode="page" />
        </div>
      </article>
    </DocumentLayout>
  );
};

export default DocumentPage;
