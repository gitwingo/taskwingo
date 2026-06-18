# Taskwingo v2.0.0

A major stability and polish release. Every change below traces back to a real bug report or feature request — nothing speculative.

## 🐛 Fixed

**Reminders & deadlines**
- Reminders are now checked centrally across **all profiles**, not just whichever one happens to be selected — switching profiles no longer silently stops reminders for the others
- Fixed reminders firing up to a minute *early* due to how the check window was calculated
- Fixed deadline dates silently shifting back one day depending on your timezone
- The "overdue" badge no longer shows on tasks you've already marked done
- Windows notifications now correctly show **"Taskwingo"** instead of the generic `electron.app.Electron`

**Task panels & editing**
- The task detail panel and edit panel no longer close themselves if you select text and your cursor drifts outside the panel while still holding the mouse button
- Cancelling an edit no longer silently keeps changes you were trying to discard
- Numbered and bulleted lists in task notes no longer spill outside their container

**UI bugs**
- The task ⋮ menu no longer renders behind the next task card, or behind the Windows taskbar, when there isn't room below it — it now flips upward automatically
- Fixed a CSS stacking-context bug where the ⋮ menu on **completed** tasks rendered at the wrong opacity and behind sibling cards
- Native date/time picker fields no longer show a confusing blue text-selection highlight underneath the custom date-format display

**Export & settings**
- CSV, JSON, and HTML report export now actually save the file — previously only the full profile bundle export worked, due to a silent key-naming mismatch
- Settings (theme, date format, auto-lock) are now genuinely **per-profile** — previously they were shared globally and silently applied to every profile regardless of which one you had selected
- The app now remembers and reopens on whichever profile you were last using, instead of always defaulting to the first one
- Removed the redundant "Save Profile Settings" button — every setting now saves the instant you change it (and a real bug where accent color wasn't being saved at all without it is now fixed too)

**Security & dev tools**
- `Ctrl+Shift+I` (DevTools) is now blocked in every mode, including `npm run dev` — previously the block only applied to production builds
- Removed Electron's default application menu, closing a second route to DevTools via the View menu

## ✨ Added

- **Strikethrough** formatting and **clickable links** in rich text task notes
- **Archive** — move tasks out of the main list without deleting them, restore anytime from the new Archive view
- **Drag-to-reorder subtasks**, with inline double-click renaming
- Click any priority badge to instantly cycle Urgent → High → Medium → Low
- **In-app zoom controls** in the title bar (`−` / `%` / `+`), plus working `Ctrl +` / `Ctrl -` / `Ctrl 0` shortcuts — zoom is clamped between 50–200% so it's no longer possible to get stuck zoomed out with no way back
- A **date format** picker — choose between `Month D, Year`, ISO `YYYY-MM-DD`, `DD/MM/YYYY`, or `MM/DD/YYYY`, per profile
- Automatic check for new releases on GitHub on launch, with a native notification and in-app banner — this never auto-installs anything, it just lets you know, which can be disabled in settings
- A toggleable **"keep running in the background"** setting in Settings → Window Behavior, replacing a previously fixed, undocumented tray behavior

## 🔧 Other

- Self-hosted the app's font instead of loading it from Google Fonts on every launch — Taskwingo now makes zero outbound network calls except the optional GitHub release check above
- Relocated Chromium's internal disk cache off the same path as app data, on Electron's own recommendation
- Various small fixes: a duplicate-key build warning and broken image imports in the About screen

---

**Full Changelog**: https://github.com/gitwingo/taskwingo/compare/v1.0.0...v2.0.0
