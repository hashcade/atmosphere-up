# Atmosphere Up

Node.js ESM CLI that assembles Nintendo Switch SD card packs from a selected HOS
version. Use pnpm and follow the installed dependencies and existing modules.

## Language and documentation

- Use English for repository content, including prompts, comments, and commits.
- Start custom prompt messages with lowercase letters. Keep Clack's built-in
  labels unchanged and preserve module branding in option labels.
- User-facing copy uses `core modules` for required contents, `optional modules`
  for selectable additions, `categories` for feature groups, and `pack` for the
  assembled output.
- README describes features, sources, and useful defaults. Put maintenance and
  implementation details in this file or the relevant skill.
- Do not narrate prompt sequences, preselection behavior, or selection mechanics
  in README. Describe what users can do and how to use the output.

## Project structure

| Location | Responsibility |
| --- | --- |
| `src/cli.ts`, `src/config.ts`, `src/types.ts` | CAC options and unconfig configuration |
| `src/commands/` | Mode dispatch, shared prompts, full builds, and module upgrades |
| `src/core/` | Bundle catalog, release resolution, installation, and output |
| `src/extensions/index.ts` | Ordered optional module categories, prompts, and resolvers |
| `src/extensions/*.ts` | One feature category per module; prompts and resolvers return arrays |
| `src/extensions/configured.ts` | Resolve user-configured GitHub release assets |
| `src/upgrade/` | Module catalog, selected resource resolution, and SD card update packs |
| `src/firmware.ts` | Optional firmware for the exact selected HOS version |
| `src/download/` | GitHub authentication, releases, and downloads |
| `src/constants.ts` | Repository names and CLI defaults |
| `src/utils.ts` | Reusable or complex pure helpers |
| `assets/sigpatches/` | Prepared patch ZIPs, HOS/Atmosphere manifest, and provenance |
| `assets/mission-control/versions.json` | HOS to exact Mission Control release tag |
| `assets/defaults/` | Files copied into every pack after extracting core modules |

## Build behavior to preserve

- Follow pncat's mode dispatch style: CAC receives `[mode] [...modules]`, the
  first argument selects `build` or `upgrade`, and configuration is resolved
  before dispatch. Default to `build`; let CAC parse the variadic module array.
- `upgrade` always shows a grouped multi-select containing all core and optional
  modules. Default to no selection; module arguments only preselect items.
  Resolve and install the final selection with required dependencies. Ask for
  HOS only when needed for Atmosphere, sigpatches, or Mission Control, or when
  `--version` is supplied. Output a single module under its name, or a combined
  `upgrade` directory/ZIP, with files starting at the SD card root.
- Share optional module options and resolvers with full builds. Apply only the
  selected core module defaults in upgrade packs. Horizon OC also needs its
  Hekate boot configuration; Hekate upgrades refresh both payload locations.
- Supported HOS versions come from the sigpatches manifest. Atmosphere uses the
  bundle's exact `atmosphereTag`; other core repositories currently use latest
  releases. Mission Control uses its HOS mapping. Other optional modules,
  including Horizon OC, use latest releases. Assemble the selected resources
  without adding HOS or Atmosphere compatibility gates.
- DBI uses the latest DBIPatcher release for both `DBI.nro` and
  `translation_en.bin`, installed as `switch/DBI/translation.bin`. Keep the
  program and translation from the same release; use upstream DBI for `dbi.config`.
- Check the destination and confirm replacement before downloads. Assemble core,
  select and install optional modules, optionally download firmware, then write the
  manifest and finalize directory or ZIP output.
- Optional module categories stay in this order: save management, file management,
  cheats, performance tuning, performance monitoring, controller support,
  streaming, Amiibo. Default categories are save management, file management,
  and cheats. Ask for tools only in selected categories.
- `extensions` configures additional modules with `name`, `repository`, optional
  `releaseTag`, and an `assets` array. Each asset has a `name` selector and either
  a file `target` or ZIP extraction `directory`. Without `target`, extract the
  ZIP to `directory` or the SD card root. Assets accept exact names or regular
  expressions. Query each module's release once. Configured names are unique across
  built-in and configured modules. Full builds install all configured modules
  after built-in optional modules and before firmware and extra files. Upgrade
  lists configured modules and installs only those selected.
- `--ext` and `--firmware` default to true; their negative forms skip their
  respective prompts. `--no-ext` leaves configured modules enabled.
  `--pack` defaults to false. `output` is a parent directory:
  create `atmosphere-<AMS>-hos-<HOS>/` or the same name with `.zip`. ZIP contents
  start at the SD card root. The repository config sets the parent to `./output`.
- Use staging and the existing AbortSignal flow. Cancellation removes temporary
  files; preserve an existing output until the replacement has been assembled.
- `extra` is an optional configuration directory in SD card layout, resolved from
  the working directory and checked before downloads. Merge it into full and
  upgrade packs after all downloaded modules and defaults, before directory or
  ZIP output. Extra files replace matching paths; copy without modifying the
  source or merging configuration fields. Do not filter cheat toggle files.
- Keep shared optional module dependencies deduplicated. An enhanced Sys Clk overlay
  replaces the original overlay while preserving the required service/manager.
- Emuiibo offers optional virtual Amiibo generation in builds and upgrades. Use
  AmiiboAPI's `amiiboSeries` categories, sorted alphabetically, with nothing
  preselected and an empty selection allowed. Generate Emuiibo-format directories
  under `emuiibo/amiibo`; include IDs in directory names to preserve same-name
  variants. Keep UUID randomization off by default, as in Emuiigen.
- Keep overlay memory at 8 MiB and the hotkey at L + D-pad Down. Cheats default
  off without remembered toggles. When cheat tools are selected, offer two
  independent confirmations for enabling cheats by default and remembering
  toggles, both defaulting to false. Share these settings with upgrade mode.
  JKSV defaults to unpacked backups with `ExportToZip: 0` and disables hold
  requirements with `HoldForDeletion`, `HoldForRestoration`, and `HoldForOverWrite`
  set to 0. Include its settings in JKSV upgrade packs. Other shipped configuration
  lives in `assets/defaults`; change these defaults only when the task calls for it.
- `assets` is included in the npm package and referenced by built modules. Do not
  move configuration into embedded strings or assume it lives under `dist`.

## Implementation conventions

- Prefer installed libraries: tinyglobby for file discovery, verkit for versions,
  adm-zip for ZIP reading/writing, @octokit/rest for GitHub, tinyexec for commands,
  and ini for INI editing. Use `getRepositoryUrl` for GitHub links.
- Keep code simple and leave blank lines between stages. Use an options object
  when a function would otherwise have more than three configuration arguments.
- Use ansis for prompt messages and tildify for displayed paths. Do not color
  `select` or `multiselect` option labels.
- Add inline dependencies to devDependencies only when they are ESM and suitable
  for bundling. Maintain the `inlined` catalog through `pncat.config.ts` and
  `pnpm pncat mig -f`. Keep existing production dependencies in place.
- GitHub credentials use `GITHUB_TOKEN`, then `gh auth token`. Never print tokens.

## Version maintenance skill

For new HOS support, Atmosphere bundle changes, sigpatch refreshes, or Mission
Control compatibility updates, read
[atmosphere-up-version-update](.agents/skills/atmosphere-up-version-update/SKILL.md)
before changing version data. This repository skill covers source collection,
standalone patch preparation, exact tags, controller mappings, and firmware.

## Verification and delivery

- Run relevant tests for changed behavior. Before delivering code changes, run
  `pnpm lint`, `pnpm typecheck`, `pnpm exec vitest run`, and `pnpm build`.
- Use small English conventional commits when committing. Respect any request
  to wait before committing or pushing. Do not wait for CI after a push.
- Regenerate `help.png` when CLI help changes and screenshot updates are part of
  the task: `pnpx termsnap "pnpm start --help" --png --font-family "MonoLisa"`,
  then rename `termsnap.png` to `help.png`. Run in a terminal; termsnap requires
  TTY input. If pnpx has a missing cached entry, force a fresh run with
  `pnpm --config.dlx-cache-max-age=0 dlx termsnap ...`. Unset `NO_COLOR` for that
  invocation if it conflicts with `FORCE_COLOR` and adds warnings to the image.
