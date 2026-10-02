import { expect, test } from '@playwright/test';
import { findMailLink } from './support/mailpit';

const apiUrl = 'http://localhost:4100/api';

test('HTTP + PostgreSQL + SMTP: pending access, one-use token, neutral resend', async ({
  request,
}) => {
  test.setTimeout(90_000);
  const email = `acceptance-api-${Date.now()}@example.test`;
  const password = 'AcceptancePassword123';

  const registration = await request.post(`${apiUrl}/auth/register`, {
    data: { accountType: 'agent', selectedPlan: 'free', email, password },
  });
  expect(registration.status()).toBe(202);
  expect(await registration.json()).toEqual({
    status: 'pending_email_verification',
  });
  const cookies = (await request.storageState()).cookies;
  expect(
    cookies.filter((cookie) =>
      ['accessToken', 'refreshToken'].includes(cookie.name),
    ),
  ).toHaveLength(0);

  const correctPassword = await request.post(`${apiUrl}/auth/login`, {
    data: { email, password },
  });
  expect(correctPassword.status()).toBe(403);
  expect((await correctPassword.json()).code).toBe(
    'EMAIL_VERIFICATION_REQUIRED',
  );
  const wrongPassword = await request.post(`${apiUrl}/auth/login`, {
    data: { email, password: 'WrongPassword123' },
  });
  expect(wrongPassword.status()).toBe(401);
  expect((await request.get(`${apiUrl}/auth/me`)).status()).toBe(401);
  expect((await request.post(`${apiUrl}/auth/refresh`)).status()).toBe(401);

  const resendPending = await request.post(
    `${apiUrl}/auth/email-verification/request`,
    { data: { email } },
  );
  expect(resendPending.status()).toBe(202);
  const link = await findMailLink(
    request,
    email,
    /http:\/\/localhost:3100\/verify-email#token=[A-Za-z0-9_-]+/,
  );
  const token = new URLSearchParams(new URL(link).hash.slice(1)).get('token');
  expect(token).toBeTruthy();

  const confirmations = await Promise.all([
    request.post(`${apiUrl}/auth/email-verification/confirm`, {
      data: { token },
    }),
    request.post(`${apiUrl}/auth/email-verification/confirm`, {
      data: { token },
    }),
  ]);
  expect(confirmations.map((response) => response.status()).sort()).toEqual([
    204, 400,
  ]);
  const replay = await request.post(
    `${apiUrl}/auth/email-verification/confirm`,
    { data: { token } },
  );
  expect(replay.status()).toBe(400);

  const unknownResend = await request.post(
    `${apiUrl}/auth/email-verification/request`,
    {
      data: { email: `missing-${Date.now()}@example.test` },
    },
  );
  const verifiedResend = await request.post(
    `${apiUrl}/auth/email-verification/request`,
    { data: { email } },
  );
  expect(unknownResend.status()).toBe(202);
  expect(verifiedResend.status()).toBe(202);
  expect(await unknownResend.json()).toEqual(await verifiedResend.json());

  const login = await request.post(`${apiUrl}/auth/login`, {
    data: { email, password },
  });
  expect(login.status()).toBe(200);
  expect((await login.json()).user.emailVerified).toBe(true);
});
