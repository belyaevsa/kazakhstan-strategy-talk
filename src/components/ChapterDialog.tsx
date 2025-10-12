import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import RichTextEditor from "@/components/RichTextEditor";
import { t } from "@/lib/i18n";
import { GripVertical } from "lucide-react";
import type { Chapter, Page } from "@/lib/api/types";

interface ChapterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapter?: Chapter;
  onSave: (data: { title: string; description: string; icon: string; slug: string }) => void;
  onReorderPages?: (pages: Page[]) => void;
  isSaving: boolean;
}

interface SortablePageItemProps {
  page: Page;
}

const SortablePageItem = ({ page }: SortablePageItemProps) => {
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
      className="flex items-center gap-2 p-2 bg-muted/50 rounded border"
    >
      <button
        className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 text-sm">{page.title}</span>
      {page.isDraft && (
        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded">
          {t("editor.draft")}
        </span>
      )}
    </div>
  );
};

const ChapterDialog = ({ open, onOpenChange, chapter, onSave, onReorderPages, isSaving }: ChapterDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [slug, setSlug] = useState("");
  const [pages, setPages] = useState<Page[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (chapter) {
      setTitle(chapter.title);
      setDescription(chapter.description || "");
      setIcon(chapter.icon || "");
      setSlug(chapter.slug);
      setPages([...chapter.pages].sort((a, b) => a.orderIndex - b.orderIndex));
    } else {
      setTitle("");
      setDescription("");
      setIcon("");
      setSlug("");
      setPages([]);
    }
  }, [chapter, open]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setPages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const reordered = arrayMove(items, oldIndex, newIndex);
        // Update orderIndex for all items
        const updated = reordered.map((item, index) => ({ ...item, orderIndex: index }));

        // Call the callback to save the reordering
        if (onReorderPages) {
          onReorderPages(updated);
        }

        return updated;
      });
    }
  };

  const handleSave = () => {
    if (!title.trim() || !slug.trim()) return;
    onSave({ title, description, icon, slug });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{chapter ? t("chapter.edit") : t("chapter.new")}</DialogTitle>
          <DialogDescription>
            {chapter ? t("chapter.updateInfo") : t("chapter.createNew")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 overflow-y-auto flex-1">
          <div className="space-y-2">
            <Label htmlFor="title">{t("chapter.title")}</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("chapter.chapterTitle")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">{t("chapter.slug")}</Label>
            <Input
              id="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={t("chapter.slugPlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t("chapter.description")}</Label>
            <div className="border rounded-md p-3 min-h-[100px]">
              <RichTextEditor
                value={description}
                onChange={(value) => setDescription(value)}
                placeholder={t("chapter.chapterDescPlaceholder")}
                className="document-content w-full border-0 bg-transparent px-0 py-0 text-foreground leading-relaxed placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="icon">{t("chapter.icon")}</Label>
              <a
                href="https://lucide.dev/icons/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline"
              >
                {t("chapter.browseIcons")}
              </a>
            </div>
            <Input
              id="icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder={t("chapter.iconPlaceholder")}
            />
          </div>

          {chapter && pages.length > 0 && (
            <div className="space-y-2">
              <Label>{t("chapter.pagesInChapter")} ({pages.length})</Label>
              <div className="border rounded-md p-3 max-h-[300px] overflow-y-auto">
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={pages.map(p => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {pages.map((page) => (
                        <SortablePageItem key={page.id} page={page} />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("chapter.dragToReorder")}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("comments.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || !slug.trim() || isSaving}>
            {isSaving ? t("chapter.saving") : t("comments.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChapterDialog;
