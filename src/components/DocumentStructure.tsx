import { useState } from "react";
import { Link, useLocation, useParams, useNavigate } from "react-router-dom";
import { FileText, ChevronRight, ChevronDown, BookOpen, Settings, Plus, EyeOff, List } from "lucide-react";
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
      </div>

      {/* Link to All Chapters View */}
      <Link
        to={`/${currentLang}/chapters`}
        onClick={(e) => handleLinkClick(e, `/${currentLang}/chapters`)}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors mb-3",
          location.pathname === `/${currentLang}/chapters`
            ? "bg-primary/10 text-primary"
            : "hover:bg-muted text-muted-foreground hover:text-foreground"
        )}
      >
        <List className="h-4 w-4" />
        <span>{t("nav.viewAllChapters")}</span>
      </Link>

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
              <div className="flex items-start gap-1">
                <CollapsibleTrigger asChild>
                  <button className="shrink-0 inline-flex items-center justify-center h-7 w-7 p-0 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors mt-0.5">
                    {openChapters[chapter.id] ?? true ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <Link
                  to={`/${currentLang}/${chapter.slug}`}
                  onClick={(e) => handleLinkClick(e, `/${currentLang}/${chapter.slug}`)}
                  className="flex-1 group min-w-0"
                >
                  <div className="flex items-start gap-1 pl-0 pr-2 py-1.5 rounded-md hover:bg-muted transition-colors text-left">
                    {(() => {
                      const ChapterIcon = getChapterIcon(chapter.icon);
                      return <ChapterIcon className="h-4 w-4 shrink-0 mt-0.5" />;
                    })()}
                    <div className="flex-1 min-w-0 flex items-center gap-1">
                      <span className="text-sm font-medium break-words">{stripMarkdownLinks(chapter.title)}</span>
                      {isEditor && chapter.isDraft && (
                        <span className="inline-flex items-center justify-center bg-yellow-100 rounded p-0.5 shrink-0" title={t("editor.draft")}>
                          <EyeOff className="h-3 w-3 text-yellow-800" />
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
                {isEditor && (
                  <Link
                    to={`/${currentLang}/chapter/${chapter.slug}`}
                    onClick={(e) => handleLinkClick(e, `/${currentLang}/chapter/${chapter.slug}`)}
                    className="shrink-0"
                  >
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 mt-0.5"
                      title={t("editor.manageChapter")}
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                  </Link>
                )}
              </div>
              <CollapsibleContent>
                <div className="ml-5 mt-1 space-y-0.5">
                  {visiblePages.map((page) => {
                    const pagePath = `/${currentLang}/${chapter.slug}/${page.slug}`;
                    const isActive = location.pathname === pagePath || location.pathname === `/${currentLang}/${page.slug}` || location.pathname === `/document/${page.slug}`;
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
                          <span className="inline-flex items-center justify-center bg-yellow-100 rounded p-0.5 shrink-0" title={t("editor.draft")}>
                            <EyeOff className="h-3 w-3 text-yellow-800" />
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
