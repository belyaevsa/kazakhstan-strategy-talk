import { apiClient } from '@/lib/api/client';
import {
  ParagraphSuggestion,
  SuggestionDetail,
  CreateSuggestionRequest,
  UpdateSuggestionRequest,
  SuggestionVoteRequest,
} from '@/lib/api/types';

class SuggestionService {
  // Create a new suggestion
  async createSuggestion(request: CreateSuggestionRequest): Promise<ParagraphSuggestion> {
    return apiClient.post<ParagraphSuggestion>('/paragraphsuggestions', request);
  }

  // Get all suggestions for a paragraph
  async getSuggestionsByParagraph(paragraphId: string): Promise<ParagraphSuggestion[]> {
    return apiClient.get<ParagraphSuggestion[]>(`/paragraphsuggestions/paragraph/${paragraphId}`);
  }

  // Get a single suggestion by ID
  async getSuggestionById(id: string): Promise<SuggestionDetail> {
    return apiClient.get<SuggestionDetail>(`/paragraphsuggestions/${id}`);
  }

  // Update a suggestion (only by author, only if pending)
  async updateSuggestion(id: string, request: UpdateSuggestionRequest): Promise<ParagraphSuggestion> {
    return apiClient.put<ParagraphSuggestion>(`/paragraphsuggestions/${id}`, request);
  }

  // Delete a suggestion (by author or admin)
  async deleteSuggestion(id: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/paragraphsuggestions/${id}`);
  }

  // Approve a suggestion (admin only)
  async approveSuggestion(id: string): Promise<{ message: string; status: string }> {
    return apiClient.post<{ message: string; status: string }>(`/paragraphsuggestions/${id}/approve`, {});
  }

  // Reject a suggestion (admin only)
  async rejectSuggestion(id: string): Promise<{ message: string; status: string }> {
    return apiClient.post<{ message: string; status: string }>(`/paragraphsuggestions/${id}/reject`, {});
  }

  // Vote on a suggestion
  async voteOnSuggestion(id: string, request: SuggestionVoteRequest): Promise<{ message: string; userVote: string | null }> {
    return apiClient.post<{ message: string; userVote: string | null }>(`/paragraphsuggestions/${id}/vote`, request);
  }

  // Get vote counts
  async getVoteCounts(id: string): Promise<{ upvotes: number; downvotes: number; userVote: string | null }> {
    return apiClient.get<{ upvotes: number; downvotes: number; userVote: string | null }>(`/paragraphsuggestions/${id}/votes`);
  }
}

export const suggestionService = new SuggestionService();
