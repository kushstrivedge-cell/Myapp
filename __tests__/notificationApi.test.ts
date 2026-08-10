import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
} from '../src/services/apiClient';
import { notificationApi } from '../src/services/notificationApi';

jest.mock('../src/services/apiClient', () => ({
  apiDelete: jest.fn(),
  apiGet: jest.fn(),
  apiPatch: jest.fn(),
  apiPost: jest.fn(),
}));

test('uses the authenticated notification endpoints', async () => {
  (apiGet as jest.Mock).mockResolvedValue([]);
  (apiPatch as jest.Mock).mockResolvedValue(undefined);
  (apiDelete as jest.Mock).mockResolvedValue(undefined);
  (apiPost as jest.Mock).mockResolvedValue(undefined);

  await notificationApi.list();
  await notificationApi.markAllRead();
  await notificationApi.clear();
  await notificationApi.registerToken('valid-device-token-12345', 'android');

  expect(apiGet).toHaveBeenCalledWith('/notifications');
  expect(apiPatch).toHaveBeenCalledWith('/notifications/read-all', {});
  expect(apiDelete).toHaveBeenCalledWith('/notifications');
  expect(apiPost).toHaveBeenCalledWith('/notifications/device-token', {
    token: 'valid-device-token-12345',
    platform: 'android',
  });
});
