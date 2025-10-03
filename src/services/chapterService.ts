import { apiClient } from '@/lib/api/client';
import type { Chapter, CreateChapterRequest, UpdateChapterRequest, ReorderRequest } from '@/lib/api/types';

class ChapterService {
  async getAll(includeDrafts: boolean = false): Promise<Chapter[]> {
    return apiClient.get<Chapter[]>(`/chapters?includeDrafts=${includeDrafts}`);
  }

  async getById(id: string): Promise<Chapter> {
    return apiClient.get<Chapter>(`/chapters/${id}`);
  }

  async create(data: CreateChapterRequest): Promise<Chapter> {
    return apiClient.post<Chapter>('/chapters', data);
  }

  async update(id: string, data: UpdateChapterRequest): Promise<void> {
    return apiClient.put<void>(`/chapters/${id}`, data);
  }

  async reorder(id: string, newOrderIndex: number): Promise<void> {
    const data: ReorderRequest = { newOrderIndex };
    return apiClient.post<void>(`/chapters/${id}/reorder`, data);
  }

  async delete(id: string): Promise<void> {
    return apiClient.delete<void>(`/chapters/${id}`);
  }
}

export const chapterService = new ChapterService();
