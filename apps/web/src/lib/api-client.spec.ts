jest.mock('@/lib/auth', () => ({
  refreshTokens: jest.fn(),
}));

jest.mock('@/lib/csrf', () => ({
  appendCsrfHeader: jest.fn().mockResolvedValue(undefined),
}));

import { refreshTokens } from '@/lib/auth';
import { apiFetch } from './api-client';

const fetchMock = jest.fn();
const refreshTokensMock = refreshTokens as jest.MockedFunction<
  typeof refreshTokens
>;

describe('apiFetch unauthorized handling', () => {
  const dispatchEvent = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    refreshTokensMock.mockReset();
    dispatchEvent.mockReset();

    global.fetch = fetchMock;
    global.CustomEvent = class CustomEvent {
      constructor(public readonly type: string) {}
    } as typeof CustomEvent;
    Object.defineProperty(global, 'window', {
      configurable: true,
      value: { dispatchEvent },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(global, 'window');
  });

  it('does not emit the global unauthorized event when suppression is requested', async () => {
    fetchMock.mockResolvedValueOnce({ status: 401 });
    refreshTokensMock.mockRejectedValueOnce(new Error('missing refresh token'));

    await expect(
      apiFetch('/auth/me', { suppressUnauthorizedEvent: true }),
    ).rejects.toMatchObject({ status: 401 });

    expect(dispatchEvent).not.toHaveBeenCalled();
  });

  it('emits the global unauthorized event for a regular expired session', async () => {
    fetchMock.mockResolvedValueOnce({ status: 401 });
    refreshTokensMock.mockRejectedValueOnce(new Error('expired session'));

    await expect(apiFetch('/listings')).rejects.toMatchObject({ status: 401 });

    expect(dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'auth:unauthorized' }),
    );
  });
});
