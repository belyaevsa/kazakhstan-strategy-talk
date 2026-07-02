import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { authService } from "@/services/authService";
import { reportService, type ReportContentType } from "@/services/reportService";
import { useTranslation } from "@/hooks/useTranslation";

interface ReportDialogProps {
  contentType: ReportContentType;
  contentId: string;
}

const REASONS = ["spam", "abuse", "offtopic", "other"] as const;

const ReportDialog = ({ contentType, contentId }: ReportDialogProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("spam");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!authService.isAuthenticated()) return null;

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await reportService.create(contentType, contentId, reason, details.trim() || undefined);
      toast.success(res.message || t("report.submitted"));
      setOpen(false);
      setDetails("");
      setReason("spam");
    } catch (err: any) {
      toast.error(err.message || t("report.failed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto p-1 text-muted-foreground hover:text-destructive"
          aria-label={t("report.action")}
          title={t("report.action")}
        >
          <Flag className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("report.title")}</DialogTitle>
          <DialogDescription>{t("report.description")}</DialogDescription>
        </DialogHeader>

        <RadioGroup value={reason} onValueChange={setReason} className="space-y-2">
          {REASONS.map((r) => (
            <div key={r} className="flex items-center space-x-2">
              <RadioGroupItem value={r} id={`report-${r}`} />
              <Label htmlFor={`report-${r}`} className="font-normal cursor-pointer">
                {t(`report.reason.${r}`)}
              </Label>
            </div>
          ))}
        </RadioGroup>

        <Textarea
          placeholder={t("report.detailsPlaceholder")}
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={1000}
          rows={3}
        />

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            {t("report.cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? t("report.submitting") : t("report.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ReportDialog;
