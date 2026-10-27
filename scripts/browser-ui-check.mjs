#!/usr/bin/env node
/** Non-destructive browser QA against local static assets. No production API calls. */
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
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
          const positions = await page.evaluate(() => {
            const theme = document.querySelector(".rx3-theme-toggle").getBoundingClientRect();
            const menu = document.querySelector(".rx3-menu-btn").getBoundingClientRect();
            const logo = document.querySelector(".rx3-brand").getBoundingClientRect();
            return { gap:menu.left - theme.right, delta:Math.abs(menu.top - theme.top),
              left: theme.left - logo.right, right:menu.right };
          });
          assert.ok(positions.gap >= 0 && positions.gap <= 14 && positions.delta < 2 &&
            positions.left > 0 && positions.right <= width + 1,
            path + " mobile theme control must be immediately beside the menu: " + JSON.stringify(positions));
        }
        if (path === "/") {
          assert.equal(await page.locator("#products .rx3-product-card").count(), 5, "missing product catalog items");
          // Code-derived Classic board and official art from development branch.
          assert.equal(await page.locator(".rx4-lp-board-image").count(),1,
            "Classic board code-derived artwork missing");
          assert.equal(await page.locator("[data-rx4-lp-pawn]").count(),4,
            "four animated official-art character pawns missing");
          const preview=page.locator("[data-rx4-ludo-replay]");
          assert.equal(await preview.count(),1,"clickable LudoPaws board preview missing");
          if(width===390 || width===1440){
            await preview.scrollIntoViewIfNeeded();
            const originalDice=await page.locator("[data-rx4-lp-dice]").textContent();
            await preview.click();
            await page.waitForFunction(() => {
              const status=document.querySelector("[data-rx4-lp-status]");
              return status && status.textContent.includes("moved");
            },{timeout:7000});
            assert.notEqual(await page.locator("[data-rx4-lp-dice]").textContent(),originalDice,
              "LudoPaws dice did not roll");
            assert.equal(await page.locator("[data-rx4-lp-pawn='dog']").evaluate(el=>el.style.left),
              "38.89%","Dog pawn should align with Android board track after three steps");
            const asset=await page.locator(".rx4-lp-board-image").evaluate(img=>({
              loaded:img.complete && img.naturalWidth>0,
              src:img.getAttribute("src")
            }));
            assert.ok(asset.loaded && asset.src==="ludopaws-classic-code-preview.svg",
              "Classic code-derived preview did not render");
            const pawnArt=await page.locator(".rx4-lp-animal").first().evaluate(el=>
              getComputedStyle(el).backgroundImage);
            assert.ok(pawnArt.includes("ludopaws-2026-official-art.webp"),
              "Official latest-branch character artwork missing");
          }
          assert.equal(await page.locator("h1").count(), 1, "homepage needs one H1");
          assert.equal(await page.locator('[data-rx4-asset-slot="ar3d-masterplan"]').count(), 1,
            "real estate slot must remain available for the owner's original image");
          assert.equal(await page.locator('[data-rx4-workbench] [role="tab"]').count(), 3,
            "engineering workbench needs three selectable technical layers");
          const backendTab = page.locator('[data-rx4-tab="backend"]');
          await backendTab.click();
          assert.equal(await backendTab.getAttribute("aria-selected"), "true");
          assert.equal(await page.locator('[data-rx4-panel="backend"]').isVisible(), true);
          assert.equal(await page.locator('[data-rx4-panel="frontend"]').isVisible(), false);
          await backendTab.focus();
          await page.keyboard.press("ArrowRight");
          assert.equal(await page.locator('[data-rx4-tab="release"]').getAttribute("aria-selected"), "true",
            "keyboard arrow keys must switch engineering layer");
          const animation = await page.locator(".rx4-aura-one").evaluate((node) => getComputedStyle(node).animationName);
          assert.equal(animation, "none", "reduced-motion users must not receive ambient animation");
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

  // Cross-theme coverage for all published HTML, not just the homepage.
  // Older policy.css has dark-only text on newly light-colored cards.
  const pages = (await readdir(publicDir)).filter(n => n.endsWith(".html"));
  for (const width of [320, 390, 820, 1440]) {
    for (const name of pages) {
      const page = await browser.newPage({ viewport:{width,height:900}, reducedMotion:"reduce" });
      try {
        await page.route("**/*", route => {
          if (new URL(route.request().url()).hostname !== "127.0.0.1") return route.abort();
          return route.continue();
        });
        await page.addInitScript(() => { try { if (!sessionStorage.getItem("__rx_qa_theme_seeded")) { localStorage.setItem("rekixo-theme","light"); sessionStorage.setItem("__rx_qa_theme_seeded","true"); } } catch (_) {} });
        assert.equal((await page.goto(origin + "/" + name, { waitUntil:"domcontentloaded" })).status(), 200);
        for (const theme of ["light","dark"]) {
          if (theme === "dark") {
            const btn = page.locator(".rx3-theme-toggle");
            if (await btn.count() && await btn.isVisible()) await btn.click();
            else await page.evaluate(() => { document.documentElement.dataset.theme = "dark"; });
          }
          const result = await page.evaluate(() => {
            const theme = document.documentElement.dataset.theme;
            const rgb = text => {
              const s = text.match(/[\d.]+/g);
              return s && s.length >= 3 ? s.slice(0,3).map(Number) : null;
            };
            const lum = color => color.map(n => { const c=n/255; return c<=.04045?c/12.92:((c+.055)/1.055)**2.4; })
              .reduce((sum,v,i) => sum + v * [.2126,.7152,.0722][i],0);
            const contrast = (a,b) => {
              const x=lum(a),y=lum(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);
            };
            const selector = "main .info-tile span,main .info-tile a,main .notice,main .service-card span," +
              "main :is(.card,.section-card,.legal-card,.service-card,.ar-feature,.control-item,.ar-metric,.ar-step,.compare-card,.builder-card,.arch-box,.hires-note) :is(p,li)";
            const issues=[];
            for(const el of document.querySelectorAll(selector)){
              if(!el.textContent.trim() || el.closest('[aria-hidden="true"]'))continue;
              const style=getComputedStyle(el),box=el.getBoundingClientRect();
              if(style.display==="none"||style.visibility==="hidden"||box.width<1)continue;
              const fg=rgb(style.color);if(!fg)continue;
              let parent=el.closest(".notice,.info-tile,.service-card,.card,.section-card,.legal-card,.ar-feature,.control-item,.ar-metric,.ar-step,.compare-card,.builder-card,.arch-box,.hires-note");
              let bg=null;
              while(parent){
                const color=getComputedStyle(parent).backgroundColor,rgba=color.match(/[\d.]+/g);
                if(color.startsWith("rgb(") || (color.startsWith("rgba(")&&Number(rgba?.[3])>=.98)){
                  bg=rgb(color);break;
                }
                parent=parent.parentElement;
              }
              bg ||= theme==="dark" ? [7,17,31]:[255,255,255];
              const ratio=contrast(fg,bg);
              if(ratio<4.5)issues.push({text:el.textContent.trim().slice(0,48),color:style.color,background:bg,ratio:ratio.toFixed(2)});
            }
            return {theme,scrollWidth:document.documentElement.scrollWidth,issues:issues.slice(0,10)};
          });
          // Home was previously hard-coded to dark while its theme attribute
          // changed. Assert actual computed surfaces, readable ink and logo.
          if (name === "index.html") {
            const appearance = await page.evaluate(() => {
              const css = (selector,prop) => {
                const el=document.querySelector(selector);
                return el ? getComputedStyle(el)[prop] : "";
              };
              const color = s => {
                const v=s.match(/[\d.]+/g);
                return v && v.length>=3 ? v.slice(0,3).map(Number) : [];
              };
              return {
                body:color(css("body","backgroundColor")),
                main:color(css("main","backgroundColor")),
                heroInk:color(css("#rekixo-intro-title","color")),
                productInk:color(css(".rx4-product-bottom h3","color")),
                cardBackground:css(".rx4-product-card","backgroundImage"),
                productSection:color(css(".rx4-products-section","backgroundColor")),
                workbench:color(css(".rx4-workbench","backgroundColor")),
                footer:color(css(".rx3-footer","backgroundColor")),
                header:color(css(".rx3-header","backgroundColor")),
                heroButton:color(css(".rx4-button-primary","color")),
                logo:document.querySelector(".rx3-brand img")?.getAttribute("src"),
                toggleLabel:document.querySelector(".rx3-theme-toggle")?.getAttribute("aria-label")
              };
            });
            const isLight=theme==="light";
            const bright=rgb=>rgb.length===3 && rgb.reduce((a,b)=>a+b,0)/3>160;
            assert.equal(bright(appearance.body),isLight,name+" body background stayed "+appearance.body+" in "+theme);
            assert.equal(bright(appearance.main),isLight,name+" main background stayed "+appearance.main+" in "+theme);
            assert.equal(bright(appearance.productSection),isLight,name+" products background stayed "+appearance.productSection+" in "+theme);
            assert.equal(bright(appearance.workbench),isLight,name+" engineering surface stayed "+appearance.workbench+" in "+theme);
            assert.equal(bright(appearance.footer),isLight,name+" footer background stayed "+appearance.footer+" in "+theme);
            assert.equal(bright(appearance.heroInk),!isLight,name+" heading did not invert "+appearance.heroInk);
            assert.equal(bright(appearance.productInk),!isLight,name+" product title did not invert "+appearance.productInk);
            assert.ok(isLight ? /rgb\(255, 255, 255\)/.test(appearance.cardBackground) :
              /rgb\(16, 31, 49\)/.test(appearance.cardBackground),
              name+" product cards didn't repaint "+appearance.cardBackground);
            assert.equal(appearance.logo,isLight?"rekixo-logo-light.svg":"rekixo-logo-static.svg");
            assert.equal(appearance.toggleLabel,isLight?"Switch to dark mode":"Switch to light mode");
            if (width===390) {
              await page.reload({waitUntil:"domcontentloaded"});
              assert.equal(await page.locator("html").getAttribute("data-theme"),theme,
                "homepage theme did not survive reload");
            }
          }

          assert.equal(result.theme,theme,name+" missing "+theme+" theme");
          assert.ok(result.scrollWidth<=width+1,name+" "+theme+" overflows at "+width);
          assert.equal(result.issues.length,0,name+" "+theme+" WCAG-AA text contrast at "+width+": "+JSON.stringify(result.issues));
          checks++;
        }
      } finally { await page.close(); }
    }
  }

  console.log("UI browser smoke passed: " + checks + " page/viewport combinations, no submissions.");
} finally {
  if (browser) await browser.close();
  await new Promise((done) => server.close(done));
}
