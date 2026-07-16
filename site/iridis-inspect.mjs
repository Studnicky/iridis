import { chromium } from 'playwright';

const version = await (await fetch('http://127.0.0.1:9222/json/version')).json();
const browser = await chromium.connectOverCDP(version.webSocketDebuggerUrl);
const ctx = browser.contexts()[0];
const page = ctx.pages()[0] || await browser.newPage();
await page.goto('http://127.0.0.1:3000/', { waitUntil: 'networkidle' });
await page.waitForTimeout(8000);

const state = await page.evaluate(() => {
  const graphWrap = document.querySelector('.cg-wrap');
  const firstBtn = graphWrap?.querySelector('.dagonizer-dpad-btn');
  return {
    graphWrap: !!graphWrap,
    loadingOverlay: !!graphWrap?.querySelector('.cg-overlay'),
    graphButtons: Array.from(graphWrap?.querySelectorAll('.dagonizer-dpad-btn') ?? []).map((b) => ({ title: b.getAttribute('title'), disabled: b.disabled })),
    dpadReady: document.querySelector('.cg-dpad-pos')?.querySelector('.dagonizer-dpad-btn')?.disabled === false,
  };
});
console.log(state);
await browser.close();
