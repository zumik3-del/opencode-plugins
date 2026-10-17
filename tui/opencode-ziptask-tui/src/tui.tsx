import { Plugin } from "@opencode/plugin/tui"
import { DEFAULT_SETTINGS, type ZiptaskSettings } from "./config"
import { getTask, listTasks, type TaskSummary } from "./data"

export default Plugin.define({
  id: "ziptask.tui",
  setup(context) {
    const [settings, updateSettings] = context.storage.store<ZiptaskSettings>("ziptask", {
      initial: DEFAULT_SETTINGS,
    })

    async function loadActiveTasks(): Promise<TaskSummary[]> {
      const { baseUrl, project } = settings()
      const statuses = ["queued", "in_progress", "review"]
      const results = await Promise.all(statuses.map((status) => listTasks(baseUrl, project, status)))
      return results.flat()
    }

    context.keymap.layer(() => ({
      mode: "global",
      commands: [
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
              const detail = await getTask(settings().baseUrl, selected)
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
              value: settings().baseUrl,
            })
            if (nextUrl !== undefined) {
              await updateSettings((draft) => {
                draft.baseUrl = nextUrl
              })
            }
            const nextProject = await context.ui.dialog.prompt({
              title: "Ziptask project slug",
              placeholder: "ziptask",
              value: settings().project,
            })
            if (nextProject !== undefined) {
              await updateSettings((draft) => {
                draft.project = nextProject
              })
            }
          },
        },
      ],
    }))

    context.ui.toast.show({ message: "Ziptask TUI plugin loaded", variant: "success" })

    return () => {}
  },
})
