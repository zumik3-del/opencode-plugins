# opencode-plugins

Local workspace for OpenCode plugins.

## Structure

- `tui/` — TUI (CLI) plugins that extend the OpenCode terminal interface.
- `server/` — server-side plugins that run in the OpenCode background service.
- `shared/` — shared utilities.

## Notes

- TUI plugins are configured in `~/.config/opencode/cli.json` under `plugins`.
- Server plugins are configured in `opencode.json` under `plugins`.
