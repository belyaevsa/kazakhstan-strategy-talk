export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl?: string;
  roles: string[];
  isBlocked: boolean;
  frozenUntil?: string;
  lastCommentAt?: string;
  lastSeenAt?: string;
  language: string;
}

export interface PublicProfile {
  id: string;
  username: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  email?: string;
  createdAt: string;
  lastSeenAt?: string;
  totalComments: number;
  totalVotesReceived: number;
  // Settings (only present when viewing own profile)
  showEmail?: boolean;
  emailNotifications?: boolean;
  timeZone?: string;
}

export interface CommentWithContext {
  id: string;
  content: string;
  createdAt: string;
  voteScore: number;
  pageId: string;
  pageTitle: string;
  pageSlug: string;
  chapterSlug: string;
  paragraphId?: string;
}

export interface ActiveDiscussion {
  pageId: string;
  pageTitle: string;
  pageSlug: string;
  chapterSlug: string;
  commentCount: number;
  lastCommentAt: string;
}

export interface ProfileStats {
  latestComments: CommentWithContext[];
  mostPopularComment?: CommentWithContext;
  activeDiscussions: ActiveDiscussion[];
}

export interface UpdateProfileRequest {
  displayName?: string;
  bio?: string;
  showEmail?: boolean;
  emailNotifications?: boolean;
  timeZone?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface Chapter {
  id: string;
  title: string;
  description?: string;
  slug: string;
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
  type: 'Text' | 'Header' | 'Image' | 'Quote' | 'Code' | 'List' | 'Table' | 'Link';
  caption?: string;
  linkedPageId?: string;
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
  slug: string;
  icon?: string;
  orderIndex: number;
  isDraft?: boolean;
}

export interface UpdateChapterRequest {
  title?: string;
  description?: string;
  slug?: string;
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
  slug?: string;
  orderIndex?: number;
  isDraft?: boolean;
  chapterId?: string;
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
  linkedPageId?: string;
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

// Notification types
export interface Notification {
  id: string;
  type: 'NewComment' | 'CommentReply' | 'PageUpdate';
  title: string;
  message: string;
  // Localization fields
  titleKey?: string;
  messageKey?: string;
  parameters?: string; // JSON string with interpolation values
  isRead: boolean;
  createdAt: string;
  readAt?: string;
  page?: {
    id: string;
    title: string;
    slug: string;
    chapterSlug: string;
  };
  commentId?: string;
}

export interface NotificationSettings {
  emailFrequency: 'immediate' | 'hourly' | 'daily' | 'none';
  notifyOnCommentReply: boolean;
  notifyOnFollowedPageComment: boolean;
  notifyOnFollowedPageUpdate: boolean;
}

export interface UpdateNotificationSettingsRequest {
  emailFrequency?: 'immediate' | 'hourly' | 'daily' | 'none';
  notifyOnCommentReply?: boolean;
  notifyOnFollowedPageComment?: boolean;
  notifyOnFollowedPageUpdate?: boolean;
}

export interface NotificationsResponse {
  notifications: Notification[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  unreadCount: number;
}

export interface PageFollowStatus {
  isFollowing: boolean;
  pageId: string;
}

export interface FollowedPage {
  followId: string;
  followedAt: string;
  page: {
    id: string;
    title: string;
    slug: string;
    description?: string;
    chapterId: string;
    chapterTitle: string;
    chapterSlug: string;
  };
}

// Suggestion types
export interface ParagraphSuggestion {
  id: string;
  paragraphId: string;
  userId: string;
  user: {
    id: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
  };
  suggestedContent: string;
  comment: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  createdAt: string;
  updatedAt: string;
  upvotes: number;
  downvotes: number;
  userVote?: 'Upvote' | 'Downvote';
  commentCount: number;
}

export interface SuggestionDetail extends ParagraphSuggestion {
  paragraph?: {
    id: string;
    content: string;
    page?: {
      id: string;
      title: string;
      slug: string;
    };
  };
  votes: Array<{
    id: string;
    userId: string;
    username: string;
    voteType: 'Upvote' | 'Downvote';
    createdAt: string;
  }>;
  comments: Array<{
    id: string;
    userId: string;
    username: string;
    displayName?: string;
    avatarUrl?: string;
    content: string;
    createdAt: string;
  }>;
}

export interface CreateSuggestionRequest {
  paragraphId: string;
  suggestedContent: string;
  comment: string;
}

export interface UpdateSuggestionRequest {
  suggestedContent: string;
  comment: string;
}

export interface SuggestionVoteRequest {
  voteType: 'Upvote' | 'Downvote';
}
