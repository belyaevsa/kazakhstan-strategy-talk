import { apiClient } from '@/lib/api/client';
import { AuthResponse, User } from '@/lib/api/types';

export interface RegisterData {
  email: string;
  password: string;
  username: string;
  website?: string; // Honeypot field
}

export interface LoginData {
  email: string;
  password: string;
}

class AuthService {
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/register', data);
    this.setSession(response);
    return response;
  }

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/login', data);
    this.setSession(response);
    return response;
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return null;

      const user = await apiClient.get<User>('/auth/me');
      // Update localStorage with fresh user data
      if (user) {
        localStorage.setItem('auth_user', JSON.stringify(user));
      }
      return user;
    } catch (error) {
      this.logout();
      return null;
    }
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  getUser(): User | null {
    const userJson = localStorage.getItem('auth_user');
    return userJson ? JSON.parse(userJson) : null;
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  hasRole(role: string): boolean {
    const user = this.getUser();
    return user?.roles?.includes(role) ?? false;
  }

  isViewer(): boolean {
    return this.hasRole('Viewer');
  }

  isEditor(): boolean {
    return this.hasRole('Editor') || this.hasRole('Admin');
  }

  isAdmin(): boolean {
    return this.hasRole('Admin');
  }

  async updateLanguage(language: string): Promise<void> {
    await apiClient.put('/auth/language', { language });
  }

  private setSession(response: AuthResponse): void {
    localStorage.setItem('auth_token', response.token);
    localStorage.setItem('auth_user', JSON.stringify(response.user));
  }
}

export const authService = new AuthService();
