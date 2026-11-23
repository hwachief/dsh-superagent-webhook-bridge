export function eventAdmission(policy) {
  if (policy && Object.hasOwn(policy,'admission')) return policy.admission || 'ignore';
  const actions = [...new Set((policy?.filters || []).map(f=>f.admission).filter(Boolean))];
  return actions.length === 1 ? actions[0] : 'ignore';
}
