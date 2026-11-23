import { decideAdmission } from "./pipeline.js";
import { createHash } from "node:crypto";
const family = { prefix: "webhook-bridge:v1:receipt:" };
const canonical = (value) =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((k) => [k, canonical(value[k])]),
        )
      : value;
const hash = (value) =>
  createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
export function normalize(endpoint, body) {
  const id = hash([endpoint, body.id]);
  const thread = hash([endpoint, body.thread ?? body.id]);
  return {
    id: `webhook:${id}`,
    source: "webhook",
    threads: [{ source: "webhook", id: thread }],
    actor: { source: "webhook", id: `${endpoint}:${body.sender}` },
    human: false,
    at: body.at ?? new Date().toISOString(),
    text: body.text,
    channel: {
      source: "webhook",
      thread: `webhook:${thread}`,
      address: { endpoint, eventId: body.id },
    },
    meta: { endpoint, event: body.event, payload: body.payload ?? {}, ...(body.mapped ? { webhookAdmission: body.admission, webhookMapped: body.mapped } : {}) },
  };
}
export class Inbox {
  constructor(
    source,
    config,
    { clock = Date.now, random = Math.random, signal, readPolicy = () => ({}) } = {},
  ) {
    this.readPolicy = readPolicy;
    this.source = source;
    this.config = config;
    this.clock = clock;
    this.random = random;
    this.signal = signal;
  }
  key(endpoint, id) {
    return family.prefix + hash([endpoint, id]);
  }
  rows() {
    return this.source.state
      .keys(family)
      .map((key) => [key, this.source.state.get(key)])
      .filter(([, v]) => v);
  }
  get(endpoint, id) {
    return this.source.state.get(this.key(endpoint, id));
  }
  enqueue(endpoint, body) {
    return this.source.atomic(() => {
      const key = this.key(endpoint, body.id),
        fingerprint = hash(body),
        old = this.source.state.get(key);
      if (old) {
        if (old.fingerprint !== fingerprint)
          throw Object.assign(new Error("event_id_conflict"), { status: 409 });
        return { duplicate: true, receipt: old };
      }
      const rows = this.rows(),
        now = this.clock();
      for (const [k, v] of rows)
        if (
          ["stored", "filtered", "dead"].includes(v.status) &&
          now - v.updatedAt > this.config.retentionDays * 86400000
        )
          this.source.state.set(k, undefined);
      const retained = this.rows();
      if (
        retained.length >= this.config.maxPending ||
        retained.reduce(
          (sum, [, v]) => sum + Buffer.byteLength(JSON.stringify(v)),
          0,
        ) +
          Buffer.byteLength(JSON.stringify(body)) >
          this.config.maxInboxBytes
      )
        throw Object.assign(new Error("inbox_capacity"), { status: 503 });
      const receipt = {
        endpoint,
        externalId: body.id,
        fingerprint,
        trigger: normalize(endpoint, body),
        status: "queued",
        attempts: 0,
        nextAt: now,
        createdAt: now,
        updatedAt: now,
      };
      this.source.state.set(key, receipt);
      return { duplicate: false, receipt };
    });
  }
  retry(endpoint, id) {
    return this.source.atomic(() => {
      const key = this.key(endpoint, id),
        v = this.source.state.get(key);
      if (!v || v.status !== "dead") return false;
      this.source.state.set(key, {
        ...v,
        status: "queued",
        attempts: 0,
        nextAt: this.clock(),
        updatedAt: this.clock(),
      });
      return true;
    });
  }
  async tick() {
    if (this.busy) return;
    this.busy = true;
    try {
      if (!this.source.configured()) return;
      let processed = 0;
      for (const [key, v] of this.rows()) {
        if (this.signal?.aborted) break;
        if (++processed % 50 === 0)
          await new Promise((resolve) => setImmediate(resolve));
        if (v.status !== "queued" || v.nextAt > this.clock()) continue;
        const endpoint = this.source
          .config("webhook")
          ?.endpoints.find((e) => e.id === v.endpoint);
        if (!endpoint?.enabled) continue;
        try {
          let trigger = v.trigger;
          if (trigger.meta.webhookMapped) {
            // Admission is evaluated only after the accepted task was durably queued.
            const policy = this.readPolicy();
            const policies = JSON.parse(policy?.eventPoliciesJson || '{}');
            const fields = endpoint.eventReceivers?.[trigger.meta.event]?.fields || [];
            const admission = decideAdmission(policies[v.endpoint]?.[trigger.meta.event],trigger.meta.webhookMapped,fields.map(f=>f.name));
            trigger = {...trigger,meta:{...trigger.meta,webhookAdmission:admission}};
            this.source.state.set(key,{...v,trigger,assessment:{status:'completed',admission,at:this.clock()}});
          }
          const result = await this.source.receive(trigger);
          this.source.state.set(key, {
            ...this.source.state.get(key),
            status: result === "filtered" ? "filtered" : "stored",
            updatedAt: this.clock(),
            trigger: undefined,
          });
        } catch {
          const attempts = v.attempts + 1;
          const delay =
            Math.min(300000, 1000 * 2 ** Math.min(attempts, 18)) *
            (0.8 + this.random() * 0.4);
          this.source.state.set(key, {
            ...v,
            attempts,
            status: attempts >= this.config.maxAttempts ? "dead" : "queued",
            nextAt: this.clock() + delay,
            updatedAt: this.clock(),
            error: "receive_failed",
          });
        }
      }
    } finally {
      this.busy = false;
    }
  }
}
