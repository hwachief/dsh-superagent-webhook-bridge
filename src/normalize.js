import { pathValues, composeText } from "./text.js";
import { evaluatePolicy } from "./policy.js";
import { createHash } from "node:crypto";
import { EventSchema } from "./schema.js";
import { valueAt } from "./policy.js";
export function normalizeEvent(body, endpoint, context, raw) {
  if (endpoint.inputMode !== "custom") {
    const path = endpoint.mapping?.text;
    if (!path || path === "text") return EventSchema.parse(body);
    const text = composeText(body, path, context);
    return EventSchema.parse({
      ...body,
      text:
        typeof text === "object" && text !== null
          ? JSON.stringify(text)
          : text === undefined || text === null
            ? undefined
            : String(text),
    });
  }
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw Error("invalid_json_object");
  if (endpoint.fields?.length) {
    const output = {};
    for (const field of endpoint.fields) {
      const path = field.expression.trim().replace(/^\$\.?/, '');
      const values = path ? pathValues(body, path) : [body];
      const value = field.type === 'null' ? null : field.type === 'array' && path.includes('[*]') ? values : values[0];
      const valid = field.type === 'any' ? value !== undefined : field.type === 'null' ? true : field.type === 'integer' ? Number.isInteger(value) : field.type === 'array' ? Array.isArray(value) : field.type === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value) : typeof value === field.type;
      if (!valid) throw Error('invalid_field_type:' + field.name);
      const keys = field.name.split('.');
      if (keys.some(k => !k || ['__proto__','prototype','constructor'].includes(k))) throw Error('invalid_field_name');
      let target = output;
      for (const key of keys.slice(0,-1)) {
        if (!Object.hasOwn(target,key)) target[key] = {};
        if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) throw Error('conflicting_field_name');
        target = target[key];
      }
      target[keys.at(-1)] = value;
    }
    return EventSchema.parse({
      id: createHash('sha256').update(raw).digest('hex'),
      event: endpoint.mapping?.defaultEvent || 'webhook', sender: endpoint.id,
      text: JSON.stringify(body), payload: body, ...output,
    });
  }
  const mapping = endpoint.mapping || {};
  const read = (key) => {
    const path = mapping[key];
    if (!path) return undefined;
    const [source, ...parts] = path.split(".");
    const value = ["header", "url"].includes(source)
      ? valueAt(
          context[source],
          source === "header" ? parts.join(".").toLowerCase() : parts.join("."),
        )
      : valueAt(body, path);
    return value === undefined || value === null
      ? undefined
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  };
  return EventSchema.parse({
    id: createHash("sha256")
      .update(JSON.stringify([endpoint.id, mapping.defaultEvent || "webhook"]))
      .update(raw)
      .digest("hex"),
    event: read("event") || mapping.defaultEvent || "webhook",
    sender: endpoint.id,
    text: mapping.text?.trim()
      ? composeText(body, mapping.text, context)
      : JSON.stringify(body),
    payload: body,
  });
}

export function receiveEvent(body, endpoint, context, raw) {
  const configured = Object.entries(endpoint.eventReceivers || {}).filter(
    ([name]) => endpoint.eventsMode === "all" || endpoint.events.includes(name),
  );
  const custom = configured.filter(([, r]) => r.inputMode === "custom");
  const matches = custom.filter(([, r]) =>
    evaluatePolicy({ ...r.receivePolicy, mode: "and" }, context),
  );
  if (matches.length > 1)
    throw Object.assign(Error("ambiguous_event_rules"), { status: 400 });
  if (matches.length === 1) {
    const [name, receiver] = matches[0];
    return {
      ...normalizeEvent(
        body,
        {
          ...endpoint,
          ...receiver,
          mapping: { ...receiver.mapping, event: "", defaultEvent: name },
        },
        context,
        raw,
      ),
      event: name,
    };
  }
  if (body && typeof body.event === "string") {
    const receiver = endpoint.eventReceivers?.[body.event];
    if (receiver?.inputMode === "custom") return null;
    if (
      receiver &&
      !evaluatePolicy({ ...receiver.receivePolicy, mode: "and" }, context)
    )
      return null;
    if (receiver)
      return normalizeEvent(body, { ...endpoint, ...receiver }, context, raw);
  }
  if (custom.length && !EventSchema.safeParse(body).success) return null;
  if (!evaluatePolicy(endpoint.receivePolicy, context)) return null;
  return normalizeEvent(body, endpoint, context, raw);
}
