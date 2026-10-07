# mods

[![check](https://github.com/vynnlee/mods/actions/workflows/check.yml/badge.svg)](https://github.com/vynnlee/mods/actions/workflows/check.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

[Claude Code mods](https://code.claude.com/docs/en/plugins/mods/overview) by [vynnlee](https://github.com/vynnlee). Each folder is one mod, installed on its own.

| Mod | Command | What it does |
|---|---|---|
| [prompt-drafts](prompt-drafts) | `/drafts` | End a prompt with `;;` to keep it as a draft of the session instead of sending it. `/drafts` puts it back in the prompt box. |

## Install

Requires Claude Code 2.1.287 or later. Mods are on by default.

```bash
claude plugin marketplace add vynnlee/mods
claude plugin install prompt-drafts@vynnlee
```

Replace `prompt-drafts` with any mod in the table. In a Claude Code session, one line does both:

```
/plugin install prompt-drafts --marketplace vynnlee/mods
```

To try a mod for one session without installing:

```bash
git clone https://github.com/vynnlee/mods
claude --plugin-dir ./mods/prompt-drafts
```

To update:

```bash
claude plugin update prompt-drafts@vynnlee
```

## Layout

```
.claude-plugin/marketplace.json   the list of mods
prompt-drafts/                    one mod: plugin.json, hooks, types, tests, README, CHANGELOG
.template/                        the starting point for a new mod
.github/workflows/check.yml       validate and test every mod
```

Every mod folder is self-contained. Claude Code copies only that folder when it installs a mod, so mods do not import code from each other.

## Adding a mod

1. Copy `.template` to a new folder named after the mod, and replace `my-mod` everywhere in it.
2. Add the mod to `plugins` in `.claude-plugin/marketplace.json` and to the table above.
3. Check it:

   ```bash
   claude plugin validate . --strict
   claude plugin validate <mod> --strict
   claude plugin test <mod>
   ```

4. For a release, raise `version` in the mod's `plugin.json`, add the changes to its `CHANGELOG.md`, and tag it with `claude plugin tag <mod> --push` (tags look like `prompt-drafts--v0.1.0`). Installed copies update only when `version` changes.

## Conventions

- Messages in English and Korean, chosen with the `language` setting.
- Each README lists the hooks and calls the mod uses, as `claude plugin validate` reports them.
- No network requests or processes unless the mod's purpose needs them, and the README says why.

## License

[MIT](LICENSE)
