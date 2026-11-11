// Erzeugt alle Icon-Varianten aus scripts/icon-art.mjs (benötigt Playwright: `npx playwright install chromium`).
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { iconSvg } from './icon-art.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const browser = await chromium.launch();

async function png(svg, size, file) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${svg.replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body></html>`,
  );
  const buf = await page.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  await page.close();
  if (file) await writeFile(file, buf);
  return buf;
}

// ICO mit eingebetteten PNGs
function ico(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const dirs = pngs.map(({ size, buf }) => {
    const d = Buffer.alloc(16);
    d.writeUInt8(size >= 256 ? 0 : size, 0);
    d.writeUInt8(size >= 256 ? 0 : size, 1);
    d.writeUInt16LE(1, 4);
    d.writeUInt16LE(32, 6);
    d.writeUInt32LE(buf.length, 8);
    d.writeUInt32LE(offset, 12);
    offset += buf.length;
    return d;
  });
  return Buffer.concat([header, ...dirs, ...pngs.map((p) => p.buf)]);
}

const rounded = iconSvg({ rounded: true });
const square = iconSvg({ rounded: false });
const maskable = iconSvg({ rounded: false, scale: 0.78 });

await writeFile('app/icon.svg', rounded);
await writeFile('public/icons/icon.svg', rounded);
await png(square, 180, 'app/apple-icon.png');
await png(rounded, 192, 'public/icons/icon-192.png');
await png(rounded, 512, 'public/icons/icon-512.png');
await png(maskable, 512, 'public/icons/maskable-512.png');
await png(rounded, 112, 'public/icons/mail-logo.png');
const f16 = await png(rounded, 16);
const f32 = await png(rounded, 32);
const f48 = await png(rounded, 48);
await writeFile('app/favicon.ico', ico([{ size: 16, buf: f16 }, { size: 32, buf: f32 }, { size: 48, buf: f48 }]));

// Open-Graph-Bild für Link-Vorschauen (WhatsApp, iMessage …)
const og = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await og.setContent(`<html><body style="margin:0;width:1200px;height:630px;display:flex;align-items:center;gap:64px;padding:0 96px;box-sizing:border-box;
  background:radial-gradient(circle at 85% 15%, #fff7e6 0, #f6f1e9 45%, #efe6d6 100%);font-family:-apple-system,'SF Pro Rounded',ui-rounded,'Segoe UI',Roboto,sans-serif;">
  <div style="width:300px;height:300px;flex:none;filter:drop-shadow(0 24px 40px rgba(12,63,43,.28))">${rounded.replace('width="512" height="512"', 'width="300" height="300"')}</div>
  <div>
    <div style="font-size:96px;font-weight:800;color:#14583a;letter-spacing:-2px;line-height:1">Wichtelomat</div>
    <div style="font-size:40px;color:#1c2420;margin-top:20px;line-height:1.25">Wichteln ohne Zettelchaos.<br><span style="color:#c8283a">Auslosen, Wünsche, Überraschung.</span></div>
  </div></body></html>`);
await writeFile('app/opengraph-image.jpg', await og.screenshot({ type: 'jpeg', quality: 86 }));
await browser.close();
console.log('Icons erzeugt.');
