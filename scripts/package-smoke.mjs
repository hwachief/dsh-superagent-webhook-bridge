import { mkdtempSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
const metadata = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const dir = mkdtempSync(join(tmpdir(), "webhook-package-"));
try {
  writeFileSync(join(dir, "package.json"), '{"private":true,"type":"module"}');
  const npm = process.env.npm_execpath;
  if (!npm) throw new Error("Run this check using npm run test:package");
  const install = spawnSync(
    process.execPath,
    [
      npm,
      "install",
      "--omit=dev",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      resolve(`${metadata.name}-${metadata.version}.tgz`),
    ],
    { cwd: dir, encoding: "utf8" },
  );
  if (install.status) throw Error(install.stderr);
  const smoke = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `import { ConfigSchema, Config, webhookKind } from 'dsh-superagent-webhook-bridge'; if(ConfigSchema.parse({}).endpoints.length!==0||!Config||webhookKind.kind!=='webhook')throw Error('bad package'); console.log('Isolated production package import passed')`,
    ],
    { cwd: dir, encoding: "utf8" },
  );
  if (smoke.status) throw Error(smoke.stderr);
  console.log(smoke.stdout.trim());
} finally {
  rmSync(dir, { recursive: true, force: true });
}
