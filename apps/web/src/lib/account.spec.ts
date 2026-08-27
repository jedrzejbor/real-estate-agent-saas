jest.mock('./api-client', () => ({
  apiFetch: jest.fn(),
}));

import { apiFetch } from './api-client';
import { fetchCurrentUser } from './account';

const apiFetchMock = apiFetch as jest.MockedFunction<typeof apiFetch>;

describe('account api', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it('checks the current user without emitting a global unauthorized event', async () => {
    const user = {
      id: 'user-1',
      email: 'agent@example.com',
      role: 'agent',
      agency: null,
      entitlements: {},
      releaseFlags: {},
      usage: {},
      agent: null,
    };
    apiFetchMock.mockResolvedValue(user);

    await expect(fetchCurrentUser()).resolves.toBe(user);
    expect(apiFetchMock).toHaveBeenCalledWith('/auth/me', {
      suppressUnauthorizedEvent: true,
    });
  });
});
