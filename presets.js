// Ready-made question sets, built into the site. Live quiz and Coconut Crack can use them straight away.
// Each question: [text, A, B, C, D, correct letter]
const R = (title, rows) => ({ title, qs: rows.map(([q, a, b, c, d, k]) => ({ q, o: [a, b, c, d], c: "ABCD".indexOf(k), t: null })) });
export const PRESETS = [
  R("4.2 Substitution method (10 quick questions)", [
    ["y = x + 2 and 2x + y = 11. Put y = x + 2 into 2x + y = 11, then find x.", "2", "3", "4", "5", "B"],
    ["x = 3y and x + y = 12. Find y.", "2", "4", "3", "6", "C"],
    ["y = 2x − 1 and 3x + y = 14. Find x.", "3", "2", "4", "5", "A"],
    ["y = 5 − x and 2x + y = 8. Find y.", "1", "3", "5", "2", "D"],
    ["Put y = 4x into 3x + 2y = 22. Which equation do you get?", "3x + 8x = 22", "3x + 4x = 22", "3x + 2x = 22", "3x + 2(4) = 22", "A"],
    ["x = y − 1 and 2x + 3y = 13. Find x.", "3", "1", "2", "4", "C"],
    ["y = 3x and y − x = 10. Find y.", "5", "10", "15", "20", "C"],
    ["x + y = 10 and y = x + 4. Find x.", "7", "3", "6", "4", "B"],
    ["2x + y = 7 and y = x + 1. Find y.", "2", "4", "5", "3", "D"],
    ["y = 2x and y = x + 6. Both are equal to y, so 2x = x + 6. Find x.", "3", "6", "12", "2", "B"],
  ]),
];
export const toTsv = p => "Question\tA\tB\tC\tD\tCorrect\n" + p.qs.map(x => [x.q, ...x.o, "ABCD"[x.c]].join("\t")).join("\n");
