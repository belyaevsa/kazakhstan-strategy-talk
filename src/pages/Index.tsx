import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { chapterService } from "@/services/chapterService";
import { authService } from "@/services/authService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ArrowRight, AlertCircle } from "lucide-react";
import DocumentLayout from "@/components/DocumentLayout";
import { getCurrentLanguage, setLanguage, type Language, t } from "@/lib/i18n";
import { getChapterIcon } from "@/lib/chapterIcons";

const Index = () => {
  const { lang } = useParams();
  const navigate = useNavigate();
  const isAuthenticated = authService.isAuthenticated();
  const isEditor = authService.isEditor();

  // Set language from URL or redirect to language-specific URL
  useEffect(() => {
    const urlLang = lang as Language | undefined;
    if (urlLang && (urlLang === 'ru' || urlLang === 'en' || urlLang === 'kk')) {
      setLanguage(urlLang);
    } else if (!lang) {
      // If no language in URL, redirect to default language (ru)
      const currentLang = getCurrentLanguage();
      navigate(`/${currentLang}`, { replace: true });
    }
  }, [lang, navigate]);

  const { data: chapters, isLoading, isError, refetch } = useQuery({
    queryKey: ["chapters", isEditor],
    queryFn: async () => {
      return chapterService.getAll(isEditor);
    },
  });

  const handleGetStarted = () => {
    if (chapters && chapters.length > 0 && chapters[0].pages.length > 0) {
      const currentLang = lang || getCurrentLanguage();
      navigate(`/${currentLang}/${chapters[0].slug}/${chapters[0].pages[0].slug}`);
    }
  };

  return (
    <DocumentLayout>
      <div className="max-w-4xl mx-auto">
        {/* Hero Section */}
        <section className="text-center py-12 mb-12">
            <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-6">
            <img
              src="/main-icon.webp"
              alt="Kazakhstan IT Strategy logo featuring a stylized digital motif, centered in a circular background, conveying a modern and optimistic atmosphere"
              className="h-12 w-12"
            />
            </div>
          <h1 className="text-4xl lg:text-5xl font-bold mb-4 leading-tight">
            {t("home.heroTitle")}
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t("home.heroSubtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" onClick={handleGetStarted}>
              {t("home.startReading")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            {!isAuthenticated && (
              <Button size="lg" variant="outline" onClick={() => navigate("/auth")}>
                {t("home.signInToComment")}
              </Button>
            )}
          </div>
        </section>

        {/* Chapters Section */}
        {isLoading ? (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-center">{t("home.documentChapters")}</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[0, 1, 2].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-8 w-8 bg-muted rounded mb-2" />
                    <div className="h-6 w-2/3 bg-muted rounded" />
                  </CardHeader>
                  <CardContent>
                    <div className="h-4 w-full bg-muted rounded" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ) : isError ? (
          <section className="mb-12">
            <Card className="p-8 text-center">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
              <h2 className="text-xl font-semibold mb-2">{t("common.loadErrorTitle")}</h2>
              <p className="text-muted-foreground mb-4">{t("common.loadError")}</p>
              <Button variant="outline" onClick={() => refetch()}>{t("common.retry")}</Button>
            </Card>
          </section>
        ) : chapters && chapters.filter(c => isEditor || c.isVisibleOnMainPage).length > 0 ? (
          <section className="mb-12">
            <h2 className="text-2xl font-bold mb-6 text-center">{t("home.documentChapters")}</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {chapters.filter(c => isEditor || c.isVisibleOnMainPage).map((chapter) => {
                const ChapterIcon = getChapterIcon(chapter.icon);
                return (
                  <Card key={chapter.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => {
                    if (chapter.pages.length > 0) {
                      const currentLang = lang || getCurrentLanguage();
                      navigate(`/${currentLang}/${chapter.slug}/${chapter.pages[0].slug}`);
                    }
                  }}>
                    <CardHeader>
                      <ChapterIcon className="h-8 w-8 text-primary mb-2" />
                      <CardTitle className="flex items-center justify-between">
                        <span>{chapter.title}</span>
                        {chapter.isDraft && (
                          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded font-normal">
                            {t("editor.draft")}
                          </span>
                        )}
                      </CardTitle>
                    </CardHeader>
                  <CardContent>
                    <CardDescription className="mb-3">
                      {chapter.description || t("home.exploreChapter")}
                    </CardDescription>
                    {chapter.pages.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        <FileText className="h-4 w-4 inline mr-1" />
                        {t(chapter.pages.length === 1 ? "home.pageCount" : "home.pageCount_plural", { count: chapter.pages.length })}
                      </div>
                    )}
                  </CardContent>
                </Card>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* About Section */}
        <section className="bg-card rounded-lg shadow-sm border p-8">
          <h2 className="text-2xl font-bold mb-4">{t("home.aboutTitle")}</h2>
          <div className="document-content space-y-4">
            <p>
              {t("home.aboutPara1")}
            </p>
            <p>
              {t("home.aboutPara2")}
            </p>
            <p>
              {t("home.aboutPara3")}
            </p>
            <p className="font-semibold text-primary">
              {isAuthenticated ? t("home.readyToParticipate") : t("home.joinDiscussion")}
            </p>
          </div>
        </section>
      </div>
    </DocumentLayout>
  );
};

export default Index;
