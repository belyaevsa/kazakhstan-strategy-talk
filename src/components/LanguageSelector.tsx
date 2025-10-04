import { useState } from "react";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/hooks/useTranslation";
import { Language, getLanguageName, setLanguage } from "@/lib/i18n";
import { authService } from "@/services/authService";
import { toast } from "sonner";

const LanguageSelector = () => {
  const { language, setLanguage: setLocalLanguage } = useTranslation();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleLanguageChange = async (newLang: Language) => {
    setIsUpdating(true);

    try {
      // Update UI immediately for better UX
      setLocalLanguage(newLang);
      setLanguage(newLang);

      // Update on server if user is logged in
      if (authService.isAuthenticated()) {
        await authService.updateLanguage(newLang);

        // Refresh user data to get updated language
        await authService.getCurrentUser();
      }
    } catch (error) {
      console.error('Failed to update language:', error);
      toast.error('Failed to update language');
    } finally {
      setIsUpdating(false);
    }
  };

  const languages: Language[] = ['ru', 'en', 'kk'];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" disabled={isUpdating} className="gap-2">
          <Globe className="h-4 w-4" />
          <span className="hidden sm:inline">{getLanguageName(language)}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => handleLanguageChange(lang)}
            className={language === lang ? "bg-accent" : ""}
          >
            {getLanguageName(lang)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSelector;
