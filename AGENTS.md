# AGENTS.md: electron-foundation

Shared rules for every AI agent on this repo, in Claude Code (through CLAUDE.md) and Google Antigravity (which reads this file directly). Keep it under ~150 lines. It is read at the start of every run. Write `TBD` rather than guessing.

## Project
- What it is: Security-first Electron + TypeScript desktop foundation with typed IPC, local SQLite storage, auto-update from GitHub Releases and a signed Windows/macOS release pipeline.
- Users: Desktop developers building hardened, local-first Electron applications.
- Related repos and contracts: Reference foundation for `job-desk`.

## Stack packs
- electron-desktop
- web-frontend
- github-actions

## Commands
- Install: `npm ci`
- Run locally: `npm run dev` (opens Electron window) | `npm run dev:renderer` → URL: http://localhost:5173 (renderer alone with stubbed window.api for screenshots)
- Verify fast: `bash scripts/verify.sh fast` (Windows PowerShell: `./scripts/verify.ps1 fast`)
- Verify full: `bash scripts/verify.sh full`
- Disposable database: none (tests create SQLite files in a temporary `userData` folder; agents touch no other database)

## Git
- Base branch: main
- Branches: `feat/<slug>`, `fix/<slug>`, `chore/<slug>`
- PR: manual

## Conventions
- This is a public MIT repository written clean-room: no code, assets, names or data from client or employer projects. Sample data is synthetic.
- The standards and this repository's requirements are in `.pipeline/SPEC.md` (local, never committed). Requirement IDs appear in AC lines as `AC-n [ID]` and in test names.
- Docs describe only what exists and was run. What an agent cannot run (push, live cloud, signing, a Unity Editor, GitHub settings) is a `[USER]` item in `docs/release-checklist.md` and is never described as tested.
- GitHub Actions: top-level `permissions: {}` plus minimal per-job permissions; `timeout-minutes` and `concurrency` on every workflow; actions pinned to a full SHA with the version in a comment; explicit `shell:`; LF line endings; no `${{ github.event.* }}` inside `run:` (use `env:`); OIDC for cloud login. Check with `actionlint`.
- Commits are small and follow `<type>(<scope>): <goal> [step N]`. Dates are real and history is never rewritten.
- Dependencies need MIT-compatible licences. Record stack choices and open-decision outcomes in `docs/adr/`.
- Layout: `src/main`, `src/preload`, `src/renderer`, `src/shared`. The renderer imports nothing from `src/main`, and Node or Electron APIs are used only in main and preload.
- All IPC goes through `src/shared/ipc.ts` (channel to zod request and response schemas) and the single validating handler wrapper. A new channel needs a schema, a handler test and a line in `docs/security.md`.
- `better-sqlite3` is used only in the main process through the repository layer. Migrations are append-only, ordered SQL files tracked by `user_version`.
- Secrets use `safeStorage`. They never reach settings JSON, logs or the diagnostics export.

## Design
- Design system / tokens: neutral and unbranded, one accent colour, system font stack.
- Direction: clean, restrained desktop UI; light and dark themes following the OS.
- Brand: neutral surfaces, single accent colour, system fonts.

## Safety: agents never do these. They prepare the command and hand it over.
- Deploy, publish, release, upload, sign or notarize builds
- `terraform` / `terragrunt` apply, destroy, import or any state command
- Any write to a database other than the disposable one above
- Change real secrets, `.env` values, CI/CD or production configuration
- Push to the base branch, force-push, rewrite published history
- Never push, tag, create releases, change GitHub settings or run `git filter-repo`; write the command into `docs/release-checklist.md` instead.
- Never print secret values: show only file, line, rule and the last four characters.
- Never loosen a security flag, the CSP or a fuse to make something work. If a feature seems to need it, stop and ask.
- `electron-builder --dir --publish never` is allowed. Any publish mode, signing or notarization is not.

## Known baseline failures

## Lessons
