import { processRequest } from "./pipeline.js";
import { authenticate } from "./security.js";
const fail = (status, code) => Object.assign(new Error(code), { status });
export function createHandler(source, orchestrator, inbox, config) {
  const buckets = new Map();
  let active = 0;
  return async (req, res) => {
    const reply = (status, data) => {
      if (res.destroyed || res.writableEnded) return;
      res.writeHead(status, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        ...(status === 429 || status === 503 ? { "retry-after": "5" } : {}),
      });
      res.end(JSON.stringify(data));
    };
    try {
      const url = new URL(req.url, "http://localhost");
      const match =
        /^\/hooks\/([a-z0-9][a-z0-9_-]{0,63})(?:\/receipts\/([^/]+)(\/retry)?)?$/.exec(
          url.pathname,
        );
      if (!match) throw fail(404, "not_found");
      if (
        !["GET", "POST"].includes(req.method) ||
        (!match[2] && req.method !== "POST") ||
        (match[3] && req.method !== "POST")
      )
        throw fail(405, "method_not_allowed");
      const endpoint = source
        .config("webhook")
        ?.endpoints.find((e) => e.id === match[1] && e.enabled);
      if (!endpoint) throw fail(404, "source_disabled");
      if (active >= 64) throw fail(503, "server_busy");
      const now = Date.now(),
        bucket = buckets.get(endpoint.id);
      if (!bucket || now - bucket.since >= 60000)
        buckets.set(endpoint.id, { since: now, count: 1 });
      else if (++bucket.count > config.ratePerMinute)
        throw fail(429, "rate_limited");
      if (buckets.size > 200)
        for (const [k, v] of buckets)
          if (now - v.since > 60000) buckets.delete(k);
      if (Number(req.headers["content-length"]) > config.maxBodyBytes)
        throw fail(413, "payload_too_large");
      active++;
      let raw;
      try {
        let size = 0;
        const chunks = [];
        for await (const chunk of req) {
          size += chunk.length;
          if (size > config.maxBodyBytes) throw fail(413, "payload_too_large");
          chunks.push(chunk);
        }
        raw = Buffer.concat(chunks);
      } finally {
        active--;
      }
      if (!authenticate({secret:endpoint.secret, auth:"key", authHeader:endpoint.authHeader || "X-Webhook-Key"}, req.headers, raw))
        throw fail(401, "unauthorized");
      if (match[2]) {
        let id;
        try {
          id = decodeURIComponent(match[2]);
        } catch {
          throw fail(400, "invalid_event_id");
        }
        const receipt = inbox.get(endpoint.id, id);
        if (!receipt) throw fail(404, "receipt_not_found");
        if (match[3]) {
          if (!inbox.retry(endpoint.id, id))
            throw fail(409, "receipt_not_dead");
          return reply(202, { status: "queued" });
        }
        if (req.method !== "GET") throw fail(405, "method_not_allowed");
        return reply(200, {
          id: receipt.externalId,
          status: receipt.status,
          attempts: receipt.attempts,
          updatedAt: new Date(receipt.updatedAt).toISOString(),
        });
      }
      if (
        !/^application\/json(?:\s*;|$)/i.test(req.headers["content-type"] ?? "")
      )
        throw fail(415, "application_json_required");
      let body;
      try {
        body = JSON.parse(
          new TextDecoder("utf-8", { fatal: true }).decode(raw),
        );
      } catch {
        throw fail(400, "invalid_event");
      }
      const inputContext = {
        payload: body,
        header: { ...req.headers },
        url: Object.fromEntries(url.searchParams),
      };
      for (const key of [
        endpoint.authHeader?.toLowerCase(),
        "authorization",
        "cookie",
        "x-webhook-key",
        "x-webhook-signature",
      ])
        delete inputContext.header[key];
      let processed;
      try {
        processed = processRequest(body, endpoint, undefined, inputContext, raw);
      } catch (error) { throw fail(400, error.message); }
      if (processed.ignored) return reply(202, {status:'filtered',reason:processed.ignored});
      body = processed.body;
      const result = inbox.enqueue(endpoint.id, body);
      reply(202, {
        id: body.id,
        status: result.receipt.status,
        duplicate: result.duplicate,
      });
    } catch (error) {
      reply(error.status ?? 503, {
        error: error.status ? error.message : "temporarily_unavailable",
      });
    }
  };
}
