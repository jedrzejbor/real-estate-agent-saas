import { expect, test, type Page } from '@playwright/test';

const listingProducts = [
  {
    code: 'publikacja_testowa',
    name: 'Publikacja testowa',
    description: 'Publiczna strona oferty i panel właściciela.',
    type: 'publication',
    priceGrossAmount: 4_900,
    promotionPreview: {
      label: 'Promocja startowa',
      discountGrossAmount: 4_410,
      priceGrossAmount: 490,
    },
    currency: 'PLN',
    vatRateBasisPoints: null,
    durationDays: 60,
    featuredTier: null,
    sortOrder: 10,
  },
  {
    code: 'wyroznienie_testowe',
    name: 'Wyróżnienie testowe',
    description: 'Dodatkowa widoczność oferty.',
    type: 'featured',
    priceGrossAmount: 1_900,
    promotionPreview: null,
    currency: 'PLN',
    vatRateBasisPoints: null,
    durationDays: 7,
    featuredTier: 'featured',
    sortOrder: 20,
  },
] as const;

const agencyPlans = [
  {
    code: 'free',
    label: 'Free testowy',
    description: 'Plan startowy dla agenta.',
    priceMonthlyPln: 0,
    priceYearlyPln: 0,
    promotionPreview: null,
    limits: {
      activeListings: 2,
      clients: 10,
      monthlyAppointments: 5,
      users: 1,
      imagesPerListing: 8,
    },
    features: {},
    sortOrder: 10,
  },
  {
    code: 'professional',
    label: 'Professional testowy',
    description: 'Plan dla rozwijającego się biura.',
    priceMonthlyPln: 19_900,
    priceYearlyPln: 199_000,
    promotionPreview: {
      monthly: {
        label: 'Start dla agentów',
        discountGrossAmount: 9_950,
        priceGrossAmount: 9_950,
        durationBillingCycles: 3,
      },
      yearly: null,
    },
    limits: {
      activeListings: 100,
      clients: 1_000,
      monthlyAppointments: 500,
      users: 10,
      imagesPerListing: 40,
    },
    features: { customBranding: true },
    sortOrder: 20,
  },
] as const;

test.beforeEach(async ({ page }) => {
  await mockPricingApi(page);
});

test('pełny cennik synchronizuje odbiorcę z URL i działa z klawiatury', async ({
  page,
}) => {
  await page.goto('/cennik');

  const privateButton = page.getByRole('button', { name: 'Sprzedaję prywatnie' });
  const agentButton = page.getByRole('button', {
    name: 'Jestem agentem lub prowadzę biuro',
  });

  await expect(privateButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Publikacja testowa')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Miesięcznie' })).toHaveCount(0);

  await agentButton.focus();
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL(/\/cennik\?dla=agentow$/);
  await expect(agentButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Professional testowy')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Miesięcznie' })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/\/cennik$/);
  await expect(privateButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Publikacja testowa')).toBeVisible();
});

test('cennik agentów pokazuje promocyjną cenę dla właściwego okresu', async ({
  page,
}) => {
  await page.goto('/cennik?dla=agentow');

  const professionalCard = page
    .locator('article')
    .filter({ hasText: 'Professional testowy' });

  await expect(professionalCard).toBeVisible();
  await expect(professionalCard.getByText('Start dla agentów')).toBeVisible();
  await expect(professionalCard.getByText('199 zł')).toBeVisible();
  await expect(
    professionalCard.getByText('99,50 zł', { exact: true }),
  ).toBeVisible();
  await expect(
    professionalCard.getByText('przez pierwsze 3 mies.'),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Rocznie' }).click();

  await expect(professionalCard.getByText('1 990 zł')).toBeVisible();
  await expect(professionalCard.getByText('Start dla agentów')).toHaveCount(0);
});

test('cennik prywatny pokazuje automatyczną promocję z backendu', async ({
  page,
}) => {
  await page.goto('/cennik?dla=prywatnych');

  await expect(page.getByText('Publikacja testowa')).toBeVisible();
  await expect(page.getByText('Promocja startowa')).toBeVisible();
  await expect(page.getByText('49,00 zł')).toBeVisible();
  await expect(page.getByText('4,90 zł')).toBeVisible();
  await expect(page.getByText('Oszczędzasz 44,10 zł')).toBeVisible();
});

test('homepage pokazuje promocyjną cenę publikacji i dodatki bez rabatu', async ({
  page,
}) => {
  await page.goto('/?dla=prywatnych#pricing');

  await expect(page.getByText('Publikacja testowa')).toBeVisible();
  await expect(page.getByText('Promocja startowa')).toBeVisible();
  await expect(page.getByText('4,90 zł')).toBeVisible();
  await expect(page.getByText('Wyróżnienie testowe')).toBeVisible();
  await expect(page.getByText('19,00 zł')).toBeVisible();
  await expect(page.getByText('Promocja startowa')).toHaveCount(1);
});

test('układ cennika nie powoduje poziomego przewijania', async ({
  page,
}, testInfo) => {
  await page.goto('/cennik?dla=prywatnych');
  await expect(page.getByText('Publikacja testowa')).toBeVisible();

  const viewportWidth = page.viewportSize()?.width ?? 0;
  const documentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(documentWidth).toBeLessThanOrEqual(viewportWidth);

  const privateBox = await page
    .getByRole('button', { name: 'Sprzedaję prywatnie' })
    .boundingBox();
  const agentBox = await page
    .getByRole('button', { name: 'Jestem agentem lub prowadzę biuro' })
    .boundingBox();
  expect(privateBox).not.toBeNull();
  expect(agentBox).not.toBeNull();

  if (testInfo.project.name === 'mobile-chromium') {
    expect(agentBox!.y).toBeGreaterThan(privateBox!.y);
    await expect(page.getByRole('link', { name: 'Dodaj ogłoszenie' }).first()).toBeVisible();
  } else {
    expect(Math.abs(agentBox!.y - privateBox!.y)).toBeLessThan(2);
  }
});

test('homepage zachowuje query string przed kotwicą sekcji', async ({ page }) => {
  await page.goto('/?dla=prywatnych#pricing');
  await expect(page.getByText('Publikacja testowa')).toBeVisible();

  await page
    .getByRole('button', { name: 'Jestem agentem lub prowadzę biuro' })
    .click();

  await expect(page).toHaveURL(/\/\?dla=agentow#pricing$/);
  await expect(page.getByText('Professional testowy')).toBeVisible();
});

test('błąd katalogu prywatnego nie blokuje planów agentów', async ({ page }) => {
  await page.route('**/api/listing-products', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Katalog produktów chwilowo niedostępny' }),
    });
  });

  await page.goto('/cennik?dla=prywatnych');
  await expect(page.getByText('Katalog produktów chwilowo niedostępny')).toBeVisible();

  await page
    .getByRole('button', { name: 'Jestem agentem lub prowadzę biuro' })
    .click();

  await expect(page.getByText('Professional testowy')).toBeVisible();
  await expect(page.getByText('Katalog produktów chwilowo niedostępny')).toHaveCount(0);
});

test('błąd planów agentów nie blokuje katalogu prywatnego', async ({ page }) => {
  await page.route('**/api/plans', async (route) => {
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Plany agentów chwilowo niedostępne' }),
    });
  });

  await page.goto('/cennik?dla=agentow');
  await expect(page.getByText('Plany agentów chwilowo niedostępne')).toBeVisible();

  await page.getByRole('button', { name: 'Sprzedaję prywatnie' }).click();

  await expect(page.getByText('Publikacja testowa')).toBeVisible();
  await expect(page.getByText('Plany agentów chwilowo niedostępne')).toHaveCount(0);
});

async function mockPricingApi(page: Page) {
  await page.route('**/api/plans', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(agencyPlans),
    });
  });
  await page.route('**/api/listing-products', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(listingProducts),
    });
  });
  await page.route('**/api/auth/me', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ message: 'Brak sesji' }),
    });
  });
}
