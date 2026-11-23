import { request } from "node:https";
import { createHmac } from "node:crypto";
import { resolveCallback } from "./security.js";

export async function deliver(
  endpoint,
  message,
  hosts,
  signal,
  { resolver, transport = request } = {},
) {
  signal = signal
    ? AbortSignal.any([signal, AbortSignal.timeout(10000)])
    : AbortSignal.timeout(10000);
  signal.throwIfAborted();
  const { url, record } = await new Promise((resolve, reject) => {
    const finish = (fn, value) => {
      signal.removeEventListener("abort", abort);
      fn(value);
    };
    const abort = () => finish(reject, signal.reason);
    signal.addEventListener("abort", abort, { once: true });
    resolveCallback(endpoint.callbackUrl, hosts, resolver).then(
      (value) => finish(resolve, value),
      (error) => finish(reject, error),
    );
  });
  signal.throwIfAborted();
  const body = JSON.stringify({
    id: message.id,
    eventId: message.channel.address.eventId,
    kind: message.kind,
    text: message.text,
    ...(message.ticketId ? { ticketId: message.ticketId } : {}),
  });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", endpoint.callbackSecret)
    .update(timestamp + "." + body)
    .digest("hex");
  await new Promise((resolve, reject) => {
    const req = transport(
      url,
      {
        method: "POST",
        signal,
        timeout: 10000,
        lookup: (_hostname, options, cb) =>
          options?.all
            ? cb(null, [record])
            : cb(null, record.address, record.family),
        headers: {
          "content-type": "application/json",
          "content-length": Buffer.byteLength(body),
          "idempotency-key": message.id,
          "x-webhook-timestamp": timestamp,
          "x-webhook-signature": `sha256=${signature}`,
        },
      },
      (res) => {
        res.resume();
        res.once("end", () =>
          res.statusCode >= 200 && res.statusCode < 300
            ? resolve()
            : reject(new Error(`callback_http_${res.statusCode}`)),
        );
        res.once("error", reject);
      },
    );
    req.once("timeout", () => req.destroy(new Error("callback_timeout")));
    req.once("error", reject);
    req.end(body);
  });
}
export function channel(source, config, signal, send = deliver) {
  return {
    allowed(address, current) {
      return !!current.endpoints.find(
        (e) => e.id === address.endpoint && e.enabled && e.callbackUrl,
      );
    },
    async send(_host, message) {
      const endpoint = source
        .config("webhook")
        ?.endpoints.find(
          (e) => e.id === message.channel.address.endpoint && e.enabled,
        );
      if (!endpoint?.callbackUrl) return "gone";
      await send(endpoint, message, config.callbackHosts, signal);
      return "sent";
    },
    link() {
      return { url: "", label: { zh: "Webhook 回执", en: "Webhook receipt" } };
    },
  };
}
