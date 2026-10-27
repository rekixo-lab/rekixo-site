import { createHash } from "node:crypto";
// Read-only production smoke checks plus intentionally invalid API requests.
// This never creates a Razorpay order, sends money, or inserts a customer enquiry.
const base = "https://rekixo.com";
const test = async (label, path, options, expectedStatus) => {
  const response = await fetch(base + path, { signal: AbortSignal.timeout(12000), redirect: "error", ...options });
  const text = await response.text();
  if (response.status !== expectedStatus) {
    throw new Error(label + ": expected HTTP " + expectedStatus + ", received " + response.status +
      ", body: " + text.slice(0, 150));
  }
  console.log("PASS " + label + " (HTTP " + response.status + ")");
  return text;
};
const json = JSON.parse(await test("Cloudflare D1 health", "/api/health", {}, 200));
if (!json.ok || json.platform !== "cloudflare" || json.database !== "ready") {
  throw new Error("Production health endpoint did not report live Cloudflare D1");
}
const home = await test("Root homepage", "/", {}, 200);
if (!home.includes("<html") || !home.includes("Rekixo")) throw new Error("Production root not serving website HTML");

// Verify the actual Google-compatible original R icon, not merely a valid home response.
if (!home.includes('href="/favicon.png"') || !home.includes('href="/apple-touch-icon.png"')) {
  throw new Error("Live site has not switched to the original-R favicon");
}
const iconResponse = await fetch(base + "/favicon.png", { signal: AbortSignal.timeout(12000), redirect: "error" });
if (iconResponse.status !== 200 || !/image\/png/i.test(iconResponse.headers.get("content-type") || "")) {
  throw new Error("Google Search favicon PNG missing or incorrect MIME type");
}
const faviconBytes = Buffer.from(await iconResponse.arrayBuffer());
if (faviconBytes.length < 100 || faviconBytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
    faviconBytes.readUInt32BE(16) !== 96 || faviconBytes.readUInt32BE(20) !== 96) {
  throw new Error("Deployed search favicon is not the expected 96x96 PNG");
}
const appleResponse = await fetch(base + "/apple-touch-icon.png", { signal: AbortSignal.timeout(12000), redirect: "error" });
if (appleResponse.status !== 200 || !Buffer.from(await appleResponse.arrayBuffer()).equals(faviconBytes)) {
  throw new Error("Old square R remains in Apple touch icon");
}
const icoResponse = await fetch(base + "/favicon.ico", { signal: AbortSignal.timeout(12000), redirect: "error" });
if (icoResponse.status !== 200 || Buffer.from(await icoResponse.arrayBuffer()).subarray(0, 4).toString("hex") !== "00000100") {
  throw new Error("Favicon ICO fallback is missing");
}
console.log("PASS Original REKIXO R favicon: Google PNG, Apple icon, ICO fallback");


// Release-version checks: generic HTTP 200 alone can pass against an outdated Worker.
// These pages and copy were introduced by the product-first company release.
if (!home.includes('data-rx4-workbench') || !home.includes('data-rx4-asset-slot="ar3d-masterplan"')) {
  throw new Error("Live homepage is still serving a pre-immersive release");
}
const immersiveStyle = await test("Immersive homepage CSS", "/rekixo-immersive.css", {}, 200);
if (!immersiveStyle.includes(".rx4-home") || !immersiveStyle.includes("prefers-reduced-motion")) {
  throw new Error("Immersive CSS is not deployed");
}
if (!immersiveStyle.includes('html[data-theme="light"] body.rx4-home main') ||
    !immersiveStyle.includes('html[data-theme="light"] body.rx4-home .rx4-product-card') ||
    !immersiveStyle.includes('html[data-theme="dark"] body.rx4-home')) {
  throw new Error("Live immersive homepage is still serving dark-only theme CSS");
}
const immersiveBehavior = await test("Immersive homepage JS", "/rekixo-immersive.js", {}, 200);
if (!immersiveBehavior.includes("data-rx4-workbench")) {
  throw new Error("Immersive workbench behavior is not deployed");
}
// Verify the user-approved LudoPaws image, rather than the retired branch SVG.
if (!home.includes('data-rx4-ludo-replay') ||
    !home.includes('src="ludopaws-user-board-640.avif"')) {
  throw new Error("Live LudoPaws card is still serving an older board image");
}
if (!immersiveBehavior.includes("START_OFFSETS = { goat:0, duck:13, cat:26, dog:39 }")) {
  throw new Error("LudoPaws animated preview controller is missing from production");
}
const boardResponse = await fetch(base+"/ludopaws-user-board-640.avif",
  {signal:AbortSignal.timeout(12000),redirect:"error"});
if(boardResponse.status!==200 ||
  !/image\/avif/i.test(boardResponse.headers.get("content-type")||"")){
  throw new Error("User-approved LudoPaws board AVIF is unavailable or served with the wrong MIME type");
}
const boardBytes=Buffer.from(await boardResponse.arrayBuffer());
if(boardBytes.length!==24502 ||
   boardBytes.toString("ascii",4,8)!=="ftyp" ||
   boardBytes.toString("ascii",8,12)!=="avif"){
  throw new Error("Unexpected LudoPaws board image bytes");
}
const boardSha=createHash("sha1").update("blob "+boardBytes.length+"\0").update(boardBytes).digest("hex");
if(boardSha!=="9dc23518f72968936919cb156ed76f824322e321"){
  throw new Error("Live image does not match the owner-approved LudoPaws illustration");
}
console.log("PASS Approved LudoPaws complete square illustration and dice preview are live");

// Cinematic AR3D artwork release gate. Verify actual bytes, not an old cached card.
// These are generated concept visuals with fictional data; real project gallery stays separate.
if (!home.includes('src="rekixo-ar3d-cinematic-square.webp"') ||
    !home.includes('src="rekixo-ar3d-cinematic-wide.webp"') ||
    !home.includes('class="rx4-ar3d-feature-frame')) {
  throw new Error("Live homepage is missing one of the new AR3D cinematic images");
}
if (home.includes('YOUR ORIGINAL MASTERPLAN') || home.includes('class="rx4-ar-grid"')) {
  throw new Error("Old AR3D placeholder or blue grid is still present in live homepage");
}
if (!immersiveStyle.includes(".rx4-ar3d-feature-stage>img") ||
    !immersiveStyle.includes(".rx4-visual.rx4-ar-media") ||
    !immersiveStyle.includes("aspect-ratio:1 / 1") ||
    !immersiveStyle.includes(".rx4-ar-media::after")) {
  throw new Error("Fixed square AR3D card or full widescreen feature CSS is missing");
}
if (home.includes('class="rx4-ar-image-wide"') ||
    home.includes('class="rx4-ar-image-tag"')) {
  throw new Error("Old AR3D hover swap or image-covering badges remain in the small card");
}
for (const [asset,expectedSha] of [
  ["rekixo-ar3d-cinematic-square.webp","46bbd42296d81eade177fc110dc2986ec7be26bf"],
  ["rekixo-ar3d-cinematic-wide.webp","fc5fab5e6680aec9cdd8acf3ed7cac09ef9fc0a6"]
]) {
  const response=await fetch(base+"/"+asset,{signal:AbortSignal.timeout(12000),redirect:"error"});
  if(response.status!==200 || !/image\/webp/i.test(response.headers.get("content-type")||"")){
    throw new Error("AR3D visual missing or wrong WebP content type: "+asset);
  }
  const bytes=Buffer.from(await response.arrayBuffer());
  if(bytes.length<1000 || bytes.toString("ascii",0,4)!=="RIFF" ||
     bytes.toString("ascii",8,12)!=="WEBP") {
    throw new Error("AR3D artwork has invalid WebP data: "+asset);
  }
  const actual=createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");
  if(actual!==expectedSha)throw new Error("Wrong live AR3D image version: "+asset);
  console.log("PASS AR3D approved marketing artwork: "+asset);
}
const ar3dPage=await test("AR3D product page cinematic hero","/rekixo-ar3d.html",{},200);
if(!ar3dPage.includes('src="rekixo-ar3d-cinematic-wide.webp"') ||
   !ar3dPage.includes('ar3d-showcase/ar3d-showcase-03-vatika-green-city.webp')) {
  throw new Error("AR3D product hero or its real project gallery is missing");
}
console.log("PASS Cinematic AR3D card, full feature, product page and customer gallery");

const geolive = await test("GeoLive product page", "/geolive.html", {}, 200);
if (!geolive.includes("GeoLive: location infrastructure for real applications.")) {
  throw new Error("Live GeoLive product page does not match the released version");
}
const statusPage = await test("Product status page", "/product-status.html", {}, 200);
if (!statusPage.includes("Product status and availability notes.")) {
  throw new Error("Live product status page does not match the released version");
}
const contact = await test("Contact HTML", "/contact.html", {}, 200);
if (!contact.includes('data-project-request-form') || !contact.includes("/api/payment/order")) {
  throw new Error("Contact form or same-origin payment route missing");
}
await test("Unknown page is a genuine 404", "/not-a-real-rekixo-page-smoke-404", {}, 404);
// Negative admin checks only: never supply a valid token or read customer data.
for (const [label, auth] of [["No admin credentials", undefined], ["Incorrect admin credentials", "Bearer invalid-smoke-test-token"]]) {
  const protectedBody = JSON.parse(await test(label, "/api/admin/contacts", auth ? {
    headers: { Authorization: auth }
  } : {}, 401));
  if (!/unauthorized/i.test(protectedBody.error || "")) {
    throw new Error("Admin authorization boundary returned an unexpected response");
  }
}
// The body intentionally fails server-side validation before any paid order is created.
const badOrder = JSON.parse(await test("No checkout for short description", "/api/payment/order", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Origin": base },
  body: JSON.stringify({
    clientName: "REKIXO Smoke",
    mobile: "+919999999999",
    email: "smoke-test@example.invalid",
    businessName: "REKIXO Monitoring",
    projectDescription: "Too short"
  })
}, 400));
if (!/description/i.test(badOrder.error || "")) throw new Error("Unexpected invalid checkout response");
// Invalid-signature security check: this cannot create payment events or charges.
const webhookRejection = JSON.parse(await test("Reject unsigned live Razorpay webhook", "/api/payment/webhook", {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-Razorpay-Signature": "invalid-test-signature" },
  body: JSON.stringify({
    event: "payment.captured",
    payload: { payment: { entity: {
      id: "pay_invalid_test",
      order_id: "order_invalid_test",
      amount: 100000,
      currency: "INR",
      status: "captured"
    } } }
  })
}, 401));
if (!/signature/i.test(webhookRejection.error || "")) {
  throw new Error("Unexpected invalid-signature webhook response");
}
// Live www should canonicalize all paths to the apex, not just the homepage.
for (const path of ["/", "/contact.html?utm_source=www-smoke"]) {
  const response = await fetch("https://www.rekixo.com" + path, {
    redirect: "manual",
    signal: AbortSignal.timeout(12000)
  });
  const expected = "https://rekixo.com" + path;
  if (response.status !== 308 || response.headers.get("location") !== expected) {
    throw new Error("WWW redirect invalid for " + path +
      ": HTTP " + response.status + " location " + response.headers.get("location"));
  }
  console.log("PASS www canonical redirect " + path + " (HTTP 308)");
}
console.log("Production smoke checks passed. No charges, orders or contact enquiries were created.");
