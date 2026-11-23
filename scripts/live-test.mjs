// Run inside the authorized DSH container. Credentials remain in container-only backup.
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
const base = process.env.LIVE_BASE ?? "http://127.0.0.1:3082";
const headers = {
  "x-orchestrator-request": "1",
  "content-type": "application/json",
};
async function api(path, method = "GET", body) {
  const r = await fetch(base + "/orchestrator/api/" + path, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!r.ok) throw Error(`${path}: ${r.status} ${await r.text()}`);
  return r.json();
}
const settings = await api("settings");
const backup =
  "/home/node/.dsh/plugin-packages/bridge-backup-20261118/settings-before-live-test.json";
try {
  writeFileSync(backup, JSON.stringify(settings), { mode: 0o600, flag: "wx" });
} catch (e) {
  if (e.code !== "EEXIST") throw e;
}
const source = settings.sources.find((s) => s.id === "webhook");
if (!source) throw Error("webhook source missing");
const secret = randomBytes(32).toString("hex"),
  id = "bridge-smoke",
  existing = source.value.config.endpoints ?? [];
if (existing.some((e) => e.id === id))
  throw Error("test source exists; inspect before retry");
await api("settings/source:webhook", "PUT", {
  revision: source.revision,
  value: {
    enabled: true,
    config: {
      endpoints: [
        ...existing,
        {
          id,
          name: "本地真实环境验收",
          enabled: true,
          secret,
          events: ["file.created"],
          eventTypes: ["file.created", "file.updated"],
          eventsMode: "selected",
        },
      ],
    },
  },
});
const policy = settings.blocks.policy;
await api("settings/policy", "PUT", {
  revision: policy.revision,
  value: {
    ...policy.value,
    sources: {
      ...policy.value.sources,
      webhook: {
        ...policy.value.sources.webhook,
        allowed: policy.value.sources.webhook?.allowed ?? [],
        bots: [
          ...(policy.value.sources.webhook?.bots ?? []),
          { id: `${id}:tester`, name: "本地验收发送者" },
        ],
      },
    },
  },
});
mkdirSync("/home/node/workspace/webhook-bridge-smoke", { recursive: true });
writeFileSync(
  "/home/node/workspace/webhook-bridge-smoke/README.md",
  "teh webhook bridge\n",
  { flag: "wx" },
);
const event = {
  id: randomUUID(),
  event: "file.created",
  sender: "tester",
  text: "请修正独立验收文件 /home/node/workspace/webhook-bridge-smoke/README.md 中唯一的一处拼写错误：把 teh webhook bridge 改为 the webhook bridge。目标和替换文本已明确，仅修改这一个验收文件，完成后回复结果；不要修改任何其他文件。",
  payload: { path: "/home/node/workspace/webhook-bridge-smoke/README.md" },
};
const hook = "http://127.0.0.1:9088/hooks/" + id;
async function send(value, key = secret) {
  const r = await fetch(hook, {
    method: "POST",
    headers: { "content-type": "application/json", "x-webhook-key": key },
    body: JSON.stringify(value),
  });
  return { http: r.status, ...(await r.json()) };
}
const wrong = await send(event, "wrong"),
  filtered = await send({
    ...event,
    id: randomUUID(),
    event: "disabled.event",
  }),
  queued = await send(event),
  duplicate = await send(event);
writeFileSync(
  "/home/node/.dsh/plugin-packages/bridge-live-receipt.json",
  JSON.stringify({ id, eventId: event.id, secret, hook, event }),
  { mode: 0o600 },
);
console.log(JSON.stringify({ wrong, filtered, queued, duplicate }));
