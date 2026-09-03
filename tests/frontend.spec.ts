import { test, expect } from '@playwright/test';

test('hub loads and shows PlatformGate', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('text=Entrar no PNBOX AI').or(page.locator('text=Criar conta'))).toBeVisible({ timeout: 10000 });
});

test('platform login -> hub shows sidebar', async ({ page }) => {
  await page.goto('http://127.0.0.1:3000/');
  await page.waitForLoadState('networkidle');

  // Should see login screen first (PlatformGate)
  await expect(page.locator('text=Entrar no PNBOX AI')).toBeVisible({ timeout: 10000 });

  // Register a test user
  await page.fill('input[type="email"]', 'test-hub-' + Date.now() + '@example.com');
  await page.fill('input[type="password"]', 'senha123');
  await page.fill('input[placeholder="Seu nome"]', 'Test User');
  await page.click('button:has-text("Criar conta")');

  // Wait for hub to load (sidebar visible)
  await expect(page.locator('text=Criar com IA')).toBeVisible({ timeout: 15000 });
});