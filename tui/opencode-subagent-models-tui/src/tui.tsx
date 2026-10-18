import { Plugin } from "@opencode/plugin/tui"
import { createSignal } from "solid-js"
import { DEFAULT_SETTINGS, agentsDirFromOptions, type SubagentModelsSettings } from "./config"
import {
  agentFilePath,
  agentModelString,
  availableModels,
  filterEditableAgents,
  listAgentFiles,
  readFileText,
  setModelLine,
  writeFileText,
} from "./data"

export default Plugin.define({
  id: "subagentmodels.tui",
  setup(context) {
    const [settings, updateSettings] = context.storage.store<SubagentModelsSettings>("subagentmodels", {
      initial: DEFAULT_SETTINGS,
    })

    const agentsDir = () =>
      agentsDirFromOptions(context.options) ?? settings.agentsDir

    const [busy, setBusy] = createSignal(false)

    async function syncData() {
      await context.data.location.agent.sync()
      await context.data.location.model.sync()
      await context.data.location.provider.sync()
    }

    async function openChangeModel() {
      if (busy()) return
      setBusy(true)
      try {
        const dir = agentsDir()
        if (!dir) {
          await openSettings()
          return
        }

        await syncData()

        const listing = await listAgentFiles(context.client, dir)
        if (!listing.ok) {
          await context.ui.dialog.alert({
            title: "Subagent models",
            message: "Could not read the agents directory. Check 'Subagent models: agents directory'.",
          })
          return
        }

        let agents = filterEditableAgents(context.data.location.agent.list() ?? [], listing.ids)

        if (agents.length === 0) {
          await context.ui.dialog.alert({
            title: "Subagent models",
            message: "No editable subagents found (built-in agents have no file).",
          })
          return
        }

        const { models, providerName } = availableModels(
          context.data.location.model.list() ?? [],
          context.data.location.provider.list() ?? [],
        )

        if (models.length === 0) {
          await context.ui.dialog.alert({ title: "Subagent models", message: "No models available" })
          return
        }

        while (true) {
          const selectedAgentId = await context.ui.dialog.select<string>({
            title: "Subagent models: choose agent",
            options: agents.map((agent: any) => ({
              title: agent.name || agent.id,
              value: agent.id,
              description: `${agentModelString(agent)}${agent.description ? " — " + agent.description : ""}`,
            })),
          })
          if (selectedAgentId === undefined) break

          const agent = agents.find((item: any) => item.id === selectedAgentId)
          if (!agent) continue

          const selectedModel = await context.ui.dialog.select<string>({
            title: `Subagent models: choose model for ${agent.id}`,
            options: models.map((model: any) => ({
              title: model.name || model.id,
              value: `${model.providerID}/${model.id}`,
              description: `${model.id} · ctx ${model.limit?.context ?? "?"}`,
              category: String(providerName.get(model.providerID) || model.providerID),
            })),
            current: agentModelString(agent) === "(default)" ? undefined : agentModelString(agent),
          })
          if (selectedModel === undefined) continue

          const path = agentFilePath(dir, agent.id)
          const content = await readFileText(context.client, path)
          const updated = setModelLine(content, selectedModel)
          await writeFileText(context.client, path, updated)

          context.data.location.agent.invalidate()
          try {
            await context.client.location.reload()
          } catch {
            // Hot reload is best-effort; the file is already updated on the server.
          }

          context.ui.toast.show({
            title: "Subagent models",
            message: `${agent.id}: ${agentModelString(agent)} -> ${selectedModel}. Restart opencode if it is not reflected.`,
            variant: "success",
          })

          // Refresh so the next agent list reflects the new model.
          await syncData()
          const refreshed = await listAgentFiles(context.client, dir)
          if (refreshed.ok) {
            agents = filterEditableAgents(context.data.location.agent.list() ?? [], refreshed.ids)
          }
        }
      } catch (error) {
        context.ui.toast.show({
          title: "Subagent models",
          message: error instanceof Error ? error.message : String(error),
          variant: "error",
        })
      } finally {
        setBusy(false)
      }
    }

    async function openSettings() {
      const next = await context.ui.dialog.prompt({
        title: "Subagent models: agents directory",
        placeholder: "/home/opencode/.config/opencode/agents",
        value: agentsDir(),
      })
      if (next !== undefined && next.trim()) {
        await updateSettings((draft) => {
          draft.agentsDir = next.trim()
        })
        context.ui.toast.show({
          title: "Subagent models",
          message: `agentsDir = ${next.trim()}`,
          variant: "info",
        })
      }
    }

    context.keymap.layer(() => ({
      mode: "global",
      commands: [
        {
          id: "subagentmodels.models",
          title: "Subagent models: change model",
          group: "Subagent models",
          palette: true,
          slash: { name: "subagent-models" },
          run: () => void openChangeModel(),
        },
        {
          id: "subagentmodels.settings",
          title: "Subagent models: agents directory",
          group: "Subagent models",
          palette: true,
          run: () => void openSettings(),
        },
      ],
    }))

    return () => {}
  },
})
