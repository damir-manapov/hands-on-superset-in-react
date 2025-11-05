import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import axios, { AxiosInstance, AxiosError } from 'axios';

interface GuestTokenRequest {
  user?: {
    username: string;
    first_name?: string;
    last_name?: string;
  };
  resources: Array<{
    type: 'dashboard' | 'chart';
    id: string;
  }>;
  rls: Array<{
    clause: string;
  }>;
}

interface LoginResponse {
  access_token: string;
  refresh_token?: string;
}

interface GuestTokenResponse {
  token: string;
}

@Injectable()
export class SupersetService {
  private readonly supersetUrl: string;
  private readonly adminUsername: string;
  private readonly adminPassword: string;
  private axiosInstance: AxiosInstance;

  constructor() {
    this.supersetUrl = process.env.SUPERSET_URL || 'http://localhost:8088';
    this.adminUsername = process.env.SUPERSET_ADMIN_USERNAME || 'admin';
    this.adminPassword = process.env.SUPERSET_ADMIN_PASSWORD || 'admin12345';

    this.axiosInstance = axios.create({
      baseURL: this.supersetUrl,
      timeout: 10000,
    });
  }

  /**
   * Authenticate with Superset and get access token
   */
  private async authenticate(): Promise<string> {
    try {
      const response = await this.axiosInstance.post<LoginResponse>(
        '/api/v1/security/login',
        {
          username: this.adminUsername,
          password: this.adminPassword,
          provider: 'db',
          refresh: true,
        }
      );

      return response.data.access_token;
    } catch {
      throw new HttpException(
        'Failed to authenticate with Superset',
        HttpStatus.UNAUTHORIZED
      );
    }
  }

  /**
   * Generate a guest token for embedding Superset dashboards/charts
   */
  async generateGuestToken(
    resources: Array<{ type: 'dashboard' | 'chart'; id: string }>,
    user?: { username: string; first_name?: string; last_name?: string },
    rls?: Array<{ clause: string }>
  ): Promise<{ token: string }> {
    try {
      // Authenticate to get access token
      const accessToken = await this.authenticate();

      // Prepare guest token request
      const guestTokenRequest: GuestTokenRequest = {
        resources,
        rls: rls || [],
      };

      if (user) {
        guestTokenRequest.user = user;
      }

      // Generate guest token
      const response = await this.axiosInstance.post<GuestTokenResponse>(
        '/api/v1/security/guest_token',
        guestTokenRequest,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      return { token: response.data.token };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ message?: string }>;
        throw new HttpException(
          axiosError.response?.data?.message ||
            'Failed to generate guest token',
          axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      throw new HttpException(
        'Failed to generate guest token',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
