import { eventAdmission } from "./event-admission.js";
import { validateEnabledEvents } from "./event-validation.js";
import { randomUUID } from "node:crypto";
import { evaluatePolicy } from "./policy.js";

import { extract } from "./json-path.js";
export { extract } from "./json-path.js";
const forbidden = new Set(["__proto__","prototype","constructor"]);
export function mapFields(input, fields = []) {
  const result = {};
  for (const {name,type,expression} of fields) {
    const keys = name.split('.');
    if (keys.some(k => !k || forbidden.has(k))) throw Error('invalid_field_name');
    const value = extract(input, expression);
    const valid = type === 'any' ? value !== undefined : type === 'null' ? value === null : type === 'integer' ? Number.isInteger(value) : type === 'number' ? typeof value === 'number' && Number.isFinite(value) : type === 'array' ? Array.isArray(value) : type === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value) : typeof value === type;
    if (!valid) throw Error('invalid_field_type:' + name);
    let target = result;
    for (const key of keys.slice(0,-1)) {
      if (!Object.hasOwn(target,key)) target[key] = {};
      if (!target[key] || typeof target[key] !== 'object' || Array.isArray(target[key])) throw Error('conflicting_field_name');
      target = target[key];
    }
    if (Object.hasOwn(target,keys.at(-1))) throw Error('duplicate_field_name');
    target[keys.at(-1)] = structuredClone(value);
  }
  return result;
}
// One action belongs to the event; all field conditions share the event's AND/OR mode.
export function decideAdmission(policy, mapped, names) {
  const action = eventAdmission(policy);
  if (!['ignore','accept','candidate'].includes(action)) return 'ignore';
  const rows = (policy?.filters || []).filter(f => f.field || f.op || f.value);
  if (!rows.length) return action;
  if (rows.some(f => !f.field || !f.op || !names.includes(f.field))) return 'ignore';
  return evaluatePolicy({mode:policy.mode,filters:rows.map(f=>({...f,source:'payload'}))},{payload:mapped}) ? action : 'ignore';
}
export function processRequest(input, endpoint, policies, context, raw) {
  validateEnabledEvents(endpoint);
  const matches = Object.entries(endpoint.eventReceivers || {}).filter(([event,r]) => endpoint.events.includes(event) && evaluatePolicy({...r.receivePolicy,mode:'and'},context));
  if (!matches.length) return {ignored:'receive_conditions'};
  if (matches.length > 1) throw Error('ambiguous_event_rules');
  const [event,receiver] = matches[0];
  const mapped = mapFields(input,receiver.fields);
  return {body:{id:randomUUID(),event,sender:endpoint.id,text:JSON.stringify(mapped),payload:mapped,mapped}};
}
