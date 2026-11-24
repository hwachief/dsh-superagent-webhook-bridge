// src/uuid.js
function randomUUID() {
  const crypto = globalThis.crypto;
  if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = bytes[6] & 15 | 64;
  bytes[8] = bytes[8] & 63 | 128;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"));
  return [hex.slice(0, 4), hex.slice(4, 6), hex.slice(6, 8), hex.slice(8, 10), hex.slice(10)].map((part) => part.join("")).join("-");
}

// src/event-admission.js
function eventAdmission(policy) {
  if (policy && Object.hasOwn(policy, "admission")) return policy.admission || "ignore";
  const actions = [...new Set((policy?.filters || []).map((f) => f.admission).filter(Boolean))];
  return actions.length === 1 ? actions[0] : "ignore";
}

// src/ui.jsx
import React2, { useState as useState2 } from "react";

// src/event-validation.js
function eventConfigurationError(event, receiver) {
  const filters = receiver?.receivePolicy?.filters || [];
  const fields = receiver?.fields || [];
  if (!filters.length || filters.some((f) => !f.field?.trim() || !f.op || f.op !== "exists" && !f.value?.trim()))
    return `\u4E8B\u4EF6\u201C${event}\u201D\u5FC5\u987B\u914D\u7F6E\u81F3\u5C11\u4E00\u6761\u5B8C\u6574\u7684\u63A5\u6536\u6761\u4EF6`;
  if (!fields.length || fields.some((f) => !f.name?.trim() || !f.type || !f.expression?.trim()))
    return `\u4E8B\u4EF6\u201C${event}\u201D\u5FC5\u987B\u914D\u7F6E\u81F3\u5C11\u4E00\u6761\u5B8C\u6574\u7684 JSON \u5B57\u6BB5\u6620\u5C04`;
  return "";
}
function validateEnabledEvents(endpoint) {
  const events = endpoint.eventsMode === "all" ? [.../* @__PURE__ */ new Set([...endpoint.events || [], ...endpoint.eventTypes || []])] : endpoint.events || [];
  for (const event of events) {
    const error = eventConfigurationError(event, endpoint.eventReceivers?.[event]);
    if (error) throw Error(error);
  }
}

// src/source-panel.jsx
import React, { useEffect, useState, createContext, useContext } from "react";
import { Fragment, jsx, jsxs } from "react/jsx-runtime";
var same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
var editable = (e) => ({ ...e, secret: "" });
var generatedKey = () => randomUUID().replaceAll("-", "");
var ToolbarContext = createContext(null);
function WebhookToolbarProvider({ children }) {
  const [toolbar, setToolbar] = useState(null);
  return /* @__PURE__ */ jsx(ToolbarContext.Provider, { value: { toolbar, setToolbar }, children });
}
function WebhookToolbar() {
  return useContext(ToolbarContext)?.toolbar ?? null;
}
function WebhookSourcePanel({ source, call, reload, onPolicy }) {
  const [pending, setPending] = useState([]), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const toolbarContext = useContext(ToolbarContext);
  const endpoints = source?.value.config.endpoints ?? [];
  const latest = async () => {
    const settings = await call("GET settings");
    const row = settings.sources.find((s) => s.id === "webhook");
    if (!row?.installed) throw Error("Webhook \u5DF2\u5173\u95ED");
    return row;
  };
  const toggle = async (enabled) => {
    setBusy(true);
    setError("");
    try {
      const row = await latest();
      await call("PUT settings/:block", {
        block: "source:webhook",
        body: { revision: row.revision, value: { ...row.value, enabled } }
      });
      await reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const commit = async (saved, draft, remove = false) => {
    if (!remove) validateEnabledEvents(draft);
    const row = await latest(), items = row.value.config.endpoints ?? [];
    const before = saved && items.find((e) => e.id === saved.id);
    if (saved && !same(before, saved))
      throw Error("\u6B64\u6765\u6E90\u5DF2\u88AB\u5176\u4ED6\u64CD\u4F5C\u4FEE\u6539\uFF0C\u8BF7\u91CD\u65B0\u8F7D\u5165\u540E\u518D\u4FDD\u5B58\u3002");
    const next = remove ? items.filter((e) => e.id !== saved.id) : saved ? items.map(
      (e) => e.id === saved.id ? { ...draft, secret: draft.secret || saved.secret } : e
    ) : [{ ...draft, secret: draft.secret || generatedKey() }, ...items];
    if (!remove && next.filter((e) => e.id === draft.id).length > 1)
      throw Error("\u5165\u53E3 ID \u5DF2\u5B58\u5728\uFF0C\u8BF7\u4F7F\u7528\u72EC\u7ACB\u7684 ID\u3002");
    await call("PUT settings/:block", {
      block: "source:webhook",
      body: {
        revision: row.revision,
        value: {
          ...row.value,
          config: { ...row.value.config, endpoints: next }
        }
      }
    });
    await reload();
    if (!remove) {
      const refreshed = await latest();
      return refreshed.value.config.endpoints.find((e) => e.id === draft.id);
    }
  };
  const toolbar = /* @__PURE__ */ jsx("span", { className: "wb-source-toolbar", children: /* @__PURE__ */ jsx(
    "button",
    {
      type: "button",
      className: "dt-btn dt-btn-outline dt-btn-sm",
      onClick: () => setPending((v) => [
        {
          uid: randomUUID(),
          value: { ...createSource(), enabled: true }
        },
        ...v
      ]),
      children: "+ \u6DFB\u52A0webhook\u6765\u6E90"
    }
  ) });
  useEffect(() => {
    toolbarContext?.setToolbar(source?.installed ? toolbar : null);
    return () => toolbarContext?.setToolbar(null);
  }, [source?.installed, source?.value.enabled, busy]);
  useEffect(() => {
    if (source?.installed && !source.value.enabled) void toggle(true);
  }, [source?.installed, source?.value.enabled]);
  if (!source?.installed) return null;
  return /* @__PURE__ */ jsxs(Shell, { children: [
    error && /* @__PURE__ */ jsx("p", { role: "alert", children: error }),
    /* @__PURE__ */ jsxs(Fragment, { children: [
      pending.map((e) => /* @__PURE__ */ jsx(
        ManagedCard,
        {
          initial: e.value,
          commit,
          baseUrl: source.facts?.endpoints,
          onPolicy,
          onRemoveDraft: () => setPending((v) => v.filter((item) => item.uid !== e.uid))
        },
        e.uid
      )),
      endpoints.map((e) => /* @__PURE__ */ jsx(
        ManagedCard,
        {
          saved: e,
          commit,
          baseUrl: source.facts?.endpoints,
          onPolicy
        },
        e.id
      ))
    ] })
  ] });
}
function ManagedCard({
  saved,
  initial,
  commit,
  baseUrl,
  onPolicy,
  onRemoveDraft
}) {
  const [baseline, setBaseline] = useState(saved), [value, setValue] = useState(() => saved ? editable(saved) : initial), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  useEffect(() => {
    if (saved && same(value, editable(baseline))) {
      setBaseline(saved);
      setValue(editable(saved));
    }
  }, [JSON.stringify(saved)]);
  const remove = async () => {
    if (!baseline) {
      onRemoveDraft();
      return;
    }
    setBusy(true);
    setError("");
    try {
      await commit(baseline, null, true);
    } catch (e) {
      setError(e.message);
      setBusy(false);
    }
  };
  const save = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const updated = await commit(baseline, value);
      setBaseline(updated);
      setValue(editable(updated));
      onRemoveDraft?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ jsx("form", { className: "wb-independent-form", onSubmit: save, children: /* @__PURE__ */ jsx("fieldset", { disabled: busy, children: /* @__PURE__ */ jsx(
    SourceEditor,
    {
      endpoint: value,
      error,
      saved: baseline,
      baseUrl: typeof baseUrl === "string" ? baseUrl : void 0,
      onPolicy,
      onChange: (patch) => setValue((v) => ({ ...v, ...patch })),
      onDiscard: () => baseline ? setValue(editable(baseline)) : onRemoveDraft(),
      onRemove: remove
    }
  ) }) });
}

// src/ui.jsx
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
var createSource = () => ({
  id: randomUUID(),
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
  callbackSecret: ""
});
var css = `.wb .wb-event-help{order:0;position:relative;flex:0 0 24px;margin-left:-44px;margin-right:8px;display:flex;align-items:center;justify-content:center}.wb .wb-event-help>button{border:0;background:transparent;color:var(--dsw-alias-label-secondary);cursor:help;padding:4px;font-size:16px}.wb .wb-event-row>input[type=text]{padding-right:40px!important}.wb .wb-event-tooltip{display:none;position:absolute;right:0;bottom:calc(100% + 6px);z-index:100;width:420px;max-width:75vw;padding:14px;border:1px solid var(--dsw-alias-border-l3);border-radius:10px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);box-shadow:0 6px 24px #0002;cursor:text}.wb .wb-event-help:hover .wb-event-tooltip,.wb .wb-event-help:focus-within .wb-event-tooltip{display:flex;flex-direction:column;gap:8px}.wb .wb-event-tooltip pre{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:1.6}.wb .wb-event-row{display:flex;align-items:center;gap:12px;min-width:0}.wb .wb-event-row>input[type=text]{order:0;flex:1;min-width:0;height:32px;padding:0 10px;border:0.5px solid var(--dsw-alias-border-l4);border-radius:8px;background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font:inherit}.wb .wb-event-row>input[type=text]:disabled{color:var(--dsw-alias-label-secondary)}.wb .wb-event-row>input[type=checkbox]{order:1;flex:0 0 36px;width:36px;height:20px}.wb .wb-event-row>button{order:2;flex:0 0 auto;white-space:nowrap}.dt-settings-title:has(.wb-source-toolbar){display:flex;align-items:center;justify-content:space-between;gap:12px}.wb-source-toolbar,.wb-master{display:inline-flex;align-items:center;gap:12px;font-size:13px;font-weight:400}.wb-independent-form>fieldset{border:0;padding:0;margin:0;min-width:0} .wb .wb-policy-event{display:flex;flex-direction:column;gap:12px;border:0;border-top:0.5px solid var(--dsw-alias-border-l3);border-radius:0;padding:20px 0 16px}.wb .wb-policy-event>header{display:flex;align-items:flex-start;justify-content:space-between;gap:24px;flex-wrap:nowrap}.wb .wb-event-title{flex:1;min-width:0;padding-top:2px;font-size:14px;font-weight:500;overflow-wrap:anywhere;color:var(--dsw-alias-label-primary)}.wb .wb-event-options{display:grid;grid-template-columns:180px 180px;gap:12px;flex:0 0 auto}.wb .wb-event-options>label{min-width:0;font-size:12px}.wb .wb-policy-event .filter{display:grid;grid-template-columns:minmax(160px,1.2fr) 160px minmax(160px,1fr) 32px;gap:12px;align-items:center}.wb .wb-policy-event .filter>*{min-width:0;width:100%}.wb .wb-policy-event .filter>button{padding:0;width:32px;height:32px}.wb .wb-filter-title{font-size:12px;color:var(--dsw-alias-label-secondary);margin-top:4px}.wb .wb-filter-labels{font-size:12px;color:var(--dsw-alias-label-tertiary);margin-bottom:-6px}.wb .wb-admission-title{font-size:13px;font-weight:400;color:var(--dsw-alias-label-secondary);margin:0}.wb .wb-policy-event>button{align-self:flex-start;margin-top:0}@media(max-width:700px){.wb .wb-policy-event>header{flex-wrap:wrap;gap:12px}.wb .wb-event-title{flex-basis:100%}.wb .wb-event-options{width:100%;grid-template-columns:1fr 1fr}.wb .wb-policy-event .filter{grid-template-columns:minmax(0,1fr) minmax(0,1fr) minmax(0,1fr) 28px;gap:8px}}#dt-source-webhook:has(.wb-source-footer button[type=submit]:not(:disabled))>.dt-savebar:not(:has([role=alert])){display:none}.wb .wb-source-card{gap:16px}.wb-event-head,.wb-links,.wb-source-footer{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.wb-event-head{justify-content:space-between;margin-top:8px}.wb-links{margin-top:8px}.wb-links small{overflow-wrap:anywhere}.wb-source-footer{border-top:0.5px solid var(--dsw-alias-border-l3);margin:0 -16px -16px;padding:12px 16px}.wb-source-footer>small{margin-right:auto}.wb-source-card header .check{min-height:20px}.wb-source-card details{font-size:12px}.wb{font:inherit;font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary);display:flex;flex-direction:column;gap:12px;min-width:0}.wb *{box-sizing:border-box}.wb p{margin:0;overflow-wrap:anywhere;color:var(--dsw-alias-label-caption);font-size:12px;line-height:18px}.wb article{display:flex;flex-direction:column;gap:12px;border:0.5px solid var(--dsw-alias-border-l3);border-radius:16px;padding:16px;min-width:0}.wb header,.wb nav,.wb .actions{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.wb header{min-height:28px}.wb header strong{flex:1;font-size:13px;font-weight:500}.wb .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.wb label{display:flex;flex-direction:column;gap:6px;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary);min-width:0}.wb .dt-input{display:flex;width:100%}.wb .check{flex-direction:row-reverse;justify-content:space-between;align-items:center;gap:16px;min-height:36px}.wb header .check{margin-left:auto}.wb input[type=checkbox]{appearance:none;position:relative;flex:0 0 auto;width:36px;height:20px;margin:0;padding:2px;border:0;border-radius:10px;background:var(--dsw-alias-border-l3);cursor:pointer}.wb input[type=checkbox]:checked{background:var(--dsw-alias-brand-primary)}.wb input[type=checkbox]::after{content:'';display:block;width:16px;height:16px;border-radius:50%;background:var(--dsw-alias-label-primary-foreground);transition:transform 120ms ease}.wb input[type=checkbox]:checked::after{transform:translateX(16px)}.wb input[type=checkbox]:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.wb input[type=checkbox]:disabled{opacity:.4;cursor:default}.wb .events{display:flex;flex-direction:column;gap:12px}.wb small{font-size:12px;color:var(--dsw-alias-label-caption)}.wb .filter{display:grid;grid-template-columns:100px minmax(0,1fr) 120px minmax(0,1fr) auto;gap:8px;align-items:center}.wb .actions>input,.wb .filter>input{height:32px;min-width:0;padding:0 8px;border:0.5px solid var(--dsw-alias-border-l4);border-radius:8px;background:var(--dsw-alias-bg-layer-1);font:inherit;font-size:14px;color:var(--dsw-alias-label-primary)}.wb .actions>input{flex:1}.wb .danger{color:var(--dsw-alias-state-error-primary)}.wb nav button[aria-pressed=true]{background:var(--dsw-alias-bg-layer-3)}.wb code{font-family:var(--ds-font-family-code,Menlo,monospace);font-size:12px}.wb details>.grid{margin-top:12px}.wb .secret-field{display:flex;flex-direction:column;gap:6px}.wb .secret-field>button{align-self:flex-start}@container(max-width:650px){.wb .grid,.wb .filter{grid-template-columns:1fr}.wb header .check{width:100%;margin-left:0}}@media(prefers-reduced-motion:reduce){.wb input[type=checkbox]::after{transition:none}}`;
var receiveCss = `
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
function Button({ className = "", ...props }) {
  return /* @__PURE__ */ jsx2(
    "button",
    {
      className: `dt-btn dt-btn-ghost dt-btn-sm ${className}`,
      ...props
    }
  );
}
function Select(props) {
  return /* @__PURE__ */ jsx2("select", { className: "dt-select", ...props });
}
function Shell({ children }) {
  return /* @__PURE__ */ jsxs2("div", { className: "wb", children: [
    /* @__PURE__ */ jsx2("style", { children: css + receiveCss }),
    children
  ] });
}
var Field = ({ label, inline = false, ...props }) => /* @__PURE__ */ jsxs2(
  "label",
  {
    style: inline ? { flexDirection: "row", alignItems: "center", gap: 12 } : void 0,
    children: [
      label,
      /* @__PURE__ */ jsx2(
        "span",
        {
          className: "dt-input",
          style: inline ? { flex: 1, minWidth: 0 } : void 0,
          children: /* @__PURE__ */ jsx2("input", { ...props })
        }
      )
    ]
  }
);
function WebhookSources({
  value,
  onChange,
  saved = [],
  onPolicy,
  baseUrl = "http://127.0.0.1:9088"
}) {
  const endpoints = Array.isArray(value) ? value : [];
  const savedEndpoints = Array.isArray(saved) ? saved : [];
  return /* @__PURE__ */ jsxs2(Shell, { children: [
    endpoints.map((e, index) => /* @__PURE__ */ jsx2(
      SourceEditor,
      {
        endpoint: e,
        saved: savedEndpoints.find((x) => x.id === e.id) ?? savedEndpoints[index],
        baseUrl,
        onPolicy,
        onChange: (patch) => onChange(
          endpoints.map(
            (item, i) => i === index ? { ...item, ...patch } : item
          )
        ),
        onDiscard: () => onChange(
          savedEndpoints[index] ? endpoints.map(
            (item, i) => i === index ? savedEndpoints[index] : item
          ) : endpoints.filter((_, i) => i !== index)
        ),
        onRemove: () => onChange(endpoints.filter((_, i) => i !== index))
      },
      index
    )),
    /* @__PURE__ */ jsx2(
      Button,
      {
        type: "button",
        onClick: () => onChange([...endpoints, createSource()]),
        disabled: endpoints.length >= 100,
        children: "+ \u65B0\u589E\u6765\u6E90"
      }
    )
  ] });
}
function SourceEditor({
  endpoint: e,
  error,
  saved,
  onChange,
  onDiscard,
  onRemove,
  onPolicy,
  baseUrl
}) {
  const [notice, setNotice] = useState2("");
  const [unnamedEvents, setUnnamedEvents] = useState2(() => /* @__PURE__ */ new Set());
  const [nameErrors, setNameErrors] = useState2({});
  const checkEventName = (input, event) => {
    const name = input.value.trim();
    const duplicate = name !== event && [...e.eventTypes || [], ...e.events || []].includes(name);
    const message = duplicate ? `\u4E8B\u4EF6\u540D\u79F0\u201C${name}\u201D\u5DF2\u5B58\u5728\uFF0C\u8BF7\u4F7F\u7528\u4E0D\u540C\u7684\u540D\u79F0\u3002` : "";
    input.setCustomValidity(message);
    input.setAttribute("aria-invalid", String(duplicate));
    setNameErrors((previous) => ({ ...previous, [event]: message }));
    return !duplicate;
  };
  const dirty = !saved || JSON.stringify({ ...e, secret: e.secret || saved.secret }) !== JSON.stringify(saved);
  const url = saved?.id ? baseUrl.replace(/\/$/, "") + "/hooks/" + encodeURIComponent(saved.id) : "";
  const copy = async (value, label) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(label + "\u5DF2\u590D\u5236");
    } catch {
      setNotice("\u590D\u5236\u5931\u8D25\uFF0C\u8BF7\u624B\u52A8\u590D\u5236");
    }
  };
  return /* @__PURE__ */ jsxs2("article", { className: "wb-source-card", children: [
    /* @__PURE__ */ jsxs2("header", { children: [
      /* @__PURE__ */ jsx2("strong", { children: e.name || "\u65B0\u589E\u6765\u6E90" }),
      /* @__PURE__ */ jsx2("label", { className: "check", children: /* @__PURE__ */ jsx2(
        "input",
        {
          type: "checkbox",
          "aria-label": "\u542F\u7528\u6765\u6E90",
          checked: e.enabled === true || e.enabled === "on",
          onChange: (ev) => onChange({ enabled: ev.target.checked })
        }
      ) })
    ] }),
    /* @__PURE__ */ jsx2(
      Field,
      {
        label: "\u6765\u6E90\u540D\u79F0",
        required: true,
        placeholder: "\u4F8B\u5982\uFF1AOpenList\u3001\u5916\u90E8\u4E1A\u52A1\u7CFB\u7EDF\u3001\u811A\u672C\u3001Apifox",
        value: e.name || "",
        maxLength: 80,
        onChange: (ev) => onChange({ name: ev.target.value })
      }
    ),
    /* @__PURE__ */ jsxs2("section", { className: "wb-auth-section", children: [
      /* @__PURE__ */ jsxs2("div", { className: "wb-auth-heading", children: [
        /* @__PURE__ */ jsxs2("span", { children: [
          "\u8BA4\u8BC1\u65B9\u5F0F",
          " ",
          /* @__PURE__ */ jsxs2(
            "span",
            {
              className: "wb-event-help",
              style: { display: "inline-flex", margin: 0 },
              children: [
                /* @__PURE__ */ jsx2("button", { type: "button", "aria-label": "\u8BA4\u8BC1\u914D\u7F6E\u8BF4\u660E", children: "\u24D8" }),
                /* @__PURE__ */ jsxs2("span", { className: "wb-event-tooltip", role: "tooltip", children: [
                  /* @__PURE__ */ jsx2("strong", { children: "\u53D1\u9001\u65B9\u914D\u7F6E\uFF08\u4FDD\u5B58\u540E\u751F\u6548\uFF09" }),
                  /* @__PURE__ */ jsx2("small", { children: "POST \xB7 Content-Type: application/json" }),
                  /* @__PURE__ */ jsx2("pre", { children: `${e.authHeader || (e.auth === "authorization" ? "Authorization" : "X-Webhook-Key")}: <\u6765\u6E90\u8BBF\u95EE\u5BC6\u94A5>

\u5728\u53D1\u9001\u65B9 Headers \u4E2D\u6DFB\u52A0\u4EE5\u4E0A\u8BF7\u6C42\u5934\uFF0C\u503C\u76F4\u63A5\u586B\u5199\u6765\u6E90\u8BBF\u95EE\u5BC6\u94A5\u3002\u540D\u79F0\u4E0D\u533A\u5206\u5927\u5C0F\u5199\u3002\u4FDD\u5B58\u540E\u751F\u6548\u3002` }),
                  /* @__PURE__ */ jsx2("small", { children: "\u70B9\u51FB\u201C\u590D\u5236\u5BC6\u94A5\u201D\u83B7\u53D6\u5BC6\u94A5\uFF1B\u8BF7\u901A\u8FC7 HTTPS \u53D1\u9001\u3002" })
                ] })
              ]
            }
          )
        ] }),
        /* @__PURE__ */ jsx2("small", { children: "\u81EA\u5B9A\u4E49\u8BF7\u6C42\u5934\u5BC6\u94A5" })
      ] }),
      /* @__PURE__ */ jsxs2("div", { className: "wb-auth-fields", children: [
        /* @__PURE__ */ jsx2(
          Field,
          {
            label: "\u8BA4\u8BC1\u8BF7\u6C42\u5934\u540D\u79F0",
            required: true,
            maxLength: 128,
            placeholder: "\u4F8B\u5982\uFF1AAuthorization\u3001X-Webhook-Key\u3001X-Api-Key",
            pattern: "[!#$%&'*+.^_`|~0-9A-Za-z-]{1,128}",
            value: e.authHeader ?? (e.auth === "authorization" ? "Authorization" : "X-Webhook-Key"),
            onChange: (ev) => onChange({ authHeader: ev.target.value, auth: "key" })
          }
        ),
        /* @__PURE__ */ jsx2(
          Field,
          {
            label: "\u8BBF\u95EE\u5BC6\u94A5",
            type: "password",
            autoComplete: "new-password",
            placeholder: saved ? "\u7559\u7A7A\u4FDD\u7559\u5BC6\u94A5" : "\u7559\u7A7A\u81EA\u52A8\u751F\u6210",
            minLength: 24,
            value: e.secret || "",
            onChange: (ev) => onChange({ secret: ev.target.value })
          }
        )
      ] })
    ] }),
    /* @__PURE__ */ jsxs2("div", { className: "wb-event-head", children: [
      /* @__PURE__ */ jsx2("span", { children: "\u63A5\u6536\u7684\u4E8B\u4EF6" }),
      /* @__PURE__ */ jsx2(Button, { type: "button", onClick: () => {
        const event = randomUUID();
        setUnnamedEvents((previous) => /* @__PURE__ */ new Set([...previous, event]));
        onChange({
          eventTypes: [...e.eventTypes || [], event],
          eventReceivers: {
            ...e.eventReceivers,
            [event]: {
              receivePolicy: { mode: "and", filters: [{ source: "payload", field: "", op: "equals", value: "" }] },
              fields: [{ name: "", type: "string", expression: "" }]
            }
          }
        });
      }, children: "+ \u6DFB\u52A0" })
    ] }),
    /* @__PURE__ */ jsx2("div", { className: "events", children: [.../* @__PURE__ */ new Set([...e.eventTypes || [], ...e.events || []])].map(
      (event) => /* @__PURE__ */ jsxs2("div", { className: "wb-receive-event", children: [
        /* @__PURE__ */ jsxs2("div", { className: "wb-event-row", children: [
          /* @__PURE__ */ jsx2(
            "input",
            {
              type: "checkbox",
              "aria-label": event,
              disabled: Boolean(nameErrors[event]),
              checked: e.eventsMode === "all" || (e.events || []).includes(event),
              onChange: (ev) => onChange({
                eventsMode: "selected",
                events: ev.target.checked ? [...e.events || [], event] : (e.eventsMode === "all" ? [
                  .../* @__PURE__ */ new Set([
                    ...e.eventTypes || [],
                    ...e.events || []
                  ])
                ] : e.events || []).filter((v) => v !== event)
              })
            }
          ),
          /* @__PURE__ */ jsx2(
            "input",
            {
              "aria-label": "\u4E8B\u4EF6\u540D\u79F0",
              type: "text",
              disabled: e.eventsMode === "all" || (e.events || []).includes(event),
              maxLength: 100,
              required: true,
              placeholder: "\u8BF7\u8F93\u5165\u4E8B\u4EF6\u540D\u79F0",
              defaultValue: unnamedEvents.has(event) ? "" : event,
              onChange: (ev) => checkEventName(ev.currentTarget, event),
              onClick: (ev) => ev.stopPropagation(),
              onKeyDown: (ev) => {
                if (ev.key === "Enter") {
                  ev.preventDefault();
                  ev.currentTarget.blur();
                }
              },
              onBlur: (ev) => {
                if (e.eventsMode === "all" || (e.events || []).includes(event))
                  return;
                const name = ev.target.value.trim();
                if (!checkEventName(ev.currentTarget, event)) return;
                if (!name || name === event || [...e.eventTypes || [], ...e.events || []].includes(
                  name
                )) {
                  ev.target.value = unnamedEvents.has(event) ? "" : event;
                  return;
                }
                onChange({
                  eventReceivers: Object.fromEntries(
                    Object.entries(e.eventReceivers || {}).map(([k, v]) => [
                      k === event ? name : k,
                      v
                    ])
                  ),
                  eventTypes: (e.eventTypes || []).map(
                    (v) => v === event ? name : v
                  ),
                  events: (e.events || []).map(
                    (v) => v === event ? name : v
                  )
                });
              },
              className: "dt-input"
            }
          ),
          /* @__PURE__ */ jsx2(
            Button,
            {
              type: "button",
              disabled: e.eventsMode === "all" || (e.events || []).includes(event),
              onClick: () => onChange({
                eventTypes: (e.eventTypes || []).filter(
                  (v) => v !== event
                ),
                events: (e.events || []).filter((v) => v !== event)
              }),
              children: "\u5220\u9664"
            }
          )
        ] }),
        nameErrors[event] && /* @__PURE__ */ jsx2("p", { role: "alert", style: { color: "var(--dsw-alias-state-error-primary)", marginInline: 14 }, children: nameErrors[event] }),
        /* @__PURE__ */ jsx2(
          EventReceiverConfig,
          {
            value: e.eventReceivers?.[event] || {},
            onChange: (patch) => onChange({
              eventReceivers: {
                ...e.eventReceivers,
                [event]: { ...e.eventReceivers?.[event], ...patch }
              }
            })
          }
        )
      ] }, event)
    ) }),
    /* @__PURE__ */ jsxs2("div", { className: "wb-links", children: [
      /* @__PURE__ */ jsx2(
        Button,
        {
          type: "button",
          onClick: () => {
            onChange({ secret: randomUUID().replaceAll("-", "") });
            setNotice(
              "\u5DF2\u751F\u6210 32 \u4F4D UUID \u5BC6\u94A5\uFF0C\u4FDD\u5B58\u540E\u751F\u6548\uFF0C\u8BF7\u540C\u6B65\u66F4\u65B0\u53D1\u9001\u65B9\u5BC6\u94A5"
            );
          },
          children: "\u91CD\u65B0\u751F\u6210\u5BC6\u94A5"
        }
      ),
      /* @__PURE__ */ jsx2("small", { children: url || "\u4FDD\u5B58\u540E\u751F\u6210\u63A5\u6536 URL" }),
      /* @__PURE__ */ jsx2(Button, { type: "button", disabled: !url, onClick: () => copy(url, "URL"), children: "\u590D\u5236 URL" }),
      /* @__PURE__ */ jsx2(
        Button,
        {
          type: "button",
          disabled: !e.secret && !saved?.secret,
          onClick: () => copy(
            e.secret || saved.secret,
            e.secret ? "\u65B0\u5BC6\u94A5\uFF08\u4FDD\u5B58\u540E\u751F\u6548\uFF09" : "\u5BC6\u94A5"
          ),
          children: "\u590D\u5236\u5BC6\u94A5"
        }
      ),
      /* @__PURE__ */ jsx2(Button, { type: "button", disabled: !saved || !onPolicy, onClick: onPolicy, children: "\u51C6\u5165\u7B56\u7565" })
    ] }),
    notice && /* @__PURE__ */ jsx2("small", { role: "status", children: notice }),
    /* @__PURE__ */ jsxs2("footer", { className: "wb-source-footer", children: [
      /* @__PURE__ */ jsx2("small", { style: error ? { color: "var(--dsw-alias-state-error-primary, #dc2626)", flex: 1, minWidth: 0 } : void 0, role: error ? "alert" : void 0, children: error || (dirty ? "\u672A\u4FDD\u5B58" : "\u5DF2\u4FDD\u5B58") }),
      onRemove && /* @__PURE__ */ jsx2(Button, { type: "button", className: "danger", onClick: onRemove, children: "\u5220\u9664\u6765\u6E90" }),
      /* @__PURE__ */ jsx2(Button, { type: "button", disabled: !dirty, onClick: onDiscard, children: "\u653E\u5F03\u4FEE\u6539" }),
      /* @__PURE__ */ jsx2(
        "button",
        {
          className: "dt-btn dt-btn-primary dt-btn-sm",
          type: "submit",
          disabled: !dirty,
          children: "\u4FDD\u5B58"
        }
      )
    ] })
  ] });
}
function WebhookPolicies({
  value,
  onChange,
  endpoints = [],
  endpointId,
  hideTabs = false
}) {
  const [selected, setSelected] = useState2("");
  let policies;
  try {
    policies = JSON.parse(value || "{}");
  } catch {
    return /* @__PURE__ */ jsxs2(Shell, { children: [
      /* @__PURE__ */ jsx2("p", { role: "alert", children: "\u5DF2\u6709\u6761\u4EF6 JSON \u65E0\u6548\uFF0C\u8BF7\u4FEE\u6B63\u540E\u4FDD\u5B58\u3002" }),
      /* @__PURE__ */ jsx2(
        "textarea",
        {
          "aria-label": "\u4E8B\u4EF6\u6761\u4EF6 JSON",
          value,
          onChange: (e) => onChange(e.target.value)
        }
      )
    ] });
  }
  const endpoint = endpoints.find((e) => e.id === (endpointId || selected)) || endpoints[0];
  const save = (event, policy) => onChange(
    JSON.stringify({
      ...policies,
      [endpoint.id]: { ...policies[endpoint.id], [event]: { ...policy, admission: eventAdmission(policy), filters: policy.filters.map(({ admission, ...f }) => f) } }
    })
  );
  if (!endpoint)
    return /* @__PURE__ */ jsx2(Shell, { children: /* @__PURE__ */ jsx2("p", { children: "\u8BF7\u5148\u5728\u6765\u6E90\u4E2D\u6DFB\u52A0\u5E76\u4FDD\u5B58 Webhook \u6765\u6E90\u3002" }) });
  const events = endpoint.eventsMode === "all" ? [
    .../* @__PURE__ */ new Set([
      ...endpoint.eventTypes || [],
      ...endpoint.events || []
    ])
  ] : endpoint.events || [];
  return /* @__PURE__ */ jsxs2(Shell, { children: [
    !hideTabs && /* @__PURE__ */ jsx2("p", { children: "\u6309\u6765\u6E90\u3001\u4E8B\u4EF6\u5206\u522B\u914D\u7F6E\u51C6\u5165\u6761\u4EF6\u3002\u5173\u95ED\u4E8B\u4EF6\u4F1A\u4FDD\u7559\u6761\u4EF6\uFF1B\u7A7A\u6761\u4EF6\u5FFD\u7565\u3002\u5019\u9009\u901A\u8FC7\u6761\u4EF6\u540E\u4ECD\u9700\u7531 Super-agent \u6388\u6743\u4E0E\u8BC4\u4F30\u3002" }),
    !hideTabs && /* @__PURE__ */ jsx2("nav", { "aria-label": "Webhook \u6765\u6E90", children: endpoints.map((e) => /* @__PURE__ */ jsx2(
      Button,
      {
        type: "button",
        "aria-pressed": e.id === endpoint.id,
        onClick: () => setSelected(e.id),
        children: e.name || e.id
      },
      e.id
    )) }),
    /* @__PURE__ */ jsx2("h3", { className: "wb-admission-title", children: "\u51C6\u5165" }),
    !events.length && /* @__PURE__ */ jsx2("p", { children: "\u6B64\u6765\u6E90\u6CA1\u6709\u5F00\u542F\u4E8B\u4EF6\u3002\u8BF7\u5728\u6765\u6E90\u9875\u542F\u7528\u4E8B\u4EF6\u540E\u4FDD\u5B58\u3002" }),
    events.map((event) => {
      const p = structuredClone(policies[endpoint.id]?.[event]) || {
        mode: "and",
        filters: []
      };
      p.admission = eventAdmission(p);
      return /* @__PURE__ */ jsxs2("article", { className: "wb-policy-event", children: [
        /* @__PURE__ */ jsxs2("header", { children: [
          /* @__PURE__ */ jsx2("div", { className: "wb-event-title", children: /* @__PURE__ */ jsx2("span", { children: {
            "file.created": "\u6587\u4EF6\u65B0\u589E",
            "file.updated": "\u6587\u4EF6\u66F4\u65B0",
            "file.deleted": "\u6587\u4EF6\u5220\u9664"
          }[event] || event }) }),
          /* @__PURE__ */ jsxs2("div", { className: "wb-event-options", children: [
            /* @__PURE__ */ jsxs2("label", { children: [
              "\u6761\u4EF6\u7EC4\u5408",
              /* @__PURE__ */ jsxs2(
                Select,
                {
                  value: p.mode,
                  onChange: (e) => save(event, { ...p, mode: e.target.value }),
                  children: [
                    /* @__PURE__ */ jsx2("option", { value: "and", children: "\u5168\u90E8\u6EE1\u8DB3\uFF08AND\uFF09" }),
                    /* @__PURE__ */ jsx2("option", { value: "or", children: "\u4EFB\u4E00\u6EE1\u8DB3\uFF08OR\uFF09" })
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ jsxs2("label", { children: [
              "\u51C6\u5165\u6761\u4EF6",
              /* @__PURE__ */ jsxs2(Select, { "aria-label": "\u4E8B\u4EF6\u51C6\u5165\u6761\u4EF6", value: p.admission, onChange: (e) => save(event, { ...p, admission: e.target.value }), children: [
                /* @__PURE__ */ jsx2("option", { value: "ignore", children: "\u5FFD\u7565" }),
                /* @__PURE__ */ jsx2("option", { value: "accept", children: "\u51C6\u5165" }),
                /* @__PURE__ */ jsx2("option", { value: "candidate", children: "\u63A8\u65AD\u7684\u5019\u9009" })
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ jsx2("span", { className: "wb-filter-title", children: "\u7B5B\u9009\u6761\u4EF6" }),
        p.filters.length > 0 && /* @__PURE__ */ jsxs2("div", { className: "filter wb-filter-labels", children: [
          /* @__PURE__ */ jsx2("span", { children: "\u5B57\u6BB5\u540D" }),
          /* @__PURE__ */ jsx2("span", { children: "\u6BD4\u8F83\u65B9\u5F0F" }),
          /* @__PURE__ */ jsx2("span", { children: "\u5339\u914D\u503C" }),
          /* @__PURE__ */ jsx2("span", {})
        ] }),
        p.filters.map((f, i) => {
          const edit = (patch) => save(event, {
            ...p,
            filters: p.filters.map(
              (item, j) => j === i ? { ...item, ...patch } : item
            )
          });
          return /* @__PURE__ */ jsxs2("div", { className: "filter", children: [
            /* @__PURE__ */ jsxs2(
              Select,
              {
                "aria-label": "\u5B57\u6BB5\u8DEF\u5F84",
                value: f.field,
                onChange: (e) => edit({ field: e.target.value, source: "payload" }),
                children: [
                  /* @__PURE__ */ jsx2("option", { value: "", children: "\u8BF7\u9009\u62E9\u5B57\u6BB5" }),
                  f.field && !(endpoint.eventReceivers?.[event]?.fields || []).some((row) => row.name === f.field) && /* @__PURE__ */ jsxs2("option", { value: f.field, disabled: true, children: [
                    f.field,
                    "\uFF08\u672A\u6620\u5C04\uFF09"
                  ] }),
                  [...new Set((endpoint.eventReceivers?.[event]?.fields || []).map((row) => row.name).filter(Boolean))].map((name) => /* @__PURE__ */ jsx2("option", { value: name, children: name }, name))
                ]
              }
            ),
            /* @__PURE__ */ jsxs2(
              Select,
              {
                "aria-label": "\u6BD4\u8F83\u65B9\u5F0F",
                value: f.op || "",
                onChange: (e) => edit({ op: e.target.value, ...e.target.value === "exists" ? { value: "" } : {} }),
                children: [
                  /* @__PURE__ */ jsx2("option", { value: "", children: "\u8BF7\u9009\u62E9\u6BD4\u8F83\u65B9\u5F0F" }),
                  [
                    ["equals", "\u7B49\u4E8E"],
                    ["not_equals", "\u4E0D\u7B49\u4E8E"],
                    ["contains", "\u5305\u542B"],
                    ["starts_with", "\u5F00\u5934\u662F"],
                    ["ends_with", "\u7ED3\u5C3E\u662F"],
                    ["regex", "\u6B63\u5219\u5339\u914D"],
                    ["exists", "\u5B58\u5728"]
                  ].map(([v, l]) => /* @__PURE__ */ jsx2("option", { value: v, children: l }, v))
                ]
              }
            ),
            /* @__PURE__ */ jsx2(
              "input",
              {
                "aria-label": "\u6BD4\u8F83\u503C",
                value: f.value,
                disabled: f.op === "exists",
                maxLength: 512,
                onChange: (e) => edit({ value: e.target.value })
              }
            ),
            /* @__PURE__ */ jsx2(
              Button,
              {
                type: "button",
                onClick: () => save(event, {
                  ...p,
                  filters: p.filters.filter((_, j) => j !== i)
                }),
                children: "\xD7"
              }
            )
          ] }, i);
        }),
        /* @__PURE__ */ jsx2(
          Button,
          {
            type: "button",
            disabled: p.filters.length >= 20,
            onClick: () => save(event, {
              ...p,
              filters: [
                ...p.filters,
                { source: "payload", field: "", op: "", value: "", admission: "" }
              ]
            }),
            children: "\u6DFB\u52A0\u6761\u4EF6"
          }
        )
      ] }, event);
    })
  ] });
}
function endpointBots(bots, endpoint) {
  return (Array.isArray(bots) ? bots : []).filter(
    (b) => b.id.startsWith(endpoint + ":")
  );
}
function replaceEndpointBots(bots, endpoint, rows) {
  return [
    ...(Array.isArray(bots) ? bots : []).filter(
      (b) => !b.id.startsWith(endpoint + ":")
    ),
    ...rows
  ];
}
function WebhookSenders() {
  return null;
}
function ReceiveRules({ endpoint, onChange }) {
  const p = endpoint.receivePolicy || { mode: "and", filters: [] };
  const save = (policy) => onChange({ receivePolicy: { ...policy, mode: "and" } });
  return /* @__PURE__ */ jsxs2("section", { className: "events wb-receive-rules", children: [
    /* @__PURE__ */ jsxs2("div", { className: "wb-section-heading", children: [
      /* @__PURE__ */ jsx2("strong", { children: "\u63A5\u6536\u6761\u4EF6" }),
      /* @__PURE__ */ jsx2(
        Button,
        {
          type: "button",
          disabled: p.filters.length >= 20,
          onClick: () => save({
            ...p,
            filters: [
              ...p.filters,
              { source: "payload", field: "", op: "equals", value: "" }
            ]
          }),
          children: "+ \u6DFB\u52A0\u6761\u4EF6"
        }
      )
    ] }),
    p.filters.length > 0 && /* @__PURE__ */ jsxs2("div", { className: "filter wb-filter-labels", children: [
      /* @__PURE__ */ jsx2("span", { children: "\u6570\u636E\u6765\u6E90" }),
      /* @__PURE__ */ jsx2("span", { children: "JSON \u8868\u8FBE\u5F0F" }),
      /* @__PURE__ */ jsx2("span", { children: "\u6BD4\u8F83\u65B9\u5F0F" }),
      /* @__PURE__ */ jsx2("span", { children: "\u5339\u914D\u503C" }),
      /* @__PURE__ */ jsx2("span", {})
    ] }),
    p.filters.map((f, i) => {
      const edit = (patch) => save({
        ...p,
        filters: p.filters.map(
          (item, j) => j === i ? { ...item, ...patch } : item
        )
      });
      return /* @__PURE__ */ jsxs2("div", { className: "filter", children: [
        /* @__PURE__ */ jsx2(
          Select,
          {
            "aria-label": "\u53D6\u503C\u4F4D\u7F6E",
            value: f.source,
            onChange: (e) => edit({ source: e.target.value }),
            children: [
              ["payload", "JSON \u6B63\u6587"],
              ["header", "\u8BF7\u6C42\u5934"],
              ["url", "\u67E5\u8BE2\u53C2\u6570"]
            ].map(([s, label]) => /* @__PURE__ */ jsx2("option", { value: s, children: label }, s))
          }
        ),
        /* @__PURE__ */ jsx2(
          "input",
          {
            "aria-label": "JSON \u8868\u8FBE\u5F0F",
            placeholder: "\u4F8B\u5982\uFF1A$.data.message \u6216 $.items[0].id",
            value: f.field,
            maxLength: 128,
            required: true,
            onChange: (e) => edit({ field: e.target.value })
          }
        ),
        /* @__PURE__ */ jsx2(
          Select,
          {
            "aria-label": "\u6BD4\u8F83\u65B9\u5F0F",
            value: f.op,
            onChange: (e) => edit({ op: e.target.value, ...e.target.value === "exists" ? { value: "" } : {} }),
            children: [
              ["equals", "\u7B49\u4E8E"],
              ["not_equals", "\u4E0D\u7B49\u4E8E"],
              ["contains", "\u5305\u542B"],
              ["starts_with", "\u5F00\u5934\u662F"],
              ["ends_with", "\u7ED3\u5C3E\u662F"],
              ["regex", "\u6B63\u5219\u5339\u914D"],
              ["exists", "\u5B58\u5728"]
            ].map(([v, l]) => /* @__PURE__ */ jsx2("option", { value: v, children: l }, v))
          }
        ),
        /* @__PURE__ */ jsx2(
          "input",
          {
            "aria-label": "\u6BD4\u8F83\u503C",
            value: f.value,
            disabled: f.op === "exists",
            maxLength: 512,
            onChange: (e) => edit({ value: e.target.value })
          }
        ),
        /* @__PURE__ */ jsx2(
          Button,
          {
            type: "button",
            onClick: () => save({
              ...p,
              filters: p.filters.filter((_, j) => j !== i)
            }),
            children: "\xD7"
          }
        )
      ] }, i);
    })
  ] });
}
function EventReceiverConfig({ value: e, onChange }) {
  return /* @__PURE__ */ jsx2("div", { className: "wb-receive-details", children: /* @__PURE__ */ jsxs2("div", { className: "events wb-receive-body", children: [
    /* @__PURE__ */ jsx2(ReceiveRules, { endpoint: e, onChange }),
    /* @__PURE__ */ jsx2(JsonFields, { value: e.fields, onChange: (fields) => onChange({ fields, inputMode: fields.length ? "custom" : e.inputMode }) })
  ] }) });
}
var fieldTypes = ["string", "integer", "boolean", "array", "object", "number", "null", "any"];
function JsonFields({ value = [], onChange }) {
  const edit = (i, patch) => onChange(value.map((row, j) => j === i ? { ...row, ...patch } : row));
  return /* @__PURE__ */ jsxs2("section", { className: "events", children: [
    /* @__PURE__ */ jsxs2("div", { className: "wb-section-heading", children: [
      /* @__PURE__ */ jsx2("strong", { children: "JSON \u5B57\u6BB5\u6620\u5C04" }),
      /* @__PURE__ */ jsx2(Button, { type: "button", disabled: value.length >= 100, onClick: () => onChange([...value, { name: "", type: "string", expression: "" }]), children: "+ \u6DFB\u52A0\u5B57\u6BB5" })
    ] }),
    /* @__PURE__ */ jsxs2("div", { style: { display: "grid", gridTemplateColumns: "minmax(100px,1fr) 110px minmax(140px,2fr) 40px", gap: 8 }, children: [
      /* @__PURE__ */ jsx2("small", { children: "\u5B57\u6BB5\u540D" }),
      /* @__PURE__ */ jsx2("small", { children: "\u6570\u636E\u7C7B\u578B" }),
      /* @__PURE__ */ jsx2("small", { children: "JSON \u8868\u8FBE\u5F0F" }),
      /* @__PURE__ */ jsx2("span", {}),
      value.map((row, i) => /* @__PURE__ */ jsxs2(React2.Fragment, { children: [
        /* @__PURE__ */ jsx2(Field, { "aria-label": "\u6620\u5C04\u5B57\u6BB5\u540D", value: row.name, required: true, placeholder: "\u4F8B\u5982\uFF1Atext \u6216 payload.path", onChange: (ev) => edit(i, { name: ev.target.value }) }),
        /* @__PURE__ */ jsx2(Select, { "aria-label": "\u6620\u5C04\u6570\u636E\u7C7B\u578B", value: row.type, onChange: (ev) => edit(i, { type: ev.target.value }), children: fieldTypes.map((t) => /* @__PURE__ */ jsx2("option", { value: t, children: t }, t)) }),
        /* @__PURE__ */ jsx2(Field, { "aria-label": "JSON \u8868\u8FBE\u5F0F", value: row.expression, required: true, placeholder: "\u4F8B\u5982\uFF1A$.data.message", onChange: (ev) => edit(i, { expression: ev.target.value }) }),
        /* @__PURE__ */ jsx2(Button, { type: "button", "aria-label": "\u5220\u9664\u6620\u5C04\u5B57\u6BB5", onClick: () => onChange(value.filter((_, j) => j !== i)), children: "\xD7" })
      ] }, i))
    ] })
  ] });
}
export {
  Shell,
  SourceEditor,
  WebhookPolicies,
  WebhookSenders,
  WebhookSourcePanel,
  WebhookSources,
  WebhookToolbar,
  WebhookToolbarProvider,
  createSource,
  endpointBots,
  replaceEndpointBots
};
//# sourceMappingURL=ui.js.map
