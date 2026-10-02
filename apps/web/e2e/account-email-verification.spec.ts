import { expect, test } from '@playwright/test';
import { findMailLink } from './support/mailpit';

const apiUrl = 'http://localhost:4100/api';
const password = 'AcceptancePassword123';

test('agent Free: registration, mailbox proof on another device, and login', async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(180_000);
  const email = `acceptance-agent-${Date.now()}@example.test`;

  await page.goto('/register?plan=free');
  await page.getByRole('textbox', { name: 'Imię' }).fill('Test');
  await page.getByRole('textbox', { name: 'Nazwisko' }).fill('Agent');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Hasło').fill(password);
  await page
    .getByRole('button', { name: 'Zarejestruj się', exact: true })
    .click();

  await expect(
    page.getByRole('heading', { name: 'Sprawdź swoją pocztę' }),
  ).toBeVisible();
  expect(
    (await page.context().cookies(apiUrl)).filter((cookie) =>
      ['accessToken', 'refreshToken'].includes(cookie.name),
    ),
  ).toHaveLength(0);

  const pendingLogin = await request.post(`${apiUrl}/auth/login`, {
    data: { email, password },
  });
  expect(pendingLogin.status()).toBe(403);
  expect((await pendingLogin.json()).code).toBe('EMAIL_VERIFICATION_REQUIRED');
  const link = await findMailLink(
    request,
    email,
    /http:\/\/localhost:3100\/verify-email#token=[A-Za-z0-9_-]+/,
  );
  const otherDevice = await browser.newContext();
  try {
    const verifyPage = await otherDevice.newPage();
    await verifyPage.goto(link);
    await expect(
      verifyPage.getByRole('heading', { name: 'Adres został potwierdzony' }),
    ).toBeVisible();
    await expect(verifyPage).toHaveURL('http://localhost:3100/verify-email');
    expect(
      (await otherDevice.cookies(apiUrl)).filter((cookie) =>
        ['accessToken', 'refreshToken'].includes(cookie.name),
      ),
    ).toHaveLength(0);
    await verifyPage.getByRole('link', { name: 'Zaloguj się' }).click();
    await verifyPage.getByRole('textbox', { name: 'Email' }).fill(email);
    await verifyPage.getByLabel('Hasło').fill(password);
    await verifyPage
      .getByRole('button', { name: 'Zaloguj się', exact: true })
      .click();
    await expect(verifyPage).toHaveURL(/\/dashboard(?:\?.*)?$/, {
      timeout: 60_000,
    });
  } finally {
    await otherDevice.close();
  }
});

test('agent paid: plan choice resumes with a fresh quote after verification', async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);
  const email = `acceptance-paid-${Date.now()}@example.test`;

  await page.goto('/register?plan=starter&billing=yearly');
  await page.getByRole('textbox', { name: 'Imię' }).fill('Test');
  await page.getByRole('textbox', { name: 'Nazwisko' }).fill('Paid');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Hasło').fill(password);
  await page
    .getByRole('button', { name: 'Zarejestruj się i przejdź do płatności' })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Sprawdź swoją pocztę' }),
  ).toBeVisible();

  const link = await findMailLink(
    request,
    email,
    /http:\/\/localhost:3100\/verify-email#token=[A-Za-z0-9_-]+/,
  );
  await page.goto(link);
  await expect(
    page.getByRole('heading', { name: 'Adres został potwierdzony' }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Zaloguj się' }).click();
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Hasło').fill(password);
  await page.getByRole('button', { name: 'Zaloguj się', exact: true }).click();

  await expect(page).toHaveURL(
    /\/dashboard\/upgrade\?plan=starter&billing=yearly$/,
    { timeout: 60_000 },
  );
  await expect(page.getByText('Do zapłaty')).toBeVisible();
  const accountPlan = await page.evaluate(async (url) => {
    const response = await fetch(`${url}/auth/me`, { credentials: 'include' });
    const user = await response.json();
    return user.entitlements.plan.code as string;
  }, apiUrl);
  expect(accountPlan).toBe('free');
});

test('seller: verified submission is claimed after mailbox proof on another device', async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(180_000);
  const email = `acceptance-seller-${Date.now()}@example.test`;
  const submission = await request.post(
    `${apiUrl}/public-listing-submissions`,
    {
      data: {
        listing: {
          title: 'Mieszkanie testowe do sprzedaży',
          description:
            'Przestronne mieszkanie z balkonem i miejscem parkingowym.',
          propertyType: 'apartment',
          transactionType: 'sale',
          price: 450000,
          areaM2: 52,
          rooms: 2,
        },
        address: { city: 'Warszawa' },
        images: [1, 2, 3].map((index) => ({
          url: `/uploads/acceptance-${index}.jpg`,
        })),
        ownerName: 'Test Seller',
        email,
        phone: '500600700',
        contactConsent: true,
        termsConsent: true,
      },
    },
  );
  expect(submission.status(), await submission.text()).toBe(201);
  const listingLink = await findMailLink(
    request,
    email,
    /http:\/\/localhost:3100\/dodaj-oferte\/potwierdzono\?token=[A-Za-z0-9_-]+/,
  );
  const submissionToken = new URL(listingLink).searchParams.get('token');
  expect(submissionToken).toBeTruthy();
  const verified = await request.post(
    `${apiUrl}/public-listing-submissions/verify`,
    {
      data: { token: submissionToken },
    },
  );
  expect(verified.status(), await verified.text()).toBe(200);
  const { claimToken } = (await verified.json()) as { claimToken: string };

  const mismatched = await request.post(`${apiUrl}/auth/register`, {
    data: {
      accountType: 'private_seller',
      claimToken,
      email: `other-${Date.now()}@example.test`,
      password,
    },
  });
  expect(mismatched.status()).toBeGreaterThanOrEqual(400);

  await page.goto(`/register?claimToken=${encodeURIComponent(claimToken)}`);
  await page.getByRole('textbox', { name: 'Imię' }).fill('Test');
  await page.getByRole('textbox', { name: 'Nazwisko' }).fill('Seller');
  await page.getByRole('textbox', { name: 'Email' }).fill(email);
  await page.getByLabel('Hasło').fill(password);
  await page
    .getByRole('button', { name: 'Zarejestruj się', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Sprawdź swoją pocztę' }),
  ).toBeVisible();

  const link = await findMailLink(
    request,
    email,
    /http:\/\/localhost:3100\/verify-email#token=[A-Za-z0-9_-]+/,
  );
  const otherDevice = await browser.newContext();
  try {
    const sellerPage = await otherDevice.newPage();
    await sellerPage.goto(link);
    await expect(
      sellerPage.getByRole('heading', { name: 'Adres został potwierdzony' }),
    ).toBeVisible();
    await sellerPage.getByRole('link', { name: 'Zaloguj się' }).click();
    await sellerPage.getByRole('textbox', { name: 'Email' }).fill(email);
    await sellerPage.getByLabel('Hasło').fill(password);
    await sellerPage
      .getByRole('button', { name: 'Zaloguj się', exact: true })
      .click();
    await expect(sellerPage).toHaveURL(/\/dashboard\/claim-listing$/, {
      timeout: 60_000,
    });
    await expect(
      sellerPage.getByRole('heading', {
        name: /Oferta (czeka na sprawdzenie|jest gotowa)/,
      }),
    ).toBeVisible();
  } finally {
    await otherDevice.close();
  }
});
