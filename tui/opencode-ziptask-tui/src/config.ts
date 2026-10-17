export type ZiptaskSettings = {
  baseUrl: string
  project: string
  refreshMs: number
}

export const DEFAULT_SETTINGS: ZiptaskSettings = {
  baseUrl: process.env.ZIPTASK_URL ?? "http://127.0.0.1:3005",
  project: process.env.ZIPTASK_PROJECT ?? "ziptask",
  refreshMs: 15000,
}
