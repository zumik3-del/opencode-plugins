import { Plugin } from "@opencode/plugin/tui"
import { createSignal } from "solid-js"
import { DEFAULT_SETTINGS, projectFromDirectory, type ZiptaskSettings } from "./config"
import { getTask, listTasks, type TaskSummary } from "./data"
import { TasksDialog } from "./dialog"

export default Plugin.define({
  id: "ziptask.tui",
  setup(context) {
    const [settings, updateSettings] = context.storage.store<ZiptaskSettings>("ziptask", {
      initial: DEFAULT_SETTINGS,
    })

    // Priority: plugin options (cli.json) -> durable store -> default.
    const baseUrl = () => (context.options.baseUrl as string | undefined) ?? settings.baseUrl

    // The project is the current directory's slug, the same way the project was created.
    const currentProject = () => projectFromDirectory(context.location?.directory ?? context.data.location.default().directory)

    const [taskCount, setTaskCount] = createSignal(0)

    async function refreshTaskCount() {
      try {
        const project = currentProject()
        if (!project) return setTaskCount(0)
        const statuses = ["queued", "in_progress", "review", "failed", "blocked"]
        const results = await Promise.all(statuses.map((status) => listTasks(baseUrl(), project, status)))
        setTaskCount(results.reduce((sum, tasks) => sum + tasks.length, 0))
      } catch {
        setTaskCount(0)
      }
    }

    const unregisterSlot = context.ui.slot({
      append: "prompt.footer.status",
      render: () => <text fg={context.theme.text.muted}>tasks: {taskCount()}</text>,
    })

    // The host pushes the "modal" input mode while a dialog is open, so the
    // dialog owns the keyboard until it closes.
    const [tasksOpen, setTasksOpen] = createSignal(false)

    function toggleTasksDialog() {
      if (tasksOpen()) {
        context.ui.dialog.clear()
        return
      }
      setTasksOpen(true)
      context.ui.dialog.set({ size: "large", centered: true })
      context.ui.dialog.show(
        () => <TasksDialog baseUrl={baseUrl} project={currentProject} />,
        () => setTasksOpen(false),
      )
    }

    const countTimer = setInterval(() => {
      void refreshTaskCount()
    }, settings.refreshMs || 15000)
    void refreshTaskCount()

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
            void refreshTaskCount()
          },
        },
      ],
    }))

    context.ui.toast.show({ message: "Ziptask TUI plugin loaded", variant: "success" })

    return () => {
      clearInterval(countTimer)
      unregisterSlot()
    }
  },
})
