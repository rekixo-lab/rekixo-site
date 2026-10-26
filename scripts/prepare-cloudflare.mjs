// Generate an effective, non-secret Wrangler config from the tracked template.
// No Cloudflare credentials are stored in GitHub. Worker secrets are provisioned
// via wrangler secret put / Cloudflare dashboard (never via this script).
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
const template = JSON.parse(await readFile(path.resolve("wrangler.example.jsonc"), "utf8"));
const id = String(process.env.REKIXO_D1_DATABASE_ID || template.d1_databases[0].database_id || "").trim();
if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(id)) {
  console.error("No valid Cloudflare D1 database UUID configured.");
  process.exit(1);
}
template.d1_databases[0].database_id = id;
const to = String(process.env.REKIXO_TO_EMAIL || "ai@rekixo.com");
const from = String(process.env.REKIXO_FROM_EMAIL || "no-reply@rekixo.com");
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from)) {
  throw new Error("Cloudflare sender and recipient email addresses must be valid.");
}
template.send_email[0].destination_address = to;
template.vars.REKIXO_TO_EMAIL = to;
template.vars.REKIXO_FROM_EMAIL = from;
await writeFile(path.resolve("wrangler.jsonc"), JSON.stringify(template, null, 2) + "\n");
console.log("Created local wrangler.jsonc: Worker + static assets + D1 + native Email Service. No API secrets included.");
