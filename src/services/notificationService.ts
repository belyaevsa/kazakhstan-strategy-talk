import { apiClient } from '@/lib/api/client';
import {
  Notification,
  NotificationsResponse,
  NotificationSettings,
  UpdateNotificationSettingsRequest,
  PageFollowStatus,
  FollowedPage,
} from '@/lib/api/types';

class NotificationService {
  // Notifications
  async getNotifications(
    page = 1,
    limit = 20,
    unreadOnly?: boolean,
    type?: string
  ): Promise<NotificationsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (unreadOnly !== undefined) {
      params.append('unreadOnly', unreadOnly.toString());
    }
    if (type) {
      params.append('type', type);
    }
    return apiClient.get<NotificationsResponse>(`/notifications?${params.toString()}`);
  }

  async getUnreadCount(): Promise<{ unreadCount: number }> {
    return apiClient.get<{ unreadCount: number }>('/notifications/unread-count');
  }

  async markAsRead(id: string): Promise<void> {
    return apiClient.put<void>(`/notifications/${id}/read`, {});
  }

  async markAllAsRead(): Promise<{ message: string; count: number }> {
    return apiClient.put<{ message: string; count: number }>('/notifications/mark-all-read', {});
  }

  async deleteNotification(id: string): Promise<void> {
    return apiClient.delete<void>(`/notifications/${id}`);
  }

  async clearReadNotifications(): Promise<{ message: string; count: number }> {
    return apiClient.delete<{ message: string; count: number }>('/notifications/clear-read');
  }

  // Notification Settings
  async getSettings(): Promise<NotificationSettings> {
    return apiClient.get<NotificationSettings>('/notifications/settings');
  }

  async updateSettings(settings: UpdateNotificationSettingsRequest): Promise<void> {
    return apiClient.put<void>('/notifications/settings', settings);
  }

  // Page Following
  async followPage(pageId: string): Promise<{ message: string; followId: string }> {
    return apiClient.post<{ message: string; followId: string }>(`/pages/${pageId}/follow`, {});
  }

  async unfollowPage(pageId: string): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(`/pages/${pageId}/follow`);
  }

  async getFollowingStatus(pageId: string): Promise<PageFollowStatus> {
    return apiClient.get<PageFollowStatus>(`/pages/${pageId}/following-status`);
  }

  async getFollowedPages(): Promise<{ pages: FollowedPage[]; total: number }> {
    return apiClient.get<{ pages: FollowedPage[]; total: number }>('/pages/followed');
  }

  async getFollowerCount(pageId: string): Promise<{ pageId: string; followerCount: number }> {
    return apiClient.get<{ pageId: string; followerCount: number }>(`/pages/${pageId}/followers/count`);
  }
}

export const notificationService = new NotificationService();
