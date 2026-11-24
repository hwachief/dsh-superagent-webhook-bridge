import { z } from "zod";
import { RE2 } from "re2-wasm";

const id = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/);
const event = z.string().trim().min(1).max(100);
const secret = z.string().min(24).max(512);
export const FilterSchema = z
  .object({
    admission: z.enum(["ignore", "accept", "candidate"]).optional(),
    source: z.enum(["payload", "header", "url"]).default("payload"),
    field: z.string().min(1).max(128),
    op: z.enum([
      "equals",
      "not_equals",
      "contains",
      "starts_with",
      "ends_with",
      "regex",
      "exists",
    ]),
    value: z.string().max(512).default(""),
  })
  .superRefine((f, c) => {
    if (f.op === "regex")
      try {
        new RE2(f.value, "u");
      } catch {
        c.addIssue({ code: "custom", message: "无效的 RE2 正则表达式" });
      }
  });
export const EventPolicySchema = z.object({
  admission: z.enum(["", "ignore", "accept", "candidate"]).optional(),
  mode: z.enum(["and", "or"]).default("and"),
  filters: z.preprocess(v => Array.isArray(v) ? v.filter(f => f.field || f.op || f.value || f.admission) : v, z.array(FilterSchema).max(20).default([])),
});
export const EndpointSchema = z
  .object({
    id,
    name: z.string().max(80).default(""),
    description: z.string().max(500).default(""),
    enabled: z.boolean().default(false),
    secret: z.union([secret, z.literal("")]).default(""),
    previousSecret: z.union([secret, z.literal("")]).default(""),
    auth: z.enum(["key", "authorization", "hmac-sha256"]).default("key"),
    authHeader: z
      .string()
      .trim()
      .regex(/^[!#$%&'*+.^_`|~0-9A-Za-z-]{1,128}$/)
      .optional(),
    eventReceivers: z
      .record(
        event,
        z.object({
          inputMode: z.enum(["standard", "custom"]).default("standard"),
          receivePolicy: EventPolicySchema.default({
            mode: "and",
            filters: [],
          }),
          fields: z.array(z.object({
            name: z.string().min(1).max(128).refine(v => !v.split('.').some(k => ['__proto__', 'prototype', 'constructor'].includes(k))),
            type: z.enum(['string','integer','boolean','array','object','number','null','any']),
            expression: z.string().max(4096),
          })).max(100).optional(),
          mapping: z.record(z.string(), z.string().max(4096)).default({}),
        }),
      )
      .default({}),
    inputMode: z.enum(["standard", "custom"]).default("standard"),
    receivePolicy: EventPolicySchema.default({ mode: "and", filters: [] }),
    mapping: z.record(z.string(), z.string().max(4096)).default({}),
    eventsMode: z.enum(["selected", "all"]).default("selected"),
    events: z.array(event).max(100).default([]),
    eventTypes: z.array(event).max(100).default([]),
    callbackUrl: z
      .union([
        z.url().refine((v) => v.startsWith("https:"), "回调必须为 HTTPS"),
        z.literal(""),
      ])
      .default(""),
    callbackSecret: z.union([secret, z.literal("")]).default(""),
  })
  .strict()
  .superRefine((v, c) => {
    if (v.enabled && v.secret.length < 24)
      c.addIssue({
        code: "custom",
        path: ["secret"],
        message: "启用来源前请填写至少24字符的密钥",
      });
    if (v.callbackUrl && !v.callbackSecret)
      c.addIssue({ code: "custom", message: "回调必须配置独立密钥" });
  });
export const ConfigSchema = z.preprocess(
  (v) => {
    if (!v || typeof v !== "object") return v;
    return {
      ...v,
      endpoints: Array.isArray(v.endpoints)
        ? v.endpoints.map((e) => ({
            ...e,
            enabled:
              e.enabled === "on" || e.enabled === "true"
                ? true
                : e.enabled === "off" || e.enabled === "false"
                  ? false
                  : e.enabled,
            events:
              typeof e.events === "string"
                ? e.events
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean)
                : e.events,
          }))
        : v.endpoints,
    };
  },
  z
    .object({ endpoints: z.array(EndpointSchema).max(100).default([]) })
    .strict()
    .superRefine((v, c) => {
      if (new Set(v.endpoints.map((e) => e.id)).size !== v.endpoints.length)
        c.addIssue({ code: "custom", message: "来源 ID 不得重复" });
    }),
);
export const PoliciesSchema = z.record(
  z.string().max(64),
  z.record(event, EventPolicySchema),
);
export const PolicySchema = z.object({
  allowed: z
    .array(
      z.object({
        id: z.string().min(1).max(200),
        name: z.string().max(100).optional(),
      }),
    )
    .max(1000)
    .default([]),
  bots: z
    .array(
      z.object({
        id: z.string().min(1).max(200),
        name: z.string().max(100).optional(),
      }),
    )
    .max(1000)
    .default([]),
  eventPolicies: PoliciesSchema.default({}),
  eventPoliciesJson: z
    .string()
    .max(1048576)
    .default("{}")
    .superRefine((v, c) => {
      try {
        PoliciesSchema.parse(JSON.parse(v));
      } catch {
        c.addIssue({ code: "custom", message: "事件条件必须为有效策略 JSON" });
      }
    }),
  rules: z
    .array(
      z.object({
        endpoint: id,
        event,
        field: z.string(),
        operator: z.enum(["equals", "contains", "exists"]),
        value: z.string().default(""),
        mode: z.enum(["AND", "OR"]).default("AND"),
      }),
    )
    .default([]),
});
export const EventSchema = z
  .object({
    id: z.string().min(1).max(256),
    event,
    sender: z.string().min(1).max(256),
    text: z.string().min(1).max(262144),
    thread: z.string().min(1).max(256).optional(),
    at: z.iso.datetime().optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();
export const RuntimeSchema = z
  .object({
    host: z.string().default("0.0.0.0"),
    publicUrl: z
      .union([z.url().refine((v) => /^https?:/.test(v)), z.literal("")])
      .default(""),
    port: z.number().int().min(0).max(65535).default(9088),
    maxBodyBytes: z.number().int().min(1024).max(10485760).default(1048576),
    maxInboxBytes: z
      .number()
      .int()
      .min(1048576)
      .max(1073741824)
      .default(67108864),
    maxPending: z.number().int().min(1).max(100000).default(10000),
    ratePerMinute: z.number().int().min(1).max(100000).default(600),
    retentionDays: z.number().int().min(1).max(365).default(30),
    maxAttempts: z.number().int().min(1).max(100).default(12),
    callbackHosts: z.array(z.string().min(1)).default([]),
  })
  .strict();
