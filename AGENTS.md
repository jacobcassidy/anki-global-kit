# Repository guide for agents

## Project purpose

Anki Global Kit combines an Anki Desktop add-on installer with card-side JavaScript and CSS. The add-on runs only in Anki Desktop. It installs the shared files into the active profile's `collection.media` folder; card templates load those files and Anki sync carries the media and template changes to AnkiWeb and the mobile clients.

The add-on can create new Advance and Cloze reference note types in the active profile. It does not rewrite existing note types. Keep this safety boundary in mind when proposing or implementing template changes.

## Repository map

- `addon/` — Python add-on entry point, note-type creation code, manifest, instructions, built card assets in `web/`, and generated reference templates in `templates/note-types/`.
- `src/js/` — Source for card-side JavaScript.
  - `inputs/` handles textarea setup, answer persistence/submission, keyboard navigation, and Markdown shortcuts.
  - `display/` controls question, answer, hint, note, and comparison display.
  - `markdown/` converts submitted Markdown to HTML.
  - `syntax-highlighting/` detects languages from the topic and highlights code.
  - `runtime/` detects clients, holds state, and initializes features.
  - `integrations/` contains client-specific integrations such as AnkiWeb layout handling.
- `src/css/` — Source card styles. `index.css` imports the module stylesheets.
- `scripts/` — esbuild configuration, build, and watch scripts.
- `docs/reference/note-types/` — Reference front/back templates and matching styling. Keep asset filenames and markup selectors in sync with the card-side code.
- `docs/dev/` — Developer and publishing instructions.
- `README.md` — User-facing features and setup.

## Build and generated files

Install JavaScript development dependencies with `npm install`. Build the add-on's card assets from the repository root:

```sh
npm run build:addon
```

The build bundles `src/js/index.js` and `src/css/index.css` into:

- `addon/web/_anki-global-kit.min.js`
- `addon/web/_anki-global-kit.min.css`

These generated files are included in the add-on package. Update `scripts/build.config.js` if source entry points or output names change, and update `addon/__init__.py`, reference templates, styling, and documentation when renaming installed assets. `npm run watch:js` watches both JS and CSS builds despite the script's name.

Useful project scripts:

- `npm run lint:scripts` — JavaScript linting.
- `npm run lint:styles` — CSS linting.
- `npm run lint:docs` — Markdown linting.
- `npm run check` — Prettier formatting check.

## Implementation boundaries

- Put review-time behavior in the card-side JavaScript/CSS when it needs to run across Anki clients. Do not assume Python add-on code runs outside Anki Desktop.
- Use the Python add-on for Desktop installation, configuration, and collection operations. Connect to Anki through documented hooks and APIs instead of patching internal functions when a supported hook exists.
- Treat media filenames as public interfaces: the installer, templates, and stylesheet imports must use identical names.
- The add-on refreshes the kit's reserved asset names through Anki's media manager on `profile_did_open`. Keep installation scoped to those managed assets; do not overwrite user templates or unrelated media without an explicit opt-in design.
- Create note types through Anki's documented `col.models` APIs. Do not modify a user's existing note types automatically; if a kit type name already exists, leave it unchanged and report that to the user.
- Preserve cross-client behavior. Check platform-specific code in `src/js/runtime/platform.js` and `src/js/inputs/` before changing answer storage or keyboard behavior.
- If changing required template markup or CSS imports, update all four reference templates and `docs/reference/note-types/styling.css`, and document the user migration in `README.md` or the changelog.

## Anki development references

Use the official documentation as the primary API reference for Anki-specific work:

- [Writing Anki add-ons](https://addon-docs.ankiweb.net/) — add-on architecture and development overview.
- [Hooks and filters](https://addon-docs.ankiweb.net/hooks-and-filters.html) — supported extension points.
- [Reviewer JavaScript](https://addon-docs.ankiweb.net/reviewer-javascript.html) — `card_will_show` and card display contexts.
- [The `anki` module](https://addon-docs.ankiweb.net/the-anki-module.html) — collection/media access from Python add-ons.
- [Add-on folders](https://addon-docs.ankiweb.net/addon-folders.html) — local add-on layout and installation.
- [Sharing add-ons](https://addon-docs.ankiweb.net/sharing.html) — `.ankiaddon` archive format and AnkiWeb upload.
- [Card templates](https://docs.ankiweb.net/templates/intro.html) — front/back templates and styling.
- [Media](https://docs.ankiweb.net/media.html) and [syncing](https://docs.ankiweb.net/syncing.html) — collection media behavior and cross-device sync.
- [AnkiDroid manual](https://docs.ankidroid.org/) and [AnkiMobile manual](https://docs.ankimobile.net/) — client-specific behavior and setup.

For each feature, prefer documentation and hooks that match the supported Anki versions. Verify any version-sensitive APIs against the actual minimum-version target before relying on them.
