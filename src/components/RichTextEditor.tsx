import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { cn } from "@/lib/utils";

interface RichTextEditorProps {
  value: string;
  onChange?: (value: string) => void;
  onEnterKey?: () => void;
  onPasteMultipleParagraphs?: (paragraphs: string[]) => void;
  placeholder?: string;
  className?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  isListMode?: boolean;
}

const RichTextEditor = forwardRef<HTMLDivElement, RichTextEditorProps>(
  ({ value, onChange, onEnterKey, onPasteMultipleParagraphs, placeholder, className, onKeyDown, isListMode }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const isComposingRef = useRef(false);

    useImperativeHandle(ref, () => editorRef.current!);

    // Convert Markdown to HTML for display
    const markdownToHtml = (markdown: string): string => {
      let html = markdown;

      // Links: [text](url) -> <a>text</a>
      html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-primary underline">$1</a>');

      // Bold: **text** -> <strong>text</strong>
      html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

      // Italic: *text* -> <em>text</em> (but not if part of **)
      html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

      // Line breaks
      if (isListMode) {
        // In list mode, just convert newlines to <br> without adding bullets
        // Bullets are managed manually by the user
        html = html.replace(/\n/g, '<br>');
      } else {
        html = html.replace(/\n/g, '<br>');
      }

      return html;
    };

    // Convert HTML back to Markdown
    const htmlToMarkdown = (html: string): string => {
      let markdown = html;

      // Remove divs and replace with newlines
      markdown = markdown.replace(/<div>/g, '\n').replace(/<\/div>/g, '');

      // Links: <a href="url">text</a> -> [text](url)
      markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)');

      // Bold: <strong>text</strong> -> **text**
      markdown = markdown.replace(/<strong>(.*?)<\/strong>/g, '**$1**');
      markdown = markdown.replace(/<b>(.*?)<\/b>/g, '**$1**');

      // Italic: <em>text</em> -> *text*
      markdown = markdown.replace(/<em>(.*?)<\/em>/g, '*$1*');
      markdown = markdown.replace(/<i>(.*?)<\/i>/g, '*$1*');

      // Line breaks
      markdown = markdown.replace(/<br\s*\/?>/g, '\n');

      // Remove any remaining HTML tags
      markdown = markdown.replace(/<[^>]*>/g, '');

      // Decode HTML entities
      const textarea = document.createElement('textarea');
      textarea.innerHTML = markdown;
      markdown = textarea.value;

      // In list mode, bullets are part of the content and can be edited by the user
      // Don't strip them automatically - let the user control bullets

      return markdown.trim();
    };

    // Update editor content when value changes externally
    useEffect(() => {
      if (editorRef.current) {
        // Skip update during composition (IME input)
        if (isComposingRef.current) {
          return;
        }

        const currentMarkdown = htmlToMarkdown(editorRef.current.innerHTML);

        // Only update if value actually changed
        if (currentMarkdown !== value) {
          const selection = window.getSelection();
          const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
          const cursorPosition = range?.startOffset || 0;

          let htmlContent = markdownToHtml(value);

          // In list mode, ensure the first line has a bullet if content exists and doesn't start with one
          if (isListMode && value.trim() && !value.trim().startsWith('•')) {
            htmlContent = '• ' + htmlContent;
          }

          editorRef.current.innerHTML = htmlContent;

          // Restore cursor position
          if (range && editorRef.current.firstChild) {
            try {
              const newRange = document.createRange();
              const textNode = editorRef.current.firstChild;
              const pos = Math.min(cursorPosition, (textNode.textContent?.length || 0));
              newRange.setStart(textNode, pos);
              newRange.collapse(true);
              selection?.removeAllRanges();
              selection?.addRange(newRange);
            } catch (e) {
              // Ignore errors with cursor positioning
            }
          }
        }
      }
    }, [value, isListMode]);

    const handleInput = () => {
      if (editorRef.current && onChange) {
        const markdown = htmlToMarkdown(editorRef.current.innerHTML);
        onChange(markdown);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      // Handle Ctrl+B for bold
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        document.execCommand('bold', false);
        handleInput(); // Update the markdown
        return;
      }

      // Handle Ctrl+I for italic
      if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
        e.preventDefault();
        document.execCommand('italic', false);
        handleInput(); // Update the markdown
        return;
      }

      // Handle Shift+Enter in list mode - add bullet after line break
      if (e.key === "Enter" && e.shiftKey && isListMode) {
        e.preventDefault();
        // Insert line break followed by bullet and space
        document.execCommand('insertHTML', false, '<br>• ');
        handleInput();
        return;
      }

      // Handle regular Enter in list mode - add bullet for new line
      if (e.key === "Enter" && !e.shiftKey && isListMode && !onEnterKey) {
        e.preventDefault();
        // Insert line break followed by bullet and space
        document.execCommand('insertHTML', false, '<br>• ');
        handleInput();
        return;
      }

      // Handle Enter key
      if (e.key === "Enter" && !e.shiftKey && onEnterKey) {
        e.preventDefault();
        onEnterKey();
        return;
      }

      onKeyDown?.(e);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
      const pastedText = e.clipboardData.getData('text/plain');

      // Check if pasted text is a URL
      const urlRegex = /^(https?:\/\/[^\s]+)$/;
      const isUrl = urlRegex.test(pastedText.trim());

      // Get current selection
      const selection = window.getSelection();
      const hasSelection = selection && selection.toString().length > 0;

      // If pasting a URL over selected text, create a clickable HTML link
      if (isUrl && hasSelection) {
        e.preventDefault();
        const selectedText = selection.toString();
        const url = pastedText.trim();

        // Create clickable HTML link
        const linkHtml = `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary underline">${selectedText}</a>`;

        // Insert the HTML link
        document.execCommand('insertHTML', false, linkHtml);

        // Convert back to markdown for storage
        if (editorRef.current && onChange) {
          const markdown = htmlToMarkdown(editorRef.current.innerHTML);
          onChange(markdown);
        }
        return;
      }

      if (onPasteMultipleParagraphs) {
        // Normalize line endings
        const normalizedText = pastedText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        // Split by double newlines
        const rawParagraphs = normalizedText.split(/\n\s*\n/);
        const paragraphs: string[] = [];

        for (const para of rawParagraphs) {
          const trimmed = para.trim();
          if (trimmed) {
            paragraphs.push(trimmed);
          }
        }

        // If multiple paragraphs, prevent default and handle it
        if (paragraphs.length > 1) {
          e.preventDefault();
          onPasteMultipleParagraphs(paragraphs);
          return;
        }
      }

      // For single paragraph paste, handle as plain text
      e.preventDefault();
      document.execCommand('insertText', false, pastedText);
      handleInput();
    };

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      // Prevent links from being followed in edit mode
      const target = e.target as HTMLElement;
      if (target.tagName === 'A') {
        e.preventDefault();
      }
    };

    const isEmpty = !value || value.trim() === '';

    return (
      <div className="relative">
        {isEmpty && placeholder && (
          <div className="absolute inset-0 pointer-events-none text-muted-foreground opacity-50">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onClick={handleClick}
          onCompositionStart={() => { isComposingRef.current = true; }}
          onCompositionEnd={() => { isComposingRef.current = false; }}
          className={cn(
            "resize-none overflow-auto outline-none",
            className
          )}
          suppressContentEditableWarning
        />
      </div>
    );
  }
);

RichTextEditor.displayName = "RichTextEditor";

export default RichTextEditor;
