import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { toast } from 'sonner';
import { suggestionService } from '@/services/suggestionService';
import { ParagraphSuggestion } from '@/lib/api/types';
import { SuggestionCard } from './SuggestionCard';
import { SuggestionEditor } from './SuggestionEditor';

interface SuggestionsCarouselProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paragraphId: string;
  originalContent: string;
}

export const SuggestionsCarousel = ({
  open,
  onOpenChange,
  paragraphId,
  originalContent,
}: SuggestionsCarouselProps) => {
  const { t } = useTranslation();
  const [suggestions, setSuggestions] = useState<ParagraphSuggestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Parse markdown text to JSX with formatting
  const parseMarkdown = (text: string) => {
    const parts: (string | JSX.Element)[] = [];
    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const boldRegex = /\*\*([^*]+)\*\*/g;
    const italicRegex = /\*([^*]+)\*/g;

    const allMatches: Array<{ index: number; length: number; element: JSX.Element }> = [];
    let match: RegExpExecArray | null;

    // Find all links
    while ((match = linkRegex.exec(text)) !== null) {
      allMatches.push({
        index: match.index,
        length: match[0].length,
        element: (
          <a
            key={match.index}
            href={match[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {match[1]}
          </a>
        )
      });
    }

    // Find all bold text
    while ((match = boldRegex.exec(text)) !== null) {
      allMatches.push({
        index: match.index,
        length: match[0].length,
        element: <strong key={match.index}>{match[1]}</strong>
      });
    }

    // Find all italic text
    while ((match = italicRegex.exec(text)) !== null) {
      const isBoldMarker = text[match.index - 1] === '*' || text[match.index + match[0].length] === '*';
      if (!isBoldMarker) {
        allMatches.push({
          index: match.index,
          length: match[0].length,
          element: <em key={match.index}>{match[1]}</em>
        });
      }
    }

    allMatches.sort((a, b) => a.index - b.index);

    let lastIndex = 0;
    for (const match of allMatches) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(match.element);
      lastIndex = match.index + match.length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const loadSuggestions = async () => {
    setIsLoading(true);
    try {
      const data = await suggestionService.getSuggestionsByParagraph(paragraphId);
      setSuggestions(data);
      if (data.length === 0) {
        toast.info(t('suggestions.noSuggestions'));
        onOpenChange(false);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('suggestions.loadError'));
      onOpenChange(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadSuggestions();
      setCurrentIndex(0);
    }
  }, [open, paragraphId]);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleUpdate = () => {
    loadSuggestions();
  };

  const currentSuggestion = suggestions[currentIndex];

  if (isEditing && currentSuggestion) {
    return (
      <SuggestionEditor
        open={isEditing}
        onOpenChange={setIsEditing}
        paragraphId={paragraphId}
        originalContent={originalContent}
        existingSuggestion={currentSuggestion}
        onSuccess={() => {
          setIsEditing(false);
          loadSuggestions();
        }}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isLoading
              ? t('common.loading')
              : t('suggestions.suggestionOf', {
                  current: currentIndex + 1,
                  total: suggestions.length,
                })}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">{t('common.loading')}</p>
          </div>
        ) : currentSuggestion ? (
          <div className="flex-1 overflow-y-auto px-1">
            <div className="space-y-6">
              {/* Original content for reference */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">
                  {t('suggestions.originalContent')}:
                </h3>
                <div className="border rounded-md p-4 bg-muted/10">
                  <p className="document-content text-foreground leading-relaxed whitespace-pre-wrap">
                    {parseMarkdown(originalContent)}
                  </p>
                </div>
              </div>

              {/* Current suggestion */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold">
                  {t('suggestions.suggestedContent')}:
                </h3>
                <SuggestionCard
                  suggestion={currentSuggestion}
                  onUpdate={handleUpdate}
                  onEdit={handleEdit}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">{t('suggestions.noSuggestions')}</p>
          </div>
        )}

        {/* Navigation */}
        {suggestions.length > 1 && (
          <div className="flex items-center justify-between border-t pt-4 mt-4">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={isLoading}
              className="gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              {t('suggestions.previous')}
            </Button>

            <span className="text-sm text-muted-foreground">
              {currentIndex + 1} / {suggestions.length}
            </span>

            <Button
              variant="outline"
              onClick={handleNext}
              disabled={isLoading}
              className="gap-2"
            >
              {t('suggestions.next')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
