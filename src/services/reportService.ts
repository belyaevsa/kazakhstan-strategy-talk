import { apiClient } from "@/lib/api/client";

export type ReportContentType = "Comment" | "Suggestion";

export interface ReportItem {
  id: string;
  contentType: ReportContentType;
  contentId: string;
  reason: string;
  details?: string;
  status: string;
  createdAt: string;
  reporterProfileId: string;
  reporterUsername?: string;
  contentPreview?: string;
}

class ReportService {
  async create(contentType: ReportContentType, contentId: string, reason: string, details?: string): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>("/reports", { contentType, contentId, reason, details });
  }

  async list(status = "Pending"): Promise<ReportItem[]> {
    return apiClient.get<ReportItem[]>(`/reports?status=${encodeURIComponent(status)}`);
  }

  async pendingCount(): Promise<number> {
    const res = await apiClient.get<{ count: number }>("/reports/pending-count");
    return res.count;
  }

  async resolve(id: string, action: "Reviewed" | "Dismissed"): Promise<{ message: string }> {
    return apiClient.post<{ message: string }>(`/reports/${id}/resolve`, { action });
  }
}

export const reportService = new ReportService();
