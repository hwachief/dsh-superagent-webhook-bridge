import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
const root = resolve(process.argv[2] || ".");
const marker = "// webhook mapped admission v1";
function patch(file, anchor, replacement) {
  const path = join(root, file);
  let s = readFileSync(path, "utf8");
  if (s.includes(marker)) return;
  if (!s.includes(anchor)) throw Error("Unsupported host: " + file);
  if (!existsSync(path + ".webhook-flow.bak"))
    writeFileSync(path + ".webhook-flow.bak", s);
  s = s.replace(anchor, replacement);
  writeFileSync(path, s);
}
patch(
  "src/policy.ts",
  "      if (!trigger.human) return machineGate(trigger)",
  `      ${marker}
      if (trigger.source === 'webhook' && trigger.meta.webhookMapped) {
        const scope = listened(sources, trigger.source, trigger.meta)
        if (!scope.listened) return {admissible:false,reason:'admission_ignored'}
        const action = trigger.meta.webhookAdmission
        if (action !== 'accept' && action !== 'candidate') return {admissible:false,reason:'admission_ignored'}
        if (action === 'candidate' && mode === 'off') return {admissible:false,reason:'admission_ignored'}
        return {admissible:true,strength:action === 'accept' ? 'explicit' : 'inferred',basis:{source:'webhook',scope:trigger.meta,row:scope.row,via:'listed',...(action === 'candidate' ? {observation:{mode}} : {})}}
      }
      if (!trigger.human) return machineGate(trigger)`,
);
// This branch only consumes metadata constructed by the authenticated webhook adapter, never raw input metadata.
const policyPath = join(root, "src/policy.ts");
let policy = readFileSync(policyPath, "utf8");
const revalidate = "      if (basis.via === 'followup')";
if (!policy.includes("// webhook mandate v1")) {
  if (!policy.includes(revalidate)) throw Error("Unsupported mandate host");
  policy = policy.replace(
    revalidate,
    `      // webhook mandate v1
      if (source === 'webhook' && basis.scope?.webhookMapped) return !!current?.listened && (basis.scope.webhookAdmission === 'accept' || (basis.scope.webhookAdmission === 'candidate' && mode === 'auto' && rulesOn(basis.rules)))
` + revalidate,
  );
  writeFileSync(policyPath, policy);
}
patch(
  "src/core/evals.ts",
  "    this.options.assessor.request(this.candidateOf(thread))",
  `    ${marker}
    if (strongest.trigger.source === 'webhook' && strongest.trigger.meta.webhookAdmission === 'accept' && strongest.trigger.meta.webhookMapped) {
      this.decide(strongest.trigger.id, {kind:'accept',title:'Webhook '+String(strongest.trigger.meta.event),scope:strongest.trigger.text,reason:'Configured webhook admission',name:'webhook-event',evalId})
      return
    }
    this.options.assessor.request(this.candidateOf(thread))`,
);
// Upgrade previously installed v1 adapters as well.
const evalPath = join(root, "src/core/evals.ts");
const evalSource = readFileSync(evalPath, "utf8");
const upgraded = evalSource.replace(
  "reason:'Configured webhook admission',evalId",
  "reason:'Configured webhook admission',name:'webhook-event',evalId",
);
if (upgraded !== evalSource) writeFileSync(evalPath, upgraded);
console.log("Webhook admission flow installed");

patch(
  "src/app/views/records.ts",
  "return trigger ? [preview(trigger.text)] : []",
  `return trigger ? [trigger.source === 'webhook' && trigger.meta.webhookMapped ? JSON.stringify(trigger.meta.webhookMapped) : preview(trigger.text)] : [] /* ${marker} */`,
);
patch(
  "src/client/rows.tsx",
  '<div className="dt-row-quote dt-line">{preview}</div>',
  `<div className="dt-row-quote" style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{preview}</div>{/* ${marker} */}`,
);

const rowsPath = join(root, "src/client/rows.tsx");
const rowsSource = readFileSync(rowsPath, "utf8");
writeFileSync(
  rowsPath,
  rowsSource.replace(
    "const preview = readableMarkers(t, decision.preview)",
    "const preview = decision.preview.startsWith('{') ? decision.preview : readableMarkers(t, decision.preview)",
  ),
);
