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
import type { Page } from "@/lib/api/types";

interface PageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  page?: Page;
  chapterId?: string;
  onSave: (data: { title: string; description: string; slug: string; chapterId: string }) => void;
  isSaving: boolean;
}

const PageDialog = ({ open, onOpenChange, page, chapterId, onSave, isSaving }: PageDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [slug, setSlug] = useState("");

  useEffect(() => {
    if (page) {
      setTitle(page.title);
      setDescription(page.description || "");
      setSlug(page.slug);
    } else {
      setTitle("");
      setDescription("");
      setSlug("");
    }
  }, [page, open]);

  const generateSlug = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!page) {
      setSlug(generateSlug(value));
    }
  };

  const handleSave = () => {
    if (!title.trim() || !slug.trim()) return;
    onSave({
      title,
      description,
      slug,
      chapterId: page?.chapterId || chapterId || "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>{page ? t("page.edit") : t("page.new")}</DialogTitle>
          <DialogDescription>
            {page ? t("page.updateInfo") : t("page.createNew")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 flex flex-col flex-1 overflow-hidden">
          <div className="space-y-2">
            <Label htmlFor="page-title">{t("page.title")}</Label>
            <Input
              id="page-title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder={t("page.pageTitle")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="page-slug">{t("page.slug")}</Label>
            <Input
              id="page-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder={t("page.slugPlaceholder")}
            />
          </div>
          <div className="space-y-2 flex-1 flex flex-col">
            <Label htmlFor="page-description">{t("page.description")}</Label>
            <div className="border rounded-md p-3 flex-1 flex flex-col">
              <RichTextEditor
                value={description}
                onChange={(value) => setDescription(value)}
                placeholder={t("page.pageDescPlaceholder")}
                className="document-content w-full border-0 bg-transparent px-0 py-0 text-foreground leading-relaxed placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none flex-1"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("page.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || !slug.trim() || isSaving}>
            {isSaving ? t("page.saving") : t("page.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PageDialog;
