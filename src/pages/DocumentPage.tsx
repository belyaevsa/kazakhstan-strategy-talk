import { useState, useEffect, useRef, forwardRef, createRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { paragraphService } from "@/services/paragraphService";
import DocumentLayout from "@/components/DocumentLayout";
import DocumentStructure from "@/components/DocumentStructure";
import ParagraphWithComments from "@/components/ParagraphWithComments";
import CommentPanel from "@/components/CommentPanel";
import ChapterDialog from "@/components/ChapterDialog";
import PageDialog from "@/components/PageDialog";
import AutoResizeTextarea from "@/components/AutoResizeTextarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pencil, Save, X, Plus, Trash2, Type, Image, Quote, Code, Share2, GripVertical, List, Link2 } from "lucide-react";
import { toast } from "sonner";
import type { Chapter, Page } from "@/lib/api/types";
import ImageUploadZone from "@/components/ImageUploadZone";

interface SortableParagraphProps {
  paragraph: { id: string; content: string; orderIndex: number; type?: string; caption?: string };
  index: number;
  onContentChange: (content: string) => void;
  onCaptionChange?: (caption: string) => void;
  onDelete: () => void;
  onEnterKey: () => void;
  onTypeChange: (type: string) => void;
}

const SortableParagraph = forwardRef<HTMLTextAreaElement, SortableParagraphProps>(
  ({ paragraph, index, onContentChange, onCaptionChange, onDelete, onEnterKey, onTypeChange }, ref) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: paragraph.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Handle keyboard shortcut to open type menu
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "/") {
      e.preventDefault();
      setDropdownOpen(true);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group flex items-start gap-2"
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center gap-1 mt-4 ml-2">
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs min-w-[60px]">
              {paragraph.type || "Text"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { onTypeChange("Text"); setDropdownOpen(false); }}>
              Text
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onTypeChange("Header"); setDropdownOpen(false); }}>
              Header
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onTypeChange("Code"); setDropdownOpen(false); }}>
              Code
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onTypeChange("Quote"); setDropdownOpen(false); }}>
              Quote
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onTypeChange("Image"); setDropdownOpen(false); }}>
              Image
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onTypeChange("List"); setDropdownOpen(false); }}>
              List
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 space-y-2">
        {paragraph.type === "Image" ? (
          <>
            {!paragraph.content ? (
              <ImageUploadZone
                onUploadComplete={(url) => onContentChange(url)}
                className="my-2"
              />
            ) : (
              <div className="space-y-3">
                {/* Image Preview */}
                <div className="relative rounded-lg border border-border overflow-hidden bg-muted/30">
                  <img
                    src={paragraph.content}
                    alt={paragraph.caption || "Uploaded image"}
                    className="w-full h-auto max-h-96 object-contain"
                    onError={(e) => {
                      e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ccc' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23666'%3EImage Error%3C/text%3E%3C/svg%3E";
                    }}
                  />
                  {/* Action buttons overlay */}
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 shadow-md"
                      onClick={() => onContentChange("")}
                      title="Replace image"
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Replace
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 shadow-md"
                      onClick={() => {
                        onContentChange("");
                        if (onCaptionChange) onCaptionChange("");
                      }}
                      title="Remove image (doesn't delete from storage)"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>

                {/* Image URL (read-only) */}
                <div className="text-xs text-muted-foreground truncate bg-muted/50 px-3 py-2 rounded">
                  <span className="font-medium">URL:</span> {paragraph.content}
                </div>

                {/* Caption Input */}
                <Input
                  value={paragraph.caption || ""}
                  onChange={(e) => onCaptionChange?.(e.target.value)}
                  placeholder="Image caption (optional)..."
                  className="text-sm"
                />
              </div>
            )}
          </>
        ) : (
          <AutoResizeTextarea
            ref={ref}
            value={paragraph.content}
            onChange={(e) => onContentChange(e.target.value)}
            onEnterKey={paragraph.type === "List" || paragraph.type === "Code" ? undefined : onEnterKey}
            placeholder={
              paragraph.type === "List"
                ? "Enter list items (Shift+Enter for new line, Enter to finish)"
                : "Type your content here..."
            }
            className="w-full border-0 border-b border-border bg-transparent px-0 py-4 text-foreground leading-relaxed placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-primary transition-colors"
          />
        )}
      </div>
      <Button
        onClick={onDelete}
        variant="destructive"
        size="sm"
        className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
});

SortableParagraph.displayName = "SortableParagraph";

const DocumentPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeParagraphId, setActiveParagraphId] = useState<string | null>(null);
  const [paragraphPosition, setParagraphPosition] = useState(0);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedIsDraft, setEditedIsDraft] = useState(false);
  const [editedParagraphs, setEditedParagraphs] = useState<Array<{ id: string; content: string; orderIndex: number; type?: string; caption?: string }>>([]);
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false);
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | undefined>();
  const [editingPage, setEditingPage] = useState<Page | undefined>();
  const [newPageChapterId, setNewPageChapterId] = useState<string | undefined>();
  const paragraphRefs = useRef<Map<string, React.RefObject<HTMLTextAreaElement>>>(new Map());
  const isEditor = authService.isEditor();

  // Strip Markdown-style links [text](url) and return just the text for TOC
  const stripMarkdownLinks = (text: string) => {
    // Replace [text](url) with just text
    return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
  };

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

  const { data: currentPage, isLoading: pageLoading } = useQuery({
    queryKey: ["page", slug],
    queryFn: () => pageService.getBySlug(slug!),
    enabled: !!slug,
  });

  const { data: paragraphs, isLoading: paragraphsLoading } = useQuery({
    queryKey: ["paragraphs", currentPage?.id, isEditor],
    queryFn: () => paragraphService.getByPage(currentPage!.id, isEditor),
    enabled: !!currentPage?.id,
  });

  // Track scroll position and recalculate paragraph position to keep comment aligned
  useEffect(() => {
    const handleScroll = () => {
      const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
      setScrollOffset(currentScroll);

      // Recalculate paragraph position if one is selected
      if (activeParagraphId) {
        const paragraphElement = document.getElementById(`paragraph-${activeParagraphId}`);
        if (paragraphElement) {
          const rect = paragraphElement.getBoundingClientRect();
          const absolutePosition = rect.top + currentScroll;
          setParagraphPosition(absolutePosition);
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [activeParagraphId]);

  // Save to localStorage when editing
  useEffect(() => {
    if (isEditMode && currentPage) {
      const storageKey = `edit_${currentPage.id}`;
      const dataToSave = {
        title: editedTitle,
        description: editedDescription,
        isDraft: editedIsDraft,
        paragraphs: editedParagraphs,
      };
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    }
  }, [isEditMode, currentPage, editedTitle, editedDescription, editedIsDraft, editedParagraphs]);

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    if (!isEditMode) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isEditMode]);

  const savePageMutation = useMutation({
    mutationFn: async () => {
      await pageService.update(currentPage!.id, {
        title: editedTitle,
        description: editedDescription,
        isDraft: editedIsDraft,
      });

      for (const para of editedParagraphs) {
        await paragraphService.update(para.id, {
          content: para.content,
          orderIndex: para.orderIndex,
          type: para.type,
          caption: para.caption
        });
      }
    },
    onSuccess: () => {
      // Clear localStorage on successful save
      if (currentPage) {
        const storageKey = `edit_${currentPage.id}`;
        localStorage.removeItem(storageKey);
      }
      queryClient.invalidateQueries({ queryKey: ["page", slug] });
      queryClient.invalidateQueries({ queryKey: ["paragraphs", currentPage?.id] });
      setIsEditMode(false);
      toast.success("Changes saved successfully!");
    },
    onError: (error: any) => {
      toast.error("Failed to save changes: " + error.message);
    },
  });

  const deleteParagraphMutation = useMutation({
    mutationFn: (paragraphId: string) => paragraphService.delete(paragraphId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paragraphs", currentPage?.id] });
      toast.success("Paragraph deleted!");
    },
    onError: (error: any) => {
      toast.error("Failed to delete: " + error.message);
    },
  });

  const addParagraphMutation = useMutation({
    mutationFn: async (type: string = "Text") => {
      const maxOrder = paragraphs?.reduce((max, p) => Math.max(max, p.orderIndex), -1) ?? -1;
      const newParagraph = await paragraphService.create({
        pageId: currentPage!.id,
        content: type === "Image" ? "" : "New paragraph content...",
        orderIndex: maxOrder + 1,
        type,
      });
      return newParagraph;
    },
    onSuccess: (newParagraph) => {
      // Update the edited paragraphs state if in edit mode
      if (isEditMode && newParagraph) {
        setEditedParagraphs(prev => [...prev, {
          id: newParagraph.id,
          content: newParagraph.content,
          orderIndex: newParagraph.orderIndex,
          type: newParagraph.type,
          caption: newParagraph.caption
        }]);
      }
      queryClient.invalidateQueries({ queryKey: ["paragraphs", currentPage?.id] });
      toast.success("Paragraph added!");
    },
    onError: (error: any) => {
      toast.error("Failed to add paragraph: " + error.message);
    },
  });

  const saveChapterMutation = useMutation({
    mutationFn: async (data: { id?: string; title: string; description: string }) => {
      if (data.id) {
        return chapterService.update(data.id, { title: data.title, description: data.description });
      } else {
        return chapterService.create({ title: data.title, description: data.description });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
      setChapterDialogOpen(false);
      setEditingChapter(undefined);
      toast.success(editingChapter ? "Chapter updated!" : "Chapter created!");
    },
    onError: (error: any) => {
      toast.error("Failed to save chapter: " + error.message);
    },
  });

  const toggleChapterDraftMutation = useMutation({
    mutationFn: async ({ id, isDraft }: { id: string; isDraft: boolean }) => {
      return chapterService.update(id, { isDraft });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
      toast.success("Chapter updated!");
    },
    onError: (error: any) => {
      toast.error("Failed to update chapter: " + error.message);
    },
  });

  const togglePageDraftMutation = useMutation({
    mutationFn: async ({ id, isDraft }: { id: string; isDraft: boolean }) => {
      return pageService.update(id, { isDraft });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
      queryClient.invalidateQueries({ queryKey: ["page"] });
      toast.success("Page updated!");
    },
    onError: (error: any) => {
      toast.error("Failed to update page: " + error.message);
    },
  });

  const savePageMutation2 = useMutation({
    mutationFn: async (data: { id?: string; title: string; description: string; slug: string; chapterId: string }) => {
      if (data.id) {
        return pageService.update(data.id, {
          title: data.title,
          description: data.description,
          slug: data.slug,
          chapterId: data.chapterId,
        });
      } else {
        return pageService.create({
          title: data.title,
          description: data.description,
          slug: data.slug,
          chapterId: data.chapterId,
        });
      }
    },
    onSuccess: (newPage) => {
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
      queryClient.invalidateQueries({ queryKey: ["page"] });
      setPageDialogOpen(false);
      setEditingPage(undefined);
      setNewPageChapterId(undefined);
      toast.success(editingPage ? "Page updated!" : "Page created!");
      if (!editingPage && newPage) {
        navigate(`/document/${newPage.slug}`);
      }
    },
    onError: (error: any) => {
      toast.error("Failed to save page: " + error.message);
    },
  });

  const handleEditMode = () => {
    if (!isEditor) {
      toast.error("Please sign in to edit content");
      navigate("/auth");
      return;
    }

    if (!isEditMode && currentPage) {
      // Try to load from localStorage first
      const storageKey = `edit_${currentPage.id}`;
      const savedData = localStorage.getItem(storageKey);

      if (savedData) {
        try {
          const { title, description, isDraft, paragraphs: savedParagraphs } = JSON.parse(savedData);
          setEditedTitle(title);
          setEditedDescription(description);
          setEditedIsDraft(isDraft);
          setEditedParagraphs(savedParagraphs);
          toast.info("Restored unsaved changes from local storage");
        } catch (e) {
          // If parsing fails, use current data
          setEditedTitle(currentPage.title);
          setEditedDescription(currentPage.description || "");
          setEditedIsDraft(currentPage.isDraft);
          setEditedParagraphs(paragraphs?.map(p => ({ id: p.id, content: p.content, orderIndex: p.orderIndex, type: p.type, caption: p.caption })) || []);
        }
      } else {
        setEditedTitle(currentPage.title);
        setEditedDescription(currentPage.description || "");
        setEditedIsDraft(currentPage.isDraft);
        setEditedParagraphs(paragraphs?.map(p => ({ id: p.id, content: p.content, orderIndex: p.orderIndex, type: p.type, caption: p.caption })) || []);
      }
    }
    setIsEditMode(!isEditMode);
  };

  const handleCancel = () => {
    if (currentPage) {
      const storageKey = `edit_${currentPage.id}`;
      localStorage.removeItem(storageKey);
    }
    setIsEditMode(false);
    setEditedTitle("");
    setEditedDescription("");
    setEditedParagraphs([]);
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleAddChapter = () => {
    setEditingChapter(undefined);
    setChapterDialogOpen(true);
  };

  const handleEditChapter = (chapterId: string) => {
    const chapter = chapters?.find(c => c.id === chapterId);
    if (chapter) {
      setEditingChapter(chapter);
      setChapterDialogOpen(true);
    }
  };

  const handleToggleChapterDraft = (chapterId: string, isDraft: boolean) => {
    toggleChapterDraftMutation.mutate({ id: chapterId, isDraft });
  };

  const handleTogglePageDraft = (pageId: string, isDraft: boolean) => {
    togglePageDraftMutation.mutate({ id: pageId, isDraft });
  };

  const handleReorderPages = async (chapterId: string, pages: Page[]) => {
    try {
      // Update order for all pages
      for (const page of pages) {
        await pageService.update(page.id, { orderIndex: page.orderIndex });
      }
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
      toast.success("Page order updated!");
    } catch (error: any) {
      toast.error("Failed to reorder pages: " + error.message);
    }
  };

  const handleAddPage = (chapterId: string) => {
    setEditingPage(undefined);
    setNewPageChapterId(chapterId);
    setPageDialogOpen(true);
  };

  const handleEditPage = (pageId: string) => {
    const page = chapters?.flatMap(c => c.pages).find(p => p.id === pageId);
    if (page) {
      setEditingPage(page);
      setPageDialogOpen(true);
    }
  };

  const handleSaveChapter = (data: { title: string; description: string }) => {
    saveChapterMutation.mutate({
      id: editingChapter?.id,
      ...data,
    });
  };

  const handleSavePage = (data: { title: string; description: string; slug: string; chapterId: string }) => {
    savePageMutation2.mutate({
      id: editingPage?.id,
      ...data,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setEditedParagraphs((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const reordered = arrayMove(items, oldIndex, newIndex);
        // Update orderIndex for all items
        return reordered.map((item, index) => ({ ...item, orderIndex: index }));
      });
    }
  };

  // Handle loading state
  if (chaptersLoading || pageLoading || paragraphsLoading) {
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

  // Handle page not found
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
    <>
      <DocumentLayout
        sidebar={chapters && <DocumentStructure chapters={chapters} />}
        comments={
          !isEditMode && (
            <div className="space-y-4">
              {/* Table of Contents - Always visible */}
              <div className="bg-card border shadow-sm rounded-lg p-4">
                <h3 className="font-semibold mb-4">Table of Contents</h3>
                <div className="space-y-2">
                  {paragraphs && paragraphs.length > 0 ? (
                    paragraphs
                      .filter(p => p.type === 'Header')
                      .map((paragraph, index) => (
                        <a
                          key={paragraph.id}
                          href={`#paragraph-${paragraph.id}`}
                          className="block text-sm text-muted-foreground hover:text-foreground transition-colors pl-2 border-l-2 border-transparent hover:border-primary"
                          onClick={(e) => {
                            e.preventDefault();
                            document.getElementById(`paragraph-${paragraph.id}`)?.scrollIntoView({ behavior: 'smooth' });
                          }}
                        >
                          {stripMarkdownLinks(paragraph.content)}
                        </a>
                      ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No headers found</p>
                  )}
                </div>
              </div>

              {/* Paragraph Comments - Shows when paragraph selected */}
              {activeParagraphId && (
                <div
                  className="transition-all duration-300"
                  style={{
                    transform: `translateY(${Math.max(0, paragraphPosition - scrollOffset - 84)}px)`
                  }}
                >
                  <CommentPanel
                    paragraphId={activeParagraphId}
                    mode="paragraph"
                  />
                </div>
              )}
            </div>
          )
        }
      >
      <article className="bg-card rounded-lg shadow-sm border p-8 lg:p-12">
        {isEditMode && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
              <span className="font-medium">✏️ Edit Mode:</span>
              Your changes are being saved locally but not to the database yet. Click "Save" to persist changes.
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
              💡 Tip: Press Ctrl/Cmd+/ to open paragraph type menu, then use arrow keys to navigate and Enter to select
            </p>
          </div>
        )}
        <header className="mb-8 pb-6 border-b flex justify-between items-start">
          <div className="flex-1">
            {isEditMode ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="text-3xl lg:text-4xl font-bold flex-1"
                    placeholder="Page title"
                  />
                  {editedIsDraft && (
                    <span className="text-sm px-3 py-1 rounded bg-yellow-100 text-yellow-800 shrink-0">
                      Draft
                    </span>
                  )}
                </div>
                <Textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className="text-lg"
                  placeholder="Page description (optional)"
                  rows={2}
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
                  <h1 className="text-3xl lg:text-4xl font-bold">{currentPage.title}</h1>
                  {isEditor && currentPage.isDraft && (
                    <span className="text-sm px-3 py-1 rounded bg-yellow-100 text-yellow-800">
                      Draft
                    </span>
                  )}
                </div>
                {currentPage.description && (
                  <p className="text-lg text-muted-foreground mb-2">{currentPage.description}</p>
                )}
                {currentPage.updatedAt && (
                  <p className="text-sm text-muted-foreground">
                    Last updated {new Date(currentPage.updatedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                    {currentPage.updatedByUsername && ` by ${currentPage.updatedByUsername}`}
                  </p>
                )}
              </>
            )}
          </div>
          <div className="flex gap-2 ml-4">
            <Button onClick={handleShare} variant="ghost" size="sm" title="Share this page">
              <Share2 className="h-4 w-4" />
            </Button>
            {isEditMode ? (
              <>
                <Button onClick={() => savePageMutation.mutate()} size="sm" disabled={savePageMutation.isPending}>
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
                Edit
              </Button>
            ) : (
              <Button onClick={() => navigate("/auth")} variant="outline" size="sm">
                Sign in to Edit
              </Button>
            )}
          </div>
        </header>

        <div className="space-y-4">
          {isEditMode ? (
            <>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={editedParagraphs.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {editedParagraphs.map((paragraph, index) => {
                    // Create or get ref for this paragraph
                    if (!paragraphRefs.current.has(paragraph.id)) {
                      paragraphRefs.current.set(paragraph.id, createRef<HTMLTextAreaElement>());
                    }
                    const ref = paragraphRefs.current.get(paragraph.id)!;

                    return (
                      <SortableParagraph
                        key={paragraph.id}
                        ref={ref}
                        paragraph={paragraph}
                        index={index}
                        onContentChange={(content) => {
                          const updated = [...editedParagraphs];
                          updated[index].content = content;
                          setEditedParagraphs(updated);
                        }}
                        onCaptionChange={(caption) => {
                          const updated = [...editedParagraphs];
                          updated[index].caption = caption;
                          setEditedParagraphs(updated);
                        }}
                        onDelete={() => {
                          deleteParagraphMutation.mutate(paragraph.id);
                          setEditedParagraphs(editedParagraphs.filter(p => p.id !== paragraph.id));
                        }}
                        onEnterKey={() => {
                          addParagraphMutation.mutate("Text", {
                            onSuccess: (newPara: any) => {
                              // Reorder: insert new paragraph after current one
                              const updated = [...editedParagraphs];
                              updated.splice(index + 1, 0, {
                                id: newPara.id,
                                content: "",
                                orderIndex: paragraph.orderIndex + 1,
                                type: "Text"
                              });
                              // Update order indices for subsequent paragraphs
                              updated.forEach((p, i) => p.orderIndex = i);
                              setEditedParagraphs(updated);

                              // Focus on the new paragraph
                              setTimeout(() => {
                                const newRef = paragraphRefs.current.get(newPara.id);
                                newRef?.current?.focus();
                              }, 100);
                            }
                          });
                        }}
                        onTypeChange={(type) => {
                          const updated = [...editedParagraphs];
                          updated[index].type = type;
                          // Clear content when switching to Image type to show upload zone
                          if (type === "Image" && updated[index].content && !updated[index].content.startsWith("http")) {
                            updated[index].content = "";
                            updated[index].caption = "";
                          }
                          setEditedParagraphs(updated);
                        }}
                      />
                    );
                  })}
                </SortableContext>
              </DndContext>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full" disabled={addParagraphMutation.isPending}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Paragraph
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => addParagraphMutation.mutate("Text")}>
                    <Type className="h-4 w-4 mr-2" />
                    Text Paragraph
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addParagraphMutation.mutate("Header")}>
                    <Type className="h-4 w-4 mr-2" />
                    Header
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addParagraphMutation.mutate("Image")}>
                    <Image className="h-4 w-4 mr-2" />
                    Image
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addParagraphMutation.mutate("Quote")}>
                    <Quote className="h-4 w-4 mr-2" />
                    Quote
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addParagraphMutation.mutate("Code")}>
                    <Code className="h-4 w-4 mr-2" />
                    Code Block
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addParagraphMutation.mutate("List")}>
                    <List className="h-4 w-4 mr-2" />
                    List
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            paragraphs && paragraphs.length > 0 ? (
              paragraphs.map((paragraph) => (
                <ParagraphWithComments
                  key={paragraph.id}
                  paragraph={paragraph}
                  isActive={activeParagraphId === paragraph.id}
                  onClick={(position) => {
                    if (activeParagraphId === paragraph.id) {
                      setActiveParagraphId(null);
                    } else {
                      setActiveParagraphId(paragraph.id);
                      setParagraphPosition(position);
                    }
                  }}
                />
              ))
            ) : (
              <p className="text-muted-foreground italic">
                No content available for this page yet.
              </p>
            )
          )}
        </div>

      </article>

      {/* General Discussion Section - Always visible below article */}
      {!isEditMode && (
        <div className="mt-8 bg-card rounded-lg shadow-sm border p-8 lg:p-12">
          <CommentPanel pageId={currentPage.id} mode="page" />
        </div>
      )}

      </DocumentLayout>

      {/* Chapter Dialog */}
      <ChapterDialog
        open={chapterDialogOpen}
        onOpenChange={setChapterDialogOpen}
        chapter={editingChapter}
        onSave={handleSaveChapter}
        isSaving={saveChapterMutation.isPending}
      />

      {/* Page Dialog */}
      <PageDialog
        open={pageDialogOpen}
        onOpenChange={setPageDialogOpen}
        page={editingPage}
        chapterId={newPageChapterId}
        onSave={handleSavePage}
        isSaving={savePageMutation2.isPending}
      />
    </>
  );
};

export default DocumentPage;
