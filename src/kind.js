import { ConfigSchema, PolicySchema } from "./schema.js";
const label = (zh, en = zh) => ({ zh, en });
const text = (key, zh) => ({ key, type: "text", label: label(zh) });
const select = (key, zh, values) => ({
  key,
  type: "select",
  label: label(zh),
  options: values.map((value) => ({ value, label: label(value) })),
});
export const webhookKind = {
  kind: "webhook",
  title: label("Webhook"),
  description: label("独立来源与事件订阅，可靠入队后交给 Super-agent 评估。"),
  health: ["webhook"],
  schema: ConfigSchema,
  fields: [
    {
      key: "endpoints",
      type: "rows",
      label: label("Webhook 来源"),
      columns: [
        text("id", "来源 ID"),
        text("name", "名称"),
        select("enabled", "启用", ["true", "false"]),
        text("secret", "密钥（至少24字符）"),
        text("events", "开启事件（逗号分隔）"),
        select("eventsMode", "接收模式", ["selected", "all"]),
        select("auth", "校验方式", ["key", "hmac-sha256"]),
        text("previousSecret", "轮换期旧密钥"),
        text("callbackUrl", "HTTPS 回调 URL"),
        text("callbackSecret", "回调密钥"),
      ],
    },
  ],
  scope({ meta }, config) {
    const e = config.endpoints.find((e) => e.id === meta.endpoint);
    return e?.enabled &&
      (e.eventsMode === "all" || e.events.includes(meta.event))
      ? { listened: true, observed: true, row: e.id }
      : { listened: false, reason: "source_disabled" };
  },
  policy: {
    schema: PolicySchema,
    explicit: label(
      "自动事件只作为候选；在“自动发送者”中授权，评估模式设为 auto 后由现有规则决定是否接单。",
    ),
    fields: [
      {
        key: "allowed",
        type: "rows",
        label: label("人工发送者（自动事件不使用此名单）"),
        columns: [text("id", "发送者 ID"), text("name", "名称")],
      },
      {
        key: "bots",
        type: "rows",
        label: label("自动发送者"),
        columns: [text("id", "发送者 ID"), text("name", "名称")],
      },
      text("eventPoliciesJson", "Webhook 事件条件 JSON"),
    ],
    rows(config) {
      return config.endpoints.map((e) => ({
        id: e.id,
        label: e.name || e.id,
        note: label("自动事件遵循自动发送者名单与评估模式"),
        cells: {
          listedUnaddressed: true,
          unlistedAddressed: false,
          unlistedUnaddressed: true,
        },
      }));
    },
  },
};
