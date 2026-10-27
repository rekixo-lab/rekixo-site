#!/usr/bin/env node
/** Non-destructive browser QA against local static assets. No production API calls. */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve, sep, extname } from "node:path";
import assert from "node:assert/strict";

const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), "../public");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png", ".ico": "image/x-icon" };
const server = createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
  const path = resolve(publicDir, "." + (pathname.endsWith("/") ? pathname + "index.html" : pathname));
  if (path !== publicDir && !path.startsWith(publicDir + sep)) {
    response.writeHead(403).end(); return;
  }
  try {
    const data = await readFile(path);
    response.writeHead(200, { "content-type": types[extname(path)] || "application/octet-stream" }).end(data);
  } catch (_) {
    response.writeHead(404).end("Not found");
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
const origin = "http://127.0.0.1:" + server.address().port;
let browser;
let checks = 0;

try {
  browser = await chromium.launch({ headless: true });
  for (const width of [320, 360, 390, 430, 768, 820, 1024, 1440, 1920]) {
    for (const path of ["/", "/contact.html", "/portfolio.html", "/privacy-policy.html", "/rekixo-ar3d.html", "/about.html", "/business-info.html", "/geolive.html", "/product-status.html"]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
      try {
        // Ensure synthetic QA never reaches analytics, Razorpay, external sites or APIs.
        await page.route("**/*", (route) => {
          if (new URL(route.request().url()).hostname !== "127.0.0.1") return route.abort();
          return route.continue();
        });
        const result = await page.goto(origin + path, { waitUntil: "domcontentloaded", timeout: 20000 });
        assert.equal(result.status(), 200, path + " returned a non-200 status");
        await page.waitForSelector(".rx3-header", { timeout: 5000 });
        const dimensions = await page.evaluate(() => {
          const menu = document.querySelector(".rx3-menu-btn");
          const theme = document.querySelector(".rx3-theme-toggle");
          const fit = (node) => {
            const box = node.getBoundingClientRect();
            return box.left >= -1 && box.right <= innerWidth + 1 && box.width > 0;
          };
          return {
            viewport: innerWidth,
            documentWidth: document.documentElement.scrollWidth,
            menuVisible: menu && getComputedStyle(menu).display !== "none",
            menuFits: menu && fit(menu),
            themeFits: theme && fit(theme),
            skip: Boolean(document.querySelector('a.rx3-skip-link[href^="#"]')),
          };
        });
        if (dimensions.documentWidth > width + 1) {
          const offenders = await page.evaluate(() =>
            [...document.querySelectorAll("body *")].map((node) => {
              const rect = node.getBoundingClientRect();
              return {
                element: node.tagName.toLowerCase(),
                id: node.id,
                className: typeof node.className === "string" ? node.className.slice(0, 70) : "",
                left: Math.round(rect.left),
                right: Math.round(rect.right),
                width: Math.round(rect.width),
              };
            }).filter((row) => row.right > innerWidth + 2 && row.left < innerWidth)
              .sort((a, b) => b.right - a.right).slice(0, 18)
          );
          console.error("Responsive overflow diagnostic", path, width, JSON.stringify(offenders));
        }
        assert.ok(dimensions.documentWidth <= width + 1,
          path + " at " + width + "px overflowed: " + JSON.stringify(dimensions));
        assert.ok(dimensions.skip, path + " must have keyboard skip-navigation");
        assert.ok(dimensions.themeFits, path + " theme control outside " + width + "px viewport");
        if (width <= 860) {
          assert.ok(dimensions.menuVisible && dimensions.menuFits, path + " menu button missing/out of frame at " + width);
        }
        if (path === "/") {
          assert.equal(await page.locator("#products .rx3-product-card").count(), 5, "missing product catalog items");
          assert.equal(await page.locator("h1").count(), 1, "homepage needs one H1");
        }
        if (path === "/contact.html") {
          const form = page.locator('form[data-project-request-form]');
          assert.equal(await form.count(), 1);
          const rect = await form.locator('input[name="client_name"]').boundingBox();
          assert.ok(rect && rect.x >= -1 && rect.x + rect.width <= width + 1,
            "contact input spills beyond viewport at " + width);
        }
        if (path === "/privacy-policy.html") {
          assert.equal(await page.locator("#website-data").count(), 1, "privacy needs actual processing details");
          assert.equal(await page.locator("#preferences").count(), 1, "privacy needs analytics/local-storage details");
        }
        if (path === "/rekixo-ar3d.html" && width <= 430) {
          const scrollData = await page.locator("#showcase .showcase-list").evaluate((node) => ({
            flow: getComputedStyle(node).gridAutoFlow,
            scrollWidth: node.scrollWidth,
            clientWidth: node.clientWidth,
          }));
          assert.equal(scrollData.flow, "column", "AR3D previews should use mobile swipe gallery");
          assert.ok(scrollData.scrollWidth > scrollData.clientWidth,
            "AR3D preview gallery should scroll sideways without document overflow");
        }
        if (path === "/geolive.html") {
          assert.equal(await page.locator("#features h2").count(), 1);
          assert.equal(await page.locator("#privacy h2").count(), 1);
        }
        if (path === "/product-status.html") {
          assert.equal(await page.locator('meta[name="robots"][content="noindex,follow"]').count(), 1);
        }
        if (width === 390) {
          const beforeTheme = await page.locator("html").getAttribute("data-theme");
          await page.locator(".rx3-theme-toggle").click();
          const afterTheme = await page.locator("html").getAttribute("data-theme");
          assert.notEqual(afterTheme, beforeTheme, "theme toggle must change the page theme");
          const menu = page.locator(".rx3-menu-btn");
          await menu.click();
          assert.equal(await menu.getAttribute("aria-expanded"), "true", path + " mobile menu did not open");
          await page.keyboard.press("Escape");
          assert.equal(await menu.getAttribute("aria-expanded"), "false", path + " mobile menu did not close via Escape");
        }
        checks += 1;
      } finally {
        await page.close();
      }
    }
  }
  console.log("UI browser smoke passed: " + checks + " page/viewport combinations, no submissions.");
} finally {
  if (browser) await browser.close();
  await new Promise((done) => server.close(done));
}
