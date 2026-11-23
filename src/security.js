import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
const digest = (v) => createHash("sha256").update(v).digest();
export const equal = (a, b) =>
  timingSafeEqual(digest(String(a)), digest(String(b)));
export function authenticate(endpoint, headers, raw, now = Date.now()) {
  const keys = [endpoint.secret, endpoint.previousSecret].filter(Boolean);
  if (endpoint.auth === "hmac-sha256") {
    const timestamp = headers["x-webhook-timestamp"];
    const signature = headers["x-webhook-signature"];
    if (
      typeof timestamp !== "string" ||
      !/^\d{10}$/.test(timestamp) ||
      Math.abs(now - Number(timestamp) * 1000) > 300000 ||
      typeof signature !== "string"
    )
      return false;
    return keys.some((key) =>
      equal(
        signature,
        `sha256=${createHmac("sha256", key)
          .update(timestamp + ".")
          .update(raw)
          .digest("hex")}`,
      ),
    );
  }
  const header = (
    endpoint.authHeader ||
    (endpoint.auth === "authorization" ? "Authorization" : "X-Webhook-Key")
  ).toLowerCase();
  return (
    typeof headers[header] === "string" &&
    keys.some((key) => equal(headers[header], key))
  );
}
export function publicAddress(address) {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0)) ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 198 && (b === 18 || b === 19))
    );
  }
  if (isIP(address) === 6) {
    const s = address.toLowerCase();
    return s.startsWith("2") || s.startsWith("3");
  }
  return false;
}
export async function resolveCallback(url, hosts, resolver = lookup) {
  const u = new URL(url);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    u.hash ||
    !hosts.includes(u.hostname)
  )
    throw new Error("callback_not_allowed");
  const records = await resolver(u.hostname, { all: true, verbatim: true });
  if (!records.length || records.some((r) => !publicAddress(r.address)))
    throw new Error("callback_address_not_public");
  return { url: u, record: records[0] };
}
