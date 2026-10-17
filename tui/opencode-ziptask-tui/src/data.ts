export type TaskSummary = {
  id: number
  title: string
  status: string
  priority: string
}

export type TaskDetail = {
  id: number
  title: string
  description: string
  status: string
  priority: string
  project: string | null
  blocked_by: number[]
  comments?: Array<{ id: number; agent: string; content: string; type: string; created_at: string }>
}

export async function listTasks(baseUrl: string, project: string, status?: string): Promise<TaskSummary[]> {
  const url = new URL("/api/tasks", baseUrl)
  if (project) url.searchParams.set("project", project)
  if (status) url.searchParams.set("status", status)
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`listTasks failed: ${res.status}`)
  const data = (await res.json()) as { tasks?: TaskSummary[] }
  return data.tasks ?? []
}

export async function getTask(baseUrl: string, id: number): Promise<TaskDetail> {
  const res = await fetch(new URL(`/api/task/${id}`, baseUrl).toString())
  if (!res.ok) throw new Error(`getTask failed: ${res.status}`)
  const data = (await res.json()) as { task: TaskDetail; blocked_by?: number[]; comments?: TaskDetail["comments"] }
  return {
    ...data.task,
    blocked_by: data.blocked_by ?? data.task.blocked_by ?? [],
    comments: data.comments ?? data.task.comments,
  }
}
