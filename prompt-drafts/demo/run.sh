#!/bin/sh
# Launch Claude Code with only prompt-drafts loaded, in a throwaway config. No login, no model calls.
set -eu
MOD_DIR="$(cd "$(dirname "$0")/.." && pwd)"
D=/tmp/ccdemo
rm -rf "$D"
mkdir -p "$D/cfg" "$D/work"
cat > "$D/cfg/.claude.json" <<EOF
{
  "hasCompletedOnboarding": true,
  "hasSeenAutoDefaultNotice": true,
  "theme": "dark",
  "projects": {
    "$D/work": { "hasTrustDialogAccepted": true },
    "/private$D/work": { "hasTrustDialogAccepted": true }
  }
}
EOF
cd "$D/work"
# A clean environment: nothing from the shell or a parent Claude Code session leaks in.
exec env -i HOME="$HOME" USER="${USER:-}" PATH="$PATH" TERM="${TERM:-xterm-256color}" LANG=en_US.UTF-8 \
  CLAUDE_CONFIG_DIR="$D/cfg" \
  CLAUDE_CODE_NO_FLICKER=1 \
  CLAUDE_CODE_HIDE_CWD=1 \
  CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1 \
  CLAUDE_CODE_DISABLE_TERMINAL_TITLE=1 \
  DISABLE_AUTOUPDATER=1 \
  claude --plugin-dir "$MOD_DIR" --strict-mcp-config
