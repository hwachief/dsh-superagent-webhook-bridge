import { spawnSync } from "node:child_process";
const integration = spawnSync(process.execPath,["scripts/integrate-flow.mjs",".reference-superagent"],{stdio:"inherit"});
if (integration.status !== 0) throw Error("Host flow integration failed");
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
mkdirSync(".test-build", { recursive: true });
await build({
  stdin: {
    contents: `export { decisionView } from './.reference-superagent/src/app/views/records.ts'; export { Store } from './.reference-superagent/src/app/store.ts'; export { Engine } from './.reference-superagent/src/core/engine.ts'; export { SourceRegistry } from './.reference-superagent/src/sources/registry.ts'; export { SettingsSchema, settingsPolicy } from './.reference-superagent/src/policy.ts';`,
    resolveDir: process.cwd(),
  },
  outfile: ".reference-superagent/.bridge-test/host.js",
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
});
