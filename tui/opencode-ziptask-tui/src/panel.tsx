import { usePlugin } from "@opencode/plugin/tui"
import type { PanelInput } from "@opencode/plugin/tui/context"
import { createMemo, createResource, createSignal, For, Show } from "solid-js"
import { getTask, listTasks, type TaskSummary } from "./data"

// Non-terminal statuses, in display order.
const STATUSES = ["queued", "in_progress", "review", "failed", "blocked"] as const

const STATUS_LABEL: Record<string, string> = {
  queued: "QUEUED",
  in_progress: "IN PROGRESS",
  review: "REVIEW",
  failed: "FAILED",
  blocked: "BLOCKED",
}

const PRIORITY_LABEL: Record<string, string> = {
  p0: "P0",
  p1: "P1",
  p2: "P2",
  p3: "P3",
}

export function TasksPanel(props: {
  panel: PanelInput
  baseUrl: () => string
  project: () => string
}) {
  const context = usePlugin()
  const [selected, setSelected] = createSignal(0)
  const [reload, setReload] = createSignal(0)

  const [tasks] = createResource(
    () => ({ baseUrl: props.baseUrl(), project: props.project(), reload: reload() }),
    async (key) => {
      if (!key.project) return [] as TaskSummary[]
      const results = await Promise.all(STATUSES.map((status) => listTasks(key.baseUrl, key.project, status)))
      return results.flat()
    },
  )

  const rows = () => tasks() ?? []
  const current = () => rows()[selected()]

  async function openSelected() {
    const task = current()
    if (!task) return
    try {
      const detail = await getTask(props.baseUrl(), task.id)
      const header = [
        `#${detail.id} ${detail.title}`,
        "",
        `status: ${detail.status}`,
        `priority: ${detail.priority}`,
        `project: ${detail.project ?? "(none)"}`,
        detail.blocked_by.length ? `blocked_by: ${detail.blocked_by.join(", ")}` : "",
        "",
        detail.description,
      ]
        .filter(Boolean)
        .join("\n")
      const comments = (detail.comments ?? []).map((comment) => `${comment.agent}: ${comment.content}`).join("\n\n")
      await context.ui.dialog.alert({
        title: `Task #${detail.id}`,
        message: comments ? `${header}\n\n---\n\n${comments}` : header,
      })
    } catch (error) {
      context.ui.toast.show({
        title: "Ziptask",
        message: error instanceof Error ? error.message : String(error),
        variant: "error",
      })
    }
  }

  // This layer is active only while the panel owns input, so its bindings never
  // collide with the global ones.
  context.keymap.layer(() => ({
    commands: [
      {
        id: "ziptask.panel.up",
        title: "Previous task",
        bind: "up,k",
        run: () => setSelected((index) => Math.max(0, index - 1)),
      },
      {
        id: "ziptask.panel.down",
        title: "Next task",
        bind: "down,j",
        run: () => setSelected((index) => Math.min(Math.max(rows().length - 1, 0), index + 1)),
      },
      {
        id: "ziptask.panel.open",
        title: "Open task",
        bind: "return",
        run: () => void openSelected(),
      },
      {
        id: "ziptask.panel.refresh",
        title: "Refresh tasks",
        bind: "r",
        run: () => setReload((value) => value + 1),
      },
      {
        id: "ziptask.panel.close",
        title: "Close tasks panel",
        bind: "escape",
        run: () => props.panel.close(),
      },
    ],
  }))

  const theme = context.theme
  const project = createMemo(() => props.project())

  return (
    <box flexDirection="column" flexGrow={1} paddingLeft={1}>
      <Show when={project()} fallback={<text fg={theme.text.muted}>project could not be resolved from the directory</text>}>
        <text fg={theme.text.muted}>
          {project()} · {rows().length} task{rows().length === 1 ? "" : "s"} · ↑/↓ select · enter open · r refresh ·
          esc close
        </text>
      </Show>

      <Show when={tasks.error}>
        <text fg={theme.text.feedback.error}>Failed to load tasks</text>
      </Show>

      <Show when={!tasks.loading && !tasks.error && rows().length === 0}>
        <text fg={theme.text.muted}>No non-terminal tasks</text>
      </Show>

      <scrollbox flexGrow={1} scrollbarOptions={{ visible: false }}>
        <box flexDirection="column">
          <For each={rows()}>
            {(task, index) => (
              <box
                flexDirection="row"
                paddingLeft={1}
                backgroundColor={index() === selected() ? theme.background.raised.high : undefined}
                onMouseDown={() => {
                  setSelected(index())
                  void openSelected()
                }}
              >
                <text fg={theme.text.muted}> {(STATUS_LABEL[task.status] ?? task.status).padEnd(11)} </text>
                <text fg={theme.text.muted}>{(PRIORITY_LABEL[task.priority] ?? task.priority).padEnd(3)} </text>
                <text fg={theme.text.base}>#{task.id} {task.title}</text>
              </box>
            )}
          </For>
        </box>
      </scrollbox>
    </box>
  )
}
