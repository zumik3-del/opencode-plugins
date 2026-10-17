# Documentation

One card per plugin. A card is a decision aid: enough to decide whether to install the plugin and
how to configure it, short enough to read in one sitting. The plugin's own README stays the manual
and a card links to it instead of restating it.

## Plugins

| Plugin | Type | Summary | Card |
| --- | --- | --- | --- |
| `opencode-ziptask-tui` | TUI | ziptask task counter in the prompt footer, plus a task list and a task detail dialog | [opencode-ziptask-tui.md](opencode-ziptask-tui.md) |

A card is added when the plugin lands, not before. `tui/` is the only folder that holds a plugin so
far.

## What a card contains

Sections, in this order:

1. Purpose
2. What it does
3. Requirements
4. Install
5. Configure
6. Keys and commands
7. Behavior worth knowing
8. Troubleshooting

Rules:

- One screen. Roughly a hundred lines; if a section grows past that, it belongs in the plugin's
  README and the card links to it.
- Tables for bindings, commands, settings and defaults. Prose for behavior and rationale.
- Every binding, command title, setting name, default value, store path and file path is taken from
  the source, not from memory or from an older revision of the README. No invented bindings, no
  invented settings.
- Deliberate behavior that would otherwise read as a bug is written down with its rationale.
- No emoji, no marketing language. Declarative, like the READMEs in the repository.
- Relative links resolve to files that exist in the repository.

## Adding a card

1. Create `docs/<plugin-directory-name>.md` with the eight sections above.
2. Fill it from the plugin source, not from its README alone — the source is the contract; the
   README may lag.
3. Add a row to the table above, with the plugin directory, its type, a one-line summary and a
   relative link to the card.
4. Check the relative links and the `path:line` claims before handing the change over.