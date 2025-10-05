import { apiClient } from '@/lib/api/client';

export interface AdminUser {
  id: string;
  username: string;
  displayName?: string;
  bio?: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  lastCommentAt?: string;
  lastSeenAt?: string;
  frozenUntil?: string;
  isBlocked: boolean;
  registrationIp?: string;
  roles: string[];
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

export interface AdminSetting {
  key: string;
  value: string;
  description?: string;
  updatedAt: string;
}

class AdminService {
  async getUsers(email?: string): Promise<AdminUser[]> {
    const endpoint = email ? `/admin/users?email=${encodeURIComponent(email)}` : '/admin/users';
    return apiClient.get<AdminUser[]>(endpoint);
  }

  async getComments(pageId?: string): Promise<AdminComment[]> {
    const endpoint = pageId ? `/admin/comments?pageId=${pageId}` : '/admin/comments';
    return apiClient.get<AdminComment[]>(endpoint);
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

  async assignRole(userId: string, role: string): Promise<void> {
    await apiClient.post(`/admin/users/${userId}/roles/${role}`);
  }

  async removeRole(userId: string, role: string): Promise<void> {
    await apiClient.delete(`/admin/users/${userId}/roles/${role}`);
  }

  async getSettings(): Promise<AdminSetting[]> {
    return apiClient.get<AdminSetting[]>('/admin/settings');
  }

  async updateSetting(key: string, value: string, description?: string): Promise<void> {
    await apiClient.put(`/admin/settings/${encodeURIComponent(key)}`, { value, description });
  }

  async createSetting(key: string, value: string, description?: string): Promise<void> {
    await apiClient.post('/admin/settings', { key, value, description });
  }

  async deleteSetting(key: string): Promise<void> {
    await apiClient.delete(`/admin/settings/${encodeURIComponent(key)}`);
  }
}

export const adminService = new AdminService();
