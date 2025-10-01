import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getManagementApiToken, callApi } from './logto';
import { secret } from 'encore.dev/config';
import { APIError } from 'encore.dev/api';
import log from 'encore.dev/log';

// Mock encore.dev modules
vi.mock('encore.dev/config', () => ({
  secret: (name: string) => () => `mock_${name}`, // Return a function that returns the mock value
}));

vi.mock('encore.dev/log', () => ({
  default: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Logto Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset token cache between tests
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getManagementApiToken', () => {
    it('should fetch and cache a new token successfully', async () => {
      const mockTokenResponse = {
        access_token: 'mock_access_token',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      const result = await getManagementApiToken();

      expect(result).toEqual({ token: 'mock_access_token' });
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'mock_LOGTO_DOMAIN/oidc/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: expect.stringContaining('Basic'),
          }),
        }),
      );
    });

    it('should use cached token if not expired', async () => {
      // First call to cache the token
      const mockTokenResponse = {
        access_token: 'mock_access_token',
        expires_in: 3600,
        token_type: 'Bearer',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTokenResponse),
      });

      await getManagementApiToken();
      mockFetch.mockClear();

      // Second call should use cached token
      const result = await getManagementApiToken();

      expect(result).toEqual({ token: 'mock_access_token' });
      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('callLogtoApi', () => {
    beforeEach(() => {
      // Mock successful token fetch for all API call tests
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'mock_token',
            expires_in: 3600,
            token_type: 'Bearer',
          }),
      });
    });

    it('should throw APIError on failed API call', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server Error'),
        headers: new Headers(),
      });

      await expect(() =>
        callApi({
          path: '/api/test',
          method: 'GET',
        }),
      ).rejects.toThrow(APIError);

      expect(log.error).toHaveBeenCalled();
    });
  });
});
