import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { chapterService } from "@/services/chapterService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, BookOpen } from "lucide-react";
import * as LucideIcons from "lucide-react";
import DocumentLayout from "@/components/DocumentLayout";
import DocumentStructure from "@/components/DocumentStructure";
import { getCurrentLanguage, setLanguage, type Language, t } from "@/lib/i18n";
import { authService } from "@/services/authService";
import { Skeleton } from "@/components/ui/skeleton";

const AllChaptersView = () => {
  const { lang } = useParams();
  const navigate = useNavigate();
  const isEditor = authService.isEditor();

  // Set language from URL
  useEffect(() => {
    const urlLang = lang as Language | undefined;
    if (urlLang && (urlLang === 'ru' || urlLang === 'en' || urlLang === 'kk')) {
      setLanguage(urlLang);
    } else if (!lang) {
      const currentLang = getCurrentLanguage();
      navigate(`/${currentLang}/chapters`, { replace: true });
    }
  }, [lang, navigate]);

  const { data: chapters, isLoading } = useQuery({
    queryKey: ["chapters", isEditor],
    queryFn: () => chapterService.getAll(isEditor),
  });

  const currentLang = lang || getCurrentLanguage();

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

  return (
    <DocumentLayout sidebar={chapters && <DocumentStructure chapters={chapters} />}>
      <article className="bg-card rounded-lg shadow-sm border p-8 lg:p-12">
        <header className="mb-8 pb-6 border-b">
          <h1 className="text-3xl lg:text-4xl font-bold mb-3">{t("chapter.allChaptersAndPages")}</h1>
          <p className="text-lg text-muted-foreground">
            {t("chapter.allChaptersDesc")}
          </p>
        </header>

        <div className="space-y-8">
          {chapters && chapters.map((chapter) => {
            const ChapterIcon = getChapterIcon(chapter.icon);
            const visiblePages = chapter.pages.filter(p => isEditor || !p.isDraft);

            // Only filter by draft status, not visibility on main page
            if (!isEditor && chapter.isDraft) {
              return null;
            }

            return (
              <div key={chapter.id} className="space-y-4">
                <div className="flex items-start gap-3">
                  <ChapterIcon className="h-6 w-6 text-primary mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2
                        className="text-2xl font-bold cursor-pointer hover:text-primary transition-colors"
                        onClick={() => navigate(`/${currentLang}/${chapter.slug}`)}
                      >
                        {chapter.title}
                      </h2>
                      {chapter.isDraft && isEditor && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                          {t("editor.draft")}
                        </span>
                      )}
                      {!chapter.isVisibleOnMainPage && isEditor && (
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                          {t("chapter.hiddenFromMainPage")}
                        </span>
                      )}
                    </div>
                    {chapter.description && (
                      <p className="text-muted-foreground mb-4">{chapter.description}</p>
                    )}
                  </div>
                </div>

                {visiblePages.length > 0 ? (
                  <div className="ml-9 space-y-2">
                    {visiblePages.map((page) => (
                      <Card
                        key={page.id}
                        className="hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => navigate(`/${currentLang}/${chapter.slug}/${page.slug}`)}
                      >
                        <CardHeader className="py-4">
                          <CardTitle className="flex items-center gap-3 text-base">
                            <FileText className="h-4 w-4 text-primary" />
                            <span>{page.title}</span>
                            {isEditor && page.isDraft && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded font-normal">
                                {t("editor.draft")}
                              </span>
                            )}
                          </CardTitle>
                          {page.description && (
                            <CardDescription className="text-sm">{page.description}</CardDescription>
                          )}
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <p className="ml-9 text-sm text-muted-foreground italic">
                    {t("chapter.noPagesInChapterYet")}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </article>
    </DocumentLayout>
  );
};

export default AllChaptersView;
