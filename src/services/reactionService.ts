import { apiClient } from "@/lib/api/client";
import type { ParagraphReactions, ReactToParagraphRequest, ReactionType } from "@/lib/api/types";

const STORAGE_PREFIX = "paragraph_reactions_";

function getStorageKey(paragraphId: string): string {
  return `${STORAGE_PREFIX}${paragraphId}`;
}

function getStoredReactions(paragraphId: string): { reactions: Record<string, number>; userReaction?: string } | null {
  try {
    const raw = localStorage.getItem(getStorageKey(paragraphId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeReactions(paragraphId: string, data: { reactions: Record<string, number>; userReaction?: string }) {
  localStorage.setItem(getStorageKey(paragraphId), JSON.stringify(data));
}

function getAllStoredReactions(): Record<string, { reactions: Record<string, number>; userReaction?: string }> {
  const result: Record<string, { reactions: Record<string, number>; userReaction?: string }> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      const paragraphId = key.slice(STORAGE_PREFIX.length);
      const data = getStoredReactions(paragraphId);
      if (data) result[paragraphId] = data;
    }
  }
  return result;
}

const reactionService = {
  async react(paragraphId: string, request: ReactToParagraphRequest): Promise<void> {
    const stored = getStoredReactions(paragraphId);
    const current = stored?.reactions || {};
    const currentUserReaction = stored?.userReaction;

    if (currentUserReaction === request.reactionType) {
      current[request.reactionType] = Math.max(0, (current[request.reactionType] || 1) - 1);
      delete current.__userReaction;
      storeReactions(paragraphId, { reactions: current });
    } else {
      if (currentUserReaction) {
        current[currentUserReaction] = Math.max(0, (current[currentUserReaction] || 1) - 1);
      }
      current[request.reactionType] = (current[request.reactionType] || 0) + 1;
      storeReactions(paragraphId, { reactions: current, userReaction: request.reactionType });
    }

    try {
      await apiClient.post(`/paragraphs/${paragraphId}/reactions`, request);
    } catch {
      // Backend endpoint may not exist yet; localStorage data is the source of truth
    }
  },

  async getByParagraph(paragraphId: string): Promise<ParagraphReactions> {
    try {
      return await apiClient.get<ParagraphReactions>(`/paragraphs/${paragraphId}/reactions`);
    } catch {
      const stored = getStoredReactions(paragraphId);
      return {
        paragraphId,
        reactions: (stored?.reactions || {}) as Record<ReactionType, number>,
        userReaction: stored?.userReaction as ReactionType | undefined,
      };
    }
  },

  async getByPage(pageId: string): Promise<ParagraphReactions[]> {
    try {
      return await apiClient.get<ParagraphReactions[]>(`/paragraphs/reactions/page/${pageId}`);
    } catch {
      return Object.entries(getAllStoredReactions()).map(([paragraphId, data]) => ({
        paragraphId,
        reactions: data.reactions as Record<ReactionType, number>,
        userReaction: data.userReaction as ReactionType | undefined,
      }));
    }
  },
};

export default reactionService;
