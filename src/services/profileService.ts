import { apiClient } from '@/lib/api/client';
import { PublicProfile, ProfileStats, UpdateProfileRequest } from '@/lib/api/types';

class ProfileService {
  async getProfile(userId: string): Promise<PublicProfile> {
    return apiClient.get<PublicProfile>(`/profile/${userId}`);
  }

  async getProfileStats(userId: string): Promise<ProfileStats> {
    return apiClient.get<ProfileStats>(`/profile/${userId}/stats`);
  }

  async updateProfile(userId: string, data: UpdateProfileRequest): Promise<void> {
    return apiClient.put<void>(`/profile/${userId}`, data);
  }
}

export const profileService = new ProfileService();
