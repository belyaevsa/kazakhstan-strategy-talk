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
}

const RichTextEditor = forwardRef<HTMLDivElement, RichTextEditorProps>(
  ({ value, onChange, onEnterKey, onPasteMultipleParagraphs, placeholder, className, onKeyDown }, ref) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const isComposingRef = useRef(false);

    useImperativeHandle(ref, () => editorRef.current!);

    // Convert Markdown to HTML for display
    const markdownToHtml = (markdown: string): string => {
      let html = markdown;

      // Bold: **text** -> <strong>text</strong>
      html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

      // Italic: *text* -> <em>text</em> (but not if part of **)
      html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

      // Line breaks
      html = html.replace(/\n/g, '<br>');

      return html;
    };

    // Convert HTML back to Markdown
    const htmlToMarkdown = (html: string): string => {
      let markdown = html;

      // Remove divs and replace with newlines
      markdown = markdown.replace(/<div>/g, '\n').replace(/<\/div>/g, '');

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

      return markdown.trim();
    };

    // Update editor content when value changes externally
    useEffect(() => {
      if (editorRef.current && !isComposingRef.current) {
        const currentMarkdown = htmlToMarkdown(editorRef.current.innerHTML);
        if (currentMarkdown !== value) {
          const selection = window.getSelection();
          const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
          const cursorPosition = range?.startOffset || 0;

          editorRef.current.innerHTML = markdownToHtml(value);

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
    }, [value]);

    const handleInput = () => {
      if (editorRef.current && onChange) {
        const markdown = htmlToMarkdown(editorRef.current.innerHTML);
        onChange({ target: { value: markdown } } as any);
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

      // Handle Enter key
      if (e.key === "Enter" && !e.shiftKey && onEnterKey) {
        e.preventDefault();
        onEnterKey();
        return;
      }

      onKeyDown?.(e);
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
      if (onPasteMultipleParagraphs) {
        const pastedText = e.clipboardData.getData('text/plain');

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
      const text = e.clipboardData.getData('text/plain');
      document.execCommand('insertText', false, text);
      handleInput();
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
