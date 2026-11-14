// Interactive worksheets (worked examples + worksheet pages) that the teacher starts class by class.
// To add one: put its .html file next to the others and add an entry here. A new entry stays hidden from students
// until the teacher presses "Start" for a class (Tools -> Live worksheets).
//   was:   classes that already had it before this list existed (visible by default until the teacher changes it)
//   parts: progress chips [play id suffix, label]; the "ws" part is the worksheet and marks it done
//   pages: several pages in one card, [file, label]; they show no progress ticks
//   noWs:  only the worked-example page exists so far (no worksheet yet)
//   xp:    key in the lesson XP record (only the older lessons have XP)
const D = "Go through the worked examples first. Then the short worksheet opens.";
const G = "Do the examples, play the games, then do the multiple choice worksheet.";
const EL = ["8B", "8Y", "8S", "8M", "8D"];
export const LIVE_WS = [
  { id: "graph42", title: "Graphing simultaneous equations", sub: "Exercise 4.2 · workbook class work", file: "graphpkg.html", desc: "Go through the two worked examples first. When you finish them, the worksheet opens." },
  { id: "sb42", title: "Substitution method: extra practice", sub: "Exercise 4.2 · new questions", file: "subst2.html", desc: "Put one equation into the other. Go through the examples first. Then the worksheet opens (6 to 8 minutes).", was: ["8Y", "8S", "8M", "8D"], xp: "sb42" },
  { id: "su42", title: "Simultaneous equations: substitution", sub: "Exercise 4.2 · Day 2", file: "subst.html", desc: "Go through the worked examples first. Then the short worksheet opens (5 to 7 minutes).", was: EL, xp: "su42" },
  { id: "el42", title: "Simultaneous equations: elimination", sub: "Exercise 4.2 · Day 1", file: "elim.html", desc: G, was: EL, xp: "el42", games: [["addsub", "Game 1"], ["solve", "Game 2"], ["spot", "Game 3"]] },
  { id: "eq41", title: "Exercise 4.1: Solving equations", sub: "Easy version", file: "eq41.html", desc: D, was: ["8G"], xp: "eq41" },
  { id: "ag34", title: "Lesson 3.4: Upper and lower bounds", sub: "Mon 9 Nov 2026", file: "ag34.html", desc: G, was: ["8G"], xp: "ag34", games: [["tap", "Game 1"], ["bound", "Game 2"], ["ineq", "Game 3"]] },
];
// Is this worksheet open for this class? Once the teacher has pressed Start/Stop, her saved choice wins; before that, "was" decides.
export const isLive = (w, open, cls) => (open && open[w.id] ? !!open[w.id][cls] : (w.was || []).includes(cls));
