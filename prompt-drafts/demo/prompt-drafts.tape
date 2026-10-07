# Record: save two prompts with ;;, open /drafts, press 2 to bring one back.
Output demo/out/prompt-drafts.gif
Output demo/out/prompt-drafts.mp4

Require claude

Set Shell "bash"
Set FontFamily "JetBrains Mono"
Set FontSize 20
Set Columns 130
Set Rows 32
Set Padding 28
Set Margin 0
Set BorderRadius 0
Set Theme { "name": "Plain Black", "background": "#000000", "foreground": "#e5e5e5", "cursor": "#e5e5e5", "selection": "#333333", "black": "#000000", "red": "#ff6b6b", "green": "#5fd38d", "yellow": "#e5c07b", "blue": "#6cb6ff", "magenta": "#d69fff", "cyan": "#56d4dd", "white": "#d4d4d4", "brightBlack": "#6e6e6e", "brightRed": "#ff8787", "brightGreen": "#7ee2a8", "brightYellow": "#f0d398", "brightBlue": "#8ccaff", "brightMagenta": "#e2b8ff", "brightCyan": "#7fe3ea", "brightWhite": "#ffffff" }
Set TypingSpeed 35ms
Set CursorBlink false
Set Framerate 30
Set WaitTimeout 20s

# Start Claude Code off camera.
Hide
Type "exec ./demo/run.sh"
Enter
Wait+Screen /for agents|for shortcuts/
Sleep 600ms
Show

Sleep 800ms
Type "Refactor the auth middleware to use the new session store;;"
Sleep 400ms
Enter
Wait+Screen /\(1 in this/
Sleep 1s

Type "Write tests for the rate limiter edge cases;;"
Sleep 300ms
Enter
Wait+Screen /\(2 in this/
Sleep 800ms

Type "/drafts"
Sleep 500ms
Enter
Wait+Screen /Save prompt box/
Sleep 2.2s

# Drafts are newest first, so 2 is the first one saved.
Type "2"
Wait+Screen /❯.Refactor the auth middleware/
Sleep 2.5s
