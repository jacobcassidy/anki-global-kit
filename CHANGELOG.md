# Anki Global Kit Add-on Changelog

## [1.0.0]

### Added

- Added card-side Markdown rendering, syntax highlighting, answer comparison, and configurable question formatting tools.
- Added Advance and Cloze note type templates for the built-in topics, with optional custom topic rows.
- Added selection and overwrite controls for note types. Existing types stay unchanged unless their **Overwrite** checkbox is selected.
- Added a **Delete** checkbox for removing a custom topic row from settings. This only removes the settings row; existing Anki note types and cards are left intact.
- Added separate **Cards** and **Editor** settings for review behavior, shortcuts, formatting, indentation, copying, and paste cleanup.
- Added configurable Markdown shortcuts and formatting toolbar buttons, including list, quote, and code formatting.

### Changed

- Renamed the Note Types action to **Update Selected Note Types** to cover creating and overwriting selected types as well as applying custom topic row changes.
- Focuses the **Save** button when settings open or the selected tab changes, while keeping normal Tab navigation through controls.
- Standardized settings panel colors, spacing, and section backgrounds, and added dividers between note type table columns.
