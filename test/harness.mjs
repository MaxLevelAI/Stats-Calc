// Tiny zero-dependency test harness. `node test/run.mjs`

const results = [];

export function t(label, got, want) {
  const ok = String(got) === String(want);
  results.push({ label, got, want, ok });
}

export function group(name) {
  results.push({ group: name });
}

export function report() {
  let pass = 0;
  let fail = 0;
  for (const r of results) {
    if (r.group) { console.log(`\n── ${r.group}`); continue; }
    if (r.ok) { pass += 1; continue; }
    fail += 1;
    console.log(`  FAIL  ${r.label}`);
    console.log(`        got  ${r.got}`);
    console.log(`        want ${r.want}`);
  }
  console.log(`\n${pass}/${pass + fail} passed${fail ? `, ${fail} FAILED` : ''}`);
  return fail;
}
