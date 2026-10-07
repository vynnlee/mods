# Changelog

## 0.1.0

First release.

- Save a prompt as a draft by ending it with `;;`, or with `/draft <text>`.
- `/drafts` puts a draft back in the prompt box. Wide terminals get a sidebar and a numbered row above the prompt box. Narrow terminals get Claude Code's question dialog.
- Drafts belong to the session they were saved in and come back when the session is resumed.
- The sidebar shows up to three lines of each draft.
- Undo the last delete with the sidebar's Undo button or `/drafts undo`.
- Messages in English or Korean.
