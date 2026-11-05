import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function renderSvgs() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Render Kalash vector sheet
  const kalashPath = 'file:///' + path.resolve(__dirname, '../public/vecteezy_free-kalash-vector_109001.svg').replace(/\\/g, '/');
  await page.setViewport({ width: 1400, height: 980 });
  await page.goto(kalashPath, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.resolve(__dirname, '../public/assets/kalash_sheet.png'), omitBackground: true });
  console.log('Rendered kalash_sheet.png');

  // Render Victorian Border vector sheet
  const borderPath = 'file:///' + path.resolve(__dirname, '../public/vecteezy_victorian-border-element-in-gold-color_6115324.svg').replace(/\\/g, '/');
  await page.setViewport({ width: 2500, height: 1600 });
  await page.goto(borderPath, { waitUntil: 'networkidle0' });
  await page.screenshot({ path: path.resolve(__dirname, '../public/assets/border_sheet.png'), omitBackground: true });
  console.log('Rendered border_sheet.png');

  await browser.close();
}

renderSvgs().catch(err => {
  console.error(err);
  process.exit(1);
});
