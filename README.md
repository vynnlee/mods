# prompt-drafts

A [Claude Code mod](https://code.claude.com/docs/en/plugins/mods/overview) for keeping prompts aside and bringing them back later.

You are halfway through a prompt and want to ask something else first. End it with `;;`, press Enter, and it is saved instead of sent. When you want it back, `/drafts` lists your drafts right above the prompt box and one number key puts a draft back.

```
❯ refactor the auth middleware to use the new session store;;
⏺ ✓ Draft 1 saved: refactor the auth middleware to use the new session store   (/drafts to bring it back)
```

```
Drafts  press a number to use one, 0 to close
1: refactor the auth middleware to use the new session store   api, 3m ago, 61 chars
2: write release notes for 2.4 from the merged PRs             web, 2h ago, 48 chars
0: close
──────────────────────────────────────────────────────────────────────────────────
❯
```

## Use

| To | Do |
|---|---|
| Save the prompt you are writing | End it with `;;` and press Enter. It is not sent. |
| Save some text | `/draft <text>` |
| Put a draft back in the prompt box | `/drafts`, then press its number. `0` closes the list. Or `/drafts <n>` |
| Delete a draft | `/drafts rm <n>` |

- Drafts are shared by every Claude Code session on your machine, newest first, up to 50. Each shows the project it was saved in. The list shows the newest 9.
- Putting a draft in a prompt box that already holds other text saves that text as a draft first, so nothing you typed is lost.
- Saving the same text again moves it to the top instead of keeping two copies.
- The list closes when you pick one, press `0`, or send a prompt.

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
- `$.command.register`, `$.ui.toast`, `$.clock.now`, `$.session.surface`, state for the list above the prompt

No network requests, no processes, no files outside the plugin store. Only prompts you type yourself are checked for the marker; prompts that other plugins or sessions submit pass through untouched.

## Develop

```bash
claude plugin validate .   # what the mod hooks and calls
claude plugin test .       # hooks/drafts.test.ts
```

## License

MIT
