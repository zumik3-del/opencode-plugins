# opencode-ziptask-tui

TUI plugin (`tui/opencode-ziptask-tui`) — plugin id `ziptask.tui`, declared in `src/tui.tsx`.

## Purpose

Read ziptask tasks from inside the OpenCode terminal interface: a task counter in the prompt
footer, a task list dialog, and a task detail dialog. The plugin only reads — it calls two
read-only ziptask endpoints and never mutates a task.

## What it does

- Appends a `tasks: N` counter (non-terminal tasks) to the `prompt.footer.status` slot.
- Opens a centered task list on `ctrl+down`, listing the resolved project's non-terminal tasks
  with status, priority and id.
- Opens a task detail dialog from a selected row: metadata grid, description, comments.
- Resolves the ziptask project from the active window's directory, so the counter and the list
  follow the window you are working in.
- Registers three commands in the `Ziptask` palette group.

## Requirements

- OpenCode with TUI plugin support.
- A reachable ziptask server. Default base URL `http://127.0.0.1:3005`.
- Node with npm >= 7, which installs the peer dependencies of the package.
- Peer dependencies resolved by npm: `@opentui/core >=0.5.8`, `@opentui/solid >=0.5.8`,
  `solid-js >=1.9.0`.

## Install

```sh
git clone https://github.com/zumik3-del/opencode-plugins.git
cd opencode-plugins/tui/opencode-ziptask-tui
npm install
```

Register the directory in `~/.config/opencode/cli.json`:

```jsonc
{ "plugins": ["/absolute/path/to/opencode-plugins/tui/opencode-ziptask-tui"] }
```

Alternatively symlink the directory into `~/.config/opencode/plugins/`. Register it in one place
only — both at once duplicates the plugin id. The npm route (`opencode plugin add`) requires the
package to be published first. The Installation section of the
[plugin README](../tui/opencode-ziptask-tui/README.md) has the details, including why the plugin
ships both root entrypoints.

## Configure

| Setting | Type | Default | Writable from |
| --- | --- | --- | --- |
| `baseUrl` | string | `http://127.0.0.1:3005` | `Ziptask: settings` command |
| `refreshMs` | number | `15000` | store file only |

- Store: `context.storage.store("ziptask")` on plugin id `ziptask.tui`, written by the host to
  `~/.local/state/opencode/latest/tui/plugin.ziptask.tui.ziptask.json`.
- Base URL priority: `options.baseUrl` from `cli.json` → store `baseUrl` → default.
- `refreshMs` is the footer counter poll interval, in milliseconds.
- Example: [`config/settings.example.json`](../tui/opencode-ziptask-tui/config/settings.example.json).
- The project slug is not configurable. It is derived from the directory of the active tab's
  session, falling back to the plugin location and then the client's launch directory. The folder
  name is lowercased, `[^a-z0-9._-]` becomes `-`, leading non-alphanumerics are stripped and the
  result is cut to 32 characters — the same rule ziptask uses when it creates a project from a
  folder path.
- `ZIPTASK_URL` and `ZIPTASK_PROJECT` are no longer read. The first was replaced by
  `options.baseUrl` in `cli.json`, the second by the directory-derived slug.

## Keys and commands

Commands, all in group `Ziptask`, registered in the global keymap layer:

| Id | Title | Entry points | Effect |
| --- | --- | --- | --- |
| `ziptask.dialog` | `Ziptask: tasks` | `ctrl+down`, palette | Toggle the centered task list dialog |
| `ziptask.tasks` | `Ziptask: tasks` | `/ziptask`, palette | Pick an active task in a host select dialog, then read it in an alert |
| `ziptask.settings` | `Ziptask: settings` | palette | Prompt for the base URL, store it, show the resolved project |

Task list dialog, modal layer:

| Binding | Title | Effect |
| --- | --- | --- |
| `↑`, `k` | Previous task | Move the selection up, clamped at the first row |
| `↓`, `j` | Next task | Move the selection down, clamped at the last row |
| `return` | Open task | Open the detail dialog for the selected row |
| `r` | Refresh tasks | Refetch the list |
| `esc` | host default | Close the dialog |
| mouse move / click | plugin handlers | Move the selection / open the row |
| _mouse wheel_ | native `scrollbox` | Scroll the rows through the scrollbox's own acceleration |

Task detail dialog, modal layer:

| Binding | Title | Effect |
| --- | --- | --- |
| `↑`, `k` | Scroll up | One line up |
| `↓`, `j` | Scroll down | One line down |
| `pageup` | Page up | Ten lines up |
| `pagedown` | Page down | Ten lines down |
| `return`, `q` | Close task | Close the dialog and return to the list |
| _mouse wheel_ | native `scrollbox` | Scroll the body through the scrollbox's own acceleration |

The two italic rows are not keymap entries. Both dialogs render a `scrollbox`, and
`ScrollBoxRenderable` handles the wheel itself: it reads the wheel delta, multiplies it by the
scroll acceleration and moves `scrollTop`. The wheel scrolls both dialogs, with no plugin binding
behind it.

## Behavior worth knowing

- **An unknown project slug fails silently to 0.** ziptask answers HTTP 400 for a slug that matches
  no project; the counter and the list swallow it and show `tasks: 0` and an empty list. This is
  intended: the footer is ambient chrome and must not interrupt, and a toast on every window switch
  would be noise. The failure stays visible where it matters — the dialog, which is a deliberate
  user action, shows the empty state.
- **The status sets differ.** The counter and the list cover the five non-terminal statuses
  (`queued`, `in_progress`, `review`, `failed`, `blocked`); `/ziptask` covers the three open ones
  (`queued`, `in_progress`, `review`).
- **Two endpoints.** The plugin issues one `GET /api/tasks?project=<slug>&status=<status>` request
  per status, in parallel, and one `GET /api/task/<id>` for the detail. The shape it expects is in
  the HTTP API section of the [plugin README](../tui/opencode-ziptask-tui/README.md).
- **Both dialogs are `large`** — 88 columns, the middle of the 60/88/116 the host offers — and
  centered. The size is applied after the dialog is shown, because showing it resets those
  properties.
- **The counter refetches** on its interval, on the `session.viewed` event, and whenever the base
  URL or the resolved project changes. A failed fetch renders `tasks: 0`.
- **`refreshMs` is read once**, when the plugin sets up its timer, so a later store edit does not
  reschedule it. A value of `0` falls back to `15000`.
- **The package also exports a no-op server entry** (`src/index.ts`, id `ziptask.server`) so it
  loads from both hosts. It has no behaviour; everything described here is the `ziptask.tui` entry.

## Troubleshooting

- **The counter reads 0 and the list is empty.** Run `Ziptask: settings`: it reports the resolved
  project. `(unresolved)` means no directory was found and no request is made at all; a slug ziptask
  does not know returns 400 and is swallowed by design. An empty project is indistinguishable from
  an unreachable server from the dialog — both render the same empty state.
- **A new base URL has no effect.** `options.baseUrl` in `cli.json` outranks the store, and the
  `Ziptask: settings` prompt writes only the store. Remove or edit the pin in `cli.json`.
- **The plugin appears twice.** It is registered both in `cli.json` and in
  `~/.config/opencode/plugins/`. Keep one registration.
- **`/ziptask` answers `No active tasks` while the counter shows work.** `/ziptask` lists only
  `queued`, `in_progress` and `review`; the counter and the list dialog also count `failed` and
  `blocked`. Use `ctrl+down` to see all five.