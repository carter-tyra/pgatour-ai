## Defaults
- Ship production-grade, maintainable implementations. Avoid temporary parallel codepaths unless explicitly asked for staged migration work.
- Keep a single source of truth for business rules, enums, validation, flags, and config.
- Define required inputs up front, validate early, and fail fast on invalid state.
- Use current docs for anything that may have changed recently.

## Working Style
- If files change unexpectedly, assume parallel edits and keep the diff scoped. Stop only when there is a real conflict or breakage.
- Prefer direct integrations over wrappers or glue layers unless there is a hard interface boundary that justifies one.
- Ask before `git push`. Prefer Conventional Commits.
- Before any UI/UX work, read `~/.codex/memories/ui-copy.md`.

## Skills And Prompts
- Prefer repo skills in `.agents/skills` and personal skills in `~/.agents/skills`.
- Prompts live in `~/.codex/prompts/*.md`.

## Shell
- Prefer fast deterministic tools: `rg`, `fd`, `ast-grep`, `jq`, and `yq`.
- Keep shell usage non-interactive and output-bounded.
- Avoid exposing secrets in commands, logs, or patches.
