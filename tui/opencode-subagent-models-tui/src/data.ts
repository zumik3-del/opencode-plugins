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
  await client.file.write({ path: { path }, payload })
}

export function setModelLine(content: string, model: string): string {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/)
  if (!match) throw new Error("agent file has no frontmatter")
  const head = match[1]
  const body = content.slice(match[0].length)
  const lines = head.split("\n")
  const idx = lines.findIndex((line) => /^model:/.test(line))
  const newLine = `model: ${model}`
  if (idx >= 0) lines[idx] = newLine
  else lines.push(newLine)
  return `---\n${lines.join("\n")}\n---\n${body}`
}

export function agentFilePath(agentsDir: string, agentId: string): string {
  const clean = agentId.replace(/[^a-zA-Z0-9._-]/g, "")
  if (!clean || clean !== agentId) throw new Error(`invalid agent id: ${agentId}`)
  const base = agentsDir.replace(/\/+$/, "")
  return `${base}/${clean}.md`
}
