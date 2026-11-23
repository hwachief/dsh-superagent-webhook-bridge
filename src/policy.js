import { RE2 } from "re2-wasm";
import { extract } from "./json-path.js";
export function valueAt(payload, path) {
  return extract(payload, path);
}
export function evaluatePolicy(policy, context) {
  if (!policy?.filters?.length) return true;
  const values = policy.filters.map((f) => {
    const root = context[f.source];
    const v = valueAt(
      root,
      f.source === "header" ? f.field.toLowerCase() : f.field,
    );
    if (f.op === "exists") return v !== undefined && (!f.field.includes("[*]") || !Array.isArray(v) || v.length > 0);
    if (v === undefined || v === null) return false;
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    switch (f.op) {
      case "equals":
        return s === f.value;
      case "not_equals":
        return s !== f.value;
      case "contains":
        return s.includes(f.value);
      case "starts_with":
        return s.startsWith(f.value);
      case "ends_with":
        return s.endsWith(f.value);
      case "regex":
        return new RE2(f.value, "u").test(s);
      default:
        return false;
    }
  });
  return policy.mode === "or" ? values.some(Boolean) : values.every(Boolean);
}
export function evaluate(rules, endpoint, event, payload) {
  const rows = rules.filter(
    (r) => r.endpoint === endpoint && r.event === event,
  );
  return evaluatePolicy(
    {
      mode: rows[0]?.mode === "OR" ? "or" : "and",
      filters: rows.map((r) => ({
        source: "payload",
        field: r.field,
        op: r.operator,
        value: r.value,
      })),
    },
    { payload },
  );
}
