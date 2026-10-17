export type ZiptaskSettings = {
  baseUrl: string
  refreshMs: number
}

export const DEFAULT_SETTINGS: ZiptaskSettings = {
  baseUrl: "http://127.0.0.1:3005",
  refreshMs: 15000,
}

// ziptask project slugs match ^[a-z0-9][a-z0-9._-]{0,31}$ and are derived from the
// folder name, so the TUI derives the project the same way the project was created.
export function projectFromDirectory(directory: string | undefined): string {
  if (!directory) return ""
  const name = directory.replace(/[/\\]+$/, "").split(/[/\\]/).pop() ?? ""
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/^[^a-z0-9]+/, "")
    .slice(0, 32)
}