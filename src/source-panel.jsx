import { validateEnabledEvents } from "./event-validation.js";
import React, { useEffect, useState, createContext, useContext } from "react";
import { createSource, SourceEditor, Shell } from "./ui.jsx";

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const editable = (e) => ({ ...e, secret: "" });
const generatedKey = () => crypto.randomUUID().replaceAll("-", "");
const ToolbarContext = createContext(null);
export function WebhookToolbarProvider({ children }) {
  const [toolbar, setToolbar] = useState(null);
  return (
    <ToolbarContext.Provider value={{ toolbar, setToolbar }}>
      {children}
    </ToolbarContext.Provider>
  );
}
export function WebhookToolbar() {
  return useContext(ToolbarContext)?.toolbar ?? null;
}
export function WebhookSourcePanel({ source, call, reload, onPolicy }) {
  const [pending, setPending] = useState([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const toolbarContext = useContext(ToolbarContext);
  const endpoints = source?.value.config.endpoints ?? [];
  const latest = async () => {
    const settings = await call("GET settings");
    const row = settings.sources.find((s) => s.id === "webhook");
    if (!row?.installed) throw Error("Webhook 已关闭");
    return row;
  };
  const toggle = async (enabled) => {
    setBusy(true);
    setError("");
    try {
      const row = await latest();
      await call("PUT settings/:block", {
        block: "source:webhook",
        body: { revision: row.revision, value: { ...row.value, enabled } },
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
    const row = await latest(),
      items = row.value.config.endpoints ?? [];
    const before = saved && items.find((e) => e.id === saved.id);
    if (saved && !same(before, saved))
      throw Error("此来源已被其他操作修改，请重新载入后再保存。");
    const next = remove
      ? items.filter((e) => e.id !== saved.id)
      : saved
        ? items.map((e) =>
            e.id === saved.id
              ? { ...draft, secret: draft.secret || saved.secret }
              : e,
          )
        : [{ ...draft, secret: draft.secret || generatedKey() }, ...items];
    if (!remove && next.filter((e) => e.id === draft.id).length > 1)
      throw Error("入口 ID 已存在，请使用独立的 ID。");
    await call("PUT settings/:block", {
      block: "source:webhook",
      body: {
        revision: row.revision,
        value: {
          ...row.value,
          config: { ...row.value.config, endpoints: next },
        },
      },
    });
    await reload();
    if (!remove) {
      const refreshed = await latest();
      return refreshed.value.config.endpoints.find((e) => e.id === draft.id);
    }
  };
  const toolbar = (
    <span className="wb-source-toolbar">
      <button
        type="button"
        className="dt-btn dt-btn-outline dt-btn-sm"
        onClick={() =>
          setPending((v) => [
            {
              uid: crypto.randomUUID(),
              value: { ...createSource(), enabled: true },
            },
            ...v,
          ])
        }
      >
        + 添加webhook来源
      </button>
    </span>
  );
  useEffect(() => {
    toolbarContext?.setToolbar(source?.installed ? toolbar : null);
    return () => toolbarContext?.setToolbar(null);
  }, [source?.installed, source?.value.enabled, busy]);
  useEffect(() => {
    if (source?.installed && !source.value.enabled) void toggle(true);
  }, [source?.installed, source?.value.enabled]);
  if (!source?.installed) return null;
  return (
    <Shell>
      {error && <p role="alert">{error}</p>}
      <>
        {pending.map((e) => (
          <ManagedCard
            key={e.uid}
            initial={e.value}
            commit={commit}
            baseUrl={source.facts?.endpoints}
            onPolicy={onPolicy}
            onRemoveDraft={() =>
              setPending((v) => v.filter((item) => item.uid !== e.uid))
            }
          />
        ))}
        {endpoints.map((e) => (
          <ManagedCard
            key={e.id}
            saved={e}
            commit={commit}
            baseUrl={source.facts?.endpoints}
            onPolicy={onPolicy}
          />
        ))}
      </>
    </Shell>
  );
}
function ManagedCard({
  saved,
  initial,
  commit,
  baseUrl,
  onPolicy,
  onRemoveDraft,
}) {
  const [baseline, setBaseline] = useState(saved),
    [value, setValue] = useState(() => (saved ? editable(saved) : initial)),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
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
  return (
    <form className="wb-independent-form" onSubmit={save}>
      <fieldset disabled={busy}>
        <SourceEditor
          endpoint={value}
          error={error}
          saved={baseline}
          baseUrl={typeof baseUrl === "string" ? baseUrl : undefined}
          onPolicy={onPolicy}
          onChange={(patch) => setValue((v) => ({ ...v, ...patch }))}
          onDiscard={() =>
            baseline ? setValue(editable(baseline)) : onRemoveDraft()
          }
          onRemove={remove}
        />
      </fieldset>
    </form>
  );
}
