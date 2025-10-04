import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { authService } from "@/services/authService";
import { chapterService } from "@/services/chapterService";
import { pageService } from "@/services/pageService";
import DocumentLayout from "@/components/DocumentLayout";
import DocumentStructure from "@/components/DocumentStructure";
import PageDialog from "@/components/PageDialog";
import ChapterDialog from "@/components/ChapterDialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Save, X, Plus, Trash2, GripVertical, Eye, EyeOff, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { Chapter, Page } from "@/lib/api/types";

interface SortablePageItemProps {
  page: Page;
  index: number;
  onToggleDraft: () => void;
  onDelete: () => void;
}

const SortablePageItem = ({ page, index, onToggleDraft, onDelete }: SortablePageItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: page.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group flex items-center gap-3 p-4 bg-card border rounded-lg hover:shadow-sm transition-all"
    >
      <button
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium truncate">{page.title}</h3>
          {page.isDraft && (
            <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">
              Draft
            </span>
          )}
        </div>
        {page.description && (
          <p className="text-sm text-muted-foreground truncate mt-1">{page.description}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">/{page.slug}</p>
      </div>

      <div className="flex items-center gap-2">
        <Link to={`/document/${page.slug}`} target="_blank">
          <Button
            size="sm"
            variant="ghost"
            title="View page"
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </Link>
        <Button
          onClick={onToggleDraft}
          size="sm"
          variant={page.isDraft ? "default" : "outline"}
          title={page.isDraft ? "Publish page" : "Hide page"}
        >
          {page.isDraft ? (
            <>
              <Eye className="h-4 w-4 mr-1" />
              Publish
            </>
          ) : (
            <>
              <EyeOff className="h-4 w-4 mr-1" />
              Hide
            </>
          )}
        </Button>
        <Button
          onClick={onDelete}
          size="sm"
          variant="ghost"
          className="text-destructive hover:text-destructive"
          title="Delete page"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

const ChapterPage = () => {
  const { chapterId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedIcon, setEditedIcon] = useState("");
  const [editedIsDraft, setEditedIsDraft] = useState(false);
  const [editedPages, setEditedPages] = useState<Page[]>([]);
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false);
  const isEditor = authService.isEditor();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: chapters, isLoading: chaptersLoading } = useQuery({
    queryKey: ["chapters", isEditor],
    queryFn: () => chapterService.getAll(isEditor),
  });

  const currentChapter = chapters?.find(c => c.id === chapterId);

  const saveChapterMutation = useMutation({
    mutationFn: async () => {
      if (!currentChapter) return;

      await chapterService.update(currentChapter.id, {
        title: editedTitle,
        description: editedDescription,
        icon: editedIcon,
        isDraft: editedIsDraft,
      });

      // Update page orders and draft status
      for (const page of editedPages) {
        await pageService.update(page.id, {
          orderIndex: page.orderIndex,
          isDraft: page.isDraft
        });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["chapters"] });
      await queryClient.refetchQueries({ queryKey: ["chapters"] });
      setIsEditMode(false);
      toast.success("Chapter saved successfully!");
    },
    onError: (error: any) => {
      toast.error("Failed to save chapter: " + error.message);
    },
  });

  const deletePageMutation = useMutation({
    mutationFn: (pageId: string) => pageService.delete(pageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
      toast.success("Page deleted!");
    },
    onError: (error: any) => {
      toast.error("Failed to delete page: " + error.message);
    },
  });

  const togglePageDraftMutation = useMutation({
    mutationFn: async ({ id, isDraft }: { id: string; isDraft: boolean }) => {
      return pageService.update(id, { isDraft });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
      toast.success("Page updated!");
    },
    onError: (error: any) => {
      toast.error("Failed to update page: " + error.message);
    },
  });

  const addPageMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; slug: string; chapterId: string }) => {
      const maxOrder = editedPages.reduce((max, p) => Math.max(max, p.orderIndex), -1);
      return pageService.create({
        ...data,
        orderIndex: maxOrder + 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
      setPageDialogOpen(false);
      toast.success("Page created!");
    },
    onError: (error: any) => {
      toast.error("Failed to create page: " + error.message);
    },
  });

  const addChapterMutation = useMutation({
    mutationFn: async (data: { title: string; description: string; icon: string }) => {
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
      toast.success("Chapter created!");
    },
    onError: (error: any) => {
      toast.error("Failed to create chapter: " + error.message);
    },
  });

  useEffect(() => {
    if (currentChapter && !isEditMode) {
      setEditedTitle(currentChapter.title);
      setEditedDescription(currentChapter.description || "");
      setEditedIcon(currentChapter.icon || "");
      setEditedIsDraft(currentChapter.isDraft);
      setEditedPages([...currentChapter.pages]);
    }
  }, [currentChapter, isEditMode]);

  const handleEditMode = () => {
    if (!isEditor) {
      toast.error("Please sign in to edit content");
      navigate("/auth");
      return;
    }
    setIsEditMode(true);
  };

  const handleCancel = () => {
    setIsEditMode(false);
    if (currentChapter) {
      setEditedTitle(currentChapter.title);
      setEditedDescription(currentChapter.description || "");
      setEditedIcon(currentChapter.icon || "");
      setEditedIsDraft(currentChapter.isDraft);
      setEditedPages([...currentChapter.pages]);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setEditedPages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const reordered = arrayMove(items, oldIndex, newIndex);
        return reordered.map((item, index) => ({ ...item, orderIndex: index }));
      });
    }
  };

  const handleTogglePageDraft = (pageId: string, isDraft: boolean) => {
    if (isEditMode) {
      setEditedPages(pages =>
        pages.map(p => p.id === pageId ? { ...p, isDraft } : p)
      );
    } else {
      togglePageDraftMutation.mutate({ id: pageId, isDraft });
    }
  };

  const handleDeletePage = (pageId: string) => {
    if (isEditMode) {
      setEditedPages(pages => pages.filter(p => p.id !== pageId));
    } else {
      if (confirm("Are you sure you want to delete this page?")) {
        deletePageMutation.mutate(pageId);
      }
    }
  };

  const handleSavePage = (data: { title: string; description: string; slug: string; chapterId: string }) => {
    addPageMutation.mutate(data);
  };

  const handleSaveChapter = (data: { title: string; description: string; icon: string }) => {
    addChapterMutation.mutate(data);
  };

  if (chaptersLoading) {
    return (
      <DocumentLayout>
        <div className="space-y-4">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
        </div>
      </DocumentLayout>
    );
  }

  if (!currentChapter) {
    return (
      <DocumentLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Chapter not found</h2>
          <p className="text-muted-foreground">The requested chapter could not be found.</p>
        </div>
      </DocumentLayout>
    );
  }

  return (
    <>
      <DocumentLayout sidebar={chapters && <DocumentStructure chapters={chapters} onAddChapter={() => setChapterDialogOpen(true)} />}>
        <article className="bg-card rounded-lg shadow-sm border p-8 lg:p-12">
          <header className="mb-8 pb-6 border-b flex justify-between items-start">
            <div className="flex-1">
              {isEditMode ? (
                <div className="space-y-4">
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="text-3xl lg:text-4xl font-bold"
                    placeholder="Chapter title"
                  />
                  <Textarea
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="text-lg"
                    placeholder="Chapter description (optional)"
                    rows={2}
                  />
                  <Input
                    value={editedIcon}
                    onChange={(e) => setEditedIcon(e.target.value)}
                    className="text-sm"
                    placeholder="Icon name (e.g., BookOpen, FileText)"
                  />
                  <Button
                    onClick={() => setEditedIsDraft(!editedIsDraft)}
                    variant={editedIsDraft ? "default" : "outline"}
                    size="sm"
                  >
                    {editedIsDraft ? "Draft - Click to Publish" : "Published - Click to Hide"}
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-3">
                    <h1 className="text-3xl lg:text-4xl font-bold">{currentChapter.title}</h1>
                    {currentChapter.isDraft && (
                      <span className="text-sm px-3 py-1 rounded bg-yellow-100 text-yellow-800">
                        Draft
                      </span>
                    )}
                  </div>
                  {currentChapter.description && (
                    <p className="text-lg text-muted-foreground">{currentChapter.description}</p>
                  )}
                </>
              )}
            </div>
            <div className="flex gap-2 ml-4">
              {isEditMode ? (
                <>
                  <Button onClick={() => saveChapterMutation.mutate()} size="sm" disabled={saveChapterMutation.isPending}>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button onClick={handleCancel} variant="outline" size="sm">
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </>
              ) : isEditor ? (
                <Button onClick={handleEditMode} variant="outline" size="sm">
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit Chapter
                </Button>
              ) : (
                <Button onClick={() => navigate("/auth")} variant="outline" size="sm">
                  Sign in to Edit
                </Button>
              )}
            </div>
          </header>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Pages in this chapter</h2>
              {isEditor && !isEditMode && (
                <Button onClick={() => setPageDialogOpen(true)} size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Page
                </Button>
              )}
            </div>

            {isEditMode ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={editedPages.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {editedPages.map((page, index) => (
                      <SortablePageItem
                        key={page.id}
                        page={page}
                        index={index}
                        onToggleDraft={() => handleTogglePageDraft(page.id, !page.isDraft)}
                        onDelete={() => handleDeletePage(page.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="space-y-3">
                {currentChapter.pages.map((page) => (
                  <div
                    key={page.id}
                    className="flex items-center gap-3 p-4 bg-card border rounded-lg hover:shadow-sm transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate">{page.title}</h3>
                        {page.isDraft && (
                          <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800">
                            Draft
                          </span>
                        )}
                      </div>
                      {page.description && (
                        <p className="text-sm text-muted-foreground truncate mt-1">{page.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">/{page.slug}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link to={`/document/${page.slug}`}>
                        <Button size="sm" variant="outline">
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {currentChapter.pages.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No pages in this chapter yet.
              </p>
            )}
          </div>
        </article>
      </DocumentLayout>

      <PageDialog
        open={pageDialogOpen}
        onOpenChange={setPageDialogOpen}
        chapterId={chapterId}
        onSave={handleSavePage}
        isSaving={addPageMutation.isPending}
      />

      <ChapterDialog
        open={chapterDialogOpen}
        onOpenChange={setChapterDialogOpen}
        onSave={handleSaveChapter}
        isSaving={addChapterMutation.isPending}
      />
    </>
  );
};

export default ChapterPage;
