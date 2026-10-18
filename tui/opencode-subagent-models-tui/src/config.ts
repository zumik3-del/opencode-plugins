export interface SubagentModelsSettings {
  agentsDir: string
}

export const DEFAULT_SETTINGS: SubagentModelsSettings = {
  agentsDir: "/home/opencode/.config/opencode/agents",
}

export function agentsDirFromOptions(options: Record<string, any> | undefined): string | undefined {
  const value = options?.agentsDir
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}
