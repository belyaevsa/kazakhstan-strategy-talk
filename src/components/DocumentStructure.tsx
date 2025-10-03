import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FileText, ChevronRight, ChevronDown, BookOpen, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/authService";
import type { Chapter } from "@/lib/api/types";

interface DocumentStructureProps {
  chapters: Chapter[];
}

const DocumentStructure = ({ chapters }: DocumentStructureProps) => {
  const location = useLocation();
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({});
  const isEditor = authService.isEditor();

  const toggleChapter = (chapterId: string) => {
    setOpenChapters(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }));
  };

  // Filter chapters and pages based on user role
  const visibleChapters = isEditor
    ? chapters
    : chapters.filter(c => !c.isDraft);

  const getVisiblePages = (chapter: Chapter) => {
    return isEditor
      ? chapter.pages
      : chapter.pages.filter(p => !p.isDraft);
  };

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <BookOpen className="h-4 w-4" />
          Document Structure
        </h3>
      </div>
      <nav className="space-y-3">
        {visibleChapters.map((chapter) => {
          const visiblePages = getVisiblePages(chapter);
          if (!isEditor && visiblePages.length === 0) return null;

          return (
            <Collapsible
              key={chapter.id}
              open={openChapters[chapter.id] ?? true}
              onOpenChange={() => toggleChapter(chapter.id)}
            >
              <div className="flex items-center gap-1">
                <CollapsibleTrigger className="flex-1 group">
                  <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-left">
                    {openChapters[chapter.id] ?? true ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                    <span className="text-sm font-medium truncate">{chapter.title}</span>
                    {isEditor && chapter.isDraft && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded ml-auto">
                        Draft
                      </span>
                    )}
                  </div>
                </CollapsibleTrigger>
                {isEditor && (
                  <Link to={`/chapter/${chapter.id}`}>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      title="Manage chapter"
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                  </Link>
                )}
              </div>
              <CollapsibleContent>
                <div className="ml-4 mt-1 space-y-0.5">
                  {visiblePages.map((page) => {
                    const isActive = location.pathname === `/document/${page.slug}`;
                    return (
                      <Link
                        key={page.id}
                        to={`/document/${page.slug}`}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span className="flex-1 truncate">{page.title}</span>
                        {isEditor && page.isDraft && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded shrink-0">
                            Draft
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </nav>
    </div>
  );
};

export default DocumentStructure;
