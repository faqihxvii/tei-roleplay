import { expect, test } from '@playwright/test';

const roles = ['Pemerintah', 'Bank Sentral', 'Pengusaha', 'Serikat Buruh', 'Masyarakat'];

const scenarioPayload = {
  scenario: {
    title: 'Skenario Uji E2E',
    description: 'Skenario deterministik untuk pengujian alur permainan.'
  },
  actions: Object.fromEntries(roles.map(role => [
    role,
    [1, 2, 3].map(index => ({
      id: `${role}-action-${index}`,
      name: `Kebijakan ${index}`,
      description: 'Pilihan kebijakan untuk tes browser.',
      effects: { mood: 0 }
    }))
  ]))
};

const recapPayload = {
  feed: [1, 2, 3, 4, 5].map(index => ({
    author: `Warga ${index}`,
    handle: `@warga${index}`,
    content: `Reaksi tes nomor ${index}.`,
    likes: 12,
    retweets: 3
  }))
};

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.route('**/api/scenario', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(scenarioPayload)
  }));
  await page.route('**/api/recap', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(recapPayload)
  }));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
});

test('dialog supports keyboard focus, Escape, and restoring focus to its trigger', async ({ page }) => {
  const trigger = page.getByRole('button', { name: 'Buka panduan peran' });
  await trigger.focus();
  await page.keyboard.press('Enter');

  const dialog = page.getByRole('dialog', { name: '5 Peran Utama Penggerak Ekonomi Nasional' });
  await expect(dialog).toBeVisible();
  const startButton = dialog.getByRole('button', { name: /Saya Paham/ });
  await expect(startButton).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(startButton).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('layout reflows at a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.getByRole('button', { name: /Kebijakan 1/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('role players can complete a year and proceed with accessible metric controls', async ({ page }) => {
  await page.getByRole('button', { name: 'Matikan timer' }).click();
  await expect(page.getByRole('progressbar', { name: 'Mood' })).toHaveAttribute('aria-valuenow', '7');
  await expect(page.getByRole('button', { name: 'Matikan suara' })).toHaveAttribute('aria-pressed', 'true');

  for (const role of roles) {
    await expect(page.getByRole('heading', { name: role, level: 3 })).toBeVisible();
    const action = page.getByRole('button', { name: /Kebijakan 1/ });
    await expect(action).toBeVisible();
    await action.click();
    await expect(action).toHaveAttribute('aria-pressed', 'true');
    const confirm = page.getByRole('button', { name: 'Sahkan Kebijakan Ini' });
    await confirm.focus();
    await expect(confirm).toBeFocused();
    await page.keyboard.press('Enter');
  }

  await expect(page.getByRole('heading', { name: 'Suara Netizen & Media (Tahun 1)' })).toBeVisible();
  await expect(page.getByText('Reaksi tes nomor 1.')).toBeVisible();
  await page.getByRole('button', { name: 'Mulai Ronde Berikutnya' }).click();
  await expect(page.getByText('Tahun 2/5')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Skenario Uji E2E' })).toBeVisible();
});

test('AI endpoints validate requests and enforce a per-client rate limit', async ({ page }) => {
  const malformedJson = await page.request.post('/api/scenario', {
    data: '{"broken":',
    headers: { 'content-type': 'application/json' }
  });
  expect(malformedJson.status()).toBe(400);
  await expect(malformedJson.json()).resolves.toEqual({ error: 'Format JSON permintaan tidak valid.' });

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const response = await page.request.post('/api/scenario', { data: {} });
    expect(response.status()).toBe(400);
  }

  const rateLimitedResponse = await page.request.post('/api/scenario', { data: {} });
  expect(rateLimitedResponse.status()).toBe(429);
  expect(Number(rateLimitedResponse.headers()['retry-after'])).toBeGreaterThan(0);
});

test('players can disable the turn timer and keep their turn open', async ({ page }) => {
  await page.getByRole('button', { name: 'Matikan timer' }).click();

  const timerToggle = page.getByRole('button', { name: 'Aktifkan timer' });
  await expect(timerToggle).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByText('Timer nonaktif')).toBeVisible();
  await page.waitForTimeout(1_200);
  await expect(page.getByRole('heading', { name: 'Skenario Uji E2E' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Kebijakan 1/ })).toBeVisible();
});
