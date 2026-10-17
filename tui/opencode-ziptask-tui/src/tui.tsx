import { Plugin } from "@opencode/plugin/tui"
import { createMemo, createResource, createSignal, Show } from "solid-js"
import { DEFAULT_SETTINGS, projectFromDirectory, type ZiptaskSettings } from "./config"
import { getTask, listTasks, type TaskSummary } from "./data"
import { TasksDialog, TaskDetailDialog } from "./dialog"

export default Plugin.define({
  id: "ziptask.tui",
  setup(context) {
    const [settings, updateSettings] = context.storage.store<ZiptaskSettings>("ziptask", {
      initial: DEFAULT_SETTINGS,
    })

    // Priority: plugin options (cli.json) -> durable store -> default.
    const baseUrl = () => (context.options.baseUrl as string | undefined) ?? settings.baseUrl

    // The project is the active window's directory slug, the same way it was created.
    // `context.location` is captured once at setup and `data.location.default()` only
    // tracks the client's launch directory — neither follows a project opened in another
    // window/tab. The active tab's session carries the real per-window location.
    const currentProject = () => {
      const activeSessionID = context.ui.tabs.list().find((tab) => tab.active)?.sessionID
      const directory =
        (activeSessionID ? context.data.session.get(activeSessionID)?.location.directory : undefined) ??
        context.location?.directory ??
        context.data.location.default()?.directory
      return projectFromDirectory(directory)
    }

    const COUNTER_STATUSES = ["queued", "in_progress", "review", "failed", "blocked"] as const

    // A resource keyed on the resolved project: switching windows changes the
    // location, which changes the key, which refetches the count immediately.
    // The source builds a fresh object on each run. createResource has no `equals`
    // option in this Solid version, so memoise the key with one instead, to avoid
    // refetching when neither the base URL nor the resolved project changed.
    const countKey = createMemo(
      () => ({ baseUrl: baseUrl(), project: currentProject() }),
      undefined,
      { equals: (a, b) => a.baseUrl === b.baseUrl && a.project === b.project },
    )

    const [taskCount, { refetch: refetchCount }] = createResource(countKey, async (key) => {
      if (!key.project) return 0
      // ziptask answers 400 for a slug that matches no project, which would
      // otherwise put the resource into an error state and throw when the
      // footer slot reads it.
      try {
        const results = await Promise.all(
          COUNTER_STATUSES.map((status) => listTasks(key.baseUrl, key.project, status)),
        )
        return results.reduce((sum, tasks) => sum + tasks.length, 0)
      } catch {
        return 0
      }
    })

    // Nothing at all while the count is 0 or the resource has not resolved yet:
    // a "tasks: 0" footer is noise, and a project with no tasks should look the
    // same as an unreachable server — both resolve to 0. Same shape as the
    // built-in `opencode.btw` indicator in this slot.
    //
    // The counter is also a mouse target: clicking it opens the same tasks
    // dialog as ctrl+down, the way the composer's Subagents tab responds to a
    // click. Hover brightens it to advertise the affordance, and a live text
    // selection suppresses the open so the footer stays copyable.
    const [footerHover, setFooterHover] = createSignal(false)
    const unregisterSlot = context.ui.slot({
      append: "prompt.footer.status",
      render: () => (
        <Show when={(taskCount() ?? 0) > 0}>
          <box
            flexShrink={0}
            onMouseOver={() => setFooterHover(true)}
            onMouseOut={() => setFooterHover(false)}
            onMouseUp={() => {
              if (context.renderer.getSelection()?.getSelectedText()) return
              openTasksDialog()
            }}
          >
            <text fg={footerHover() ? context.theme.text.base : context.theme.text.muted}>
              tasks: {taskCount()}
            </text>
          </box>
        </Show>
      ),
    })

    // Safety net in case the location store is not reactive on its own.
    const offSessionViewed = context.data.on("session.viewed", () => {
      void refetchCount()
    })

    // A task claimed or created in this window may not change the reactive key,
    // and the interval only catches changes from other machines. Idle fires once
    // per turn, so it is the cheapest moment to notice a count that went from
    // 0 to something. `session.tool.success` would refetch per tool call.
    const offSessionIdle = context.data.on("session.idle", () => {
      void refetchCount()
    })

    // The host pushes the "modal" input mode while a dialog is open, so the
    // dialog owns the keyboard until it closes.
    const [tasksOpen, setTasksOpen] = createSignal(false)

    function openTasksDialog() {
      setTasksOpen(true)
      context.ui.dialog.show(
        () => <TasksDialog baseUrl={baseUrl} project={currentProject} onPick={openTaskDetail} />,
        () => setTasksOpen(false),
      )
      // Must come after show(): the host's replace() resets size to "medium" and
      // centered to false, so a set() before show() is silently discarded.
      // The host only offers three widths — medium 60, large 88, xlarge 116 —
      // so "large" (about 24% narrower than xlarge) is the closest to -20%.
      context.ui.dialog.set({ size: "large", centered: true })
    }

    async function openTaskDetail(id: number) {
      try {
        const detail = await getTask(baseUrl(), id)
        context.ui.dialog.show(
          () => <TaskDetailDialog detail={detail} />,
          () => {
            // The host calls onClose before it pops the stack, so re-opening here
            // would recurse. Defer until the stack is settled.
            setTimeout(() => openTasksDialog(), 0)
          },
        )
        context.ui.dialog.set({ size: "large", centered: true })
      } catch (error) {
        context.ui.toast.show({
          title: "Ziptask",
          message: error instanceof Error ? error.message : String(error),
          variant: "error",
        })
      }
    }

    function toggleTasksDialog() {
      if (tasksOpen()) {
        context.ui.dialog.clear()
        return
      }
      openTasksDialog()
    }

    const countTimer = setInterval(() => {
      void refetchCount()
    }, settings.refreshMs || 15000)

    async function loadActiveTasks(): Promise<TaskSummary[]> {
      const project = currentProject()
      if (!project) return []
      const statuses = ["queued", "in_progress", "review"]
      const results = await Promise.all(statuses.map((status) => listTasks(baseUrl(), project, status)))
      return results.flat()
    }

    context.keymap.layer(() => ({
      mode: "global",
      commands: [
        {
          id: "ziptask.dialog",
          title: "Ziptask: tasks",
          group: "Ziptask",
          palette: true,
          bind: "ctrl+down",
          run: () => toggleTasksDialog(),
        },
        {
          id: "ziptask.tasks",
          title: "Ziptask: tasks",
          group: "Ziptask",
          palette: true,
          slash: { name: "ziptask" },
          run: async () => {
            try {
              const tasks = await loadActiveTasks()
              if (tasks.length === 0) {
                await context.ui.dialog.alert({ title: "Ziptask", message: "No active tasks" })
                return
              }
              const selected = await context.ui.dialog.select({
                title: "Ziptask tasks",
                options: tasks.map((task) => ({
                  title: `#${task.id} ${task.title}`,
                  value: task.id,
                  description: `${task.status} · ${task.priority}`,
                })),
              })
              if (selected === undefined) return
              const detail = await getTask(baseUrl(), selected)
              await context.ui.dialog.alert({
                title: `#${detail.id} ${detail.title}`,
                message: [
                  `status: ${detail.status}`,
                  `priority: ${detail.priority}`,
                  `project: ${detail.project ?? "(none)"}`,
                  detail.blocked_by.length ? `blocked_by: ${detail.blocked_by.join(", ")}` : "",
                  "",
                  detail.description,
                ]
                  .filter(Boolean)
                  .join("\n"),
              })
            } catch (error) {
              context.ui.toast.show({
                title: "Ziptask",
                message: error instanceof Error ? error.message : String(error),
                variant: "error",
              })
            }
          },
        },
        {
          id: "ziptask.settings",
          title: "Ziptask: settings",
          group: "Ziptask",
          palette: true,
          run: async () => {
            const nextUrl = await context.ui.dialog.prompt({
              title: "Ziptask base URL",
              placeholder: "http://127.0.0.1:3005",
              value: baseUrl(),
            })
            if (nextUrl !== undefined) {
              await updateSettings((draft) => {
                draft.baseUrl = nextUrl
              })
            }
            await context.ui.dialog.alert({
              title: "Ziptask",
              message: `project: ${currentProject() || "(unresolved)"}`,
            })
            void refetchCount()
          },
        },
      ],
    }))

    return () => {
      clearInterval(countTimer)
      offSessionViewed()
      offSessionIdle()
      unregisterSlot()
    }
  },
})
