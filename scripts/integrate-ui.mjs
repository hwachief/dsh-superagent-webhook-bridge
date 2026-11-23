import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { resolve, join } from "node:path";
const root = resolve(process.argv[2] || "");
const marker = "// dsh-superagent-webhook-bridge UI adapter v2";
function replace(source, anchor, next) {
  if (!source.includes(anchor))
    throw Error("Unsupported host structure: " + anchor.slice(0, 70));
  return source.replace(anchor, next);
}
function settings(source) {
  const anchor =
      "  const label = localized(t, field.label), hint = localized(t, field.hint)",
    start = source.indexOf("export function SourceField(");
  if (start < 0) throw Error("Missing SourceField");
  return (
    "import { WebhookSources, WebhookPolicies } from './webhook-bridge-ui.js'\n" +
    marker +
    "\n" +
    source.slice(0, start) +
    replace(
      source.slice(start),
      anchor,
      anchor +
        "\n  const bridgeSettings = useSettings().settings\n  if (field.key === 'endpoints' && field.label.zh === 'Webhook 来源') return <WebhookSources value={value} saved={saved} onChange={onChange} />\n  if (field.key === 'eventPoliciesJson') return <WebhookPolicies value={value} onChange={onChange} endpoints={bridgeSettings.sources.find(source => source.id === 'webhook')?.value.config.endpoints as any[] ?? []} />",
    )
  );
}
function sources(source) {
  source = replace(
    source,
    "  const { sources } = useSettings().settings",
    "  const { sources } = useSettings().settings\n  const { call, navigate } = usePanel()\n  const { reload } = useSettings()",
  );
  source = replace(
    source,
    "{sources.map(source => <SourceCard key={source.id} source={source} />)}",
    "<WebhookSourcePanel source={sources.find(source => source.id === 'webhook')} call={call} reload={reload} onPolicy={() => navigate(settingsRoute('eval'))} />\n    {sources.filter(source => source.id !== 'webhook').map(source => <SourceCard key={source.id} source={source} />)}",
  );
  return (
    "import { WebhookSourcePanel } from './webhook-bridge-ui.js'\n" +
    marker +
    "\n" +
    source
  );
}
function evaluation(source) {
  // Preserve automatic sender authorization when saving event conditions.
  source = replace(
    source,
    "useBlockDraft('policy', blocks.policy.value, blocks.policy.revision)",
    "useBlockDraft('policy', blocks.policy.value, blocks.policy.revision, value => ({ ...value, sources: Object.fromEntries(Object.entries(value.sources).map(([id, part]) => [id, sources.find(source => source.id === id)?.kind === 'webhook' || id === 'webhook' ? { ...part, bots: (Array.isArray(part.bots) ? part.bots : []).filter((bot: any) => typeof bot.id === 'string' && bot.id.trim().length > 0), allowed: [], admission: {}, eventPoliciesJson: JSON.stringify(Object.fromEntries((sources.find(source => source.id === id)?.value.config.endpoints as any[] ?? []).map(endpoint => [endpoint.id, Object.fromEntries(Object.entries(JSON.parse(part.eventPoliciesJson as string || '{}')[endpoint.id] ?? {}).filter(([event]) => (endpoint.eventsMode === 'all' ? [...(endpoint.eventTypes ?? []), ...(endpoint.events ?? [])] : endpoint.events ?? []).includes(event)))]))) } : part])) }))",
  );
  source = replace(
    source,
    "  const parts = sources.filter(source => source.installed && source.policy)",
    "  const parts = sources.filter(source => source.installed && source.policy).flatMap<(typeof sources)[number] & { webhookEndpoint?: string }>(source => source.id === 'webhook' ? (source.value.enabled ? (source.value.config.endpoints as any[] ?? []).map(endpoint => ({ ...source, id: 'webhook:' + endpoint.id, webhookEndpoint: String(endpoint.id), title: { zh: endpoint.name || endpoint.id, en: endpoint.name || endpoint.id } })) : []) : [{ ...source, webhookEndpoint: undefined as string | undefined }])",
  );
  const anchor =
    "<SourcePart key={current.id} source={current} part={part(current.id)}";
  const start = source.indexOf(anchor);
  if (start < 0) throw Error("Missing per-source policy renderer");
  const end = source.indexOf(" />", start);
  if (end < 0) throw Error("Missing SourcePart terminator");
  source =
    source.slice(0, start) +
    "{current.webhookEndpoint ? <><WebhookSenders Icon={Icon} Input={Input} Button={Button} endpoint={current.webhookEndpoint} bots={part('webhook').bots as any[] ?? []} onChange={(bots: any[]) => edit({ sources: { ...policy.sources, webhook: { ...part('webhook'), allowed: [], admission: {}, bots } as typeof policy.sources[string] } })}/><WebhookPolicies value={part('webhook').eventPoliciesJson as string ?? '{}'} endpoints={sources.find(source => source.id === 'webhook')?.value.config.endpoints as any[] ?? []} endpointId={current.webhookEndpoint} hideTabs onChange={(value: string) => edit({ sources: { ...policy.sources, webhook: { ...part('webhook'), allowed: [], admission: {}, eventPoliciesJson: value } as typeof policy.sources[string] } })} /></> : " +
    source.slice(start, end + 3) +
    "}" +
    source.slice(end + 3);
  return (
    "import { WebhookPolicies, WebhookSenders } from './webhook-bridge-ui.js'\n" +
    marker +
    "\n" +
    source
  );
}
function page(source) {
  source = replace(
    source,
    'return <div className="dt-settings">',
    'return <WebhookToolbarProvider><div className="dt-settings">',
  );
  const heading =
    '<h2 className="dt-settings-title">{t(`settingsGroup.${group}`)}</h2>';
  source = replace(
    source,
    heading,
    heading.replace("</h2>", "<WebhookToolbar /></h2>"),
  );
  const end = source.lastIndexOf("</div>");
  if (end < 0) throw Error("Missing settings page root");
  source =
    source.slice(0, end) +
    "</div></WebhookToolbarProvider>" +
    source.slice(end + 6);
  return (
    "import { WebhookToolbarProvider, WebhookToolbar } from './webhook-bridge-ui.js'\n" +
    marker +
    "\n" +
    source
  );
}
const adapters = [
  ["settings-kit.tsx", settings],
  ["source.tsx", sources],
  ["eval.tsx", evaluation],
  ["settings.tsx", page],
].filter(([file]) => existsSync(join(root, "src/client", file)));
if (!adapters.some(([file]) => file === "settings-kit.tsx"))
  throw Error("Missing host settings renderer");
const assets = [
  ["webhook-bridge-ui.js", "../lib/ui.js"],
  ["webhook-bridge-ui.d.ts", "../lib/ui.d.ts"],
].map(([file, asset]) => ({
  path: join(root, "src/client", file),
  content: readFileSync(new URL(asset, import.meta.url), "utf8"),
}));
const removing = process.argv.includes("--remove");
const edits = adapters.map(([file, adapt]) => {
  const path = join(root, "src/client", file),
    backup = path + ".webhook-bridge.bak",
    current = readFileSync(path, "utf8");
  const original = existsSync(backup) ? readFileSync(backup, "utf8") : current;
  const modified = adapt(original);
  if (current !== original && current !== modified)
    throw Error("Host changed or older adapter installed: " + file);
  if (removing && current !== modified)
    throw Error("Adapter not installed: " + file);
  return { path, backup, original, modified };
});
for (const asset of assets)
  if (
    existsSync(asset.path) &&
    readFileSync(asset.path, "utf8") !== asset.content
  )
    throw Error(
      "Renderer differs; remove the previous version adapter before upgrading",
    );
if (removing) {
  for (const e of edits) writeFileSync(e.path, e.original);
  for (const asset of assets)
    if (existsSync(asset.path)) unlinkSync(asset.path);
  console.log("UI adapter removed; rebuild host client");
} else {
  for (const e of edits) {
    if (!existsSync(e.backup))
      writeFileSync(e.backup, e.original, { flag: "wx" });
    writeFileSync(e.path, e.modified);
  }
  for (const asset of assets) writeFileSync(asset.path, asset.content);
  console.log("UI adapter installed; rebuild host client");
}
