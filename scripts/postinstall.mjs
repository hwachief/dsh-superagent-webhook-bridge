import { createRequire } from "node:module";
import { dirname, resolve, join } from "node:path";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
export function installFrontend() {
  const candidates = [
    process.env.DSH_SUPERAGENT_ROOT,
    process.env.INIT_CWD,
    process.cwd(),
    "/opt/superagent",
  ];
  try {
    candidates.unshift(
      dirname(
        createRequire(import.meta.url).resolve("dsh-superagent/package.json"),
      ),
    );
  } catch {}
  const root = candidates
    .filter(Boolean)
    .map((p) => resolve(p))
    .find((p) => {
      try {
        return (
          JSON.parse(readFileSync(join(p, "package.json"), "utf8")).name ===
            "dsh-superagent" &&
          existsSync(join(p, "src/client/settings-kit.tsx"))
        );
      } catch {
        return false;
      }
    });
  if (!root)
    throw Error(
      "Webhook frontend installation failed: cannot locate running Superagent source. Set DSH_SUPERAGENT_ROOT to its source directory. Backend-only installation is incomplete.",
    );
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("./install-host.mjs", import.meta.url)), root],
    { stdio: "inherit", env: process.env },
  );
  if (result.error || result.status !== 0)
    throw (
      result.error ||
      Error(
        "Webhook frontend installation/build failed. Do not deploy this installation.",
      )
    );
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  installFrontend();
