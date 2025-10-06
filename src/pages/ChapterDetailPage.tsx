import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { chapterService } from "@/services/chapterService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ArrowRight } from "lucide-react";
import DocumentLayout from "@/components/DocumentLayout";
import DocumentStructure from "@/components/DocumentStructure";
import { getCurrentLanguage, setLanguage, type Language, t } from "@/lib/i18n";
import { authService } from "@/services/authService";
import { Skeleton } from "@/components/ui/skeleton";

const ChapterDetailPage = () => {
  const { chapterSlug, lang } = useParams();
  const navigate = useNavigate();
  const isEditor = authService.isEditor();

  // Set language from URL
  useEffect(() => {
    const urlLang = lang as Language | undefined;
    if (urlLang && (urlLang === 'ru' || urlLang === 'en' || urlLang === 'kk')) {
      setLanguage(urlLang);
    } else if (!lang) {
      const currentLang = getCurrentLanguage();
      navigate(`/${currentLang}/${chapterSlug}`, { replace: true });
    }
  }, [lang, chapterSlug, navigate]);

  const { data: chapters, isLoading } = useQuery({
    queryKey: ["chapters", isEditor],
    queryFn: () => chapterService.getAll(isEditor),
  });

  const chapter = chapters?.find(c => c.slug === chapterSlug);
  const visiblePages = chapter?.pages.filter(p => isEditor || !p.isDraft) || [];

  const currentLang = lang || getCurrentLanguage();

  if (isLoading) {
    return (
      <DocumentLayout sidebar={chapters && <DocumentStructure chapters={chapters} />}>
        <div className="space-y-4">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </DocumentLayout>
    );
  }

  if (!chapter) {
    return (
      <DocumentLayout sidebar={chapters && <DocumentStructure chapters={chapters} />}>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">{t("common.notFound")}</h2>
          <p className="text-muted-foreground">{t("common.chapterNotFound")}</p>
        </div>
      </DocumentLayout>
    );
  }

  return (
    <DocumentLayout sidebar={chapters && <DocumentStructure chapters={chapters} />}>
      <article className="bg-card rounded-lg shadow-sm border p-8 lg:p-12">
        <header className="mb-8 pb-6 border-b">
          <div className="flex items-center gap-3 mb-3">
            <h1 className="text-3xl lg:text-4xl font-bold">{chapter.title}</h1>
            {chapter.isDraft && (
              <span className="text-sm px-3 py-1 rounded bg-yellow-100 text-yellow-800">
                {t("editor.draft")}
              </span>
            )}
          </div>
          {chapter.description && (
            <p className="text-lg text-muted-foreground">{chapter.description}</p>
          )}
        </header>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">{t("chapter.pagesInChapter")}</h2>

          {visiblePages.length > 0 ? (
            <div className="space-y-3">
              {visiblePages.map((page) => (
                <Card
                  key={page.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/${currentLang}/${chapter.slug}/${page.slug}`)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-primary" />
                      <span>{page.title}</span>
                      {isEditor && page.isDraft && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-normal">
                          {t("editor.draft")}
                        </span>
                      )}
                    </CardTitle>
                    {page.description && (
                      <CardDescription>{page.description}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <Button variant="ghost" size="sm" className="gap-2">
                      {t("chapter.readPage")}
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              {t("chapter.noPages")}
            </p>
          )}
        </div>
      </article>
    </DocumentLayout>
  );
};

export default ChapterDetailPage;
