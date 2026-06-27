# Agent Operating Guide

This is the canonical code-agent hub for nexenne.com. It owns the
working-memory floor: what every assistant must keep in mind before changing
this repo. Process rules live in [CONVENTIONS.org](CONVENTIONS.org). The full
map lives in [docs/index.org](docs/index.org).

`AGENTS.md` is the single source of truth for coding-assistant guidance in this
repo. If a tool needs another filename, create a tiny bridge that imports or
points to this file; do not copy these rules into a second maintained file.
AI-assisted output is still the human committer's responsibility: review, test,
and understand every line; use assistants, not autopilot, and do not add AI
trailers.

## Read Order

Always start with:

1. [AGENTS.md](AGENTS.md): working rules and forbidden patterns.
2. [docs/index.org](docs/index.org): choose the role-specific docs.
3. [CONVENTIONS.org](CONVENTIONS.org): commands, git, CI, docs governance.
4. The one spoke that owns the area you are touching.

Do not load everything by habit. Load the smallest set that covers the task.

## Role Shortcuts

- Understand the repo: [VISION.org](VISION.org),
  [how-it-fits-together](docs/how-it-fits-together.org), and
  [glossary](docs/glossary.org).
- Plan a change: [file-system](docs/file-system.org),
  [project-setup](docs/project-setup.org), and the relevant feature spoke.
- Implement UI/page work: [DESIGN.org](DESIGN.org), [routes](docs/routes.org),
  [components](docs/components.org), and [styling](docs/styling.org).
- Implement content: [content-pipeline](docs/content-pipeline.org),
  [routes](docs/routes.org), and [file-system](docs/file-system.org).
- Change copy/tone: [tone-of-voice](docs/tone-of-voice.org),
  [DESIGN.org](DESIGN.org), and [glossary](docs/glossary.org).
- Change parser/data: [content-pipeline](docs/content-pipeline.org),
  [testing](docs/testing.org), and [dependencies](docs/dependencies.org).
- Change build/deploy: [CONVENTIONS.org](CONVENTIONS.org),
  [project-setup](docs/project-setup.org), and [deployment](docs/deployment.org).
- Review: [AGENTS.md](AGENTS.md), [STYLE_GUIDE.org](STYLE_GUIDE.org), and
  [testing](docs/testing.org).
- Return after a break: [maintenance](docs/maintenance.org), then the
  role-specific docs above.

## Working Rules

- Inspect before editing: `git status --short`, then read the owning doc and the
  relevant files.
- Keep changes scoped to one concern.
- Keep commit messages to a single `type(scope): description` sentence. Do not
  add a multi-paragraph body.
- Preserve the static-site model. Pages prerender into `build/` and deploy to
  GitHub Pages.
- Keep project documentation in Org mode, except assistant entrypoint bridges:
  `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, and `.github/copilot-instructions.md`.
- Update docs when you change a durable rule, workflow, service, route family,
  content schema, dependency, or generated artifact.
- Do not edit generated folders: `build/`, `.svelte-kit/`, `node_modules/`.
- Do not use em dashes. Use a colon, comma, parentheses, or a plain hyphen.
- Do not weaken a test to make it pass. If the test describes intended behavior,
  fix the code or update the documented contract first.
- Run the relevant verification commands before finishing.

## Where New Things Go

Use [docs/file-system.org](docs/file-system.org) as the owner. The quick floor:

| new thing                         | location                                 |
| --------------------------------- | ---------------------------------------- |
| page route                        | `src/routes/[[lang=lang]]/<name>/`       |
| language-independent endpoint     | `src/routes/<name>/+server.ts`           |
| reusable Svelte component         | `src/lib/components/`                    |
| route-only markup                 | keep it in the route                     |
| content parser/loader logic       | `src/lib/content/`                       |
| internal link helper              | `src/lib/paths.ts`                       |
| user-facing app copy              | `src/lib/i18n.ts` in both languages      |
| site-wide facts/navigation        | `src/lib/data.ts`                        |
| authored blog/work/resume content | `content/`                               |
| public static asset               | `static/`                                |
| project documentation             | root `*.org` hubs or `docs/*.org` spokes |

## Hard Rules

### Routes And Links

- English is root, Italian is `/it/`.
- New public pages usually live under `src/routes/[[lang=lang]]/`.
- Dynamic routes must prerender entries for every language they support.
- Build internal links through `lpath`, `lhref`, or `lgoto` from
  `src/lib/paths.ts`. Do not hand-build language prefixes in components.

### Content

- Content files may be Markdown or Org because the parser supports both.
- Project docs are Org mode only, except the assistant entrypoints named above.
- Required frontmatter belongs to the Zod schemas in `src/lib/content/`.
- Draft content can exist locally but must not ship in production.

### UI And Styling

- Use existing CSS custom properties before adding raw colors or spacing.
- Keep the first-paint preference script in `src/app.html` synchronized with
  `src/lib/tweaks.ts` and the tokens in `src/app.css`.
- Preserve keyboard access, focus states, contrast, and reduced-motion behavior.
- Reusable UI belongs in `src/lib/components/` only when it is actually reused or
  has enough behavior to deserve extraction.

### Tests

- Shared logic, content parsing, endpoints, stores, route helpers, and
  regressions need Vitest coverage.
- UI-only changes still need `yarn check` and `yarn build`.
- Build-time globals injected by Vite must be stubbed in `vitest.config.ts` when
  tests import modules that read them.

### Dependencies

- Prefer platform APIs and existing dependencies.
- Add packages only after the checklist in
  [docs/dependencies.org](docs/dependencies.org).
- Document new services in
  [features-and-integrations](docs/features-and-integrations.org) and new env
  vars in `.env.example`.

## Forbidden Patterns

- Editing `build/`, `.svelte-kit/`, or `node_modules/` by hand.
- Adding a new project doc without registering it in [docs/index.org](docs/index.org).
- Duplicating the same rule in multiple docs instead of linking to the owner.
- Adding a route, page, or navigation label in only one language.
- Hard-coding `/it/` or `BASE_PATH` logic in components.
- Adding a public env var without documenting it in `.env.example` and docs.
- Adding a dependency because it is convenient but not necessary.
- Changing deployment behavior without updating [deployment](docs/deployment.org)
  and [CONVENTIONS.org](CONVENTIONS.org).
- Bypassing hooks or quality gates because the environment is inconvenient.
- Using em dashes in code, comments, docs, commits, UI copy, or content.
- Treating AI output as accepted without review. See
  [AI_DISCLAIMER.org](AI_DISCLAIMER.org).

## Verification Matrix

| change type           | minimum commands                                     |
| --------------------- | ---------------------------------------------------- |
| docs only             | `git diff --check`                                   |
| config/process docs   | `yarn format:check`, `git diff --check`              |
| app code              | `yarn format:check`, `yarn check`, `yarn lint`       |
| shared logic/tests    | `yarn test` plus app-code commands                   |
| content/parser/routes | `yarn test`, `yarn build` plus app-code commands     |
| deploy/build changes  | full gate: install, format, check, lint, test, build |

Full gate:

```sh
yarn install --immutable
yarn format:check
yarn check
yarn lint
yarn test
yarn build
```

If the shell cannot find `node`, add the local Node path first:

```sh
PATH="$HOME/.local/bin:$PATH" yarn check
```
