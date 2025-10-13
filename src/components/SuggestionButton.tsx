import { Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/hooks/useTranslation';
import { authService } from '@/services/authService';

interface SuggestionButtonProps {
  suggestionCount: number;
  onClick: () => void;
  variant?: 'suggest' | 'view';
}

export const SuggestionButton = ({ suggestionCount, onClick, variant = 'suggest' }: SuggestionButtonProps) => {
  const { t } = useTranslation();
  const isAuthenticated = authService.isAuthenticated();

  if (variant === 'view' && suggestionCount === 0) {
    return null;
  }

  if (variant === 'view') {
    return (
      <Button
        size="sm"
        variant="outline"
        onClick={onClick}
        className="gap-2"
      >
        <Lightbulb className="h-4 w-4" />
        <span className="text-sm">
          {t('suggestions.viewSuggestions', { count: suggestionCount })}
        </span>
      </Button>
    );
  }

  // Suggest variant
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={onClick}
      disabled={!isAuthenticated}
      title={!isAuthenticated ? t('suggestions.signInToSuggest') : t('suggestions.suggestEdit')}
      className="gap-2"
    >
      <Lightbulb className="h-4 w-4" />
      <span className="text-sm">{t('suggestions.suggestEdit')}</span>
    </Button>
  );
};
