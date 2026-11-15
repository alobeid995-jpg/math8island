# Save and Submit for classwork

Every new classwork page gets two buttons at the bottom: **Save my work** (a checkpoint) and **Submit** (finished).

* **Save**: the student's work so far is kept. He can close the page and carry on later, here or at home.
* **Submit**: the work is kept for good, the page becomes view only, and the worksheet is marked as done for the teacher.
  The student can open it again at any time and see his own solved worksheet (nothing to redo).
* A teacher who opens the page sees no bar.

## How it works
`cwkeep.js` is the bar. The page that holds the classwork (for example `graphpkg.html`) owns the database.
Saved work is stored as a `plays` document (`g = <worksheet>-cw`, field `cw` = the saved state as JSON, `sub: 1` when submitted).
A copy is also kept on the device, so Save still works if the online save is refused.
A teacher's "let him do it again" (retake) hides the old saved work.

## Using it in a new page
```html
<script src="cwkeep.js"></script>
<script>
CWKeep.init({
  id: "g42-ws",                       // the id the package page listens for
  getState: () => ({ ... }),          // everything the student did (plain JSON)
  setState: (state, submitted) => {}, // put it back
  isComplete: () => true,             // optional
  summary: () => "1 of 2 finished",   // optional
  onLock: (at) => {}                  // optional: make the page view only
});
</script>
```
and in the package page add the same `message` branch that `graphpkg.html` has (`hello`, `save`, `submit`).
