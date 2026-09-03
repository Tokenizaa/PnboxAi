// Quick test script
import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
    headless: true,
  });
  const page = await browser.newPage();
  await page.goto('http://127.0.0.1:3001/', { waitUntil: 'networkidle', timeout: 30000 });
  console.log('=== TITLE ===');
  console.log(await page.title());
  console.log('=== BODY TEXT (first 2000) ===');
  console.log(await page.textContent('body'));
  await browser.close();
})().catch(console.error);