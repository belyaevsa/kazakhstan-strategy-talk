import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { chapterService } from "@/services/chapterService";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, BookOpen, GripVertical, Save, X, Plus } from "lucide-react";
import ChapterDialog from "@/components/ChapterDialog";
import * as LucideIcons from "lucide-react";
import DocumentLayout from "@/components/DocumentLayout";
import DocumentStructure from "@/components/DocumentStructure";
import { getCurrentLanguage, setLanguage, type Language, t } from "@/lib/i18n";
import { authService } from "@/services/authService";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Chapter } from "@/lib/api/types";

interface SortableChapterItemProps {
  chapter: Chapter;
  isEditor: boolean;
  currentLang: string;
  navigate: (path: string) => void;
  getChapterIcon: (iconName?: string) => any;
}

const SortableChapterItem = ({ chapter, isEditor, currentLang, navigate, getChapterIcon }: SortableChapterItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: chapter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const ChapterIcon = getChapterIcon(chapter.icon);
  const visiblePages = chapter.pages.filter(p => isEditor || !p.isDraft);

  return (
    <div ref={setNodeRef} style={style} className="space-y-4">
      <div className="flex items-start gap-3">
        <button
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors mt-1"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
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
        <div className="ml-14 space-y-2">
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
        <p className="ml-14 text-sm text-muted-foreground italic">
          {t("chapter.noPagesInChapterYet")}
        </p>
      )}
    </div>
  );
};

const AllChaptersView = () => {
  const { lang } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditor = authService.isEditor() || authService.isAdmin();
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [reorderedChapters, setReorderedChapters] = useState<Chapter[]>([]);
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  useEffect(() => {
    if (chapters && !isReorderMode) {
      setReorderedChapters([...chapters].sort((a, b) => a.orderIndex - b.orderIndex));
    }
  }, [chapters, isReorderMode]);

  const saveOrderMutation = useMutation({
    mutationFn: async () => {
      // Update orderIndex for all chapters
      for (let i = 0; i < reorderedChapters.length; i++) {
        await chapterService.update(reorderedChapters[i].id, { orderIndex: i });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
      setIsReorderMode(false);
      toast.success("Chapter order saved successfully!");
    },
    onError: (error: any) => {
      toast.error("Failed to save chapter order: " + error.message);
    },
  });

  const addChapterMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; slug: string; icon: string; isVisibleOnMainPage: boolean }) => {
      const maxOrder = chapters?.reduce((max, c) => Math.max(max, c.orderIndex), -1) || 0;
      return chapterService.create({
        ...data,
        orderIndex: maxOrder + 1,
        isDraft: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
      setChapterDialogOpen(false);
      toast.success(t("chapter.chapterCreated"));
    },
    onError: (error: any) => {
      toast.error(t("chapter.chapterCreateFailed") + ": " + error.message);
    },
  });

  const handleSaveChapter = (data: { title: string; description: string; slug: string; icon: string; isVisibleOnMainPage: boolean }) => {
    addChapterMutation.mutate(data);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setReorderedChapters((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleCancelReorder = () => {
    setIsReorderMode(false);
    if (chapters) {
      setReorderedChapters([...chapters].sort((a, b) => a.orderIndex - b.orderIndex));
    }
  };

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

  const displayChapters = isReorderMode ? reorderedChapters : chapters;
  const filteredChapters = displayChapters?.filter(chapter => isEditor || !chapter.isDraft) || [];

  return (
    <DocumentLayout sidebar={chapters && <DocumentStructure chapters={chapters} />}>
      <article className="bg-card rounded-lg shadow-sm border p-8 lg:p-12">
        <header className="mb-8 pb-6 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h1 className="text-3xl lg:text-4xl font-bold mb-3">{t("chapter.allChaptersAndPages")}</h1>
              <p className="text-lg text-muted-foreground">
                {t("chapter.allChaptersDesc")}
              </p>
            </div>
            {isEditor && (
              <div className="flex gap-2 ml-4">
                {isReorderMode ? (
                  <>
                    <Button
                      onClick={() => saveOrderMutation.mutate()}
                      disabled={saveOrderMutation.isPending}
                      size="sm"
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {t("comments.save")}
                    </Button>
                    <Button
                      onClick={handleCancelReorder}
                      variant="outline"
                      size="sm"
                    >
                      <X className="h-4 w-4 mr-1" />
                      {t("comments.cancel")}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      onClick={() => setChapterDialogOpen(true)}
                      variant="default"
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {t("editor.addChapter")}
                    </Button>
                    <Button
                      onClick={() => setIsReorderMode(true)}
                      variant="outline"
                      size="sm"
                    >
                      <GripVertical className="h-4 w-4 mr-1" />
                      {t("chapter.reorderChapters")}
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        </header>

        {isReorderMode ? (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={filteredChapters.map(c => c.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-8">
                {filteredChapters.map((chapter) => (
                  <SortableChapterItem
                    key={chapter.id}
                    chapter={chapter}
                    isEditor={isEditor}
                    currentLang={currentLang}
                    navigate={navigate}
                    getChapterIcon={getChapterIcon}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="space-y-8">
            {filteredChapters.map((chapter) => {
              const ChapterIcon = getChapterIcon(chapter.icon);
              const visiblePages = chapter.pages.filter(p => isEditor || !p.isDraft);

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
        )}
      </article>

      <ChapterDialog
        open={chapterDialogOpen}
        onOpenChange={setChapterDialogOpen}
        onSave={handleSaveChapter}
        isSaving={addChapterMutation.isPending}
      />
    </DocumentLayout>
  );
};

export default AllChaptersView;
