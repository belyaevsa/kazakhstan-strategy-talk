import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FileText, ChevronRight, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Page {
  id: string;
  slug: string;
  title: string;
  order_index: number;
}

interface DocumentStructureProps {
  pages: Page[];
}

const DocumentStructure = ({ pages }: DocumentStructureProps) => {
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(true);

  const sortedPages = [...pages].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <h3 className="font-semibold mb-4 flex items-center gap-2 hover:text-primary transition-colors">
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <FileText className="h-4 w-4" />
            Document Structure
          </h3>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <nav className="space-y-1">
            {sortedPages.map((page) => {
              const isActive = location.pathname === `/document/${page.slug}`;
              return (
                <Link
                  key={page.id}
                  to={`/document/${page.slug}`}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted text-muted-foreground hover:text-foreground"
                  )}
                >
                  <ChevronRight className={cn("h-4 w-4 transition-transform", isActive && "rotate-90")} />
                  <span className="flex-1 truncate">{page.title}</span>
                </Link>
              );
            })}
          </nav>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};

export default DocumentStructure;
