import { apiClient } from '@/lib/api/client';
import { Comment, CreateCommentRequest, UpdateCommentRequest, VoteRequest } from '@/lib/api/types';

export interface PagedComments {
  items: Comment[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

class CommentService {
  async getByPage(pageId: string, page = 1, pageSize = 20): Promise<PagedComments> {
    return apiClient.get<PagedComments>(`/comments/page/${pageId}?page=${page}&pageSize=${pageSize}`);
  }

  async getByParagraph(paragraphId: string, page = 1, pageSize = 20): Promise<PagedComments> {
    return apiClient.get<PagedComments>(`/comments/paragraph/${paragraphId}?page=${page}&pageSize=${pageSize}`);
  }

  async getById(id: string): Promise<Comment> {
    return apiClient.get<Comment>(`/comments/${id}`);
  }

  async create(data: CreateCommentRequest): Promise<Comment> {
    return apiClient.post<Comment>('/comments', data);
  }

  async update(id: string, data: UpdateCommentRequest): Promise<void> {
    return apiClient.put<void>(`/comments/${id}`, data);
  }

  async delete(id: string): Promise<void> {
    return apiClient.delete<void>(`/comments/${id}`);
  }

  async vote(commentId: string, voteType: 'agree' | 'disagree'): Promise<void> {
    return apiClient.post<void>(`/comments/${commentId}/vote`, { voteType });
  }
}

export const commentService = new CommentService();
