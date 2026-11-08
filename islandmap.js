// Who is who in the 9S games, and the list of lessons and games (read from the games page itself,
// so a new lesson shows up everywhere as soon as the new games page is uploaded).
export const BY_ID = { "18-00058": "ali", "15-00003": "abood", "16-00107": "saud" };
const BY_NAME = { ali: "ali", abdulla: "abood", abdullah: "abood", abood: "abood", saud: "saud" };
export const playerOf = st => st ? (BY_ID[String(st.enrollment || "").trim()] || BY_NAME[String(st.name || "").trim().split(/\s+/)[0].toLowerCase()] || "") : "";

let cat = null;
export async function catalog() {
  if (cat) return cat;
  const t = await (await fetch("island9s.html", { cache: "no-cache" })).text();
  const q = "'((?:[^'\\\\]|\\\\.)*)'", un = s => s.replace(/\\(.)/g, "$1");
  const players = [...t.matchAll(new RegExp(`\\{ id: '(\\w+)', name: ${q}, group: '(\\w+)' \\}`, "g"))].map(m => ({ id: m[1], name: un(m[2]), group: m[3] }));
  const lessons = [...t.matchAll(new RegExp(`\\{ id: '([\\w-]+)', group: '(\\w+)', title: ${q}, date: ${q}`, "g"))].map(m => ({ id: m[1], group: m[2], title: un(m[3]), date: un(m[4]) }));
  const games = [...t.matchAll(new RegExp(`id: '([\\w-]+)', sec: '([\\w-]+)', title: ${q}, desc: ${q}`, "g"))].map(m => ({ id: m[1], sec: m[2], title: un(m[3]), desc: un(m[4]) }));
  return (cat = { players, lessons, games });
}
