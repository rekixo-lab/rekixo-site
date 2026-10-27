import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
const read=(p)=>readFileSync(new URL("../public/"+p,import.meta.url),"utf8");
const home=read("index.html"),page=read("geolive.html"),svg=read("geolive-globe-animated.svg"),
style=read("rekixo-immersive.css"),experience=read("geolive-experience.css");
test("the exact approved GeoLive vector sketch is a self-contained animated illustration",()=>{
  const blob=createHash("sha1").update("blob "+Buffer.byteLength(svg)+"\0").update(svg).digest("hex");
  assert.equal(blob,"ee9b8e4e3c0dabc9cb0abb4e34fde812b6bf756a");
  assert.match(svg,/data-geolive-concept="animated-globe-v1"/);
  assert.match(svg,/<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  for(const key of ["geo-drift","geo-route","geo-geofence","geo-marker","geo-orbit"])
    assert.match(svg,new RegExp("."+key));
  assert.match(svg,/@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(svg,/<script|https?:\/\/|onload=/i);
  assert.match(svg,/illustrative, not live tracking data/);
});
test("the homepage GeoLive card displays the full square animated image without admin widgets",()=>{
  assert.match(home,/class="rx4-visual rx4-geo-art rx4-geo-globe"/);
  assert.match(home,/class="rx4-geo-globe-image" src="geolive-globe-animated.svg"/);
  assert.doesNotMatch(home,/class="rx4-radar"/);
  assert.match(style,/\.rx4-home \.rx4-visual\.rx4-geo-globe\{[\s\S]*?aspect-ratio:1 \/ 1/);
  assert.match(style,/\.rx4-home \.rx4-geo-globe-image\{[\s\S]*?object-fit:contain/);
  assert.match(home,/websites, mobile apps, custom software and your own dashboards through secure GeoLive APIs/);
});
test("GeoLive product page clearly offers cross-platform API integration, not a dashboard embed",()=>{
  assert.match(page,/geolive-experience.css/);
  assert.match(page,/src="geolive-globe-animated.svg"/);
  for(const label of ["Websites","Android &amp; iOS","Flutter &amp; React Native","Custom Software","App &amp; Admin Dashboards","Trusted Backends"])
    assert.ok(page.includes(label),label);
  assert.match(page,/API integration, not a dashboard embed/);
  assert.match(page,/trusted backend relay/);
  assert.match(page,/Never put private server API keys/);
  assert.match(page,/ANIMATED CONCEPT VISUAL · NO LIVE USER DATA/);
});
test("product showcase remains responsive with light/dark and motion accessibility",()=>{
  assert.match(experience,/@media\(max-width:860px\)/);
  assert.match(experience,/@media\(max-width:420px\)/);
  assert.match(experience,/html\[data-theme="dark"\]/);
  assert.match(experience,/prefers-reduced-motion:reduce/);
  assert.match(experience,/object-fit:contain/);
});
