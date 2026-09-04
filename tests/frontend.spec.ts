import { test, expect } from '@playwright/test';

test('hub loads and shows PlatformGate', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await expect(page.getByRole('button', { name: 'Entrar no PNBOX AI' }).or(page.getByRole('button', { name: 'Criar conta' }))).toBeVisible({ timeout: 10000 });
});

test('platform login -> hub shows sidebar', async ({ page }) => {
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Should see login screen first (PlatformGate) - find the login button
  const loginBtn = page.getByRole('button', { name: /entrar/i });
  await expect(loginBtn).toBeVisible({ timeout: 10000 });

  // Click "Criar conta" to show registration form
  await page.getByRole('button', { name: /criar conta/i }).click();

  // Register a test user - use nth to get second password field (confirm password)
  const email = 'test-hub-' + Date.now() + '@example.com';
  const password = 'senha123';
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.fill('input[type="password"] >> nth=1', password); // confirm password
  await page.fill('input[placeholder="Seu nome"]', 'Test User');
  await page.click('button:has-text("Criar conta")');

  // Wait for navigation/registration to complete
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);

  // Wait for hub to load - sidebar should be visible with user info
  await expect(page.getByRole('button', { name: /sair/i })).toBeVisible({ timeout: 15000 });
});