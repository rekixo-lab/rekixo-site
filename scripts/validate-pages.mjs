#!/usr/bin/env node
/**
 * Dependency-free Cloudflare Pages build gate for Rekixo's static parent site.
 * Run: node scripts/validate-pages.mjs
 */
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../public");
const files = new Set();
async function collect(dir, prefix = "") {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) await collect(path.join(dir, entry.name), name);
    else if (entry.isFile()) files.add(name);
  }
}
await collect(root);

const required = ["index.html", "404.html", "robots.txt", "sitemap.xml", "_headers"];
const failures = required.filter((name) => !files.has(name)).map((name) => `Missing required file: ${name}`);
const canonicalOrigin = "https://rekixo.com";

function verifyReference(source, raw) {
  if (!raw || raw.startsWith("#") || /^(mailto:|tel:|data:|javascript:|blob:)/i.test(raw)) return;
  let url;
  try {
    url = new URL(raw, `${canonicalOrigin}/${source}`);
  } catch {
    failures.push(`${source}: invalid reference ${raw}`);
    return;
  }
  if (url.origin !== canonicalOrigin) return;
  let name;
  try {
    name = decodeURIComponent(url.pathname).replace(/^\/+/, "");
  } catch {
    failures.push(`${source}: invalid URL encoding ${raw}`);
    return;
  }
  if (!name || name.endsWith("/")) name += "index.html";
  if (!files.has(name) && !files.has(`${name}.html`) && !files.has(`${name}/index.html`)) {
    failures.push(`${source}: broken local reference ${raw}`);
  }
}

let htmlCount = 0;
for (const name of files) {
  if (!name.endsWith(".html")) continue;
  htmlCount += 1;
  const html = await readFile(path.join(root, name), "utf8");
  for (const match of html.matchAll(/\b(?:src|href|poster|action)\s*=\s*(["'])(.*?)\1/gi)) {
    verifyReference(name, match[2].trim());
  }
}

if (files.has("sitemap.xml")) {
  const sitemap = await readFile(path.join(root, "sitemap.xml"), "utf8");
  for (const match of sitemap.matchAll(/<loc>([^<]+)<\/loc>/gi)) {
    verifyReference("sitemap.xml", match[1].trim());
  }
}
if (files.has("_headers")) {
  const headers = await readFile(path.join(root, "_headers"), "utf8");
  for (const value of ["Content-Security-Policy:", "Strict-Transport-Security:", "https://checkout.razorpay.com"]) {
    if (!headers.includes(value)) failures.push(`_headers: missing required security/integration rule ${value}`);
  }
}

if (failures.length) {
  console.error(`Static site validation failed (${failures.length}):\n${failures.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Rekixo static site validated: ${htmlCount} HTML pages, ${files.size} assets/files; security header and local links present.`);
}
