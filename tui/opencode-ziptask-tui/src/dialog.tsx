import { TextAttributes } from "@opentui/core"
import { usePlugin } from "@opencode/plugin/tui"
import { createResource, createSignal, For, Show } from "solid-js"
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

export function TasksDialog(props: {
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

  // The host pushes the "modal" input mode while a dialog is open, so this layer
  // is active only here and its bindings cannot collide with the composer ones.
  context.keymap.layer(() => ({
    mode: "modal",
    commands: [
      {
        id: "ziptask.dialog.up",
        title: "Previous task",
        bind: "up,k",
        run: () => setSelected((index) => Math.max(0, index - 1)),
      },
      {
        id: "ziptask.dialog.down",
        title: "Next task",
        bind: "down,j",
        run: () => setSelected((index) => Math.min(Math.max(rows().length - 1, 0), index + 1)),
      },
      {
        id: "ziptask.dialog.open",
        title: "Open task",
        bind: "return",
        run: () => void openSelected(),
      },
      {
        id: "ziptask.dialog.refresh",
        title: "Refresh tasks",
        bind: "r",
        run: () => setReload((value) => value + 1),
      },
      {
        id: "ziptask.dialog.close",
        title: "Close tasks",
        bind: "escape",
        run: () => context.ui.dialog.clear(),
      },
    ],
  }))

  const theme = context.theme

  return (
    <box flexDirection="column">
      <text fg={theme.text.muted}>
        {`${props.project() || "(unresolved)"} · ${rows().length} task${rows().length === 1 ? "" : "s"} · ↑/↓ select · enter open · r refresh · esc close`}
      </text>

      <scrollbox maxHeight={15} scrollbarOptions={{ visible: false }}>
        <Show
          when={rows().length > 0}
          fallback={
            <text fg={theme.text.muted}>{tasks.error ? " Failed to load tasks" : " No tasks"}</text>
          }
        >
          <For each={rows()}>
            {(task, index) => {
              const isSelected = () => index() === selected()
              return (
                <box
                  flexDirection="row"
                  paddingLeft={1}
                  paddingRight={1}
                  backgroundColor={
                    isSelected() ? theme.background.action.primary.focused : theme.background.action.primary.base
                  }
                  onMouseMove={() => setSelected(index())}
                  onMouseUp={() => {
                    setSelected(index())
                    void openSelected()
                  }}
                >
                  <box flexGrow={1} minWidth={0} flexDirection="row">
                    <text
                      wrapMode="none"
                      fg={isSelected() ? theme.text.action.primary.focused : theme.text.action.primary.base}
                      attributes={isSelected() ? TextAttributes.BOLD : undefined}
                    >
                      {`${STATUS_LABEL[task.status] ?? task.status}: ${PRIORITY_LABEL[task.priority] ?? task.priority}: #${task.id} ${task.title}`}
                    </text>
                  </box>
                </box>
              )
            }}
          </For>
        </Show>
      </scrollbox>
    </box>
  )
}
