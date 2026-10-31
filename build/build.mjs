// 拼接单文件站点：head + style + hero + 七章 + 结语(footer 内) + demos.js
// 用法：node build/build.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");

const style = read("build/style.css");
const hero = read("build/hero.html");
const chapters = ["ch1", "ch2", "ch3", "ch4", "ch5", "ch6", "ch7"]
  .map((n) => read(`build/${n}.html`)).join("\n");
const footer = read("build/footer.html");
const js = read("build/demos.js");

const head = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<meta name="color-scheme" content="dark"/>
<meta name="theme-color" content="#0b110e"/>
<link rel="preload" href="assets/fonts/wenkai-regular.woff2" as="font" type="font/woff2" crossorigin/>
<link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Crect width='24' height='24' fill='%230b110e'/%3E%3Crect x='2.5' y='12' width='19' height='8' rx='1.5' fill='none' stroke='%2363e6a2' stroke-width='1.3'/%3E%3Cpath d='M5 8.5h3.4l2-4.2 2.2 8.4 2-4.2H19' fill='none' stroke='%23e6b45c' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3Ccircle cx='5.5' cy='16' r='1' fill='%2363e6a2'/%3E%3C/svg%3E"/>
<meta name="description" content="从一行招聘要求出发：Python 是 Agent 的母语，REST、SSE、WebSocket 是它和世界说话的三种方式。同一条消息走完三种协议的完整一生，附报文解剖台、首字竞速台、双工对讲机、选型法庭四枚确定性小样。"/>
<meta name="author" content="StarrySea1412"/>
<meta property="og:title" content="Agent 的三条信号线 · 造物手记 VOL.08"/>
<meta property="og:description" content="模型是 Agent 的脑子，通信是 Agent 的嘴和耳朵。REST、SSE、WebSocket——一条消息的三次旅行，一个文件的三种端点。"/>
<meta property="og:type" content="article"/>
<meta property="og:image" content="assets/art/hero.webp"/>
<title>Agent 的三条信号线 · 造物手记 VOL.08</title>
<style>
${style}
</style>
</head>
<body>
<div class="progress" id="progress"></div>
`;
const tail = `
<script>
${js}
</script>
</body>
</html>
`;

const html = head + hero + "\n<main>\n" + chapters + "\n" + footer + "\n</main>\n" + tail;
writeFileSync(join(root, "index.html"), html, "utf8");
console.log(`built index.html  ${(Buffer.byteLength(html) / 1024).toFixed(1)} KB`);
