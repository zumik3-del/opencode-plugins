// NOTE: @opencode/client's published type for FileWriteInput declares
// `path: { path: string }`, but the server actually expects a flat string.
// Keep this call as `{ path, payload }` even though it looks "wrong" by the types.
// (Reported against sst/opencode; do not "fix" it back to the nested shape.)

export interface AgentSummary {
  id: string
  name: string
  model: string
  description?: string
}

export function agentModelString(agent: { model?: { providerID: string; id: string } | null }): string {
  const model = agent.model
  if (!model?.providerID || !model?.id) return "(default)"
  return `${model.providerID}/${model.id}`
}

export async function readFileText(client: any, path: string): Promise<string> {
  const bytes = await client.file.read({ path })
  return new TextDecoder().decode(bytes)
}

export async function writeFileText(client: any, path: string, content: string): Promise<void> {
  const payload = new TextEncoder().encode(content)
  await client.file.write({ path, payload })
}

export interface AgentFileListing {
  ok: boolean
  ids: Set<string>
}

export async function listAgentFiles(client: any, agentsDir: string): Promise<AgentFileListing> {
  try {
    const result = await client.file.list({ path: agentsDir })
    const entries = Array.isArray(result?.data) ? result.data : []
    const ids = new Set<string>()
    for (const entry of entries) {
      const name = String(entry?.path ?? "").split("/").pop() ?? ""
      const match = name.match(/^(.+)\.md$/)
      if (match) ids.add(match[1])
    }
    return { ok: true, ids }
  } catch {
    return { ok: false, ids: new Set() }
  }
}

export function setModelLine(content: string, model: string): string {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/)
  if (!match) throw new Error("agent file has no frontmatter")
  const head = match[1]
  const body = content.slice(match[0].length)
  const lines = head.split("\n")
  const idx = lines.findIndex((line) => /^model:/.test(line))
  if (idx >= 0) {
    // Replace only the value token, preserving any trailing comment (e.g. "# reason").
    const line = lines[idx]
    const valueMatch = line.match(/^model:(\s*)(\S+)(.*)$/)
    if (valueMatch) {
      lines[idx] = `model:${valueMatch[1]}${model}${valueMatch[3]}`
    } else {
      lines[idx] = `model: ${model}`
    }
  } else {
    lines.push(`model: ${model}`)
  }
  return `---\n${lines.join("\n")}\n---\n${body}`
}

export function filterEditableAgents(agents: any[], fileIds: Set<string>): any[] {
  return (agents ?? [])
    .filter((agent: any) => agent.mode === "subagent" && !agent.hidden)
    .filter((agent: any) => fileIds.has(agent.id))
    .sort((a: any, b: any) => String(a.id).localeCompare(String(b.id)))
}

export function availableModels(models: any[], providers: any[]): { models: any[]; providerName: Map<string, string> } {
  const providerName = new Map((providers ?? []).map((provider: any) => [provider.id, provider.name || provider.id]))
  const filtered = (models ?? [])
    .filter((model: any) => model.enabled !== false && model.status !== "deprecated")
    .sort((a: any, b: any) => {
      const pa = String(providerName.get(a.providerID) || a.providerID)
      const pb = String(providerName.get(b.providerID) || b.providerID)
      if (pa !== pb) return pa.localeCompare(pb)
      return String(a.name || a.id).localeCompare(String(b.name || b.id))
    })
  return { models: filtered, providerName }
}

/**
 * `location.reload()` resolves before the server has re-read the agent .md
 * files, so the agent list briefly holds only the built-in agents. Polling
 * until a non-empty editable list comes back avoids showing an empty picker.
 *
 * Returns [] on timeout; callers MUST keep their previous list in that case,
 * otherwise the empty-list bug comes back.
 */
export async function waitForEditableAgents(
  listAgents: () => any[],
  fileIds: () => Promise<AgentFileListing>,
  options: { timeoutMs?: number; intervalMs?: number; sleep?: (ms: number) => Promise<void> } = {},
): Promise<any[]> {
  const timeoutMs = options.timeoutMs ?? 5000
  const intervalMs = options.intervalMs ?? 150
  const sleep = options.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)))
  const deadline = Date.now() + timeoutMs
  for (;;) {
    const listing = await fileIds()
    if (listing.ok) {
      const list = filterEditableAgents(listAgents(), listing.ids)
      if (list.length > 0) return list
    }
    if (Date.now() >= deadline) return []
    await sleep(intervalMs)
  }
}

export function agentFilePath(agentsDir: string, agentId: string): string {
  const clean = agentId.replace(/[^a-zA-Z0-9._-]/g, "")
  if (!clean || clean !== agentId) throw new Error(`invalid agent id: ${agentId}`)
  const base = agentsDir.replace(/\/+$/, "")
  return `${base}/${clean}.md`
}
