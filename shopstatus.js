// Shop opening times. The owner saves shop/status = { closed: bool, wins: [{ on, from:"08:00", to:"14:30", days:[0..6] }] }.
// The shop is shut when "closed" is on, or when the clock (Bahrain time) is inside an enabled window on one of its days.
export function shopClosedNow(st, now = Date.now()) {
  if (!st) return "";
  if (st.closed) return "manual";
  const d = new Date(now + 3 * 3600e3), day = d.getUTCDay(), mins = d.getUTCHours() * 60 + d.getUTCMinutes();
  const m = t => { const x = /^(\d{1,2}):(\d{2})$/.exec(String(t || "")); return x ? +x[1] * 60 + +x[2] : null; };
  for (const w of st.wins || []) {
    if (!w || !w.on || !(w.days || []).includes(day)) continue;
    const a = m(w.from), b = m(w.to); if (a === null || b === null) continue;
    if (a <= b ? (mins >= a && mins < b) : (mins >= a || mins < b)) return "schedule";
  }
  return "";
}
