import * as tokenStorage from '../src/services/tokenStorage';
import {apiGet} from '../src/services/apiClient';

jest.mock('../src/config/api', () => ({
  API_BASE_URL: 'http://cartly.test/api/v1',
}));

const response = (status: number, body: unknown) =>
  ({
    status,
    ok: status >= 200 && status < 300,
    json: jest.fn().mockResolvedValue(body),
  }) as unknown as Response;

describe('apiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('attaches the saved access token to authenticated requests', async () => {
    jest.spyOn(tokenStorage, 'readTokens').mockResolvedValue({
      accessToken: 'access-one',
      refreshToken: 'refresh-one',
    });
    const fetchMock = jest
      .fn()
      .mockResolvedValue(response(200, {success: true, data: {id: 'user-1'}}));
    globalThis.fetch = fetchMock;

    await expect(apiGet<{id: string}>('/auth/me')).resolves.toEqual({
      id: 'user-1',
    });

    const headers = fetchMock.mock.calls[0][1].headers as Headers;
    expect(headers.get('Authorization')).toBe('Bearer access-one');
  });

  it('refreshes an expired token and retries the original request once', async () => {
    jest.spyOn(tokenStorage, 'readTokens').mockResolvedValue({
      accessToken: 'expired-access',
      refreshToken: 'valid-refresh',
    });
    const saveSpy = jest.spyOn(tokenStorage, 'saveTokens');
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(
        response(401, {
          success: false,
          error: {code: 'UNAUTHORIZED', message: 'Expired token'},
        }),
      )
      .mockResolvedValueOnce(
        response(200, {
          success: true,
          data: {
            accessToken: 'fresh-access',
            refreshToken: 'fresh-refresh',
          },
        }),
      )
      .mockResolvedValueOnce(
        response(200, {success: true, data: {id: 'user-1'}}),
      );
    globalThis.fetch = fetchMock;

    await expect(apiGet<{id: string}>('/auth/me')).resolves.toEqual({
      id: 'user-1',
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(saveSpy).toHaveBeenCalledWith({
      accessToken: 'fresh-access',
      refreshToken: 'fresh-refresh',
    });
    const retryHeaders = fetchMock.mock.calls[2][1].headers as Headers;
    expect(retryHeaders.get('Authorization')).toBe('Bearer fresh-access');
  });

  it('keeps saved tokens when refresh fails because the network is offline', async () => {
    jest.spyOn(tokenStorage, 'readTokens').mockResolvedValue({
      accessToken: 'expired-access',
      refreshToken: 'valid-refresh',
    });
    const clearSpy = jest.spyOn(tokenStorage, 'clearTokens');
    globalThis.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        response(401, {
          success: false,
          error: {code: 'UNAUTHORIZED', message: 'Expired token'},
        }),
      )
      .mockRejectedValueOnce(new TypeError('Network request failed'));

    await expect(apiGet('/auth/me')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
    expect(clearSpy).not.toHaveBeenCalled();
  });
});
