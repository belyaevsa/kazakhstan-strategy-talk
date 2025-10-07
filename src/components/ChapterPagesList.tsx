import { FileText } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { Page } from "@/lib/api/types";
import { getCurrentLanguage, t } from "@/lib/i18n";
import { authService } from "@/services/authService";

interface ChapterPagesListProps {
  pages: Page[];
  chapterSlug: string;
  currentPageSlug?: string;
}

const ChapterPagesList = ({ pages, chapterSlug, currentPageSlug }: ChapterPagesListProps) => {
  const navigate = useNavigate();
  const { lang } = useParams();
  const isEditor = authService.isEditor();
  const currentLang = lang || getCurrentLanguage();

  // Filter pages based on user role
  const visiblePages = isEditor ? pages : pages.filter(p => !p.isDraft);

  if (visiblePages.length === 0) {
    return null;
  }

  // Strip Markdown-style links [text](url) and return just the text
  const stripMarkdownLinks = (text: string) => {
    return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
  };

  return (
    <div className="md:hidden mb-6 bg-muted/30 rounded-lg p-4 border">
      <h3 className="text-sm font-semibold mb-3 text-muted-foreground">{t('chapter.pagesInThisChapter')}</h3>
      <div className="space-y-1">
        {visiblePages.map((page) => {
          const isActive = page.slug === currentPageSlug;
          return (
            <button
              key={page.id}
              onClick={() => navigate(`/${currentLang}/${chapterSlug}/${page.slug}`)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left",
                isActive
                  ? "bg-primary text-primary-foreground font-medium"
                  : "hover:bg-muted text-foreground"
              )}
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="flex-1 truncate">{stripMarkdownLinks(page.title)}</span>
              {isEditor && page.isDraft && (
                <span className="text-xs bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded shrink-0">
                  {t('editor.draft')}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ChapterPagesList;
