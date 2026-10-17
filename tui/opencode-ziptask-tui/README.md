# opencode-ziptask-tui

OpenCode TUI plugin for browsing ziptask tasks.

A one-screen overview — what it does, how to configure it, the full binding tables — is in the
[documentation card](../../docs/opencode-ziptask-tui.md). This file stays the manual.

## Settings

The base URL is stored in OpenCode durable plugin storage
(`context.storage.store("ziptask")`) and seeded with the default from `src/config.ts`
(`http://127.0.0.1:3005`). Change it with the `Ziptask: settings` command; the current
value lives at
`~/.local/state/opencode/latest/tui/plugin.ziptask.tui.ziptask.json`.

It can also be pinned in `cli.json` via plugin options, which take priority over the store:

```jsonc
// ~/.config/opencode/cli.json
{
  "plugins": [
    {
      "package": "/absolute/path/to/opencode-plugins/tui/opencode-ziptask-tui",
      "options": { "baseUrl": "http://ziptask.local:3005" }
    }
  ]
}
```

Priority: `options` → durable store → default.

The project slug is **not** configured: it is derived from the current directory name, using the same
slug rule ziptask uses when a project is created from a folder path (lowercase, `[^a-z0-9._-]` → `-`,
leading non-alphanumerics stripped, truncated to 32). An example settings file is at
`config/settings.example.json`.

## Installation

### Local (development)

The loader for a local path (`cli.json` → `plugins: ["/path"]`) and for directory discovery
(`~/.config/opencode/plugins/<name>/`) looks for `index.ts` and `tui.ts`/`tui.tsx` in the
**root of the directory** and ignores `package.json` → `exports`. This package ships both root
entrypoints, so point `cli.json` straight at the directory:

```sh
git clone https://github.com/zumik3-del/opencode-plugins.git
cd opencode-plugins/tui/opencode-ziptask-tui
npm install
```

```jsonc
// ~/.config/opencode/cli.json
{ "plugins": ["/absolute/path/to/opencode-plugins/tui/opencode-ziptask-tui"] }
```

`npm install` (npm >= 7) installs the `@opentui/*` and `solid-js` peer dependencies — no manual
peer installation is needed.

Alternatively symlink the directory into the discovery folder:

```sh
ln -s /absolute/path/to/opencode-plugins/tui/opencode-ziptask-tui ~/.config/opencode/plugins/ziptask
```

Do **not** register the same plugin both in `cli.json` and in `~/.config/opencode/plugins/` —
that duplicates the plugin id.

### From npm (after publishing)

```sh
opencode plugin add opencode-ziptask-tui
```

Requires the package to be published to npm first (`npm publish` from the plugin directory).

## Commands

Three commands are registered in the global keymap layer, all in the `Ziptask` palette group. The
palette lists the first two under the same title, `Ziptask: tasks`, so they are told apart here by
their command ids and their entry points.

- `ziptask.dialog` (`Ziptask: tasks`, bound to `ctrl+down` or the palette) — toggle the centered
  Tasks dialog; `ctrl+down` again closes it.
- `ziptask.tasks` (`Ziptask: tasks`, the `/ziptask` slash command or the palette) — pick one of
  the open tasks (`queued`, `in_progress`, `review`) in the host's select dialog, then read it in
  a plain alert. With no open tasks it alerts `No active tasks` instead. Both are the host's own
  dialogs, so they are not sized like the task dialogs above.
- `ziptask.settings` (`Ziptask: settings`, palette) — prompt for the base URL, store it, then show
  the resolved project slug.

## UI

- A compact `tasks: N` counter (non-terminal tasks) is appended to `prompt.footer.status`,
  near the composer/subagent picker. It counts the five non-terminal statuses (`queued`,
  `in_progress`, `review`, `failed`, `blocked`) of the **active window's** project, and refetches
  on the configured interval, when a turn ends (`session.idle`), on a window or tab switch, whenever
  the resolved project or base URL changes, and after a settings change. It is hidden entirely while
  the count is zero — including while loading and when the fetch fails. The counter is display only:
  `ctrl+down` and the palette commands work whether it is visible or not.
- **Ctrl+Down** opens a centered modal dialog listing non-terminal tasks with their status
  and priority. Inside it: `↑`/`↓` (or `k`/`j`) select, `enter` opens the task, `r` reloads,
  `esc` closes, and clicking a row opens it too. Closing a task returns to the list.
- Opening a task shows a **detail dialog**: the title, a rule, the metadata block (`status`,
  `priority`, `project`, `blocked_by` as muted label/value pairs), another rule, then the
  description and comments in a scroll region. Scroll with `↑`/`↓`, `pgup`/`pgdn`, or the
  mouse wheel; `enter`/`q`/`esc` close it.

## Assumed ziptask HTTP API

A ziptask server is required, not optional — the plugin reads its tasks from one. It lives in
[ziptask](https://github.com/zumik3-del/ziptask). Both endpoints are read-only and are what the
plugin assumes:

- `GET /api/tasks?project=<slug>&status=<status>` → `{ "tasks": [{ "id", "title", "status", "priority" }], "total": N }`
- `GET /api/task/:id` → `{ "task": {...}, "blocked_by": [...], "comments": [...] }`

## Next steps

- Add a sidebar slot with an active-task counter.
- Add polling for the open task list: `r` refetches it, but only the footer counter polls.