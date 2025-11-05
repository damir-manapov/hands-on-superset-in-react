import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import axios, { AxiosInstance, AxiosError } from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

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

interface CsrfTokenResponse {
  result: string;
}

@Injectable()
export class SupersetService {
  private readonly logger = new Logger(SupersetService.name);
  private readonly supersetUrl: string;
  private readonly adminUsername: string;
  private readonly adminPassword: string;
  private axiosInstance: AxiosInstance;
  private readonly cookieJar: CookieJar;
  private accessToken: string | null = null;
  private accessExp: number = 0;

  constructor() {
    this.supersetUrl = process.env.SUPERSET_URL || 'http://localhost:8088';
    this.adminUsername = process.env.SUPERSET_ADMIN_USERNAME || 'admin';
    this.adminPassword = process.env.SUPERSET_ADMIN_PASSWORD || 'admin12345';

    // Create a cookie jar to maintain session cookies (including CSRF session token)
    this.cookieJar = new CookieJar();

    // Create axios instance with cookie jar support
    // The wrapper function adds cookie jar support to axios
    // Note: jar is not in the axios types but is handled by axios-cookiejar-support
    /* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unnecessary-type-assertion */
    const axiosConfig: any = {
      baseURL: this.supersetUrl,
      timeout: 10000,
      withCredentials: true,
      jar: this.cookieJar,
    };
    this.axiosInstance = wrapper(axios.create(axiosConfig)) as AxiosInstance;
    /* eslint-enable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any, @typescript-eslint/no-unnecessary-type-assertion */
  }

  /**
   * Extract CSRF token from JWT access token
   * The JWT contains a 'csrf' claim that we can use
   */
  private extractCsrfFromToken(accessToken: string): string | null {
    try {
      // JWT tokens have 3 parts separated by dots: header.payload.signature
      const parts = accessToken.split('.');
      if (parts.length !== 3) {
        return null;
      }

      // Decode the payload (second part)
      const payload = Buffer.from(parts[1], 'base64url').toString('utf-8');
      const decoded = JSON.parse(payload) as { csrf?: string };

      // Extract the csrf claim
      return decoded.csrf || null;
    } catch {
      return null;
    }
  }

  /**
   * Get CSRF token from Superset API
   * The cookie jar maintains the CSRF session cookie automatically
   */
  private async getCsrfToken(): Promise<string> {
    try {
      const response = await this.axiosInstance.get<CsrfTokenResponse>(
        '/api/v1/security/csrf_token/',
        {
          headers: {
            Referer: this.supersetUrl,
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );
      return (
        response.data.result ||
        (response.data as { csrf_token?: string }).csrf_token ||
        (response.data as { token?: string }).token ||
        ''
      );
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ message?: string }>;
        throw new HttpException(
          axiosError.response?.data?.message ||
            'Failed to get CSRF token from Superset',
          axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      throw new HttpException(
        'Failed to get CSRF token from Superset',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  /**
   * Authenticate with Superset and get access token
   * Uses cookie jar to maintain session cookies including CSRF session token
   */
  private async authenticate(): Promise<string> {
    // Check if we have a valid cached token
    const now = Date.now();
    if (this.accessToken && now < this.accessExp - 30_000) {
      return this.accessToken;
    }

    try {
      // Get CSRF token first (this will set the CSRF session cookie)
      let csrfToken: string | undefined;
      try {
        const csrfResponse = await this.axiosInstance.get<CsrfTokenResponse>(
          '/api/v1/security/csrf_token/',
          {
            headers: {
              Referer: this.supersetUrl,
            },
          }
        );
        csrfToken =
          csrfResponse.data.result ||
          (csrfResponse.data as { csrf_token?: string }).csrf_token ||
          (csrfResponse.data as { token?: string }).token;
      } catch {
        this.logger.warn(
          'Could not get CSRF token from API, attempting login without it'
        );
      }

      const headers: Record<string, string> = {
        Referer: this.supersetUrl,
      };
      if (csrfToken) {
        headers['X-CSRFToken'] = csrfToken;
      }

      const response = await this.axiosInstance.post<LoginResponse>(
        '/api/v1/security/login',
        {
          username: this.adminUsername,
          password: this.adminPassword,
          provider: 'db',
          refresh: true,
        },
        {
          headers,
        }
      );

      // Cache the access token
      this.accessToken = response.data.access_token;
      const ttlSec =
        (response.data as { expires_in?: number }).expires_in ?? 300;
      this.accessExp = now + ttlSec * 1000;

      // Set Authorization header for subsequent calls
      this.axiosInstance.defaults.headers.common['Authorization'] =
        `Bearer ${this.accessToken}`;

      return this.accessToken;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{ message?: string }>;
        throw new HttpException(
          axiosError.response?.data?.message ||
            'Failed to authenticate with Superset',
          axiosError.response?.status || HttpStatus.UNAUTHORIZED
        );
      }
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
      // Authenticate to get access token (this also sets up session cookies)
      await this.authenticate();

      // Get CSRF token (cookie jar will maintain the CSRF session cookie)
      const csrfToken = await this.getCsrfToken();

      // Prepare guest token request
      const guestTokenRequest: GuestTokenRequest = {
        resources,
        rls: rls || [],
      };

      if (user) {
        guestTokenRequest.user = user;
      }

      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
        Referer: this.supersetUrl,
      };

      const response = await this.axiosInstance.post<GuestTokenResponse>(
        '/api/v1/security/guest_token/',
        guestTokenRequest,
        {
          headers,
        }
      );

      return { token: response.data.token };
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<{
          message?: string;
          errors?: unknown;
        }>;
        const errorMessage =
          axiosError.response?.data?.message ||
          JSON.stringify(axiosError.response?.data?.errors) ||
          axiosError.message ||
          'Failed to generate guest token';

        this.logger.error(`Failed to generate guest token: ${errorMessage}`, {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          data: axiosError.response?.data,
          url: axiosError.config?.url,
          method: axiosError.config?.method,
        });

        throw new HttpException(
          errorMessage,
          axiosError.response?.status || HttpStatus.INTERNAL_SERVER_ERROR
        );
      }
      this.logger.error('Unexpected error generating guest token', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw new HttpException(
        error instanceof Error
          ? `Failed to generate guest token: ${error.message}`
          : 'Failed to generate guest token',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
