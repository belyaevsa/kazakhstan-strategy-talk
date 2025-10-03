import { apiClient } from '@/lib/api/client';
import { Paragraph, CreateParagraphRequest, UpdateParagraphRequest, ReorderRequest } from '@/lib/api/types';

class ParagraphService {
  async getByPage(pageId: string, includeHidden: boolean = false): Promise<Paragraph[]> {
    return apiClient.get<Paragraph[]>(`/paragraphs/page/${pageId}?includeHidden=${includeHidden}`);
  }

  async getById(id: string): Promise<Paragraph> {
    return apiClient.get<Paragraph>(`/paragraphs/${id}`);
  }

  async create(data: CreateParagraphRequest): Promise<Paragraph> {
    return apiClient.post<Paragraph>('/paragraphs', data);
  }

  async update(id: string, data: UpdateParagraphRequest): Promise<void> {
    return apiClient.put<void>(`/paragraphs/${id}`, data);
  }

  async reorder(id: string, newOrderIndex: number): Promise<void> {
    const data: ReorderRequest = { newOrderIndex };
    return apiClient.post<void>(`/paragraphs/${id}/reorder`, data);
  }

  async delete(id: string): Promise<void> {
    return apiClient.delete<void>(`/paragraphs/${id}`);
  }
}

export const paragraphService = new ParagraphService();
