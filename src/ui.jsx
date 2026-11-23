import { eventAdmission } from "./event-admission.js";
import { textPaths } from "./text.js";
import React, { useState } from "react";
export const createSource = () => ({
  id: crypto.randomUUID(),
  name: "",
  description: "",
  enabled: false,
  secret: "",
  eventsMode: "selected",
  events: [],
  eventTypes: [],
  auth: "key",
  previousSecret: "",
  callbackUrl: "",
  callbackSecret: "",
});
const css =
  `.wb .wb-event-help{order:0;position:relative;flex:0 0 24px;margin-left:-44px;margin-right:8px;display:flex;align-items:center;justify-content:center}.wb .wb-event-help>button{border:0;background:transparent;color:var(--dsw-alias-label-secondary);cursor:help;padding:4px;font-size:16px}.wb .wb-event-row>input[type=text]{padding-right:40px!important}.wb .wb-event-tooltip{display:none;position:absolute;right:0;bottom:calc(100% + 6px);z-index:100;width:420px;max-width:75vw;padding:14px;border:1px solid var(--dsw-alias-border-l3);border-radius:10px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:0 6px 24px #0002;cursor:text}.wb .wb-event-help:hover .wb-event-tooltip,.wb .wb-event-help:focus-within .wb-event-tooltip{display:flex;flex-direction:column;gap:8px}.wb .wb-event-tooltip pre{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:1.6}` +
  `.wb .wb-event-row{display:flex;align-items:center;gap:12px;min-width:0}.wb .wb-event-row>input[type=text]{order:0;flex:1;min-width:0;height:32px;padding:0 10px;border:0.5px solid var(--dsw-alias-border-l4);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit}.wb .wb-event-row>input[type=text]:disabled{color:var(--dsw-alias-label-secondary)}.wb .wb-event-row>input[type=checkbox]{order:1;flex:0 0 36px;width:36px;height:20px}.wb .wb-event-row>button{order:2;flex:0 0 auto;white-space:nowrap}.dt-settings-title:has(.wb-source-toolbar){display:flex;align-items:center;justify-content:space-between;gap:12px}.wb-source-toolbar,.wb-master{display:inline-flex;align-items:center;gap:12px;font-size:13px;font-weight:400}.wb-independent-form>fieldset{border:0;padding:0;margin:0;min-width:0} .wb .wb-policy-event{display:flex;flex-direction:column;gap:12px;border:0;border-top:0.5px solid var(--dsw-alias-border-l3);border-radius:0;padding:20px 0 16px}.wb .wb-policy-event>header{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;flex-wrap:nowrap}.wb .wb-event-title{flex:1;min-width:0;padding-top:2px;font-size:14px;font-weight:500;overflow-wrap:anywhere;color:var(--dsw-alias-label-primary)}.wb .wb-event-options{display:grid;grid-template-columns:180px 180px;gap:12px;flex:0 0 auto}.wb .wb-event-options>label{min-width:0;font-size:12px}.wb .wb-policy-event .filter{display:grid;grid-template-columns:minmax(160px,1.2fr) 160px minmax(160px,1fr) 32px;gap:12px;align-items:center}.wb .wb-policy-event .filter>*{min-width:0;width:100%}.wb .wb-policy-event .filter>button{padding:0;width:32px;height:32px}.wb .wb-filter-title{font-size:12px;color:var(--dsw-alias-label-secondary);margin-top:4px}.wb .wb-filter-labels{font-size:12px;color:var(--dsw-alias-label-tertiary);margin-bottom:-6px}.wb .wb-admission-title{font-size:13px;font-weight:400;color:var(--dsw-alias-label-secondary);margin:0}.wb .wb-policy-event>button{align-self:flex-start;margin-top:0}@media(max-width:700px){.wb .wb-policy-event>header{flex-wrap:wrap;gap:12px}.wb .wb-event-title{flex-basis:100%}.wb .wb-event-options{width:100%;grid-template-columns:1fr 1fr}.wb .wb-policy-event .filter{grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) 28px;gap:8px}}#dt-source-webhook:has(.wb-source-footer button[type=submit]:not(:disabled))>.dt-savebar:not(:has([role=alert])){display:none}.wb .wb-source-card{gap:16px}.wb-event-head,.wb-links,.wb-source-footer{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.wb-event-head{justify-content:space-between;margin-top:8px}.wb-links{margin-top:8px}.wb-links small{overflow-wrap:anywhere}.wb-source-footer{border-top:0.5px solid var(--dsw-alias-border-l3);margin:0 -16px -16px;padding:12px 16px}.wb-source-footer>small{margin-right:auto}.wb-source-card header .check{min-height:20px}.wb-source-card details{font-size:12px}.wb{font:inherit;font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:12px;min-width:0}.wb *{box-sizing:border-box}.wb p{margin:0;overflow-wrap:anywhere;color:var(--dsw-alias-label-caption);font-size:12px;line-height:18px}.wb article{display:flex;flex-direction:column;gap:12px;border:0.5px solid var(--dsw-alias-border-l3);border-radius:16px;padding:16px;min-width:0}.wb header,.wb nav,.wb .actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.wb header{min-height:28px}.wb header strong{flex:1;font-size:13px;font-weight:500}.wb .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.wb label{display:flex;flex-direction:column;gap:6px;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary);min-width:0}.wb .dt-input{display:flex;width:100%}.wb .check{flex-direction:row-reverse;justify-content:space-between;align-items:center;gap:16px;min-height:36px}.wb header .check{margin-left:auto}.wb input[type=checkbox]{appearance:none;position:relative;flex:0 0 auto;width:36px;height:20px;margin:0;padding:2px;border:0;border-radius:10px;background:var(--dsw-alias-border-l3);cursor:pointer}.wb input[type=checkbox]:checked{background:var(--dsw-alias-brand-primary)}.wb input[type=checkbox]::after{content:'';display:block;width:16px;height:16px;border-radius:50%;background:var(--dsw-alias-label-primary-foreground);transition:transform 120ms ease}.wb input[type=checkbox]:checked::after{transform:translateX(16px)}.wb input[type=checkbox]:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.wb input[type=checkbox]:disabled{opacity:.4;cursor:default}.wb .events{display:flex;flex-direction:column;gap:12px}.wb small{font-size:12px;color:var(--dsw-alias-label-caption)}.wb .filter{display:grid;grid-template-columns:100px minmax(0,1fr) 120px minmax(0,1fr) auto;gap:8px;align-items:center}.wb .actions>input,.wb .filter>input{height:32px;min-width:0;padding:0 8px;border:0.5px solid var(--dsw-alias-border-l4);border-radius:8px;background:var(--dsw-alias-bg-layer-1);font:inherit;font-size:14px;color:var(--dsw-alias-label-primary)}.wb .actions>input{flex:1}.wb .danger{color:var(--dsw-alias-state-error-primary)}.wb nav button[aria-pressed=true]{background:var(--dsw-alias-bg-layer-3)}.wb code{font-family:var(--ds-font-family-code,Menlo,monospace);font-size:12px}.wb details>.grid{margin-top:12px}.wb .secret-field{display:flex;flex-direction:column;gap:6px}.wb .secret-field>button{align-self:flex-start}@container(max-width:650px){.wb .grid,.wb .filter{grid-template-columns:1fr}.wb header .check{width:100%;margin-left:0}}@media(prefers-reduced-motion:reduce){.wb input[type=checkbox]::after{transition:none}}`;
const receiveCss = `
.wb .wb-auth-section{display:flex;flex-direction:column;gap:14px;padding:16px 0;border-top:1px solid var(--dsw-alias-border-l3,#e5e7eb);border-bottom:1px solid var(--dsw-alias-border-l3,#e5e7eb)}
.wb .wb-auth-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}
.wb .wb-auth-heading>span{display:inline-flex;align-items:center;gap:6px;font-weight:500}
.wb .wb-auth-heading .wb-event-help>button{font-size:14px;padding:0 2px}
.wb .wb-auth-fields{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.wb .wb-auth-fields>label{gap:8px}
.wb .wb-auth-fields input{width:100%;min-width:0}
@media(max-width:600px){.wb .wb-auth-fields{grid-template-columns:1fr}.wb .wb-auth-heading{flex-wrap:wrap}}

.wb .wb-receive-event{border:1px solid var(--dsw-alias-border-l3,#e5e7eb);border-radius:10px;overflow:visible;background:var(--dsw-alias-bg-layer-1,#fff)}
.wb .wb-receive-event>.wb-event-row{border-radius:10px 10px 0 0;padding:12px 14px;background:var(--dsw-alias-bg-layer-2,#f8f9fa)}
.wb .wb-receive-event>.wb-event-row>input[type=text]{background:var(--dsw-alias-bg-layer-1,#fff)}
.wb .wb-receive-details>summary{padding:10px 14px;cursor:pointer;color:var(--dsw-alias-label-secondary);font-size:12px;list-style-position:inside;user-select:none}
.wb .wb-receive-details>summary:hover{background:var(--dsw-alias-bg-layer-2,#f8f9fa)}
.wb .wb-receive-details[open]>summary{border-bottom:1px solid var(--dsw-alias-border-l3,#e5e7eb)}
.wb .wb-receive-body{padding:16px;gap:14px}
.wb .wb-receive-body>label{display:grid!important;grid-template-columns:100px minmax(0,1fr);gap:16px!important;align-items:center}
.wb .wb-receive-body>p{margin-left:116px;font-size:12px}
.wb .wb-receive-rules{gap:10px}
.wb .wb-section-heading{display:flex;align-items:center;justify-content:space-between;gap:12px}
.wb .wb-section-heading strong{font-size:13px;font-weight:500}
.wb .wb-receive-body>section+section{border-top:1px solid var(--dsw-alias-border-l3,#e5e7eb);padding-top:16px}
.wb .wb-receive-rules>strong{font-size:13px;font-weight:500}
.wb .wb-receive-rules>.filter{grid-template-columns:120px minmax(100px,1fr) 104px minmax(100px,1fr) 28px;gap:8px}
.wb .wb-receive-rules>.wb-filter-labels{margin-top:6px}
.wb .wb-receive-rules>button{align-self:flex-start;margin-top:2px}
.wb .wb-receive-rules .filter>button{padding:4px;min-width:28px}
@container(max-width:650px){.wb .wb-receive-rules>.filter{grid-template-columns:1fr 1fr}.wb .wb-receive-rules>.wb-filter-labels{display:none}.wb .wb-receive-body{padding:12px}.wb .wb-receive-body>label{grid-template-columns:90px minmax(0,1fr);gap:8px!important}.wb .wb-receive-body>p{margin-left:0}}
`;
function EventExample({ event, auth, authHeader, receiver }) {
  const custom = receiver?.inputMode === "custom";
  const body = Object.create(null);
  const extras = [];
  const set = (path, value) => {
    if (!path) return;
    if (path.startsWith("header.") || path.startsWith("url.")) {
      extras.push(`${path}: ${value}`);
      return;
    }
    const keys = path
      .replace(/\[(\d+|\*)?\]/g, (_, k) => "." + (!k || k === "*" ? "0" : k))
      .split(".");
    if (
      keys.some(
        (k) => !k || ["__proto__", "prototype", "constructor"].includes(k),
      )
    )
      return;
    let target = body;
    keys.forEach((key, i) => {
      if (i === keys.length - 1) target[key] = value;
      else {
        if (!target[key] || typeof target[key] !== "object")
          target[key] = /^\d+$/.test(keys[i + 1]) ? [] : Object.create(null);
        target = target[key];
      }
    });
  };
  if (custom) {
    for (const filter of receiver.receivePolicy?.filters || [])
      set(
        filter.source === "payload"
          ? filter.field
          : `${filter.source}.${filter.field}`,
        filter.op === "exists" ? "示例值" : filter.value || "示例值",
      );
    for (const [key, value] of Object.entries({ text: `收到 ${event} 事件` }))
      (receiver.mapping?.[key]?.includes("{{")
        ? [...receiver.mapping[key].matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g)].map(
            (m) => m[1].trim(),
          )
        : textPaths(receiver.mapping?.[key])
      ).forEach((path) => set(path, value));
  }
  const example = JSON.stringify(
    custom
      ? body
      : {
          id: "evt-001",
          event,
          sender: "external-system",
          text: `收到 ${event} 事件`,
          payload: { path: "/documents/example.txt" },
        },
    null,
    2,
  );
  return (
    <span className="wb-event-help">
      <button type="button" aria-label={`${event} 的 JSON 请求示例`}>
        ⓘ
      </button>
      <span className="wb-event-tooltip" role="tooltip">
        <strong>发送 JSON 示例</strong>
        <small>
          POST · Content-Type: application/json
          <br />
          {auth === "hmac-sha256"
            ? "X-Webhook-Timestamp + X-Webhook-Signature（见认证方式说明）"
            : `${authHeader || (auth === "authorization" ? "Authorization" : "X-Webhook-Key")}: 来源访问密钥`}
        </small>
        {custom && extras.length > 0 && (
          <small style={{ whiteSpace: "pre-wrap" }}>{extras.join("\n")}</small>
        )}
        <pre>{example}</pre>
        <small>
          {custom
            ? "示例随当前字段配置变化；请按实际业务填写内容。"
            : "每次发送请使用唯一 id；payload 可按业务调整。"}
        </small>
      </span>
    </span>
  );
}
function Button({ className = "", ...props }) {
  return (
    <button
      className={`dt-btn dt-btn-ghost dt-btn-sm ${className}`}
      {...props}
    />
  );
}
function Select(props) {
  return <select className="dt-select" {...props} />;
}
export function Shell({ children }) {
  return (
    <div className="wb">
      <style>{css + receiveCss}</style>
      {children}
    </div>
  );
}
const Field = ({ label, inline = false, ...props }) => (
  <label
    style={
      inline
        ? { flexDirection: "row", alignItems: "center", gap: 12 }
        : undefined
    }
  >
    {label}
    <span
      className="dt-input"
      style={inline ? { flex: 1, minWidth: 0 } : undefined}
    >
      <input {...props} />
    </span>
  </label>
);
export function WebhookSources({
  value,
  onChange,
  saved = [],
  onPolicy,
  baseUrl = "http://127.0.0.1:9088",
}) {
  const endpoints = Array.isArray(value) ? value : [];
  const savedEndpoints = Array.isArray(saved) ? saved : [];
  return (
    <Shell>
      {endpoints.map((e, index) => (
        <SourceEditor
          key={index}
          endpoint={e}
          saved={
            savedEndpoints.find((x) => x.id === e.id) ?? savedEndpoints[index]
          }
          baseUrl={baseUrl}
          onPolicy={onPolicy}
          onChange={(patch) =>
            onChange(
              endpoints.map((item, i) =>
                i === index ? { ...item, ...patch } : item,
              ),
            )
          }
          onDiscard={() =>
            onChange(
              savedEndpoints[index]
                ? endpoints.map((item, i) =>
                    i === index ? savedEndpoints[index] : item,
                  )
                : endpoints.filter((_, i) => i !== index),
            )
          }
          onRemove={() => onChange(endpoints.filter((_, i) => i !== index))}
        />
      ))}
      <Button
        type="button"
        onClick={() => onChange([...endpoints, createSource()])}
        disabled={endpoints.length >= 100}
      >
        + 新增来源
      </Button>
    </Shell>
  );
}
export function SourceEditor({
  endpoint: e,
  error,
  saved,
  onChange,
  onDiscard,
  onRemove,
  onPolicy,
  baseUrl,
}) {
  const [adding, setAdding] = useState(false),
    [notice, setNotice] = useState("");
  const dirty =
    !saved ||
    JSON.stringify({ ...e, secret: e.secret || saved.secret }) !==
      JSON.stringify(saved);
  const url = saved?.id
    ? baseUrl.replace(/\/$/, "") + "/hooks/" + encodeURIComponent(saved.id)
    : "";
  const copy = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(label + "已复制");
    } catch {
      setNotice("复制失败，请手动复制");
    }
  };
  return (
    <article className="wb-source-card">
      <header>
        <strong>{e.name || "新增来源"}</strong>
        <label className="check">
          <input
            type="checkbox"
            aria-label="启用来源"
            checked={e.enabled === true || e.enabled === "on"}
            onChange={(ev) => onChange({ enabled: ev.target.checked })}
          />
        </label>
      </header>
      <Field
        label="来源名称"
        required
        placeholder="例如：OpenList、外部业务系统、脚本、Apifox"
        value={e.name || ""}
        maxLength={80}
        onChange={(ev) => onChange({ name: ev.target.value })}
      />
      <section className="wb-auth-section">
      <div className="wb-auth-heading">
        <span>
          认证方式{" "}
          <span
            className="wb-event-help"
            style={{ display: "inline-flex", margin: 0 }}
          >
            <button type="button" aria-label="认证配置说明">
              ⓘ
            </button>
            <span className="wb-event-tooltip" role="tooltip">
              <strong>发送方配置（保存后生效）</strong>
              <small>POST · Content-Type: application/json</small>
              <pre>{`${e.authHeader || (e.auth === "authorization" ? "Authorization" : "X-Webhook-Key")}: <来源访问密钥>\n\n在发送方 Headers 中添加以上请求头，值直接填写来源访问密钥。名称不区分大小写。保存后生效。`}</pre>
              <small>点击“复制密钥”获取密钥；请通过 HTTPS 发送。</small>
            </span>
          </span>
        </span>
        <small>自定义请求头密钥</small>
      </div>
      <div className="wb-auth-fields">
      <Field
        label="认证请求头名称"
        required
        maxLength={128}
        placeholder="例如：Authorization、X-Webhook-Key、X-Api-Key"
        pattern="[!#$%&'*+.^_`|~0-9A-Za-z-]{1,128}"
        value={
          e.authHeader ??
          (e.auth === "authorization" ? "Authorization" : "X-Webhook-Key")
        }
        onChange={(ev) =>
          onChange({ authHeader: ev.target.value, auth: "key" })
        }
      />
      <Field
        label="访问密钥"
        type="password"
        autoComplete="new-password"
        placeholder={saved ? "留空保留密钥" : "留空自动生成"}
        minLength={24}
        value={e.secret || ""}
        onChange={(ev) => onChange({ secret: ev.target.value })}
      />
      </div>
      </section>
      <div className="wb-event-head">
        <span>接收的事件</span>
        <Button type="button" onClick={() => setAdding(!adding)}>
          + 添加
        </Button>
      </div>
      <div className="events">
        {[...new Set([...(e.eventTypes || []), ...(e.events || [])])].map(
          (event) => (
            <div key={event} className="wb-receive-event">
              <div className="wb-event-row">
                <input
                  type="checkbox"
                  aria-label={event}
                  checked={
                    e.eventsMode === "all" || (e.events || []).includes(event)
                  }
                  onChange={(ev) =>
                    onChange({
                      eventsMode: "selected",
                      events: ev.target.checked
                        ? [...(e.events || []), event]
                        : (e.eventsMode === "all"
                            ? [
                                ...new Set([
                                  ...(e.eventTypes || []),
                                  ...(e.events || []),
                                ]),
                              ]
                            : e.events || []
                          ).filter((v) => v !== event),
                    })
                  }
                />
                <input
                  aria-label="事件名称"
                  type="text"
                  disabled={
                    e.eventsMode === "all" || (e.events || []).includes(event)
                  }
                  maxLength={100}
                  defaultValue={event}
                  onClick={(ev) => ev.stopPropagation()}
                  onKeyDown={(ev) => {
                    if (ev.key === "Enter") {
                      ev.preventDefault();
                      ev.currentTarget.blur();
                    }
                  }}
                  onBlur={(ev) => {
                    if (
                      e.eventsMode === "all" ||
                      (e.events || []).includes(event)
                    )
                      return;
                    const name = ev.target.value.trim();
                    if (
                      !name ||
                      name === event ||
                      [...(e.eventTypes || []), ...(e.events || [])].includes(
                        name,
                      )
                    ) {
                      ev.target.value = event;
                      return;
                    }
                    onChange({
                      eventReceivers: Object.fromEntries(
                        Object.entries(e.eventReceivers || {}).map(([k, v]) => [
                          k === event ? name : k,
                          v,
                        ]),
                      ),
                      eventTypes: (e.eventTypes || []).map((v) =>
                        v === event ? name : v,
                      ),
                      events: (e.events || []).map((v) =>
                        v === event ? name : v,
                      ),
                    });
                  }}
                  className="dt-input"
                />
                <Button
                  type="button"
                  disabled={
                    e.eventsMode === "all" || (e.events || []).includes(event)
                  }
                  onClick={() =>
                    onChange({
                      eventTypes: (e.eventTypes || []).filter(
                        (v) => v !== event,
                      ),
                      events: (e.events || []).filter((v) => v !== event),
                    })
                  }
                >
                  删除
                </Button>
              </div>
              <EventReceiverConfig
                value={e.eventReceivers?.[event] || {}}
                onChange={(patch) =>
                  onChange({
                    eventReceivers: {
                      ...e.eventReceivers,
                      [event]: { ...e.eventReceivers?.[event], ...patch },
                    },
                  })
                }
              />
            </div>
          ),
        )}
      </div>
      {adding && (
        <AddEvent
          onAdd={(event) => {
            onChange({
              eventTypes: [...new Set([...(e.eventTypes || []), event])],
            });
            setAdding(false);
          }}
        />
      )}
      <div className="wb-links">
        <Button
          type="button"
          onClick={() => {
            onChange({ secret: crypto.randomUUID().replaceAll("-", "") });
            setNotice(
              "已生成 32 位 UUID 密钥，保存后生效，请同步更新发送方密钥",
            );
          }}
        >
          重新生成密钥
        </Button>

        <small>{url || "保存后生成接收 URL"}</small>
        <Button type="button" disabled={!url} onClick={() => copy(url, "URL")}>
          复制 URL
        </Button>
        <Button
          type="button"
          disabled={!e.secret && !saved?.secret}
          onClick={() =>
            copy(
              e.secret || saved.secret,
              e.secret ? "新密钥（保存后生效）" : "密钥",
            )
          }
        >
          复制密钥
        </Button>
        <Button type="button" disabled={!saved || !onPolicy} onClick={onPolicy}>
          准入策略
        </Button>
      </div>
      {notice && <small role="status">{notice}</small>}
      <footer className="wb-source-footer">
        <small style={error ? { color: "var(--dsw-alias-state-error-primary, #dc2626)", flex: 1, minWidth: 0 } : undefined} role={error ? "alert" : undefined}>{error || (dirty ? "未保存" : "已保存")}</small>
        {onRemove && <Button type="button" className="danger" onClick={onRemove}>删除来源</Button>}
        <Button type="button" disabled={!dirty} onClick={onDiscard}>
          放弃修改
        </Button>
        <button
          className="dt-btn dt-btn-primary dt-btn-sm"
          type="submit"
          disabled={!dirty}
        >
          保存
        </button>
      </footer>
    </article>
  );
}
function AddEvent({ onAdd }) {
  const [value, setValue] = useState("");
  return (
    <div className="actions">
      <input
        aria-label="自定义事件"
        maxLength={100}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <Button
        type="button"
        disabled={!value.trim()}
        onClick={() => {
          onAdd(value.trim());
          setValue("");
        }}
      >
        添加事件
      </Button>
    </div>
  );
}
export function WebhookPolicies({
  value,
  onChange,
  endpoints = [],
  endpointId,
  hideTabs = false,
}) {
  const [selected, setSelected] = useState("");
  let policies;
  try {
    policies = JSON.parse(value || "{}");
  } catch {
    return (
      <Shell>
        <p role="alert">已有条件 JSON 无效，请修正后保存。</p>
        <textarea
          aria-label="事件条件 JSON"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </Shell>
    );
  }
  const endpoint =
    endpoints.find((e) => e.id === (endpointId || selected)) || endpoints[0];
  const save = (event, policy) =>
    onChange(
      JSON.stringify({
        ...policies,
        [endpoint.id]: { ...policies[endpoint.id], [event]: { ...policy, admission: eventAdmission(policy), filters: policy.filters.map(({admission, ...f}) => f) } },
      }),
    );
  if (!endpoint)
    return (
      <Shell>
        <p>请先在来源中添加并保存 Webhook 来源。</p>
      </Shell>
    );
  const events =
    endpoint.eventsMode === "all"
      ? [
          ...new Set([
            ...(endpoint.eventTypes || []),
            ...(endpoint.events || []),
          ]),
        ]
      : endpoint.events || [];
  return (
    <Shell>
      {!hideTabs && (
        <p>
          按来源、事件分别配置准入条件。关闭事件会保留条件；空条件忽略。候选通过条件后仍需由
          Super-agent 授权与评估。
        </p>
      )}
      {!hideTabs && (
        <nav aria-label="Webhook 来源">
          {endpoints.map((e) => (
            <Button
              type="button"
              aria-pressed={e.id === endpoint.id}
              key={e.id}
              onClick={() => setSelected(e.id)}
            >
              {e.name || e.id}
            </Button>
          ))}
        </nav>
      )}
      <h3 className="wb-admission-title">准入</h3>
      {!events.length && <p>此来源没有开启事件。请在来源页启用事件后保存。</p>}
      {events.map((event) => {
        const p = structuredClone(policies[endpoint.id]?.[event]) || {
          mode: "and",
          filters: [],
        };
        p.admission = eventAdmission(p);
        return (
          <article key={event} className="wb-policy-event">
            <header>
              <div className="wb-event-title">
                <span>
                  {{
                    "file.created": "文件新增",
                    "file.updated": "文件更新",
                    "file.deleted": "文件删除",
                  }[event] || event}
                </span>
              </div>
              <div className="wb-event-options">
              <label>
                条件组合
                <Select
                  value={p.mode}
                  onChange={(e) => save(event, { ...p, mode: e.target.value })}
                >
                  <option value="and">全部满足（AND）</option>
                  <option value="or">任一满足（OR）</option>
                </Select>
              </label>
              <label>准入条件
                <Select aria-label="事件准入条件" value={p.admission} onChange={e=>save(event,{...p,admission:e.target.value})}>
                  <option value="ignore">忽略</option><option value="accept">准入</option><option value="candidate">推断的候选</option>
                </Select>
              </label></div>
            </header>
            <span className="wb-filter-title">筛选条件</span>
            {p.filters.length > 0 && (
              <div className="filter wb-filter-labels">
                
                <span>字段名</span>
                <span>比较方式</span>
                <span>匹配值</span>
                <span />
              </div>
            )}
            {p.filters.map((f, i) => {
              const edit = (patch) =>
                save(event, {
                  ...p,
                  filters: p.filters.map((item, j) =>
                    j === i ? { ...item, ...patch } : item,
                  ),
                });
              return (
                <div className="filter" key={i}>
                  <Select aria-label="字段路径" value={f.field}
                    onChange={e => edit({field:e.target.value, source:'payload'})}>
                    <option value="">请选择字段</option>
                    {f.field && !(endpoint.eventReceivers?.[event]?.fields || []).some(row=>row.name===f.field) && <option value={f.field} disabled>{f.field}（未映射）</option>}
                    {[...new Set((endpoint.eventReceivers?.[event]?.fields || []).map(row=>row.name).filter(Boolean))].map(name=><option key={name} value={name}>{name}</option>)}
                  </Select>
                  <Select
                    aria-label="比较方式"
                    value={f.op || ""}
                    onChange={(e) => edit({ op: e.target.value })}
                  >
                    <option value="">请选择比较方式</option>
                    {[
                      ["equals", "等于"],
                      ["not_equals", "不等于"],
                      ["contains", "包含"],
                      ["starts_with", "开头是"],
                      ["ends_with", "结尾是"],
                      ["regex", "正则匹配"],
                      ["exists", "存在"],
                    ].map(([v, l]) => (
                      <option key={v} value={v}>
                        {l}
                      </option>
                    ))}
                  </Select>
                  <input
                    aria-label="比较值"
                    value={f.value}
                    disabled={f.op === "exists"}
                    maxLength={512}
                    onChange={(e) => edit({ value: e.target.value })}
                  />
                  <Button
                    type="button"
                    onClick={() =>
                      save(event, {
                        ...p,
                        filters: p.filters.filter((_, j) => j !== i),
                      })
                    }
                  >
                    ×
                  </Button>
                </div>
              );
            })}
            <Button
              type="button"
              disabled={p.filters.length >= 20}
              onClick={() =>
                save(event, {
                  ...p,
                  filters: [
                    ...p.filters,
                    { source: "payload", field: "", op: "", value: "", admission: "" },
                  ],
                })
              }
            >
              添加条件
            </Button>
          </article>
        );
      })}
    </Shell>
  );
}
export {
  WebhookSourcePanel,
  WebhookToolbarProvider,
  WebhookToolbar,
} from "./source-panel.jsx";

export function endpointBots(bots, endpoint) {
  return (Array.isArray(bots) ? bots : []).filter((b) =>
    b.id.startsWith(endpoint + ":"),
  );
}
export function replaceEndpointBots(bots, endpoint, rows) {
  return [
    ...(Array.isArray(bots) ? bots : []).filter(
      (b) => !b.id.startsWith(endpoint + ":"),
    ),
    ...rows,
  ];
}
export function WebhookSenders() {
  return null;
}

function ReceiveRules({ endpoint, onChange }) {
  const p = endpoint.receivePolicy || { mode: "and", filters: [] };
  const save = (policy) =>
    onChange({ receivePolicy: { ...policy, mode: "and" } });
  return (
    <section className="events wb-receive-rules">
      <div className="wb-section-heading"><strong>接收条件</strong>
      <Button
        type="button"
        disabled={p.filters.length >= 20}
        onClick={() =>
          save({
            ...p,
            filters: [
              ...p.filters,
              { source: "payload", field: "", op: "equals", value: "" },
            ],
          })
        }
      >
        + 添加条件
      </Button>
      </div>

      {p.filters.length > 0 && (
        <div className="filter wb-filter-labels">
          <span>数据来源</span>
          <span>JSON 表达式</span>
          <span>比较方式</span>
          <span>匹配值</span>
          <span />
        </div>
      )}
      {p.filters.map((f, i) => {
        const edit = (patch) =>
          save({
            ...p,
            filters: p.filters.map((item, j) =>
              j === i ? { ...item, ...patch } : item,
            ),
          });
        return (
          <div className="filter" key={i}>
            <Select
              aria-label="取值位置"
              value={f.source}
              onChange={(e) => edit({ source: e.target.value })}
            >
              {[
                ["payload", "JSON 正文"],
                ["header", "请求头"],
                ["url", "查询参数"],
              ].map(([s, label]) => (
                <option key={s} value={s}>
                  {label}
                </option>
              ))}
            </Select>
            <input
              aria-label="JSON 表达式"
              placeholder="例如：$.data.message 或 $.items[0].id"
              value={f.field}
              maxLength={128}
              required
              onChange={(e) => edit({ field: e.target.value })}
            />
            <Select
              aria-label="比较方式"
              value={f.op}
              onChange={(e) => edit({ op: e.target.value })}
            >
              {[
                ["equals", "等于"],
                ["not_equals", "不等于"],
                ["contains", "包含"],
                ["starts_with", "开头是"],
                ["ends_with", "结尾是"],
                ["regex", "正则匹配"],
                ["exists", "存在"],
              ].map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </Select>
            <input
              aria-label="比较值"
              value={f.value}
              disabled={f.op === "exists"}
              maxLength={512}
              onChange={(e) => edit({ value: e.target.value })}
            />
            <Button
              type="button"
              onClick={() =>
                save({
                  ...p,
                  filters: p.filters.filter((_, j) => j !== i),
                })
              }
            >
              ×
            </Button>
          </div>
        );
      })}

    </section>
  );
}

function EventReceiverConfig({ value: e, onChange }) {
  return (
    <div className="wb-receive-details">
      <div className="events wb-receive-body">
        <ReceiveRules endpoint={e} onChange={onChange} />
        <JsonFields value={e.fields} onChange={(fields) => onChange({ fields, inputMode: fields.length ? "custom" : e.inputMode })} />
      </div>
    </div>
  );
}

const fieldTypes = ['string','integer','boolean','array','object','number','null','any'];
function JsonFields({ value = [], onChange }) {
  const edit = (i, patch) => onChange(value.map((row, j) => j === i ? { ...row, ...patch } : row));
  return <section className="events">
    <div className="wb-section-heading"><strong>JSON 字段映射</strong>
      <Button type="button" disabled={value.length>=100} onClick={()=>onChange([...value,{name:'',type:'string',expression:''}])}>+ 添加字段</Button></div>
    <div style={{display:'grid',gridTemplateColumns:'minmax(100px,1fr) 110px minmax(140px,2fr) 40px',gap:8}}>
      <small>字段名</small><small>数据类型</small><small>JSON 表达式</small><span />
      {value.map((row,i) => <React.Fragment key={i}>
        <Field aria-label="映射字段名" value={row.name} required placeholder="例如：text 或 payload.path" onChange={ev=>edit(i,{name:ev.target.value})} />
        <Select aria-label="映射数据类型" value={row.type} onChange={ev=>edit(i,{type:ev.target.value})}>{fieldTypes.map(t=><option key={t} value={t}>{t}</option>)}</Select>
        <Field aria-label="JSON 表达式" value={row.expression} required placeholder="例如：$.data.message" onChange={ev=>edit(i,{expression:ev.target.value})} />
        <Button type="button" aria-label="删除映射字段" onClick={()=>onChange(value.filter((_,j)=>j!==i))}>×</Button>
      </React.Fragment>)}
    </div>
  </section>;
}
