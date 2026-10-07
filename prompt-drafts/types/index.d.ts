export type Draft = { id: string; title: string; text: string; savedAt: number }
export type Deleted = { draft: Draft; index: number }

declare module 'claude-code' {
  interface PluginState {
    'prompt-drafts': { drafts: Draft[]; isPicking: boolean; deleted: Deleted | null }
  }
}
