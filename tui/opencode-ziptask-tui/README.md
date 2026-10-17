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

## Assumed ziptask HTTP API

The plugin currently assumes these endpoints exist (to be added to ziptask later):

- `GET /api/tasks?project=<slug>&status=<status>` → `{ "tasks": [{ "id", "title", "status", "priority" }] }`
- `GET /api/task/:id` → `{ "task": {...}, "blocked_by": [...], "comments": [...] }` (already exists)

## Next steps

- Add the assumed REST endpoints to ziptask.
- Add a sidebar slot with an active-task counter.
- Add polling/refresh for the task list.
