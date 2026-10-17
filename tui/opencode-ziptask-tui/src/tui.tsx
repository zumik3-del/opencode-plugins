import { Plugin } from "@opencode/plugin/tui"
import { DEFAULT_SETTINGS, type ZiptaskSettings } from "./config"

export default Plugin.define({
  id: "ziptask.tui",
  setup(context) {
    const [settings, updateSettings] = context.storage.store<ZiptaskSettings>("ziptask", {
      initial: DEFAULT_SETTINGS,
    })

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
            const current = settings()
            await context.ui.dialog.alert({
              title: "Ziptask",
              message: `baseUrl=${current.baseUrl}\nproject=${current.project || "(not set)"}\nrefreshMs=${current.refreshMs}`,
            })
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
