export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  roles: string[];
  isBlocked: boolean;
  frozenUntil?: string;
  lastCommentAt?: string;
  language: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Chapter {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  orderIndex: number;
  isDraft: boolean;
  createdAt: string;
  updatedAt?: string;
  pages: Page[];
}

export interface Page {
  id: string;
  title: string;
  description?: string;
  slug: string;
  orderIndex: number;
  isDraft: boolean;
  chapterId: string;
  viewCount: number;
  createdAt: string;
  updatedAt?: string;
  updatedByUsername?: string;
}

export interface Paragraph {
  id: string;
  content: string;
  orderIndex: number;
  commentCount: number;
  isHidden: boolean;
  type: 'Text' | 'Header' | 'Image' | 'Quote' | 'Code' | 'List';
  caption?: string;
  pageId: string;
  createdAt: string;
  updatedAt?: string;
  updatedByUsername?: string;
}

export interface Comment {
  id: string;
  content: string;
  agreeCount: number;
  disagreeCount: number;
  createdAt: string;
  updatedAt?: string;
  isDeleted: boolean;
  user: User;
  parentId?: string;
  replies: Comment[];
}

export interface CreateChapterRequest {
  title: string;
  description?: string;
  icon?: string;
  orderIndex: number;
  isDraft?: boolean;
}

export interface UpdateChapterRequest {
  title?: string;
  description?: string;
  icon?: string;
  orderIndex?: number;
  isDraft?: boolean;
}

export interface CreatePageRequest {
  title: string;
  description?: string;
  slug: string;
  orderIndex: number;
  chapterId: string;
}

export interface UpdatePageRequest {
  title?: string;
  description?: string;
  orderIndex?: number;
}

export interface CreateParagraphRequest {
  content: string;
  orderIndex: number;
  pageId: string;
  type?: string;
  caption?: string;
}

export interface UpdateParagraphRequest {
  content?: string;
  orderIndex?: number;
  isHidden?: boolean;
  type?: string;
  caption?: string;
}

export interface ReorderRequest {
  newOrderIndex: number;
}

export interface CreateCommentRequest {
  content: string;
  pageId?: string;
  paragraphId?: string;
  parentId?: string;
}

export interface UpdateCommentRequest {
  content: string;
}

export interface VoteRequest {
  voteType: 'agree' | 'disagree';
}
