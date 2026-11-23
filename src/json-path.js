const forbidden = new Set(['__proto__','prototype','constructor']);
export function extract(root, expression) {
  const path = expression.trim().replace(/^\$\.?/, '').replace(/\[(\d+|\*)\]/g, '.$1');
  if (!path) return root;
  const keys = path.split('.');
  if (keys.some(k => !k || forbidden.has(k))) throw Error('invalid_expression');
  let values = [root];
  for (const key of keys) values = values.flatMap(v => key === '*' ? (Array.isArray(v) ? v : []) : v !== null && typeof v === 'object' && Object.hasOwn(v,key) ? [v[key]] : []);
  return keys.includes('*') ? values : values[0];
}
