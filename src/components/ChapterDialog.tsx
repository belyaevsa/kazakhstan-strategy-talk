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
import RichTextEditor from "@/components/RichTextEditor";
import { t } from "@/lib/i18n";
import type { Chapter } from "@/lib/api/types";

interface ChapterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapter?: Chapter;
  onSave: (data: { title: string; description: string; icon: string; slug: string }) => void;
  isSaving: boolean;
}

const ChapterDialog = ({ open, onOpenChange, chapter, onSave, isSaving }: ChapterDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("");
  const [slug, setSlug] = useState("");

  useEffect(() => {
    if (chapter) {
      setTitle(chapter.title);
      setDescription(chapter.description || "");
      setIcon(chapter.icon || "");
      setSlug(chapter.slug);
    } else {
      setTitle("");
      setDescription("");
      setIcon("");
      setSlug("");
    }
  }, [chapter, open]);

  const handleSave = () => {
    if (!title.trim() || !slug.trim()) return;
    onSave({ title, description, icon, slug });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{chapter ? t("chapter.edit") : t("chapter.new")}</DialogTitle>
          <DialogDescription>
            {chapter ? t("chapter.updateInfo") : t("chapter.createNew")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
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
                className="document-content w-full border-0 bg-transparent px-0 py-0 text-foreground leading-relaxed placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
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
