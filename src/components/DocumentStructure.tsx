import { useState } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import { FileText, ChevronRight, ChevronDown, BookOpen, Settings, Plus } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/authService";
import { t, getCurrentLanguage } from "@/lib/i18n";
import type { Chapter } from "@/lib/api/types";

interface DocumentStructureProps {
  chapters: Chapter[];
  onAddChapter?: () => void;
  onNavigate?: (path: string) => boolean | Promise<boolean>;
}

const DocumentStructure = ({ chapters, onAddChapter, onNavigate }: DocumentStructureProps) => {
  const location = useLocation();
  const { lang } = useParams();
  const navigate = useNavigate();
  const [openChapters, setOpenChapters] = useState<Record<string, boolean>>({});
  const isEditor = authService.isEditor();

  // Get current language from URL or fallback to stored language
  const currentLang = lang || getCurrentLanguage();

  const handleLinkClick = async (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
    if (onNavigate) {
      e.preventDefault();
      const canNavigate = await onNavigate(path);
      if (canNavigate) {
        navigate(path);
      }
    }
  };

  const toggleChapter = (chapterId: string) => {
    setOpenChapters(prev => ({
      ...prev,
      [chapterId]: !prev[chapterId]
    }));
  };

  const getChapterIcon = (iconName?: string) => {
    if (!iconName) return BookOpen;

    // Convert kebab-case to PascalCase (e.g., "mail-open" -> "MailOpen")
    const pascalCaseName = iconName
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');

    const Icon = (LucideIcons as any)[pascalCaseName];
    return Icon || BookOpen;
  };

  // Strip Markdown-style links [text](url) and return just the text for TOC
  const stripMarkdownLinks = (text: string) => {
    // Replace [text](url) with just text
    return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
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
          {t("nav.documentStructure")}
        </h3>
        {isEditor && onAddChapter && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={onAddChapter}
            title={t("editor.addChapter")}
          >
            <Plus className="h-4 w-4" />
          </Button>
        )}
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
                    {(() => {
                      const ChapterIcon = getChapterIcon(chapter.icon);
                      return <ChapterIcon className="h-4 w-4 shrink-0" />;
                    })()}
                    <span className="text-sm font-medium truncate">{stripMarkdownLinks(chapter.title)}</span>
                    {isEditor && chapter.isDraft && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded ml-auto">
                        {t("editor.draft")}
                      </span>
                    )}
                  </div>
                </CollapsibleTrigger>
                {isEditor && (
                  <Link
                    to={`/${currentLang}/chapter/${chapter.id}`}
                    onClick={(e) => handleLinkClick(e, `/${currentLang}/chapter/${chapter.id}`)}
                  >
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0"
                      title={t("editor.manageChapter")}
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                  </Link>
                )}
              </div>
              <CollapsibleContent>
                <div className="ml-4 mt-1 space-y-0.5">
                  {visiblePages.map((page) => {
                    const isActive = location.pathname === `/${currentLang}/${page.slug}` || location.pathname === `/document/${page.slug}`;
                    const pagePath = `/${currentLang}/${page.slug}`;
                    return (
                      <Link
                        key={page.id}
                        to={pagePath}
                        onClick={(e) => handleLinkClick(e, pagePath)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors",
                          isActive
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <FileText className="h-3.5 w-3.5 shrink-0" />
                        <span className="flex-1 truncate">{stripMarkdownLinks(page.title)}</span>
                        {isEditor && page.isDraft && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded shrink-0">
                            {t("editor.draft")}
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
