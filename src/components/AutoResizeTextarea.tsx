import { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { cn } from "@/lib/utils";

interface AutoResizeTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  value: string;
  onEnterKey?: () => void;
  onPasteMultipleParagraphs?: (paragraphs: string[]) => void;
}

const AutoResizeTextarea = forwardRef<HTMLTextAreaElement, AutoResizeTextareaProps>(
  ({ value, className, onEnterKey, onPasteMultipleParagraphs, ...props }, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => textareaRef.current!);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Reset height to auto to get the correct scrollHeight
      textarea.style.height = "auto";
      // Set the height to match the content
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Ctrl+B for bold
    if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
      e.preventDefault();
      wrapSelectedText('**');
      return;
    }

    // Handle Ctrl+I for italic
    if ((e.ctrlKey || e.metaKey) && e.key === 'i') {
      e.preventDefault();
      wrapSelectedText('*');
      return;
    }

    if (e.key === "Enter" && !e.shiftKey && onEnterKey) {
      e.preventDefault();
      onEnterKey();
    }
    props.onKeyDown?.(e);
  };

  const wrapSelectedText = (wrapper: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    if (selectedText) {
      // Wrap the selected text
      const newValue = value.substring(0, start) + wrapper + selectedText + wrapper + value.substring(end);

      // Trigger onChange with the new value
      const event = {
        target: { value: newValue }
      } as React.ChangeEvent<HTMLTextAreaElement>;
      props.onChange?.(event);

      // Restore selection after the component re-renders
      setTimeout(() => {
        textarea.setSelectionRange(start + wrapper.length, end + wrapper.length);
        textarea.focus();
      }, 0);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (onPasteMultipleParagraphs) {
      const pastedText = e.clipboardData.getData('text');

      // Normalize line endings (handle \r\n, \r, and \n)
      const normalizedText = pastedText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

      // Split by double newlines (blank lines) to get paragraphs
      const rawParagraphs = normalizedText.split(/\n\s*\n/);
      const paragraphs: string[] = [];

      for (const para of rawParagraphs) {
        const trimmed = para.trim();
        if (trimmed) {
          paragraphs.push(trimmed);
        }
      }

      // If there are multiple paragraphs, prevent default and handle it
      if (paragraphs.length > 1) {
        e.preventDefault();
        onPasteMultipleParagraphs(paragraphs);
        return;
      }
    }

    // Let default paste behavior happen for single paragraph or if handler not provided
    props.onPaste?.(e);
  };

  return (
    <textarea
      ref={textareaRef}
      value={value}
      className={cn("resize-none overflow-hidden", className)}
      {...props}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
    />
  );
});

AutoResizeTextarea.displayName = "AutoResizeTextarea";

export default AutoResizeTextarea;
