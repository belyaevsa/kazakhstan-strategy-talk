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
import type { Chapter } from "@/lib/api/types";

interface ChapterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chapter?: Chapter;
  onSave: (data: { title: string; description: string }) => void;
  isSaving: boolean;
}

const ChapterDialog = ({ open, onOpenChange, chapter, onSave, isSaving }: ChapterDialogProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (chapter) {
      setTitle(chapter.title);
      setDescription(chapter.description || "");
    } else {
      setTitle("");
      setDescription("");
    }
  }, [chapter, open]);

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({ title, description });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{chapter ? "Edit Chapter" : "New Chapter"}</DialogTitle>
          <DialogDescription>
            {chapter ? "Update chapter information" : "Create a new chapter for organizing pages"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Chapter title"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the chapter (optional)"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!title.trim() || isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ChapterDialog;
