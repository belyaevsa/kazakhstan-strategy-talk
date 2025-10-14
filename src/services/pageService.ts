import { apiClient } from '@/lib/api/client';
import { Page, CreatePageRequest, UpdatePageRequest } from '@/lib/api/types';

class PageService {
  async getAll(): Promise<Page[]> {
    return apiClient.get<Page[]>('/pages');
  }

  async getBySlug(slug: string): Promise<Page> {
    return apiClient.get<Page>(`/pages/${slug}`);
  }

  async create(data: CreatePageRequest): Promise<Page> {
    return apiClient.post<Page>('/pages', data);
  }

  async update(id: string, data: UpdatePageRequest): Promise<void> {
    return apiClient.put<void>(`/pages/${id}`, data);
  }

  async duplicate(id: string): Promise<Page> {
    return apiClient.post<Page>(`/pages/${id}/duplicate`, {});
  }

  async delete(id: string): Promise<void> {
    return apiClient.delete<void>(`/pages/${id}`);
  }
}

export const pageService = new PageService();
