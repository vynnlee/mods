export type Runs = number

declare module 'claude-code' {
  interface PluginState {
    'my-mod': { runs: Runs }
  }
}
