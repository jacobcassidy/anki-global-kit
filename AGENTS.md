# Repository guide for agents

## Project purpose

Anki Global Kit combines Anki Desktop features with card-side JavaScript and CSS. Desktop code runs in the add-on. Card assets are installed into the active profile's `collection.media` folder; card templates load those files and Anki sync carries the media and template changes to AnkiWeb and the mobile clients.

The add-on can create new topic and format note types in the active profile. It does not rewrite existing note types. Keep this safety boundary in mind when proposing or implementing template changes.

## Repository map

- `addon/__init__.py` — Required Anki add-on entry point; initializes the Desktop features.
- `addon/desktop/` — Python code that runs in Anki Desktop.
  - `settings.py` manages settings, the settings panel, and card asset installation.
  - `note_types.py` creates selected topic and format note types.
  - `editor/` contains Python integrations for editor features.
- `addon/web/` — Built card assets installed in `collection.media`.
- `addon/templates/note-types/parts/` — HTML, script, and styling parts used to create note types.
- `src/cards/js/` — Card-side JavaScript.
  - `inputs/` handles textarea setup, answer persistence/submission, keyboard navigation, and Markdown shortcuts.
  - `display/` controls question, answer, hint, note, and comparison display.
  - `markdown/` converts submitted Markdown to HTML.
  - `syntax-highlighting/` detects languages from the topic and highlights code.
  - `runtime/` detects clients, holds state, and initializes features.
  - `integrations/` contains client-specific integrations such as AnkiWeb layout handling.
- `src/cards/css/` — Card styles. `index.css` imports the module stylesheets.
- `src/editor/js/` and `src/editor/css/` — Desktop editor JavaScript and styles.
- `src/shared/js/` and `src/shared/css/` — Code shared between card and editor targets when runtime behavior is genuinely common.
- `scripts/` — esbuild configuration, build, and watch scripts.
- `docs/reference/note-types/` — Reference front/back templates and matching styling. Keep asset filenames and markup selectors in sync with the card-side code.
- `docs/dev/` — Developer and publishing instructions.
- `README.md` — User-facing features and setup.

## Build and generated files

Install JavaScript development dependencies with `npm install`. Build the card assets from the repository root:

```sh
npm run build:addon
```

The current build bundles `src/cards/js/index.js` and `src/cards/css/index.css` into:

- `addon/web/_anki-global-kit.min.js`
- `addon/web/_anki-global-kit.min.css`

These generated files are included in the add-on package. Update `scripts/build.config.js` if source entry points or output names change, and update `addon/desktop/settings.py`, template parts, styling, and documentation when renaming installed assets. The watch script currently watches card JavaScript and CSS.

Useful project scripts:

- `npm run lint:scripts` — JavaScript linting.
- `npm run lint:styles` — CSS linting.
- `npm run lint:docs` — Markdown linting.
- `npm run check` — Prettier formatting check.

## Implementation boundaries

- Put review-time behavior in `src/cards/` when it needs to run across Anki clients. Put editor behavior in `src/editor/` and use `addon/desktop/editor/` for its Desktop integration. Do not assume Python add-on code runs outside Anki Desktop.
- Use the Python add-on for Desktop installation, configuration, and collection operations. Connect to Anki through documented hooks and APIs instead of patching internal functions when a supported hook exists.
- Keep the setting keys in `addon/config.json` synchronized with the keys inside `addon/meta.json`'s `config` object, including `note_type_selections`, whenever either file changes.
- Treat media filenames as public interfaces: the installer, templates, and stylesheet imports must use identical names.
- The add-on refreshes the kit's reserved asset names through Anki's media manager on `profile_did_open`. Keep installation scoped to those managed assets; do not overwrite user templates or unrelated media without an explicit opt-in design.
- Create note types through Anki's documented `col.models` APIs. Do not modify a user's existing note types automatically; if a kit type name already exists, leave it unchanged and report that to the user.
- Preserve cross-client behavior. Check platform-specific code in `src/cards/js/runtime/platform.js` and `src/cards/js/inputs/` before changing answer storage or keyboard behavior.
- If changing required template markup or CSS imports, update all four reference templates and `docs/reference/note-types/styling.css`, and document the user migration in `README.md` or the changelog.

## Git commits

- Create a Git commit for each completed new feature, fix, refactor, or other
  logical change after appropriate validation.
- Use a concise, descriptive commit message explaining the change.
- Stage only files belonging to that change. Do not include unrelated user work.
- Check the repository root before committing, especially when accessing this
  directory through a symlink. If no repository is available, report that and
  arrange repository setup rather than claiming a commit was created.
- Report validation performed and any limitations; do not claim live Anki
  verification when only syntax checks or isolated tests were run.

## Anki development references

Use the official documentation as the primary API reference for Anki-specific work:

- [Writing Anki add-ons](https://addon-docs.ankiweb.net/) — add-on architecture and development overview.
- [Hooks and filters](https://addon-docs.ankiweb.net/hooks-and-filters.html) — supported extension points.
- [Reviewer JavaScript](https://addon-docs.ankiweb.net/reviewer-javascript.html) — `card_will_show` and card display contexts.
- [The `anki` module](https://addon-docs.ankiweb.net/the-anki-module.html) — collection/media access from Python add-ons.
- [Add-on folders](https://addon-docs.ankiweb.net/addon-folders.html) — local add-on layout and packaging.
- [Sharing add-ons](https://addon-docs.ankiweb.net/sharing.html) — `.ankiaddon` archive format.
- [Card templates](https://docs.ankiweb.net/templates/intro.html) — front/back templates and styling.
- [Media](https://docs.ankiweb.net/media.html) and [syncing](https://docs.ankiweb.net/syncing.html) — Anki media and sync behavior.
- [AnkiDroid manual](https://docs.ankidroid.org/) and [AnkiMobile manual](https://docs.ankimobile.net/) — client-specific behavior and setup.

For each feature, prefer documentation and hooks that match the supported Anki versions. Verify version-sensitive APIs against the actual minimum-version target before relying on them.
