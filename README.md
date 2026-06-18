<div align="center">

<img src="src/public/logo.ico" alt="Taskwingo Logo" width="80" height="80" />

# Taskwingo v2.0.0

**A clean, powerful personal task manager for desktop**

*Built with Electron · React · TypeScript · SQLite*

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows-blue)](https://github.com/gitwingo/taskwingo/releases)
[![Made by Gitwingo](https://img.shields.io/badge/made%20by-Gitwingo-6366f1)](https://github.com/gitwingo)

[Download](#installation) · [Features](#features) · [What's New](#whats-new-in-v200) · [Screenshots](#screenshots) · [Build from Source](#build-from-source) · [Support](#support)

</div>

<p align="center">
  <a href="https://github.com/gitwingo/taskwingo/releases/download/v2.0.0/taskwingo.Setup.2.0.0.exe">
    <img src="https://img.shields.io/badge/Download_Latest_for_Windows-007bff?style=for-the-badge&logo=windows&logoColor=white" alt="Download Button">
  </a>
</p>

---

# Screenshots

### Task List
<img src="./assets/screenshots/main-dark.png" width="840" alt="Task List Screen"/>

---

### Create New Task
<img src="./assets/screenshots/create-task.png" width="840" alt="Create New Task Screen"/>

---

### Task View
<img src="./assets/screenshots/task-view.png" width="840" alt="Task View Screen"/>

---

### Calendar View
<img src="./assets/screenshots/calendar-view.png" width="840" alt="Calendar View Screen"/>

---

### Themes
<img src="./assets/screenshots/themes.png" width="840" alt="Themes Selection Screen"/>

---

# Overview

Taskwingo is a fully offline, privacy-first desktop task manager. All your data stays on your machine — no accounts, no cloud, no subscriptions. It supports multiple profiles on a single PC, making it perfect for managing different identities, clients, or projects without mixing things up.

---

# Features

### Task Management
- Create, edit, delete, and reorder tasks with drag-and-drop
- Priority levels — **Urgent**, **High**, **Medium**, **Low** — with color indicators, clickable to cycle directly from the card or detail view
- Status tracking — **To Do**, **In Progress**, **Done** — toggle directly from the task card
- Deadlines with overdue and upcoming visual warnings (correctly suppressed once a task is marked done)
- Reminders with desktop notifications — checked centrally across **all profiles**, not just the one currently selected
- Recurring tasks — Daily, Weekdays, Weekly, Monthly
- Tags for flexible labeling and filtering
- Subtasks with progress tracking, inline rename, and drag-to-reorder
- Rich text notes — bold, italic, underline, strikethrough, bullet lists, numbered lists, headings, and clickable links
- File attachments — images, PDFs, videos, audio, Word docs, spreadsheets
- **Archive** — move completed or stale tasks out of the main list without deleting them, restore anytime

### Organization
- **Projects** — group tasks under color-coded projects
- **3 views** — List, Kanban board, Calendar
- **Filters** — filter by priority, status, project, search, and sort order
- **Export** — CSV, JSON, HTML report, or full profile bundle
- **Import** — import tasks from JSON

### Profiles
- Create multiple independent profiles on one PC
- Per-profile avatar, bio, and saved links
- Per-profile **theme** and **date format** — each profile keeps its own preference, no longer shared globally across every profile
- **PIN lock** per profile — set, change, or remove
- **Auto-lock** after configurable idle time
- Custom accent color per profile
- App remembers which profile you were last using and reopens on it automatically

### App
- **4 themes** — Dark, Light, Night, Summer — set independently per profile
- Custom accent color (11 choices)
- 4 date format options — `Month D, Year`, ISO `YYYY-MM-DD`, `DD/MM/YYYY`, `MM/DD/YYYY`
- Minimize to system tray on close (default; toggleable in Settings → Window Behavior if you'd rather the app fully quit)
- In-app zoom controls in the title bar, plus `Ctrl +`/`Ctrl -`/`Ctrl 0` shortcuts, clamped between 50–200% so it can never get stuck
- Checks GitHub Releases for new versions on launch and notifies you — never auto-installs, just tells you when something's available
- Window size and position remembered between sessions
- Fully offline — no internet required, no telemetry (the only outbound network call is the optional release-version check above)

---

# What's New in v2.0.0

This release is a major stability and polish pass — every item below started as a real bug report or a real feature request, not a speculative change.

**Fixed:**
- Reminders now fire at the correct time, never early, and are checked centrally across every profile instead of only whichever one happens to be selected
- Deadline dates no longer shift back a day depending on your timezone
- The task detail panel and edit panel no longer close themselves when you select text and your cursor drifts outside the panel while still holding the mouse button
- Cancelling an edit no longer silently keeps changes you tried to discard
- The right-click task menu no longer renders behind the next task card or behind the Windows taskbar when there isn't room below it
- The right-click menu and notes preview on completed (dimmed) tasks no longer render at the wrong opacity or behind sibling cards — a CSS stacking-context issue
- Numbered and bulleted lists in task notes no longer spill outside their container
- CSV, JSON, and HTML report export now actually write the file (previously only the full profile bundle export worked)
- The "electron.app.Electron" notification title now correctly reads "Taskwingo"
- Ctrl+Shift+I (DevTools) is now blocked in every mode, not just production builds
- The app no longer silently applies the wrong profile's settings — theme, date format, and auto-lock are now genuinely per-profile, matching how accent color already worked
- The app remembers and reopens on whichever profile you were last using, instead of always defaulting to the first one
- Removed the redundant "Save Profile Settings" button — every setting now saves the instant you change it

**Added:**
- Strikethrough formatting and clickable links in rich text notes
- Archive — move tasks out of the main list without deleting them, restore anytime from Archive view
- Drag-to-reorder subtasks, with inline renaming
- Click any priority badge to cycle through Urgent → High → Medium → Low
- In-app zoom controls (title bar buttons + keyboard shortcuts), clamped so it's never possible to get stuck zoomed out
- A date format picker — choose between `Month D, Year`, ISO `YYYY-MM-DD`, `DD/MM/YYYY`, or `MM/DD/YYYY`
- Automatic check for new releases on GitHub, with an in-app banner and notification — never auto-installs, just lets you know, which can be disabled in settings
- A toggleable "keep running in the background" setting, instead of a fixed, undocumented tray behavior

---

# Installation

### Download (recommended)

Go to [Releases](https://github.com/gitwingo/taskwingo/releases) and download the latest version for your platform:

| Platform | File |
|----------|------|
| Windows  | `taskwingo.Setup.x.x.x.exe` (installer) |

---

# Build from Source

### Prerequisites

- [Node.js 20 LTS](https://nodejs.org/) (v20.x recommended)
- npm 9+
- On Windows: [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022) with **"Desktop development with C++"** workload (required for `better-sqlite3`)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/gitwingo/taskwingo.git
cd taskwingo

# 2. Install dependencies
npm install

# 3. If better-sqlite3 fails on Windows, rebuild for Electron
npx @electron/rebuild -f -w better-sqlite3
```

### Development

```bash
npm run dev
```

### Build Installer

```bash
# Windows (.exe installer + portable)
npm run dist:win

# macOS (.dmg)
npm run dist:mac

# Linux (.AppImage + .deb)
npm run dist:linux
```

Output goes to the `dist/` folder.

---

# Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Electron 29 |
| UI | React 18 + TypeScript |
| Build | electron-vite + Vite 5 |
| Database | better-sqlite3 (SQLite, local) |
| State | Zustand |
| Styling | CSS Variables (4 themes) |
| Packaging | electron-builder |

---

# Data & Privacy

All data is stored locally on your machine:

| Type | Location (Windows) |
|------|-------------------|
| Database | `%APPDATA%\taskwingo\data\taskwingo.db` |
| Attachments | `%APPDATA%\taskwingo\attachments\` |
| Window state | `%APPDATA%\taskwingo\window-state.json` |
| App preferences (zoom level, background-running) | `%APPDATA%\taskwingo\app-prefs.json` |

No data is ever sent to any server. The app works fully offline.

---

# Project Structure

```
taskwingo/
├── electron/                  # Main process (Node.js)
│   ├── main.ts                # Window creation, tray, zoom, IPC setup
│   ├── preload.ts             # Secure contextBridge API
│   ├── ipc/                   # IPC handlers
│   │   ├── tasks.ts           # Task + subtask + project CRUD, archive
│   │   ├── profiles.ts        # Profile management
│   │   ├── files.ts           # File attachment handling
│   │   ├── auth.ts            # PIN lock
│   │   └── export.ts          # CSV / JSON / HTML / import
│   ├── reminders/              # Centralized cross-profile reminder checker
│   ├── update/                 # GitHub release version checker
│   └── db/                    # SQLite schema + migrations
├── src/                       # Renderer process (React)
│   ├── components/
│   │   ├── tasks/             # TaskList, TaskCard, TaskModal, ArchiveView, DateInput, Kanban, Calendar
│   │   ├── profiles/          # ProfileModal, ProfileAvatar, ProfileSwitcher
│   │   ├── auth/              # PinLock, PinManager
│   │   ├── settings/          # AppSettings, ThemePicker
│   │   ├── layout/            # TitleBar, Sidebar
│   │   └── about/             # AboutModal, UpdateBanner
│   ├── store/                 # Zustand global state
│   ├── types/                 # TypeScript types
│   ├── hooks/                 # Custom hooks (useProfileSettings, useTheme)
│   └── styles/                # CSS themes + global styles
└── public/                    # Static assets
```

---

# Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/your-feature`)
3. Commit your changes (`git commit -m 'Add your feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

---

# Support

If Taskwingo has been useful to you, consider supporting its development:

<a href="https://ko-fi.com/gitwingo">
  <img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Buy Me a Ko-Fi" />
</a>

---

# Connect

- GitHub: [@gitwingo](https://github.com/gitwingo)
- Reddit: [u/gitwingo](https://reddit.com/user/gitwingo)
- X / Twitter: [@gitwingo](https://x.com/gitwingo)

---

# License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <sub>Made with 💖 by <a href="https://github.com/gitwingo">Gitwingo</a></sub>
</div>
