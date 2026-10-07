// my-mod: replace this with what the mod does and how it is used.
import { atom, update } from 'claude-code'
import type { Register } from 'claude-code'
import { text, type Lang } from './text'

const runs = atom({ plugin: 'my-mod', key: 'runs' } as const, 0)

export const register: Register = (on, options) => {
  const lang: Lang = options.language === 'ko' ? 'ko' : 'en'
  const t = text[lang]

  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'my-mod', description: t.cmd })
    return next(e)
  })

  on('command.run', { command: 'my-mod' }, async ($) => {
    const n = await update($, runs, v => v + 1)
    return { text: t.hello(n) }
  })
}
