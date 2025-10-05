import { apiClient } from '@/lib/api/client';

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  createdAt: string;
  lastCommentAt?: string;
  frozenUntil?: string;
  isBlocked: boolean;
}

export interface AdminComment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  authorEmail: string;
  createdAt: string;
  pageTitle?: string;
  pageSlug?: string;
  pageId?: string;
  paragraphId?: string;
  ipAddress?: string;
  isDeleted: boolean;
}

class AdminService {
  async getUsers(email?: string): Promise<AdminUser[]> {
    const params = email ? { email } : {};
    return apiClient.get<AdminUser[]>('/admin/users', { params });
  }

  async getComments(pageId?: string): Promise<AdminComment[]> {
    const params = pageId ? { pageId } : {};
    return apiClient.get<AdminComment[]>('/admin/comments', { params });
  }

  async freezeUser(userId: string, freezeUntil: Date): Promise<void> {
    await apiClient.post(`/admin/users/${userId}/freeze`, { freezeUntil: freezeUntil.toISOString() });
  }

  async unfreezeUser(userId: string): Promise<void> {
    await apiClient.post(`/admin/users/${userId}/unfreeze`);
  }

  async blockUser(userId: string): Promise<void> {
    await apiClient.post(`/admin/users/${userId}/block`);
  }

  async unblockUser(userId: string): Promise<void> {
    await apiClient.post(`/admin/users/${userId}/unblock`);
  }
}

export const adminService = new AdminService();
