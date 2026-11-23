import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
for (const dir of ["src", "scripts"])
  for (const f of readdirSync(dir))
    if (/\.(m?js)$/.test(f)) {
      const r = spawnSync(process.execPath, ["--check", `${dir}/${f}`], {
        stdio: "inherit",
      });
      if (r.status) process.exit(r.status);
    }
console.log("All JavaScript files passed syntax checks");
