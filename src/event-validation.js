export function eventConfigurationError(event, receiver) {
  const filters = receiver?.receivePolicy?.filters || [];
  const fields = receiver?.fields || [];
  if (!filters.length || filters.some(f => !f.field?.trim() || !f.op || (f.op !== 'exists' && !f.value?.trim())))
    return `事件“${event}”必须配置至少一条完整的接收条件`;
  if (!fields.length || fields.some(f => !f.name?.trim() || !f.type || !f.expression?.trim()))
    return `事件“${event}”必须配置至少一条完整的 JSON 字段映射`;
  return '';
}
export function validateEnabledEvents(endpoint) {
  const events = endpoint.eventsMode === 'all' ? [...new Set([...(endpoint.events || []), ...(endpoint.eventTypes || [])])] : endpoint.events || [];
  for (const event of events) {
    const error = eventConfigurationError(event, endpoint.eventReceivers?.[event]);
    if (error) throw Error(error);
  }
}
