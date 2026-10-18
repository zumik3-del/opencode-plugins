# opencode-subagent-models-tui

## Purpose

Interactively change the model assigned to an OpenCode subagent. The plugin lists subagents and the models currently offered by the connected OpenCode server, then writes the selected model into the agent file on the server.

## What it does

- Registers two commands in the `Subagent models` palette group.
- `Subagent models: change model` (`/subagent-models`): pick a subagent, then pick a model grouped by provider, then apply.
- `Subagent models: agents directory`: set the server directory that holds agent `.md` files.
- Reads subagent and model data from the OpenCode server, so it works when the TUI is connected to a remote server.
- Writes the selected model into `<agentsDir>/<agent>.md` through the server file API.
- Attempts a best-effort hot reload and tells the user to restart opencode if needed.

## Requirements

- OpenCode TUI connected to an OpenCode server.
- The server's agent files must be reachable through the server file API.
- Node/OpenCode runtime dependencies installed (`npm install` in the plugin directory).

## Install

Local development:

```sh
cd /mnt/external/zum/PROJECTS/local/opencode-plugins/tui/opencode-subagent-models-tui
npm install
```

Register in `~/.config/opencode/cli.json`:

```jsonc
{ "plugins": ["/absolute/path/to/opencode-plugins/tui/opencode-subagent-models-tui"] }
```

## Configure

Plugin options in `cli.json`:

```jsonc
{
  "plugins": [
    {
      "package": "/absolute/path/to/opencode-plugins/tui/opencode-subagent-models-tui",
      "options": { "agentsDir": "/home/opencode/.config/opencode/agents" }
    }
  ]
}
```

The directory can also be changed at runtime with `Subagent models: agents directory`. Priority: plugin option -> durable store -> default `/home/opencode/.config/opencode/agents`.

## Keys and commands

| Command | Title | Slash | Notes |
| --- | --- | --- | --- |
| `subagentmodels.models` | `Subagent models: change model` | `/subagent-models` | Interactive agent then model selection |
| `subagentmodels.settings` | `Subagent models: agents directory` | none | Prompts for the server agents directory |

## Behavior worth knowing

- Only agents with `mode: subagent` and not hidden are listed.
- Deprecated or disabled models are excluded.
- The plugin changes only the `model:` line in the agent frontmatter and leaves permissions, description, mode and body untouched.
- Because opencode reads agent files at startup, a restart may be required after a change; the plugin attempts `location.reload()` first.
- If the selected model is already assigned, the file is still rewritten with the same value.

## Troubleshooting

- `No subagents found`: check that the server exposes subagent definitions.
- `No models available`: verify connected providers on the server.
- Write errors: verify `agentsDir` points to the server-side directory and is writable by the server process.
- Changes not reflected: restart opencode.