import { apiClient } from '@/lib/api/client';
import { Comment, CreateCommentRequest, UpdateCommentRequest, VoteRequest } from '@/lib/api/types';

class CommentService {
  async getByPage(pageId: string): Promise<Comment[]> {
    return apiClient.get<Comment[]>(`/comments/page/${pageId}`);
  }

  async getByParagraph(paragraphId: string): Promise<Comment[]> {
    return apiClient.get<Comment[]>(`/comments/paragraph/${paragraphId}`);
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
