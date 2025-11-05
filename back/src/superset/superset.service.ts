import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
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
  expires_in?: number;
}

interface GuestTokenResponse {
  token: string;
}

interface CsrfTokenResponse {
  result?: string;
  csrf_token?: string;
  token?: string;
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

    this.axiosInstance.interceptors.response.use(resp => {
      if (resp.config.url?.includes('/api/v1/security/csrf_token/')) {
        this.logger.log(
          '[/csrf_token/] set-cookie:',
          resp.headers['set-cookie']
        );
      }
      return resp;
    });
    this.axiosInstance.interceptors.request.use(async config => {
      const url = new URL(config.url!, this.supersetUrl);
      const cookieStr = await this.cookieJar.getCookieString(url.toString());
      if (config.url?.includes('/api/v1/security/guest_token/')) {
        this.logger.log(
          `[req ${config.method} ${config.url}] Cookie: ${cookieStr}`
        );
      }
      return config;
    });
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
      const resp = await this.axiosInstance.get<CsrfTokenResponse>(
        '/api/v1/security/csrf_token/',
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            Referer: this.supersetUrl, // http://localhost:8088
            Origin: this.supersetUrl,
            Accept: 'application/json',
          },
        }
      );

      const data: CsrfTokenResponse = resp.data;
      const token: string = data.result ?? data.csrf_token ?? data.token ?? '';

      if (!token) {
        throw new HttpException(
          'CSRF token missing in response',
          HttpStatus.BAD_GATEWAY
        );
      }

      // --- Capture Set-Cookie header(s) from Superset
      const setCookieHeader = resp.headers['set-cookie'];
      const setCookieHdr: string[] | undefined = Array.isArray(setCookieHeader)
        ? setCookieHeader
        : typeof setCookieHeader === 'string'
          ? [setCookieHeader]
          : undefined;
      if (setCookieHdr?.length) {
        // Try to find the Flask session cookie value
        const sessionPair = setCookieHdr
          .map(h => h.split(';')[0]) // "session=...."
          .find(kv => kv.trim().toLowerCase().startsWith('session='));
        if (sessionPair) {
          // Re-insert a host-only session cookie *without* Secure so it will be sent on http
          await this.cookieJar.setCookie(
            `${sessionPair}; Path=/; SameSite=Lax`,
            this.supersetUrl
          );
        }
      }

      // --- Ensure CSRF cookies exist in the jar (host-only)
      const checkUrl = `${this.supersetUrl}/api/v1/security/csrf_token/`;
      let cookies = await this.cookieJar.getCookies(checkUrl);

      const hasSession = cookies.some(c => c.key === 'session');
      let hasCsrf = cookies.some(c => /csrf/i.test(c.key));

      if (!hasCsrf) {
        for (const name of ['csrf_token', 'csrf_access_token']) {
          await this.cookieJar.setCookie(
            `${name}=${encodeURIComponent(token)}; Path=/; SameSite=Lax`,
            this.supersetUrl
          );
        }
        cookies = await this.cookieJar.getCookies(checkUrl);
        hasCsrf = cookies.some(c => /csrf/i.test(c.key));
      }

      if (!hasSession) {
        // Double-check if we can recover session cookie from Set-Cookie again
        if (setCookieHdr?.length) {
          const sessionPair = setCookieHdr
            .map(h => h.split(';')[0])
            .find(kv => kv.trim().toLowerCase().startsWith('session='));
          if (sessionPair) {
            await this.cookieJar.setCookie(
              `${sessionPair}; Path=/; SameSite=Lax`,
              this.supersetUrl
            );
            cookies = await this.cookieJar.getCookies(checkUrl);
          }
        }
      }

      // Final assert: both a CSRF cookie and a session cookie present
      const finalHasSession = cookies.some(c => c.key === 'session');
      const finalHasCsrf = cookies.some(c => /csrf/i.test(c.key));
      if (!finalHasSession || !finalHasCsrf) {
        this.logger.error(
          '[SupersetService] cookie check failed after /csrf_token/',
          {
            cookies: cookies.map(
              c =>
                `${c.key}; Domain=${c.domain}; Path=${c.path}; Secure=${c.secure}`
            ),
          }
        );
        throw new HttpException(
          'CSRF/session cookie missing',
          HttpStatus.BAD_GATEWAY
        );
      }

      return token;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const errorResponseData: unknown = err.response?.data;
        const errorHeaders: unknown = err.response?.headers;
        this.logger.error('[SupersetService] getCsrfToken() failed', {
          status: err.response?.status,
          data: errorResponseData,
          headers: errorHeaders,
        });
        throw new HttpException(
          'Failed to get CSRF token from Superset',
          err.response?.status ?? HttpStatus.BAD_GATEWAY
        );
      }
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  /**
   * Authenticate with Superset and get access token
   * Uses cookie jar to maintain session cookies including CSRF session token
   */
  private async authenticate(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.accessExp - 30_000)
      return this.accessToken;

    const { data } = await this.axiosInstance.post<LoginResponse>(
      '/api/v1/security/login',
      {
        username: this.adminUsername,
        password: this.adminPassword,
        provider: 'db',
        refresh: true,
      },
      {
        headers: {
          // Referer/Origin not strictly required for login, but harmless
          Referer: this.supersetUrl,
          Origin: this.supersetUrl,
        },
      }
    );

    this.accessToken = data.access_token;
    const ttlSec = data.expires_in ?? 300;
    this.accessExp = now + ttlSec * 1000;

    this.axiosInstance.defaults.headers.common['Authorization'] =
      `Bearer ${this.accessToken}`;

    return this.accessToken;
  }

  /**
   * Generate a guest token for embedding Superset dashboards/charts
   */
  async generateGuestToken(
    resources: Array<{ type: 'dashboard' | 'chart'; id: string }>,
    user?: { username: string; first_name?: string; last_name?: string },
    rls: Array<{ clause: string }> = []
  ): Promise<{ token: string }> {
    await this.authenticate();

    const csrfToken = await this.getCsrfToken(); // throws if bad

    const cookies = await this.cookieJar.getCookies(this.supersetUrl);
    this.logger.log(
      '[SupersetService] cookies after /csrf_token/',
      cookies.map(
        c =>
          `${c.key}=${c.value}; Domain=${c.domain}; Path=${c.path}; Secure=${c.secure}; SameSite=${c.sameSite}`
      )
    );

    // Superset requires a user field, so provide a default if none is given
    const defaultUser = {
      username: 'guest',
      first_name: 'Guest',
      last_name: 'User',
    };
    const payload: GuestTokenRequest = {
      resources,
      rls,
      user: user ?? defaultUser,
    };

    try {
      const { data } = await this.axiosInstance.post<GuestTokenResponse>(
        '/api/v1/security/guest_token/',
        payload,
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'X-CSRFToken': csrfToken,
            'Content-Type': 'application/json',
            Referer: this.supersetUrl,
            Origin: this.supersetUrl,
          },
        }
      );
      return { token: data.token };
    } catch (err) {
      if (axios.isAxiosError(err)) {
        const errorData = err.response?.data as
          | { message?: string }
          | string
          | undefined;
        const errorMessage =
          typeof errorData === 'object' && errorData !== null
            ? (errorData.message ?? JSON.stringify(errorData))
            : typeof errorData === 'string'
              ? errorData
              : JSON.stringify(errorData ?? 'guest_token failed');

        const errorResponseData: unknown = err.response?.data;
        this.logger.error('[guest_token] failed', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: errorResponseData, // <-- this has the real reason
          requestBody: payload, // help spot shape problems
        });
        throw new HttpException(errorMessage, err.response?.status ?? 400);
      }
      throw err;
    }
  }
}
