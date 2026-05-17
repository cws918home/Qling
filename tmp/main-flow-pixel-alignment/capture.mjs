import { chromium } from 'playwright';

const baseUrl = process.argv[2] ?? 'http://127.0.0.1:5173/tmp/main-flow-pixel-alignment/preview.html';
const outDir = new URL('./', import.meta.url).pathname;

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 393, height: 852 }, deviceScaleFactor: 1 });

for (const screen of ['06', '07', '08']) {
  await page.goto(`${baseUrl}?screen=${screen}`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: `${outDir}${screen}-production.png`, fullPage: false });
}

await browser.close();
