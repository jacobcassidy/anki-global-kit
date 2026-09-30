# Anki Global Kit

Anki Global Kit adds reusable card templates, typed-answer tools, Markdown rendering, code syntax highlighting, and shared card styling to Anki. The features are implemented in card HTML, CSS, and JavaScript so they can be used in Anki Desktop, AnkiWeb, AnkiMobile, and AnkiDroid after the media files and note templates are installed and synced.

## Features

### Typed answers

- Add multiple multiline answer fields to a card, including an optional bonus question and answer.
- Show type hints and hide empty bonus sections automatically.
- Use **Tab** to insert indentation (four spaces when the topic contains “Python,” otherwise two); use **Shift+Tab** to move focus forward.
- Submit an answer with **Ctrl+Enter** on Anki Desktop and AnkiWeb.
- Preserve typed answers for display on the back of the card, including AnkiDroid's review flow.

### Answer comparison

- Enable comparison per input with its `data-compare` value and the matching answer field.
- Compare typed and reference answers character by character using the same bundled diff algorithm across supported clients.
- Display additions, omissions, and matching text in a comparison view; multiple inputs can each have their own comparison.
- Treat Unicode code points as whole characters when generating the comparison.

### Markdown and editing shortcuts

Submitted text is rendered as a safe subset of Markdown: headings, paragraphs and line breaks, ordered and unordered lists, blockquotes, fenced code blocks, inline code, bold, italics, strikethrough, and HTTP(S) links.

On answer textareas, use **Cmd+B** for bold, **Cmd+I** for italics, **Cmd+Shift+C** for inline code, and **Ctrl+Cmd+C** for a fenced code block. With no selection, formatting applies to the word at the caret; applying a shortcut again removes the markers.

### Code syntax highlighting

Fenced code in submitted answers is highlighted based on the card's `.topic` text. Language names and common aliases are recognized for Python, JavaScript/Node, TypeScript, Java, C, C++, C#, SQL, Bash/shell, JSON, Ruby, Go, Rust, and PHP. Newly rendered answer blocks are highlighted as they appear.

### Card presentation

- Shared responsive card layout for questions, answers, comparison panels, cloze deletions, hints, bonus sections, and notes.
- Light and dark palette variables, including distinct colors for typed matches, mistakes, and missed text.
- Topic-level accent color customization through CSS custom properties such as `--brand-color-h` in the reference styling template.
- Shared typography, spacing, borders, code blocks, links, and form control styling.
- AnkiWeb study menu layout adjustment.

## Setup

The Desktop add-on installs the generated JavaScript and CSS into the active profile's `collection.media` folder. The reference note templates and stylesheet are in [`docs/reference/note-types`](docs/reference/note-types/).

Generated Advance note types use these fields:

`Question`, `Answer`, `Type Hint`, `Compare`, `Bonus Question`, `Bonus Answer`, `Bonus Type Hint`, `Bonus Compare`, and `Notes`.

Generated Cloze note types use `Cloze Question`, `Type Hint`, `Bonus Question`, `Bonus Answer`, `Bonus Type Hint`, `Bonus Compare`, and `Notes`; their selected topic appears in the card heading and the primary typed answer is compared automatically. You can still copy and adapt the reference templates manually if you prefer.

1. Install [Anki Desktop](https://apps.ankiweb.net/) and the Anki Global Kit add-on. For a local development install, run `npm install` and `npm run build:addon`, then copy the generated `addon` folder into Anki's add-ons folder and restart Anki.
2. Choose **Tools > Anki Global Kit Settings...**, open **Note Types**, and select one or more topics and card formats. Choose **Create Selected Note Types** to create them in the active profile with names such as `CSS (Advance)` and `CSS (Cloze)`. Existing note types with the same names are left unchanged. The front and back templates and styling are assembled from the matching parts in `addon/templates/card/`.
3. Sync from Anki Desktop so the templates and media files are available on your other devices.

The add-on installs or refreshes its JavaScript and CSS in the active profile automatically when the profile opens. After an add-on update, restart Anki; the updated card files will be copied before use. Profile switches trigger the same refresh for the newly opened profile.

Use the **Cards** settings tab to control question-input hotkeys and indentation, and Markdown rendering and syntax highlighting for submitted answers. The **Editor** tab controls the inline-code hotkey and button, plus the master Tab-indentation setting. Save the settings and sync the collection to apply them on other devices.

Comparison is included in the JavaScript bundle and does not require a separate `_diff_match_patch.js` file. Installed media filenames begin with an underscore so Anki's Check Media feature preserves these template resources.

## Reference templates

- [Advance front](docs/reference/note-types/advance-front.html)
- [Advance back](docs/reference/note-types/advance-back.html)
- [Cloze front](docs/reference/note-types/cloze-front.html)
- [Cloze back](docs/reference/note-types/cloze-back.html)
- [Styling](docs/reference/note-types/styling.css)

## Development

Install dependencies with `npm install`. Use `npm run build:addon` to bundle the add-on assets, `npm run watch:js` to rebuild while editing, and `npm run check` / `npm run lint:docs` for formatting and documentation checks. The add-on source is in `addon`; card code lives under `src/js` and `src/css`.

See [docs/dev/PUBLISHING.md](docs/dev/PUBLISHING.md) for instructions to publish the add-on and submit updates on AnkiWeb.

## FAQ

### Which Anki apps can use the features?

The kit uses web technologies in card templates and is designed for Anki Desktop, AnkiWeb, AnkiMobile, and AnkiDroid. Initial setup and syncing require Anki Desktop.

### Why is this not an Anki add-on?

Anki add-ons run in Anki Desktop. This kit uses card templates and synced media so its card features can also run in the other Anki clients.

### Where can I report a problem?

Open an [issue](https://github.com/jacobcassidy/anki-global-kit/issues). See the [changelog](CHANGELOG.md) for project updates.

## License

[MIT](LICENSE)
