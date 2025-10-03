import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{page ? "Edit Page" : "New Page"}</DialogTitle>
          <DialogDescription>
            {page ? "Update page information" : "Create a new page in this chapter"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="page-title">Title</Label>
            <Input
              id="page-title"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="Page title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="page-slug">Slug</Label>
            <Input
              id="page-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="page-slug"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="page-description">Description</Label>
            <Textarea
              id="page-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the page (optional)"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || !slug.trim() || isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PageDialog;
