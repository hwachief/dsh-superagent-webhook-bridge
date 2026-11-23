import s from "@deepseek-ai/schemastery";
export const Config = s.object({
  publicUrl: s
    .string()
    .default("")
    .description("发送方使用的 Webhook 基础 URL；为空时使用独立监听地址"),
  host: s
    .string()
    .default("127.0.0.1")
    .description("Webhook 绑定地址；建议只通过 HTTPS 反向代理对外提供服务"),
  port: s.number().min(1).max(65535).step(1).default(9088),
  maxBodyBytes: s.number().min(1024).max(10485760).step(1).default(1048576),
  maxPending: s.number().min(1).max(100000).step(1).default(10000),
  maxInboxBytes: s
    .number()
    .min(1048576)
    .max(1073741824)
    .step(1)
    .default(67108864),
  ratePerMinute: s.number().min(1).max(100000).step(1).default(600),
  retentionDays: s.number().min(1).max(365).step(1).default(30),
  maxAttempts: s.number().min(1).max(100).step(1).default(12),
  callbackHosts: s
    .array(s.string())
    .default([])
    .description("允许回传结果的 HTTPS 域名精确白名单，不支持通配符"),
});
