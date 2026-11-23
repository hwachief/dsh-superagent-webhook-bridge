import { build } from "esbuild";
await build({
  entryPoints: ["src/ui.jsx"],
  outfile: "lib/ui.js",
  bundle: true,
  format: "esm",
  platform: "browser",
  external: ["react", "react-dom"],
  jsx: "automatic",
  sourcemap: true,
});
