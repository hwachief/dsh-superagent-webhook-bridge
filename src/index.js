import { createServer } from "node:http";
import { RuntimeSchema } from "./schema.js";
import { webhookKind } from "./kind.js";
import { Inbox } from "./inbox.js";
import { createHandler } from "./http.js";
import { channel } from "./channel.js";
export {
  ConfigSchema,
  PolicySchema,
  RuntimeSchema,
  EventSchema,
} from "./schema.js";
export { evaluate, evaluatePolicy } from "./policy.js";
export { normalize, Inbox } from "./inbox.js";
export { createHandler } from "./http.js";
export { webhookKind };
export { Config } from "./config.js";
export const name = "dsh-superagent-webhook-bridge";
export const inject = ["orchestrator"];
export function apply(ctx, input = {}) {
  const config = RuntimeSchema.parse(input),
    host = ctx.orchestrator;
  const controller = new AbortController();
  let source;
  const kind = {
    ...webhookKind,
    facts: () => ({
      endpoints:
        config.publicUrl ||
        `http://${config.host === "0.0.0.0" ? "127.0.0.1" : config.host}:${config.port}`,
    }),
    channel: channel(
      { config: (id) => { const current = source?.config(id); return current && { ...current, endpoints: current.endpoints.map(e => ({ ...e, callbackUrl: "" })) }; } },
      config,
      controller.signal,
    ),
  };
  ctx.effect(() => host.sources.register(kind));
  ctx.effect(() => {
    source = host.context(kind);
    const inbox = new Inbox(source, config, { signal: controller.signal, readPolicy: () => host.sources.policyPart("webhook") });
    const server = createServer(createHandler(source, host, inbox, config));
    server.requestTimeout = 15000;
    server.headersTimeout = 10000;
    server.keepAliveTimeout = 5000;
    server.maxRequestsPerSocket = 100;
    let stopped = false,
      running = Promise.resolve();
    const report = (state, detail) =>
      source.report("webhook", { state, detail });
    server.on("error", () =>
      report("error", "Webhook listener failed; check bind address and port"),
    );
    server.listen(config.port, config.host, () =>
      report(
        "ready",
        `Webhook listener ready on ${config.host}:${server.address().port}`,
      ),
    );
    const tick = () => {
      if (stopped || inbox.busy) return;
      running = inbox
        .tick()
        .then(() => {
          if (!server.listening) {
            report("error", "Webhook listener is not bound");
            return;
          }
          const dead = inbox
            .rows()
            .filter(([, v]) => v.status === "dead").length;
          report(
            dead ? "error" : source.config("webhook") ? "ready" : "paused",
            dead
              ? `${dead} dead-letter events; inspect authenticated receipts`
              : "Webhook inbox ready",
          );
        })
        .catch(() => report("error", "Webhook inbox storage unavailable"));
    };
    const timer = setInterval(tick, 1000);
    timer.unref();
    tick();
    return async () => {
      stopped = true;
      clearInterval(timer);
      controller.abort();
      await new Promise((resolve) => {
        server.close(() => resolve());
        server.closeAllConnections();
      });
      await running;
    };
  });
}
