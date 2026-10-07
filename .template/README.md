# my-mod

One sentence: what the mod does and how you use it.

## Install

Requires Claude Code 2.1.287 or later.

```bash
claude plugin marketplace add vynnlee/mods
claude plugin install my-mod@vynnlee
```

## Usage

| To | Do |
|---|---|
| Say hello | `/my-mod` |

## Settings

`/plugin configure my-mod@vynnlee`

| Setting | Default | Values |
|---|---|---|
| `language` | `en` | `en`, `ko` (Korean) |

## What it touches

| | |
|---|---|
| Hooks | `session.start`, `command.run` (`my-mod`) |
| Calls | `$.command.register`, `$.state.get`, `$.state.set` |

No network requests, no processes, no files.

## License

[MIT](../LICENSE)
