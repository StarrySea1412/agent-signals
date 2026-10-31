// 本地无头验收（VOL.08）：四枚小样逐状态、错误收集、移动端溢出
import { createServer } from "node:http";
import { readFile, mkdir } from "node:fs/promises";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const require = createRequire("D:/project/machine-skill/node_modules/");
const { chromium } = require("playwright");
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const shots = join(root, "shots");
await mkdir(shots, { recursive: true });
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript",
  ".webp": "image/webp", ".woff2": "font/woff2", ".png": "image/png" };
const server = createServer(async (req, res) => {
  try {
    const p = decodeURIComponent(req.url.split("?")[0]);
    const file = join(root, p === "/" ? "index.html" : p);
    const body = await readFile(file);
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch { res.writeHead(404); res.end("not found"); }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}/`;
console.log("serving", base);
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const errors = [];
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
page.on("requestfailed", (r) => errors.push("requestfailed: " + r.url()));
await page.goto(base, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
const font = await page.evaluate(() => document.fonts.check('16px "LXGW WenKai"'));
const imgs = await page.evaluate(() => [...document.images].map((i) => ({ src: i.getAttribute("src"), ok: i.naturalWidth > 0 })));
console.log("font:", font, "| images:", imgs.length, "| broken:", imgs.filter((i) => !i.ok).map((i) => i.src).join(",") || "none");
await page.screenshot({ path: join(shots, "00-hero.png"), clip: { x: 0, y: 0, width: 1440, height: 900 } });

async function shot(sel, name, fn) {
  const el = await page.$(sel);
  await el.scrollIntoViewIfNeeded();
  if (fn) await fn();
  await page.waitForTimeout(150);
  const box = await el.boundingBox();
  await page.screenshot({ path: join(shots, name), clip: { x: Math.max(0, box.x - 6), y: Math.max(0, box.y - 6), width: Math.min(1440, box.width + 12), height: Math.min(2200, box.height + 12) } });
}

/* D1 wire anatomy */
const d1 = async (name, scene, status) => {
  await page.evaluate(([scene, status]) => {
    document.querySelector(`#d1-scene button[data-scene="${scene}"]`).click();
    document.querySelector(`#d1-status button[data-status="${status}"]`).click();
  }, [scene, status]);
  await page.waitForTimeout(120);
  await shot("#demo1", name);
  console.log("d1", scene, status, await page.evaluate(() => ({
    tag: document.querySelector("#d1-codetag").textContent,
    note: document.querySelector("#d1-note").textContent.slice(0, 40),
  })));
};
await d1("01-d1-get200.png", "read", 200);
await d1("02-d1-get429.png", "read", 429);
await d1("03-d1-post500.png", "call", 500);
await d1("04-d1-post404.png", "call", 404);

/* D2 race */
await shot("#demo2", "05-d2-idle.png");
await page.evaluate(() => document.querySelector("#d2-run").click());
await page.waitForTimeout(1400);
await shot("#demo2", "06-d2-mid.png");
await page.waitForTimeout(6500);
await shot("#demo2", "07-d2-end.png");
console.log("d2 end", await page.evaluate(() => ({
  a: document.querySelector("#d2-na").textContent, b: document.querySelector("#d2-nb").textContent,
  c: document.querySelector("#d2-nc").textContent, d: document.querySelector("#d2-nd").textContent,
  log: document.querySelectorAll("#d2-log .wrow").length,
})));

/* D3 duplex */
const d3 = async (name, mode) => {
  await page.evaluate((m) => {
    document.querySelector(`#d3-mode button[data-mode="${m}"]`).click();
  }, mode);
  await page.waitForTimeout(120);
  await shot("#demo3", name);
  console.log("d3", mode, await page.evaluate(() => ({
    a: document.querySelector("#d3-na").textContent, b: document.querySelector("#d3-nb").textContent,
  })));
};
await d3("08-d3-half.png", "half");
await d3("09-d3-full.png", "full");
await page.evaluate(() => { document.querySelector("#d3-heart").checked = true; document.querySelector("#d3-heart").dispatchEvent(new Event("change")); document.querySelector("#d3-cut").click(); });
await page.waitForTimeout(150);
await shot("#demo3", "10-d3-cut.png");
console.log("d3 cut", await page.evaluate(() => document.querySelector("#d3-note").textContent.slice(0, 50)));

/* D4 court */
await shot("#demo4", "11-d4-open.png");
await page.evaluate(() => { document.querySelectorAll("#d4-btns button")[0].click(); });
await page.waitForTimeout(120);
await shot("#demo4", "12-d4-verdict.png");
console.log("d4", await page.evaluate(() => ({
  score: document.querySelector("#d4-score").textContent,
  v: document.querySelector("#d4-verdict").textContent.slice(0, 60),
})));
// 答完六题看总分
for (let i = 0; i < 6; i++) {
  await page.evaluate(() => { document.querySelector("#d4-next").click(); });
  await page.waitForTimeout(60);
  await page.evaluate((i) => { document.querySelectorAll("#d4-btns button")[i % 3].click(); }, i);
  await page.waitForTimeout(40);
}
await page.waitForTimeout(120);
await shot("#demo4", "13-d4-final.png");
console.log("d4 final", await page.evaluate(() => document.querySelector("#d4-title").textContent));
await page.evaluate(() => { document.querySelector("#d4-next").click(); });

/* mobile */
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true });
mobile.on("pageerror", (e) => errors.push("mobile pageerror: " + e.message));
await mobile.goto(base, { waitUntil: "networkidle" });
await mobile.evaluate(() => document.fonts.ready);
await mobile.screenshot({ path: join(shots, "14-mobile-hero.png") });
for (const [sel, name] of [["#demo1", "15-mobile-d1.png"], ["#demo2", "16-mobile-d2.png"], ["#demo3", "17-mobile-d3.png"], ["#demo4", "18-mobile-d4.png"]]) {
  const el = await mobile.$(sel);
  await el.scrollIntoViewIfNeeded();
  await mobile.waitForTimeout(120);
  const box = await el.boundingBox();
  await mobile.screenshot({ path: join(shots, name), clip: { x: 0, y: Math.max(0, box.y), width: 390, height: Math.min(900, box.height) } });
}
console.log("mobile overflow:", await mobile.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth));
console.log("ERRORS:", errors.length ? errors : "none");
await browser.close();
server.close();
