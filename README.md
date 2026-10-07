# prompt-drafts

A [Claude Code mod](https://code.claude.com/docs/en/plugins/mods/overview) for keeping prompts aside and bringing them back later.

You are halfway through a prompt and want to ask something else first. End it with `;;`, press Enter, and it is saved instead of sent. When you want it back, `/drafts` opens your drafts in a sidebar and one number key puts a draft back.

```
❯ refactor the auth middleware to use the new session store;;
⏺ ✓ Draft 1 saved: refactor the auth middleware to use the new session store   (/drafts to bring it back)
```

```
❯ /drafts                                           │ Drafts                          ✕
                                                    │ [ Save prompt box ]
Drafts  number keys  1: refactor the a…  2: write…  │ Press a number key or click a
0: close                                            │ draft to put it in the prompt box.
────────────────────────────────────────────────    │
❯                                                   │ 1  refactor the auth middleware…
                                                    │    api, 3m ago, 61 chars  ×
                                                    │ 2  write release notes for 2.4…
                                                    │    web, 2h ago, 48 chars  ×
```

## Use

| To | Do |
|---|---|
| Save the prompt you are writing | End it with `;;` and press Enter. It is not sent. |
| Save some text | `/draft <text>` |
| Put a draft back in the prompt box | `/drafts` opens the drafts sidebar: press a number key or click a draft. `0` closes. Or `/drafts <n>` |
| Save what is in the prompt box | Click **Save prompt box** in the sidebar |
| Delete a draft | Click `×` in the sidebar, or `/drafts rm <n>` |

- Drafts are shared by every Claude Code session on your machine, newest first, up to 50. Each shows the project it was saved in. The list shows the newest 9.
- Putting a draft in a prompt box that already holds other text saves that text as a draft first, so nothing you typed is lost.
- Saving the same text again moves it to the top instead of keeping two copies.
- Number keys work right away: a row of numbered buttons waits above the prompt box (a bare digit in an empty prompt box presses it, as when Claude asks you a question). On a terminal too narrow for the sidebar, that row becomes the full list.
- The sidebar and the row close when you pick a draft, press `0`, close the sidebar, or send a prompt.

## Install

Claude Code 2.1.287 or later (mods are on by default). In a Claude Code session:

```
/plugin install prompt-drafts --marketplace <owner>/prompt-drafts
```

Or try it for one session from a clone:

```bash
git clone https://github.com/<owner>/prompt-drafts
claude --plugin-dir ./prompt-drafts
```

## Settings

`/plugin configure prompt-drafts@prompt-drafts`

| Setting | Default | |
|---|---|---|
| `language` | `en` | `en` or `ko` (Korean) for every message and the list |

## What it touches

`claude plugin validate .` lists everything the mod calls:

- `$.prompt.read`, `$.prompt.fill`: read and fill the prompt box
- `$.store.get`, `$.store.set`: keep drafts in the plugin's own store on your machine
- `$.session.root`: the project name shown next to each draft
- `$.command.register`, `$.ui.open`, `$.ui.close`, `$.ui.panes`, `$.ui.toast`, `$.clock.now`, `$.session.surface`, state for the sidebar and the number row

No network requests, no processes, no files outside the plugin store. Only prompts you type yourself are checked for the marker; prompts that other plugins or sessions submit pass through untouched.

## Develop

```bash
claude plugin validate .   # what the mod hooks and calls
claude plugin test .       # hooks/drafts.test.ts
```

## License

MIT
