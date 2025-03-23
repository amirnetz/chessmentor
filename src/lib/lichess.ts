import axios from 'axios';
import type { LichessUser, LichessGame } from '@/types/lichess';

const LICHESS_API_URL = 'https://lichess.org/api';

export class LichessAPI {
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await axios({
      url: `${LICHESS_API_URL}${endpoint}`,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/json',
      },
      ...options,
    });

    return response.data;
  }

  async getAccount(): Promise<LichessUser> {
    return this.request<LichessUser>('/account');
  }

  async getCurrentGame(): Promise<LichessGame | null> {
    try {
      return await this.request<LichessGame>('/account/playing');
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async createChallenge(options: {
    rated?: boolean;
    clock?: { limit: number; increment: number };
    days?: number;
    color?: 'white' | 'black' | 'random';
    variant?: string;
  }): Promise<{ id: string; url: string }> {
    const response = await this.request<{ id: string; url: string }>('/challenge/open', {
      method: 'POST',
      data: options,
    });

    return response;
  }
} 