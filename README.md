# opencode-plugins

Local workspace for OpenCode plugins.

## Structure

- `tui/` — TUI (CLI) plugins that extend the OpenCode terminal interface.
- `docs/` — one documentation card per plugin.

`server/` and `shared/` are not part of the tree yet.

## Documentation

Per-plugin cards live in [`docs/`](docs/README.md).

## Notes

- TUI plugins are configured in `~/.config/opencode/cli.json` under `plugins`.
- Server plugins are configured in `opencode.json` under `plugins`.
