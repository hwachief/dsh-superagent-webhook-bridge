#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "node:fs";
import { resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = resolve(process.argv[2] || process.env.DSH_SUPERAGENT_ROOT || ".");
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
if (manifest.name !== "dsh-superagent" || !manifest.scripts?.build)
  throw Error(
    "Specify the running dsh-superagent source directory: install-host.mjs <host-root>",
  );
const names = ["settings-kit.tsx", "source.tsx", "eval.tsx", "settings.tsx"];
for (const name of names)
  if (!existsSync(join(root, "src/client", name)))
    throw Error("Missing host source: " + name);
const files = [
  ...names.flatMap((name) => [name, name + ".webhook-bridge.bak"]),
  "webhook-bridge-ui.js",
  "webhook-bridge-ui.d.ts",
];
const backendFiles = ["src/policy.ts", "src/core/evals.ts", "src/app/views/records.ts", "src/client/rows.tsx"];
const backendSnapshot = backendFiles.flatMap(name => [name, name + ".webhook-flow.bak"]).map(name => ({path:join(root,name),content:existsSync(join(root,name)) ? readFileSync(join(root,name)) : null}));
const snapshot = files.map((name) => {
  const path = join(root, "src/client", name);
  return { path, content: existsSync(path) ? readFileSync(path) : null };
});
function run(command, args) {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
  if (result.error || result.status !== 0)
    throw result.error || Error(command + " failed: " + result.status);
}
try {
  run(process.execPath, [
    fileURLToPath(new URL("./integrate-ui.mjs", import.meta.url)),
    root,
  ]);
  run(process.execPath, [
    fileURLToPath(new URL("./integrate-flow.mjs", import.meta.url)),
    root,
  ]);
  if (process.env.npm_execpath) {
    run(process.execPath, [process.env.npm_execpath, "run", "build"]);
  } else {
    const { createRequire } = await import("node:module");
    const req = createRequire(join(root, "package.json"));
    const pkg = req.resolve("tsdown/package.json");
    const meta = JSON.parse(readFileSync(pkg, "utf8"));
    const bin = typeof meta.bin === "string" ? meta.bin : meta.bin.tsdown;
    run(process.execPath, [resolve(pkg, "..", bin)]);
  }
  if (!existsSync(join(root, "lib/client.js")))
    throw Error("Host build did not produce lib/client.js");
  console.log(
    "Frontend integrated and host build completed. Restart the running host service and refresh the browser. Backend plugin must also be installed in the target DSH profile.",
  );
} catch (error) {
  for (const { path, content } of [...snapshot, ...backendSnapshot]) {
    if (content !== null) writeFileSync(path, content);
    else if (existsSync(path)) unlinkSync(path);
  }
  throw error;
}
