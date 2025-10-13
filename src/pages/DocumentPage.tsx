import { useState, useEffect, useRef, forwardRef, createRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { authService } from "@/services/authService";
import { chapterService } from "@/services/chapterService";
import { pageService } from "@/services/pageService";
import { paragraphService } from "@/services/paragraphService";
import DocumentLayout from "@/components/DocumentLayout";
import DocumentStructure from "@/components/DocumentStructure";
import ParagraphWithComments from "@/components/ParagraphWithComments";
import CommentPanel from "@/components/CommentPanel";
import ChapterDialog from "@/components/ChapterDialog";
import PageDialog from "@/components/PageDialog";
import ChapterPagesList from "@/components/ChapterPagesList";
import FollowButton from "@/components/FollowButton";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import AutoResizeTextarea from "@/components/AutoResizeTextarea";
import RichTextEditor from "@/components/RichTextEditor";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Pencil, Save, X, Plus, Trash2, Type, Image, Quote, Code, Share2, GripVertical, List, Link2, Eye, Table, Minus, Info, AlertTriangle, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ru, enUS, kk } from "date-fns/locale";
import { t, getCurrentLanguage, setLanguage, type Language } from "@/lib/i18n";
import type { Chapter, Page } from "@/lib/api/types";
import ImageUploadZone from "@/components/ImageUploadZone";

interface SortableParagraphProps {
  paragraph: { id: string; content: string; orderIndex: number; type?: string; caption?: string; linkedPageId?: string };
  index: number;
  onContentChange: (content: string) => void;
  onCaptionChange?: (caption: string) => void;
  onLinkedPageChange?: (linkedPageId: string | undefined) => void;
  onDelete: () => void;
  onEnterKey: () => void;
  onTypeChange: (type: string) => void;
  onPasteMultipleParagraphs?: (paragraphs: string[]) => void;
  chapters?: Chapter[];
}

const SortableParagraph = forwardRef<HTMLTextAreaElement | HTMLDivElement, SortableParagraphProps>(
  ({ paragraph, index, onContentChange, onCaptionChange, onLinkedPageChange, onDelete, onEnterKey, onTypeChange, onPasteMultipleParagraphs, chapters }, ref) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: paragraph.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Handle keyboard shortcut to open type menu
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "/") {
      e.preventDefault();
      setDropdownOpen(true);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="relative group flex items-start gap-2"
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center gap-1 mt-4 ml-2">
        <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs min-w-[60px]">
              {paragraph.type ? t(`paragraph.${paragraph.type.toLowerCase()}`) : t("paragraph.text")}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => { onTypeChange("Text"); setDropdownOpen(false); }}>
              <Type className="h-4 w-4 mr-2" />
              Text Paragraph
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onTypeChange("Header"); setDropdownOpen(false); }}>
              <Type className="h-4 w-4 mr-2" />
              Header
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onTypeChange("Code"); setDropdownOpen(false); }}>
              <Code className="h-4 w-4 mr-2" />
              Code Block
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onTypeChange("Quote"); setDropdownOpen(false); }}>
              <Quote className="h-4 w-4 mr-2" />
              Quote
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onTypeChange("Image"); setDropdownOpen(false); }}>
              <Image className="h-4 w-4 mr-2" />
              Image
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onTypeChange("List"); setDropdownOpen(false); }}>
              <List className="h-4 w-4 mr-2" />
              List
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onTypeChange("Table"); setDropdownOpen(false); }}>
              <Table className="h-4 w-4 mr-2" />
              Table
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onTypeChange("Link"); setDropdownOpen(false); }}>
              <Link2 className="h-4 w-4 mr-2" />
              Link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onTypeChange("Divider"); setDropdownOpen(false); }}>
              <Minus className="h-4 w-4 mr-2" />
              Horizontal Divider
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { onTypeChange("Callout"); setDropdownOpen(false); }}>
              <Info className="h-4 w-4 mr-2" />
              Callout Box
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 space-y-2">
        {paragraph.type === "Image" ? (
          <>
            {!paragraph.content ? (
              <ImageUploadZone
                onUploadComplete={(url) => onContentChange(url)}
                className="my-2"
              />
            ) : (
              <div className="space-y-3">
                {/* Image Preview */}
                <div className="relative rounded-lg border border-border overflow-hidden bg-muted/30">
                  <img
                    src={paragraph.content}
                    alt={paragraph.caption || "Uploaded image"}
                    className="w-full h-auto max-h-96 object-contain"
                    onError={(e) => {
                      e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23ccc' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23666'%3EImage Error%3C/text%3E%3C/svg%3E";
                    }}
                  />
                  {/* Action buttons overlay */}
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      className="h-8 shadow-md"
                      onClick={() => onContentChange("")}
                      title={t("document.replaceImage")}
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      {t("document.replace")}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-8 shadow-md"
                      onClick={() => {
                        onContentChange("");
                        if (onCaptionChange) onCaptionChange("");
                      }}
                      title={t("document.removeImageNote")}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      {t("document.remove")}
                    </Button>
                  </div>
                </div>

                {/* Image URL (read-only) */}
                <div className="text-xs text-muted-foreground truncate bg-muted/50 px-3 py-2 rounded">
                  <span className="font-medium">{t("document.urlLabel")}</span> {paragraph.content}
                </div>

                {/* Caption Input */}
                <Input
                  value={paragraph.caption || ""}
                  onChange={(e) => onCaptionChange?.(e.target.value)}
                  placeholder={t("paragraph.imageCaption")}
                  className="text-sm"
                />
              </div>
            )}
          </>
        ) : paragraph.type === "Table" ? (
          <AutoResizeTextarea
            ref={ref as any}
            value={paragraph.content}
            onChange={(e) => onContentChange(e.target.value)}
            onPasteMultipleParagraphs={onPasteMultipleParagraphs}
            placeholder={t("paragraph.tablePlaceholder")}
            className="w-full border-0 border-b border-border bg-transparent px-0 py-4 text-foreground leading-relaxed placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none transition-colors font-mono text-sm"
          />
        ) : paragraph.type === "Link" ? (
          <div className="space-y-3">
            <select
              value={paragraph.linkedPageId || ""}
              onChange={(e) => onLinkedPageChange?.(e.target.value || undefined)}
              className="w-full border border-border rounded-md px-3 py-2 bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">{t("paragraph.selectPage")}</option>
              {chapters?.map(chapter => (
                <optgroup key={chapter.id} label={chapter.title}>
                  {chapter.pages.map(page => (
                    <option key={page.id} value={page.id}>
                      {page.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <Input
              value={paragraph.caption || ""}
              onChange={(e) => onCaptionChange?.(e.target.value)}
              placeholder={t("paragraph.linkComment")}
              className="text-sm"
            />
          </div>
        ) : paragraph.type === "Divider" ? (
          <hr className="my-0 border-t-2 border-border" />
        ) : paragraph.type === "Callout" ? (
          <div className="space-y-3">
            <select
              value={paragraph.caption || "info"}
              onChange={(e) => onCaptionChange?.(e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 bg-background text-foreground focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            >
              <option value="info">Info (Blue)</option>
              <option value="warning">Warning (Yellow)</option>
              <option value="success">Success (Green)</option>
              <option value="error">Error (Red)</option>
            </select>
            <div className={`p-4 rounded-r flex gap-3 ${
              paragraph.caption === "warning" ? "border-l-4 border-dashed border-gray-500 bg-gray-50 dark:bg-gray-900/20" :
              paragraph.caption === "success" ? "border-l-4 border-gray-700 bg-gray-50 dark:bg-gray-900/20" :
              paragraph.caption === "error" ? "border-l-[6px] border-gray-900 dark:border-gray-100 bg-gray-100 dark:bg-gray-900/40" :
              "border-l-4 border-gray-600 bg-gray-50 dark:bg-gray-900/20"
            }`}>
              {paragraph.caption === "warning" ? (
                <AlertTriangle className="h-5 w-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
              ) : paragraph.caption === "success" ? (
                <CheckCircle className="h-5 w-5 text-gray-700 dark:text-gray-300 flex-shrink-0 mt-0.5" />
              ) : paragraph.caption === "error" ? (
                <AlertCircle className="h-5 w-5 text-gray-900 dark:text-gray-100 flex-shrink-0 mt-0.5" />
              ) : (
                <Info className="h-5 w-5 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-0.5" />
              )}
            <RichTextEditor
                ref={ref as any}
                value={paragraph.content}
                onChange={(value) => onContentChange(value)}
                onEnterKey={onEnterKey}
                onPasteMultipleParagraphs={onPasteMultipleParagraphs}
                placeholder="Enter callout content..."
                className="document-content w-full border-0 bg-transparent px-0 py-0 text-foreground leading-relaxed placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none flex-1"
              />
            </div>
          </div>
        ) : paragraph.type === "Header" ? (
          <RichTextEditor
            ref={ref as any}
            value={paragraph.content}
            onChange={(value) => onContentChange(value)}
            onEnterKey={onEnterKey}
            onPasteMultipleParagraphs={onPasteMultipleParagraphs}
            placeholder={t("paragraph.headerPlaceholder")}
            className="w-full border-0 border-b border-border bg-transparent px-0 py-4 text-2xl font-bold text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none transition-colors min-h-[3rem]"
          />
        ) : paragraph.type === "List" ? (
          <RichTextEditor
            ref={ref as any}
            value={paragraph.content}
            onChange={(value) => onContentChange(value)}
            onEnterKey={onEnterKey}
            onPasteMultipleParagraphs={onPasteMultipleParagraphs}
            placeholder={t("paragraph.listPlaceholder")}
            className="document-content list-editor w-full border-0 border-b border-border bg-transparent px-0 py-2 text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none transition-colors min-h-[2.5rem]"
            isListMode={true}
          />
        ) : paragraph.type === "Text" ? (
          <RichTextEditor
            ref={ref as any}
            value={paragraph.content}
            onChange={(value) => onContentChange(value)}
            onEnterKey={onEnterKey}
            onPasteMultipleParagraphs={onPasteMultipleParagraphs}
            placeholder={t("paragraph.contentPlaceholder")}
            className="document-content w-full border-0 border-b border-border bg-transparent px-0 py-4 text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none transition-colors min-h-[2.5rem]"
          />
        ) : paragraph.type === "Code" ? (
          <AutoResizeTextarea
            ref={ref as any}
            value={paragraph.content}
            onChange={(e) => onContentChange(e.target.value)}
            onPasteMultipleParagraphs={onPasteMultipleParagraphs}
            placeholder={t("paragraph.contentPlaceholder")}
            className="w-full bg-muted p-4 rounded-md overflow-x-auto whitespace-pre-wrap break-words text-sm font-mono text-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:outline-none transition-colors"
          />
        ) : paragraph.type === "Quote" ? (
          <AutoResizeTextarea
            ref={ref as any}
            value={paragraph.content}
            onChange={(e) => onContentChange(e.target.value)}
            onEnterKey={onEnterKey}
            onPasteMultipleParagraphs={onPasteMultipleParagraphs}
            placeholder={t("paragraph.contentPlaceholder")}
            className="document-content w-full border-0 border-l-4 border-primary pl-4 bg-transparent py-4 italic text-muted-foreground placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none transition-colors"
          />
        ) : (
          <AutoResizeTextarea
            ref={ref as any}
            value={paragraph.content}
            onChange={(e) => onContentChange(e.target.value)}
            onEnterKey={onEnterKey}
            onPasteMultipleParagraphs={onPasteMultipleParagraphs}
            placeholder={t("paragraph.contentPlaceholder")}
            className="w-full border-0 border-b border-border bg-transparent px-0 py-4 text-foreground leading-relaxed placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none transition-colors"
          />
        )}
      </div>
      <Button
        onClick={onDelete}
        variant="destructive"
        size="sm"
        className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
});

SortableParagraph.displayName = "SortableParagraph";

const DocumentPage = () => {
  const { slug, chapterSlug, pageSlug, lang } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Use either new route params (chapterSlug/pageSlug) or legacy (slug)
  const actualPageSlug = pageSlug || slug;
  const [activeParagraphId, setActiveParagraphId] = useState<string | null>(null);
  const [commentPanelTop, setCommentPanelTop] = useState(100);
  const [commentPanelRight, setCommentPanelRight] = useState('1rem');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const [editedDescription, setEditedDescription] = useState("");
  const [editedIsDraft, setEditedIsDraft] = useState(false);
  const [editedParagraphs, setEditedParagraphs] = useState<Array<{ id: string; content: string; orderIndex: number; type?: string; caption?: string; linkedPageId?: string }>>([]);
  const [chapterDialogOpen, setChapterDialogOpen] = useState(false);
  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | undefined>();
  const [editingPage, setEditingPage] = useState<Page | undefined>();
  const [newPageChapterId, setNewPageChapterId] = useState<string | undefined>();
  const paragraphRefs = useRef<Map<string, React.RefObject<HTMLTextAreaElement | HTMLDivElement>>>(new Map());
  const isEditor = authService.isEditor();

  // Set language from URL parameter or default to 'ru'
  useEffect(() => {
    const urlLang = lang as Language | undefined;
    if (urlLang && (urlLang === 'ru' || urlLang === 'en' || urlLang === 'kk')) {
      setLanguage(urlLang);
    } else if (!lang) {
      // If no language in URL, redirect to language-specific URL
      const currentLang = getCurrentLanguage();
      if (chapterSlug && pageSlug) {
        navigate(`/${currentLang}/${chapterSlug}/${pageSlug}`, { replace: true });
      } else if (actualPageSlug) {
        navigate(`/${currentLang}/${actualPageSlug}`, { replace: true });
      }
    }
  }, [lang, chapterSlug, pageSlug, actualPageSlug, navigate]);

  // Strip Markdown-style links [text](url) and return just the text for TOC
  const stripMarkdownLinks = (text: string) => {
    // Replace [text](url) with just text
    return text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
  };

  // Parse Markdown-style formatting (bold, italic) for description
  const parseMarkdown = (text: string) => {
    const parts: (string | JSX.Element)[] = [];
    const boldRegex = /\*\*([^*]+)\*\*/g;
    const italicRegex = /\*([^*]+)\*/g;

    // Combine all matches
    const allMatches: Array<{ index: number; length: number; element: JSX.Element }> = [];
    let match: RegExpExecArray | null;

    // Find all bold text
    while ((match = boldRegex.exec(text)) !== null) {
      allMatches.push({
        index: match.index,
        length: match[0].length,
        element: (
          <strong key={match.index} className="font-bold">
            {match[1]}
          </strong>
        )
      });
    }

    // Find all italic text (but skip if it's part of bold)
    while ((match = italicRegex.exec(text)) !== null) {
      // Check if this is part of a bold marker (**)
      const isBoldMarker = text[match.index - 1] === '*' || text[match.index + match[0].length] === '*';
      if (!isBoldMarker) {
        allMatches.push({
          index: match.index,
          length: match[0].length,
          element: (
            <em key={match.index} className="italic">
              {match[1]}
            </em>
          )
        });
      }
    }

    // Sort by index
    allMatches.sort((a, b) => a.index - b.index);

    // Build the parts array
    let lastIndex = 0;
    for (const match of allMatches) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      // Add the element
      parts.push(match.element);
      lastIndex = match.index + match.length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: chapters, isLoading: chaptersLoading } = useQuery({
    queryKey: ["chapters", isEditor],
    queryFn: () => chapterService.getAll(isEditor),
  });

  const { data: currentPage, isLoading: pageLoading } = useQuery({
    queryKey: ["page", actualPageSlug],
    queryFn: () => pageService.getBySlug(actualPageSlug!),
    enabled: !!actualPageSlug,
  });

  // Update document title and meta tags for SEO
  useEffect(() => {
    if (currentPage && chapters) {
      const chapter = chapters.find(c => c.id === currentPage.chapterId);
      const siteTitle = t("app.siteTitle");
      const pageTitle = currentPage.title;
      const chapterTitle = chapter?.title;

      // Set document title
      if (chapterTitle) {
        document.title = `${siteTitle} | ${chapterTitle} | ${pageTitle}`;
      } else {
        document.title = `${siteTitle} | ${pageTitle}`;
      }

      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription && currentPage.description) {
        metaDescription.setAttribute('content', currentPage.description);
      }

      // Update Open Graph meta tags
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute('content', `${siteTitle} | ${chapterTitle || ''} | ${pageTitle}`);
      }

      const ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription && currentPage.description) {
        ogDescription.setAttribute('content', currentPage.description);
      }

      // Update Twitter Card meta tags
      const twitterTitle = document.querySelector('meta[name="twitter:title"]');
      if (twitterTitle) {
        twitterTitle.setAttribute('content', `${siteTitle} | ${pageTitle}`);
      }

      const twitterDescription = document.querySelector('meta[name="twitter:description"]');
      if (twitterDescription && currentPage.description) {
        twitterDescription.setAttribute('content', currentPage.description);
      }
    } else {
      document.title = t("app.siteTitle");
    }
  }, [currentPage, chapters]);

  const { data: paragraphs, isLoading: paragraphsLoading } = useQuery({
    queryKey: ["paragraphs", currentPage?.id, isEditor],
    queryFn: () => paragraphService.getByPage(currentPage!.id, isEditor),
    enabled: !!currentPage?.id,
  });

  // Calculate comment panel position to avoid TOC overlap
  useEffect(() => {
    if (!activeParagraphId) return;

    const calculatePosition = () => {
      // Find the TOC element in the sidebar
      const tocElement = document.querySelector('.bg-card.border.shadow-sm.rounded-lg');

      // Get current scroll position
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

      // Calculate right position based on actual container width
      const containerElement = document.querySelector('.container');
      if (containerElement) {
        const containerRect = containerElement.getBoundingClientRect();
        const containerRight = containerRect.right;
        const viewportWidth = window.innerWidth;
        const rightOffset = viewportWidth - containerRight;
        setCommentPanelRight(`max(1rem, ${rightOffset + 8}px)`); // 16px = 1rem default spacing
      }

      if (tocElement) {
        const tocRect = tocElement.getBoundingClientRect();
        const tocBottom = tocRect.bottom;
        const tocTop = tocRect.top;

        // When at the top of the page, use a higher position (50px)
        // As you scroll down, transition to 100px
        const preferredTop = scrollTop < 100 ? 50 : 100;

        // Get viewport height
        const viewportHeight = window.innerHeight;

        // Only consider the VISIBLE portion of TOC (in viewport)
        const visibleTocTop = Math.max(0, tocTop); // If TOC is scrolled above viewport, start from 0
        const visibleTocBottom = Math.min(viewportHeight, tocBottom); // If TOC extends below viewport, cap at viewport height

        // Estimate panel height
        const estimatedPanelHeight = 700;
        const preferredBottom = preferredTop + estimatedPanelHeight;

        // Check if preferred position would overlap with VISIBLE TOC
        // Overlap occurs if: panel bottom > TOC top AND panel top < TOC bottom
        let newTop: number;

        if (preferredBottom > visibleTocTop && preferredTop < visibleTocBottom) {
          // Panel overlaps with visible TOC - push panel below visible TOC
          newTop = visibleTocBottom + 20; // 20px gap below visible TOC
        } else {
          // No overlap with visible TOC - use preferred position
          newTop = preferredTop;
        }

        setCommentPanelTop(newTop);
      } else {
        // If no TOC found, use position based on scroll
        const preferredTop = scrollTop < 100 ? 50 : 100;
        setCommentPanelTop(preferredTop);
      }
    };

    // Calculate on mount and when scrolling
    calculatePosition();
    window.addEventListener('scroll', calculatePosition, { passive: true });
    window.addEventListener('resize', calculatePosition, { passive: true });

    return () => {
      window.removeEventListener('scroll', calculatePosition);
      window.removeEventListener('resize', calculatePosition);
    };
  }, [activeParagraphId]);

  // Save to localStorage when editing
  useEffect(() => {
    if (isEditMode && currentPage) {
      const storageKey = `edit_${currentPage.id}`;
      const dataToSave = {
        title: editedTitle,
        description: editedDescription,
        isDraft: editedIsDraft,
        paragraphs: editedParagraphs,
      };
      localStorage.setItem(storageKey, JSON.stringify(dataToSave));
    }
  }, [isEditMode, currentPage, editedTitle, editedDescription, editedIsDraft, editedParagraphs]);

  // Warn before leaving page with unsaved changes
  useEffect(() => {
    if (!isEditMode) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isEditMode]);

  const savePageMutation = useMutation({
    mutationFn: async () => {
      await pageService.update(currentPage!.id, {
        title: editedTitle,
        description: editedDescription,
        isDraft: editedIsDraft,
      });

      for (const para of editedParagraphs) {
        await paragraphService.update(para.id, {
          content: para.content,
          orderIndex: para.orderIndex,
          type: para.type,
          caption: para.caption,
          linkedPageId: para.linkedPageId
        });
      }
    },
    onSuccess: () => {
      // Clear localStorage on successful save
      if (currentPage) {
        const storageKey = `edit_${currentPage.id}`;
        localStorage.removeItem(storageKey);
      }
      // Invalidate all queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["page", actualPageSlug] });
      queryClient.invalidateQueries({ queryKey: ["page"] });
      queryClient.invalidateQueries({ queryKey: ["paragraphs", currentPage?.id] });
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
      setIsEditMode(false);
      toast.success("Changes saved successfully!");
    },
    onError: (error: any) => {
      toast.error("Failed to save changes: " + error.message);
    },
  });

  const deleteParagraphMutation = useMutation({
    mutationFn: (paragraphId: string) => paragraphService.delete(paragraphId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paragraphs", currentPage?.id] });
      toast.success("Paragraph deleted!");
    },
    onError: (error: any) => {
      toast.error("Failed to delete: " + error.message);
    },
  });

  const addParagraphMutation = useMutation({
    mutationFn: async (type: string = "Text") => {
      const maxOrder = paragraphs?.reduce((max, p) => Math.max(max, p.orderIndex), -1) ?? -1;
      const newParagraph = await paragraphService.create({
        pageId: currentPage!.id,
        content: type === "Image" ? "" : "New paragraph content...",
        orderIndex: maxOrder + 1,
        type,
      });
      return newParagraph;
    },
    onSuccess: (newParagraph) => {
      // Update the edited paragraphs state if in edit mode
      if (isEditMode && newParagraph) {
        setEditedParagraphs(prev => [...prev, {
          id: newParagraph.id,
          content: newParagraph.content,
          orderIndex: newParagraph.orderIndex,
          type: newParagraph.type,
          caption: newParagraph.caption,
          linkedPageId: newParagraph.linkedPageId
        }]);
      }
      queryClient.invalidateQueries({ queryKey: ["paragraphs", currentPage?.id] });
      toast.success("Paragraph added!");
    },
    onError: (error: any) => {
      toast.error("Failed to add paragraph: " + error.message);
    },
  });

  const saveChapterMutation = useMutation({
    mutationFn: async (data: { id?: string; title: string; description: string; slug: string; icon: string }) => {
      if (data.id) {
        return chapterService.update(data.id, { title: data.title, description: data.description, slug: data.slug, icon: data.icon });
      } else {
        const maxOrder = chapters?.reduce((max, c) => Math.max(max, c.orderIndex), -1) || 0;
        return chapterService.create({ title: data.title, description: data.description, slug: data.slug, icon: data.icon, orderIndex: maxOrder + 1, isDraft: true });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
      setChapterDialogOpen(false);
      setEditingChapter(undefined);
      toast.success(editingChapter ? "Chapter updated!" : "Chapter created!");
    },
    onError: (error: any) => {
      toast.error("Failed to save chapter: " + error.message);
    },
  });

  const toggleChapterDraftMutation = useMutation({
    mutationFn: async ({ id, isDraft }: { id: string; isDraft: boolean }) => {
      return chapterService.update(id, { isDraft });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
      toast.success("Chapter updated!");
    },
    onError: (error: any) => {
      toast.error("Failed to update chapter: " + error.message);
    },
  });

  const togglePageDraftMutation = useMutation({
    mutationFn: async ({ id, isDraft }: { id: string; isDraft: boolean }) => {
      return pageService.update(id, { isDraft });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
      queryClient.invalidateQueries({ queryKey: ["page"] });
      toast.success("Page updated!");
    },
    onError: (error: any) => {
      toast.error("Failed to update page: " + error.message);
    },
  });

  const savePageMutation2 = useMutation({
    mutationFn: async (data: { id?: string; title: string; description: string; slug: string; chapterId: string }) => {
      if (data.id) {
        return pageService.update(data.id, {
          title: data.title,
          description: data.description,
          slug: data.slug,
          chapterId: data.chapterId,
        });
      } else {
        const newPage = await pageService.create({
          title: data.title,
          description: data.description,
          slug: data.slug,
          chapterId: data.chapterId,
        });

        // Create a default empty text paragraph for the new page
        await paragraphService.create({
          pageId: newPage.id,
          content: "",
          orderIndex: 0,
          type: "Text",
        });

        return newPage;
      }
    },
    onSuccess: (newPage) => {
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
      queryClient.invalidateQueries({ queryKey: ["page"] });
      setPageDialogOpen(false);
      setEditingPage(undefined);
      setNewPageChapterId(undefined);
      toast.success(editingPage ? "Page updated!" : "Page created!");
      if (!editingPage && newPage) {
        const currentLang = lang || getCurrentLanguage();
        navigate(`/${currentLang}/${newPage.slug}`);
      }
    },
    onError: (error: any) => {
      toast.error("Failed to save page: " + error.message);
    },
  });

  const handleEditMode = () => {
    if (!isEditor) {
      toast.error(t("editor.signInToEdit"));
      navigate("/auth");
      return;
    }

    if (!isEditMode && currentPage) {
      // Try to load from localStorage first
      const storageKey = `edit_${currentPage.id}`;
      const savedData = localStorage.getItem(storageKey);

      if (savedData) {
        try {
          const { title, description, isDraft, paragraphs: savedParagraphs } = JSON.parse(savedData);
          setEditedTitle(title);
          setEditedDescription(description);
          setEditedIsDraft(isDraft);
          setEditedParagraphs(savedParagraphs);
          toast.info("Restored unsaved changes from local storage");
        } catch (e) {
          // If parsing fails, use current data
          setEditedTitle(currentPage.title);
          setEditedDescription(currentPage.description || "");
          setEditedIsDraft(currentPage.isDraft);
          setEditedParagraphs(paragraphs?.map(p => ({ id: p.id, content: p.content, orderIndex: p.orderIndex, type: p.type, caption: p.caption, linkedPageId: p.linkedPageId })) || []);
        }
      } else {
        setEditedTitle(currentPage.title);
        setEditedDescription(currentPage.description || "");
        setEditedIsDraft(currentPage.isDraft);
        setEditedParagraphs(paragraphs?.map(p => ({ id: p.id, content: p.content, orderIndex: p.orderIndex, type: p.type, caption: p.caption, linkedPageId: p.linkedPageId })) || []);
      }
    }
    setIsEditMode(!isEditMode);
  };

  const handleCancel = () => {
    if (currentPage) {
      const storageKey = `edit_${currentPage.id}`;
      localStorage.removeItem(storageKey);
    }
    setIsEditMode(false);
    setEditedTitle("");
    setEditedDescription("");
    setEditedParagraphs([]);
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard!");
    } catch (err) {
      toast.error("Failed to copy link");
    }
  };

  const handleNavigation = (path: string): boolean => {
    if (!isEditMode) {
      return true;
    }

    const confirmed = window.confirm(
      "You have unsaved changes. If you leave this page, your changes will be lost. Do you want to continue?"
    );

    if (confirmed && currentPage) {
      // Clean up localStorage on navigation away
      const storageKey = `edit_${currentPage.id}`;
      localStorage.removeItem(storageKey);
      setIsEditMode(false);
    }

    return confirmed;
  };

  const handleAddChapter = () => {
    setEditingChapter(undefined);
    setChapterDialogOpen(true);
  };

  const handleEditChapter = (chapterId: string) => {
    const chapter = chapters?.find(c => c.id === chapterId);
    if (chapter) {
      setEditingChapter(chapter);
      setChapterDialogOpen(true);
    }
  };

  const handleToggleChapterDraft = (chapterId: string, isDraft: boolean) => {
    toggleChapterDraftMutation.mutate({ id: chapterId, isDraft });
  };

  const handleTogglePageDraft = (pageId: string, isDraft: boolean) => {
    togglePageDraftMutation.mutate({ id: pageId, isDraft });
  };

  const handleReorderPages = async (chapterId: string, pages: Page[]) => {
    try {
      // Update order for all pages
      for (const page of pages) {
        await pageService.update(page.id, { orderIndex: page.orderIndex });
      }
      queryClient.invalidateQueries({ queryKey: ["chapters"] });
      toast.success("Page order updated!");
    } catch (error: any) {
      toast.error("Failed to reorder pages: " + error.message);
    }
  };

  const handleAddPage = (chapterId: string) => {
    setEditingPage(undefined);
    setNewPageChapterId(chapterId);
    setPageDialogOpen(true);
  };

  const handleEditPage = (pageId: string) => {
    const page = chapters?.flatMap(c => c.pages).find(p => p.id === pageId);
    if (page) {
      setEditingPage(page);
      setPageDialogOpen(true);
    }
  };

  const handleSaveChapter = (data: { title: string; description: string; slug: string; icon: string }) => {
    saveChapterMutation.mutate({
      id: editingChapter?.id,
      ...data,
    });
  };

  const handleSavePage = (data: { title: string; description: string; slug: string; chapterId: string }) => {
    savePageMutation2.mutate({
      id: editingPage?.id,
      ...data,
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setEditedParagraphs((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const reordered = arrayMove(items, oldIndex, newIndex);
        // Update orderIndex for all items
        return reordered.map((item, index) => ({ ...item, orderIndex: index }));
      });
    }
  };

  // Handle loading state
  if (chaptersLoading || pageLoading || paragraphsLoading) {
    return (
      <DocumentLayout>
        <div className="space-y-4">
          <Skeleton className="h-12 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
      </DocumentLayout>
    );
  }

  // Handle page not found
  if (!currentPage) {
    return (
      <DocumentLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-2">Page not found</h2>
          <p className="text-muted-foreground">The requested document page could not be found.</p>
        </div>
      </DocumentLayout>
    );
  }

  return (
    <>
      <DocumentLayout
        sidebar={chapters && <DocumentStructure chapters={chapters} onAddChapter={handleAddChapter} onNavigate={handleNavigation} />}
        comments={
          !isEditMode && (
            <div className="space-y-4">
              {/* Table of Contents - Always visible */}
              <div className="bg-card border shadow-sm rounded-lg p-4">
                <h3 className="font-semibold mb-4">{t("document.tableOfContents")}</h3>
                <div className="space-y-2">
                  {paragraphs && paragraphs.length > 0 ? (
                    paragraphs
                      .filter(p => p.type === 'Header')
                      .map((paragraph, index) => (
                        <a
                          key={paragraph.id}
                          href={`#paragraph-${paragraph.id}`}
                          className="block text-sm text-muted-foreground hover:text-foreground transition-colors pl-2 border-l-2 border-transparent hover:border-primary"
                          onClick={(e) => {
                            e.preventDefault();
                            document.getElementById(`paragraph-${paragraph.id}`)?.scrollIntoView({ behavior: 'smooth' });
                          }}
                        >
                          {stripMarkdownLinks(paragraph.content)}
                        </a>
                      ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic">No headers found</p>
                  )}
                </div>
              </div>

              {/* Paragraph Comments - Shows when paragraph selected */}
              {activeParagraphId && (
                <div
                  className="fixed w-[320px] transition-all duration-300 z-10 hidden xl:block"
                  style={{
                    top: `${commentPanelTop}px`,
                    right: commentPanelRight,
                  }}
                >
                  <CommentPanel
                    paragraphId={activeParagraphId}
                    mode="paragraph"
                  />
                </div>
              )}
            </div>
          )
        }
      >
      <article className="bg-card rounded-lg shadow-sm border p-8 lg:p-12">
        {/* Chapter Pages List - Mobile Only */}
        {!isEditMode && chapterSlug && chapters && (
          <ChapterPagesList
            pages={chapters.find(c => c.slug === chapterSlug)?.pages || []}
            chapterSlug={chapterSlug}
            currentPageSlug={actualPageSlug}
          />
        )}

        {isEditMode && (
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
              <span className="font-medium">✏️ Edit Mode:</span>
              Your changes are being saved locally but not to the database yet. Click "Save" to persist changes.
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-2">
              💡 Tip: Press Ctrl/Cmd+/ to open paragraph type menu, then use arrow keys to navigate and Enter to select
            </p>
          </div>
        )}
        <header className="mb-8 pb-6 border-b flex justify-between items-start">
          <div className="flex-1">
            {isEditMode ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <Input
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="text-3xl lg:text-4xl font-bold flex-1"
                    placeholder="Page title"
                  />
                  {editedIsDraft && (
                    <span className="text-sm px-3 py-1 rounded bg-yellow-100 text-yellow-800 shrink-0">
                      Draft
                    </span>
                  )}
                </div>
                <div className="border rounded-md p-3 min-h-[80px]">
                  <RichTextEditor
                    value={editedDescription}
                    onChange={(value) => setEditedDescription(value)}
                    placeholder="Page description (optional)"
                    className="document-content w-full border-0 bg-transparent px-0 py-0 text-lg text-foreground leading-relaxed placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:outline-none"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-3">
                  <h1 className="text-3xl lg:text-4xl font-bold">{currentPage.title}</h1>
                  {isEditor && currentPage.isDraft && (
                    <span className="text-sm px-3 py-1 rounded bg-yellow-100 text-yellow-800">
                      Draft
                    </span>
                  )}
                </div>
                {currentPage.description && (
                  <p className="text-lg text-muted-foreground mb-2">{parseMarkdown(currentPage.description)}</p>
                )}
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  {currentPage.updatedAt && (
                    <p>
                      {t("misc.lastUpdated")} {format(new Date(currentPage.updatedAt), 'dd/MM/yyyy')}
                      {currentPage.updatedByUsername && ` ${t("misc.by")} ${currentPage.updatedByUsername}`}
                    </p>
                  )}
                  {currentPage.viewCount > 0 && (
                    <p className="flex items-center gap-1">
                      <Eye className="h-4 w-4 text-gray-400" />
                      {currentPage.viewCount.toLocaleString()}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2 ml-4">
            {!isEditMode && <FollowButton pageId={currentPage.id} />}
            <Button onClick={handleShare} variant="ghost" size="sm" title="Share this page">
              <Share2 className="h-4 w-4" />
            </Button>
            {isEditMode ? (
              <>
                <Button
                  onClick={() => setEditedIsDraft(!editedIsDraft)}
                  variant={editedIsDraft ? "default" : "outline"}
                  size="sm"
                >
                  {editedIsDraft ? t("editor.draftClickToPublish") : t("editor.publishedClickToHide")}
                </Button>
                <Button onClick={() => savePageMutation.mutate()} size="sm" disabled={savePageMutation.isPending}>
                  <Save className="h-4 w-4 mr-1" />
                  {t("comments.save")}
                </Button>
                <Button onClick={handleCancel} variant="outline" size="sm">
                  <X className="h-4 w-4 mr-1" />
                  {t("comments.cancel")}
                </Button>
              </>
            ) : isEditor && (
              <Button onClick={handleEditMode} variant="outline" size="sm">
                <Pencil className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
          </div>
        </header>

        <div className="space-y-4">
          {isEditMode ? (
            <>
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={editedParagraphs.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {editedParagraphs.map((paragraph, index) => {
                    // Create or get ref for this paragraph
                    if (!paragraphRefs.current.has(paragraph.id)) {
                      paragraphRefs.current.set(paragraph.id, createRef<HTMLTextAreaElement>());
                    }
                    const ref = paragraphRefs.current.get(paragraph.id)!;

                    return (
                      <SortableParagraph
                        key={paragraph.id}
                        ref={ref}
                        paragraph={paragraph}
                        index={index}
                        chapters={chapters}
                        onContentChange={(content) => {
                          const updated = [...editedParagraphs];
                          updated[index].content = content;
                          setEditedParagraphs(updated);
                        }}
                        onCaptionChange={(caption) => {
                          const updated = [...editedParagraphs];
                          updated[index].caption = caption;
                          setEditedParagraphs(updated);
                        }}
                        onLinkedPageChange={(linkedPageId) => {
                          const updated = [...editedParagraphs];
                          updated[index].linkedPageId = linkedPageId;
                          setEditedParagraphs(updated);
                        }}
                        onDelete={() => {
                          deleteParagraphMutation.mutate(paragraph.id);
                          setEditedParagraphs(editedParagraphs.filter(p => p.id !== paragraph.id));
                        }}
                        onEnterKey={() => {
                          addParagraphMutation.mutate("Text", {
                            onSuccess: (newPara: any) => {
                              // Reorder: insert new paragraph after current one
                              const updated = [...editedParagraphs];
                              updated.splice(index + 1, 0, {
                                id: newPara.id,
                                content: "",
                                orderIndex: paragraph.orderIndex + 1,
                                type: "Text"
                              });
                              // Update order indices for subsequent paragraphs
                              updated.forEach((p, i) => p.orderIndex = i);
                              setEditedParagraphs(updated);

                              // Focus on the new paragraph
                              setTimeout(() => {
                                const newRef = paragraphRefs.current.get(newPara.id);
                                newRef?.current?.focus();
                              }, 100);
                            }
                          });
                        }}
                        onTypeChange={(type) => {
                          const updated = [...editedParagraphs];
                          updated[index].type = type;
                          // Clear content when switching to Image type to show upload zone
                          if (type === "Image" && updated[index].content && !updated[index].content.startsWith("http")) {
                            updated[index].content = "";
                            updated[index].caption = "";
                          }
                          setEditedParagraphs(updated);
                        }}
                        onPasteMultipleParagraphs={async (paragraphs) => {
                          if (!currentPage) return;

                          try {
                            // Update the current paragraph with the first pasted paragraph
                            const updated = [...editedParagraphs];
                            updated[index].content = paragraphs[0];
                            setEditedParagraphs(updated);

                            // Create additional paragraphs for the rest
                            for (let i = 1; i < paragraphs.length; i++) {
                              const newPara = await paragraphService.create({
                                pageId: currentPage.id,
                                content: paragraphs[i],
                                orderIndex: paragraph.orderIndex + i,
                                type: "Text",
                              });

                              updated.splice(index + i, 0, {
                                id: newPara.id,
                                content: newPara.content,
                                orderIndex: newPara.orderIndex,
                                type: "Text"
                              });
                            }

                            // Update order indices for all paragraphs
                            updated.forEach((p, i) => p.orderIndex = i);
                            setEditedParagraphs(updated);

                            queryClient.invalidateQueries({ queryKey: ["paragraphs", currentPage.id] });
                            toast.success(`Pasted ${paragraphs.length} paragraph${paragraphs.length > 1 ? 's' : ''}!`);
                          } catch (error: any) {
                            toast.error("Failed to paste paragraphs: " + error.message);
                          }
                        }}
                      />
                    );
                  })}
                </SortableContext>
              </DndContext>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="flex-1" disabled={addParagraphMutation.isPending}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Paragraph
                    </Button>
                  </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => addParagraphMutation.mutate("Text")}>
                    <Type className="h-4 w-4 mr-2" />
                    Text Paragraph
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addParagraphMutation.mutate("Header")}>
                    <Type className="h-4 w-4 mr-2" />
                    Header
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addParagraphMutation.mutate("Image")}>
                    <Image className="h-4 w-4 mr-2" />
                    Image
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addParagraphMutation.mutate("Quote")}>
                    <Quote className="h-4 w-4 mr-2" />
                    Quote
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addParagraphMutation.mutate("Code")}>
                    <Code className="h-4 w-4 mr-2" />
                    Code Block
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addParagraphMutation.mutate("List")}>
                    <List className="h-4 w-4 mr-2" />
                    List
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addParagraphMutation.mutate("Table")}>
                    <Table className="h-4 w-4 mr-2" />
                    Table
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addParagraphMutation.mutate("Link")}>
                    <Link2 className="h-4 w-4 mr-2" />
                    Link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addParagraphMutation.mutate("Divider")}>
                    <Minus className="h-4 w-4 mr-2" />
                    Horizontal Divider
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => addParagraphMutation.mutate("Callout")}>
                    <Info className="h-4 w-4 mr-2" />
                    Callout Box
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            </>
          ) : (
            paragraphs && paragraphs.length > 0 ? (
              paragraphs.map((paragraph) => (
                <ParagraphWithComments
                  key={paragraph.id}
                  paragraph={paragraph}
                  chapters={chapters}
                  isActive={activeParagraphId === paragraph.id}
                  onClick={() => {
                    if (activeParagraphId === paragraph.id) {
                      setActiveParagraphId(null);
                    } else {
                      setActiveParagraphId(paragraph.id);
                    }
                  }}
                />
              ))
            ) : (
              <p className="text-muted-foreground italic">
                No content available for this page yet.
              </p>
            )
          )}
        </div>

      </article>

      {/* General Discussion Section - Always visible below article */}
      {!isEditMode && (
        <div className="mt-8 bg-card rounded-lg shadow-sm border p-8 lg:p-12">
          <CommentPanel pageId={currentPage.id} mode="page" />
        </div>
      )}

      </DocumentLayout>

      {/* Chapter Dialog */}
      <ChapterDialog
        open={chapterDialogOpen}
        onOpenChange={setChapterDialogOpen}
        chapter={editingChapter}
        onSave={handleSaveChapter}
        onReorderPages={handleReorderPages}
        isSaving={saveChapterMutation.isPending}
      />

      {/* Page Dialog */}
      <PageDialog
        open={pageDialogOpen}
        onOpenChange={setPageDialogOpen}
        page={editingPage}
        chapterId={newPageChapterId}
        onSave={handleSavePage}
        isSaving={savePageMutation2.isPending}
      />

    </>
  );
};

export default DocumentPage;
