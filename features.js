// Every feature a teacher can have, in one list. The owner switches each one on or off per teacher
// (Developer -> Teachers -> Features). The owner always has everything.
//   def: true  = every teacher has it until the owner removes it from someone
//   def: false = only the owner has it until the owner gives it to someone
//   css: what to hide on the teacher page when the teacher does not have it
// Saved in shop/features as { <key>: { all: bool, uids: [teacher ids], deny: [teacher ids] } }.
export const CATS = [
  ["xp", "XP and behaviour", "Giving and taking XP"],
  ["card", "Student cards", "What each student's card shows"],
  ["class", "Class tools", "Quick tools for the lesson"],
  ["comm", "Reports and messages", "Emails, reports, certificates, chat"],
  ["comp", "Competitions and rewards", "Class Cup, Shop, Dashboard"],
  ["hub", "Teacher Hub", "Attendance, homework, marks, grades, seats"],
  ["work", "Classwork and lessons", "What students get to do"],
  ["admin", "Accounts and admin", "Logins, importing, progress"],
];
export const FEATURES = [
  // ---- XP and behaviour
  { key: "xp_quick", cat: "xp", def: true, label: "Quick XP buttons", what: "The positive and deduction buttons on a student card", css: [".item .quick"] },
  { key: "xp_custom", cat: "xp", def: true, label: "Custom XP box", what: "Type any amount of XP with a reason", css: [".item .cxp"] },
  { key: "xp_whole", cat: "xp", def: true, label: "Whole-class XP", what: "Give XP to everyone in the class at once", css: ["[data-act=wcOpen]"] },
  { key: "xp_undo", cat: "xp", def: true, label: "Undo last entry", what: "Take back the last XP entry", css: ["[data-act=undo]"] },
  { key: "xp_bully", cat: "xp", def: true, label: "Bullying report", what: "Move XP from the bully to the student who was bullied", css: [".item .ctls"] },
  { key: "xp_week", cat: "xp", def: true, label: "Clear weekly list", what: "Start a new week on the Students page", css: ["#weekWrap"] },
  { key: "xp_reset", cat: "xp", def: true, label: "Monthly XP reset", what: "Reset everyone's XP to zero", css: ["[data-feat~=xp_reset]"] },
  // ---- Student cards
  { key: "stu_levels", cat: "card", def: true, label: "Levels and progress bars", what: "Level, level bar and XP to the next level", css: [".item .lvrow", ".item .panel [data-feat~=stu_levels]"] },
  { key: "stu_badges", cat: "card", def: true, label: "Badges", what: "Badge icons and the badge board", css: [".item .bdgrow", ".item .bdgboard"] },
  { key: "stu_weekchip", cat: "card", def: true, label: "XP this week", what: "The small \"+N XP this week\" line", css: [".item .swk"] },
  { key: "stu_log", cat: "card", def: true, label: "This week's entries", what: "The list of entries for the week", css: [".item .log"] },
  { key: "stu_notes", cat: "card", def: true, label: "Private notes", what: "Notes only the teacher sees", css: [".item .notebox"] },
  { key: "stu_avatar", cat: "card", def: true, label: "Change avatar", what: "Pick a new avatar for a student", css: ["[data-act=avPick]", ".item .picker"] },
  { key: "stu_add", cat: "card", def: true, label: "Add students", what: "The add-student box, including pasting from Excel", css: [".toolbar .add"] },
  { key: "stu_name", cat: "card", def: true, label: "Edit a student's name", what: "", css: ["[data-act=nameEdit]", ".item .nmedit"] },
  { key: "stu_move", cat: "card", def: true, label: "Change a student's class", what: "", css: ["[data-act=moveAsk]"] },
  { key: "stu_remove", cat: "card", def: true, label: "Remove a student", what: "", css: ["[data-act=delAsk]"] },
  // ---- Class tools
  { key: "picker", cat: "class", def: true, label: "Random picker", what: "Pick a student at random for the board", css: ["[data-act=pkOpen]"] },
  { key: "timer", cat: "class", def: true, label: "Lesson timer", what: "Countdown timer with sound", css: ["[data-feat~=timer]"] },
  { key: "groups", cat: "class", def: true, label: "Group maker", what: "Shuffle the class into groups", css: ["[data-feat~=groups]"] },
  { key: "stats", cat: "class", def: true, label: "Class summary numbers", what: "Students, average XP, entries, top student", css: ["#statsSec"] },
  { key: "topstrip", cat: "class", def: true, label: "Student of the day and week", what: "The strip with the day and week stars", css: ["#topStrip"] },
  { key: "sort", cat: "class", def: true, label: "Sort students", what: "A to Z or highest XP", css: ["#sortBy"] },
  { key: "sound", cat: "class", def: true, label: "Sound setting", what: "Chime and voice on this device", css: ["#sndMode", "#soundGate"] },
  // ---- Reports and messages
  { key: "parent_email", cat: "comm", def: true, label: "Parent email", what: "Write the weekly email to a parent", css: ["[data-act=email]"] },
  { key: "student_report", cat: "comm", def: true, label: "Student report", what: "Report on one student", css: ["[data-act=report]"] },
  { key: "certificates", cat: "comm", def: true, label: "Certificates", what: "Print or post certificates", css: ["[data-act=cert]"] },
  { key: "chat", cat: "comm", def: true, label: "Chat", what: "Messages with students", css: ["#chDock", "#chPanel"] },
  // ---- Competitions and rewards
  { key: "cup", cat: "comp", def: true, label: "Class Cup", what: "Weekly points between classes", css: ["#vCup", "#cupView"] },
  { key: "shop", cat: "comp", def: true, label: "Shop", what: "Prices, perks and the student shop", css: ["#vShop", "#shopView", "[data-act=shopOpen]"] },
  { key: "dash", cat: "comp", def: true, label: "Dashboard", what: "The big-screen class dashboard", css: ["#vBoard", "#dashView"] },
  // ---- Teacher Hub
  { key: "hub", cat: "hub", def: true, label: "Teacher Hub (whole page)", what: "Turns off every part of the Hub", css: ["#vHub", "#hubView"] },
  { key: "hub_insights", cat: "hub", def: true, label: "Hub: Insights", what: "Who needs attention", css: [] },
  { key: "hub_att", cat: "hub", def: true, label: "Hub: Attendance", what: "", css: [] },
  { key: "hub_hw", cat: "hub", def: true, label: "Hub: Homework", what: "", css: [] },
  { key: "hub_marks", cat: "hub", def: true, label: "Hub: Marks", what: "Test marks", css: [] },
  { key: "hub_grades", cat: "hub", def: true, label: "Hub: Grades /10", what: "Participation, behaviour and classwork grades", css: [] },
  { key: "grades_xlsx", cat: "hub", def: true, label: "Grades Excel export", what: "Download the formatted grades file", css: ["[data-act=grXlsx]"] },
  { key: "hub_books", cat: "hub", def: true, label: "Hub: Notebooks", what: "", css: [] },
  { key: "hub_seats", cat: "hub", def: true, label: "Hub: Seat plan", what: "", css: [] },
  // ---- Classwork and lessons
  { key: "classwork", cat: "work", def: true, label: "Classwork", what: "Make and mark worksheets", css: ["#workBtn"] },
  { key: "material", cat: "work", def: true, label: "My material", what: "Lesson lists with links for students", css: ["#matBtn"] },
  { key: "announce", cat: "work", def: true, label: "Announcements", what: "Notices for students", css: ["#inboxBtn"] },
  { key: "livequiz", cat: "work", def: true, label: "Live quiz", what: "Quiz students answer on their phones", css: ["#liveBtn"] },
  { key: "funpark", cat: "work", def: false, label: "Fun Park", what: "Games students play after their work", css: ["#funBtn"] },
  { key: "coconut", cat: "work", def: false, label: "Coconut Crack", what: "The team question game", css: ["#ccBtn"] },
  { key: "liveworks", cat: "work", def: false, label: "Live worksheets", what: "Interactive worksheets started class by class", css: ["#lwBtn"] },
  { key: "mylessons", cat: "work", def: false, label: "My lessons", what: "Full-screen lessons", css: ["#mlBtn"] },
  { key: "ml_students", cat: "work", def: false, label: "Lessons: class panel", what: "Student names and quick XP inside a lesson", css: [".ml-stu", ".ml-p"] },
  { key: "ml_picker", cat: "work", def: false, label: "Lessons: random picker", what: "The floating picker inside a lesson", css: [".ml-wheel", ".ml-fw"] },
  // ---- Accounts and admin
  { key: "logins", cat: "admin", def: true, label: "Student logins", what: "Create logins and PINs", css: ["#loginsBtn"] },
  { key: "import", cat: "admin", def: true, label: "Import old data", what: "", css: ["#impBtn"] },
  { key: "progress", cat: "admin", def: true, label: "Students progress", what: "Progress in the games", css: ["#islandBtn"] },
  { key: "email_reset", cat: "admin", def: true, label: "My email and password reset", what: "", css: ["#emailBtn"] },
];
export const byKey = Object.fromEntries(FEATURES.map(f => [f.key, f]));
// Does this teacher have this feature?  d = the shop/features document (may be empty).
export function hasFeature(d, key, uid, admin) {
  if (admin) return true;
  const f = byKey[key]; if (!f) return true;
  const e = d && d[key];
  if (!e) return !!f.def;
  if (Array.isArray(e.deny) && e.deny.includes(uid)) return false;
  return e.all === true || (Array.isArray(e.uids) && e.uids.includes(uid));
}
// The CSS that hides every feature this teacher does not have.
export function hideCss(d, uid, admin) {
  return FEATURES.filter(f => !hasFeature(d, f.key, uid, admin)).flatMap(f => f.css || []).map(s => s + "{display:none!important}").join("\n");
}
