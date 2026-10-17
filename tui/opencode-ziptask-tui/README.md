# opencode-ziptask-tui

OpenCode TUI plugin for browsing ziptask tasks.

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
      "options": { "baseUrl": "http://192.168.1.93:3005" }
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

- `Ziptask: tasks` — toggle the centered Tasks dialog (`ctrl+down`)
- `Ziptask: settings` — edit the base URL and show the resolved project slug

## UI

- A compact `tasks: N` counter (non-terminal tasks) is appended to `prompt.footer.status`,
  near the composer/subagent picker, and refreshed on the configured interval.
- **Ctrl+Down** opens a centered modal dialog listing non-terminal tasks with their status
  and priority. Inside it: `↑`/`↓` (or `k`/`j`) select, `enter` opens the task, `r` reloads,
  `esc` closes, and clicking a row opens it too. The detail dialog shows the title, status,
  priority, project, blocked-by, description, and comments.

## Assumed ziptask HTTP API

- `GET /api/tasks?project=<slug>&status=<status>` → `{ "tasks": [{ "id", "title", "status", "priority" }], "total": N }`
- `GET /api/task/:id` → `{ "task": {...}, "blocked_by": [...], "comments": [...] }`

## Next steps

- Add a sidebar slot with an active-task counter.
- Add polling/refresh for the task list.