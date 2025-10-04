import { useState } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
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
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();

  const handleLanguageChange = async (newLang: Language) => {
    setIsUpdating(true);

    try {
      // Update UI immediately for better UX
      setLocalLanguage(newLang);
      setLanguage(newLang);

      // Update URL to reflect new language
      const currentPath = location.pathname;
      const currentLang = params.lang;

      // Replace language in URL or prepend it
      let newPath: string;
      if (currentLang && (currentLang === 'ru' || currentLang === 'en' || currentLang === 'kk')) {
        // Replace existing language
        newPath = currentPath.replace(`/${currentLang}`, `/${newLang}`);
      } else if (currentPath === '/') {
        // Homepage without language
        newPath = `/${newLang}`;
      } else if (currentPath.startsWith('/auth') || currentPath.startsWith('/admin')) {
        // Don't modify auth/admin paths
        newPath = currentPath;
      } else {
        // Prepend language to path
        newPath = `/${newLang}${currentPath}`;
      }

      navigate(newPath, { replace: true });

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
