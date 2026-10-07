export type Draft = { id: string; title: string; text: string; savedAt: number; project: string }

declare module 'claude-code' {
  interface PluginState {
    'prompt-drafts': { drafts: Draft[] }
  }
}
