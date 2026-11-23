export function textPaths(spec) {
  return (spec || "")
    .split(/[,，;；\n]+/)
    .map((p) => p.trim())
    .filter(Boolean);
}
export function pathValues(root, path) {
  const normalized = path.replace(
    /\[(\d+|\*)?\]/g,
    (_, key) => "." + (key || "*"),
  );
  const keys = normalized.split(".");
  if (
    keys.some(
      (k) => !k || ["__proto__", "prototype", "constructor"].includes(k),
    )
  )
    return [];
  let values = [root];
  for (const key of keys) {
    values = values.flatMap((value) => {
      if (key === "*") return Array.isArray(value) ? value : [];
      return value !== null &&
        typeof value === "object" &&
        Object.hasOwn(value, key)
        ? [value[key]]
        : [];
    });
  }
  return values.filter((v) => v !== undefined && v !== null);
}
export function composeText(body, spec, context = {}) {
  if (spec.includes("{{")) {
    let found = false;
    const result = spec.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_, path) => {
      const text = composeText(body, path.trim(), context);
      if (text !== undefined) found = true;
      return text ?? "";
    });
    return found && result.trim() ? result : undefined;
  }
  const values = textPaths(spec).flatMap((path) => {
    const [source, ...parts] = path.split(".");
    return ["header", "url"].includes(source)
      ? pathValues(
          context[source],
          source === "header" ? parts.join(".").toLowerCase() : parts.join("."),
        )
      : pathValues(body, path);
  });
  const text = values
    .map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v)))
    .filter((v) => v.trim())
    .join("\n\n");
  return text || undefined;
}
