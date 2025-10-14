import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useTranslation } from '@/hooks/useTranslation';
import { toast } from 'sonner';
import { suggestionService } from '@/services/suggestionService';
import { ParagraphSuggestion } from '@/lib/api/types';
import RichTextEditor from '@/components/RichTextEditor';

interface SuggestionEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paragraphId: string;
  originalContent: string;
  existingSuggestion?: ParagraphSuggestion;
  onSuccess: () => void;
}

export const SuggestionEditor = ({
  open,
  onOpenChange,
  paragraphId,
  originalContent,
  existingSuggestion,
  onSuccess,
}: SuggestionEditorProps) => {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setContent(existingSuggestion?.suggestedContent || originalContent);
      setComment(existingSuggestion?.comment || '');
    }
  }, [open, existingSuggestion, originalContent]);

  const handleSubmit = async () => {
    if (!content || !content.trim()) {
      toast.error(t('suggestions.createError'));
      return;
    }

    if (!comment.trim()) {
      toast.error(t('suggestions.explainChanges'));
      return;
    }

    setIsSubmitting(true);

    try {
      if (existingSuggestion) {
        await suggestionService.updateSuggestion(existingSuggestion.id, {
          suggestedContent: content.trim(),
          comment: comment.trim(),
        });
        toast.success(t('suggestions.updateSuccess'));
      } else {
        await suggestionService.createSuggestion({
          paragraphId,
          suggestedContent: content.trim(),
          comment: comment.trim(),
        });
        toast.success(t('suggestions.createSuccess'));
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      const errorMessage = existingSuggestion
        ? t('suggestions.updateError')
        : t('suggestions.createError');
      toast.error(error.response?.data?.message || errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingSuggestion
              ? t('suggestions.editSuggestion')
              : t('suggestions.createSuggestion')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Editor */}
          <div className="space-y-2">
            <Label htmlFor="content">{t('suggestions.suggestedContent')}</Label>
            <div className="border rounded-md p-3 min-h-[200px]">
              <RichTextEditor
                value={content}
                onChange={setContent}
                placeholder={t('paragraph.contentPlaceholder')}
                className="document-content min-h-[180px] text-foreground leading-relaxed"
              />
            </div>
          </div>

          {/* Comment field */}
          <div className="space-y-2">
            <Label htmlFor="comment">{t('suggestions.explainChanges')}</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t('suggestions.explainPlaceholder')}
              rows={3}
              maxLength={1000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {comment.length}/1000
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t('suggestions.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting
              ? t('common.loading')
              : existingSuggestion
              ? t('suggestions.save')
              : t('suggestions.createSuggestion')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
