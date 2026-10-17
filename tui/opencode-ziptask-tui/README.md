# opencode-ziptask-tui

OpenCode TUI plugin for browsing ziptask tasks.

## Settings

Settings are stored in OpenCode durable plugin storage (`context.storage.store("ziptask")`).
Defaults come from `src/config.ts` and can be overridden with environment variables:

- `ZIPTASK_URL` — ziptask base URL (default `http://127.0.0.1:3005`)
- `ZIPTASK_PROJECT` — default project slug

An example settings file is provided at `config/settings.example.json`.

## Commands

- `Ziptask: tasks` — show current settings (placeholder; task list coming next)
- `Ziptask: settings` — edit base URL and project slug

## Next steps

- Implement ziptask MCP client (`fetch` to `/mcp`) for `list_projects`, `list_tasks`, `list_queue`.
- Replace the alert with a `select` dialog listing tasks.
- Add a sidebar slot with an active-task counter.
