import { TextAttributes, type ScrollBoxRenderable } from "@opentui/core"
import { usePlugin } from "@opencode/plugin/tui"
import { createResource, createSignal, For, Show } from "solid-js"
import { getTask, listTasks, type TaskDetail, type TaskSummary } from "./data"

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

const LABEL_WIDTH = 12
const RULE_WIDTH = 80

export function TasksDialog(props: {
  baseUrl: () => string
  project: () => string
  onPick: (id: number) => void
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

  // The host pushes the "modal" input mode while a dialog is open, so this layer
  // is active only here and its bindings cannot collide with the composer ones.
  context.keymap.layer(() => ({
    mode: "modal",
    commands: [
      {
        id: "ziptask.dialog.up",
        title: "Previous task",
        bind: "up,k",
        run: () => {
          setSelected((index) => Math.max(0, index - 1))
        },
      },
      {
        id: "ziptask.dialog.down",
        title: "Next task",
        bind: "down,j",
        run: () => {
          setSelected((index) => Math.min(Math.max(rows().length - 1, 0), index + 1))
        },
      },
      {
        id: "ziptask.dialog.open",
        title: "Open task",
        bind: "return",
        run: () => {
          const task = rows()[selected()]
          if (task) props.onPick(task.id)
        },
      },
      {
        id: "ziptask.dialog.refresh",
        title: "Refresh tasks",
        bind: "r",
        run: () => {
          setReload((value) => value + 1)
        },
      },
    ],
  }))

  const theme = context.theme

  return (
    <box flexDirection="column" paddingLeft={2} paddingRight={2}>
      <text fg={theme.text.muted} wrapMode="none">
        {`${props.project() || "(unresolved)"} · ${rows().length} task${rows().length === 1 ? "" : "s"} · ↑/↓ select · enter open · r refresh · esc close`}
      </text>

      <scrollbox maxHeight={15} scrollbarOptions={{ visible: false }}>
        <Show
          when={rows().length > 0}
          fallback={<text fg={theme.text.muted}>{tasks.error ? " Failed to load tasks" : " No tasks"}</text>}
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
                  onMouseUp={() => props.onPick(task.id)}
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

export function TaskDetailDialog(props: { detail: TaskDetail }) {
  const context = usePlugin()
  let scroller: ScrollBoxRenderable | undefined

  const theme = context.theme
  const detail = () => props.detail

  // Leave room for the header, the metadata block, the rules and the footer.
  const bodyHeight = () => Math.max(5, context.renderer.terminalHeight - 14)

  function scrollBy(delta: number) {
    if (!scroller) return
    const limit = Math.max(0, scroller.scrollHeight - scroller.height)
    scroller.scrollTop = Math.min(limit, Math.max(0, scroller.scrollTop + delta))
  }

  context.keymap.layer(() => ({
    mode: "modal",
    commands: [
      {
        id: "ziptask.detail.up",
        title: "Scroll up",
        bind: "up,k",
        run: () => {
          scrollBy(-1)
        },
      },
      {
        id: "ziptask.detail.down",
        title: "Scroll down",
        bind: "down,j",
        run: () => {
          scrollBy(1)
        },
      },
      {
        id: "ziptask.detail.page_up",
        title: "Page up",
        bind: "pageup",
        run: () => {
          scrollBy(-10)
        },
      },
      {
        id: "ziptask.detail.page_down",
        title: "Page down",
        bind: "pagedown",
        run: () => {
          scrollBy(10)
        },
      },
      {
        id: "ziptask.detail.close",
        title: "Close task",
        bind: "return,q",
        run: () => {
          context.ui.dialog.clear()
        },
      },
    ],
  }))

  const meta = () => [
    ["status", STATUS_LABEL[detail().status] ?? detail().status],
    ["priority", (PRIORITY_LABEL[detail().priority] ?? detail().priority).toUpperCase()],
    ["project", detail().project ?? "(none)"],
    ["blocked_by", detail().blocked_by.length ? detail().blocked_by.join(", ") : "—"],
  ] as const

  const comments = () => detail().comments ?? []

  return (
    <box flexDirection="column" paddingLeft={2} paddingRight={2}>
      <text fg={theme.text.feedback.warning.base} attributes={TextAttributes.BOLD} wrapMode="none">
        {`#${detail().id}  ${detail().title}`}
      </text>

      <text fg={theme.text.muted} wrapMode="none">
        {"─".repeat(RULE_WIDTH)}
      </text>

      <For each={meta()}>
        {([label, value]) => (
          <box flexDirection="row">
            <text fg={theme.text.muted}>{label.padEnd(LABEL_WIDTH)}</text>
            <text fg={theme.text.base} wrapMode="none">
              {value}
            </text>
          </box>
        )}
      </For>

      <text fg={theme.text.muted} wrapMode="none">
        {"─".repeat(RULE_WIDTH)}
      </text>

      <scrollbox
        ref={(element: ScrollBoxRenderable) => {
          scroller = element
        }}
        maxHeight={bodyHeight()}
        scrollbarOptions={{ visible: false }}
      >
        <box flexDirection="column">
          <text fg={theme.text.base}>{detail().description}</text>

          <Show when={comments().length > 0}>
            <text fg={theme.text.muted} wrapMode="none">
              {"─".repeat(RULE_WIDTH)}
            </text>
            <text fg={theme.text.action.secondary.base} attributes={TextAttributes.BOLD}>
              {`Comments (${comments().length})`}
            </text>
            <For each={comments()}>
              {(comment) => (
                <box flexDirection="column">
                  <text fg={theme.text.muted} attributes={TextAttributes.BOLD}>
                    {`${comment.agent} · ${comment.type}`}
                  </text>
                  <text fg={theme.text.base}>{comment.content}</text>
                </box>
              )}
            </For>
          </Show>
        </box>
      </scrollbox>

      <text fg={theme.text.muted}>
        {"↑/↓ scroll · pgup/pgdn page · enter close"}
      </text>
    </box>
  )
}
