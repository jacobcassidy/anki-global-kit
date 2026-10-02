# TODOS

- [ ] Update CHANGELOG.md and README.md with latest changes, then push dev branch to main and publish a new version.

## Agent Todos

- [ ] There is a bug where clicking in the Changelog setting tab text box causes buttons and checkboxes on other pages to get outline focus applied to them (specifically, the About tab's GitHub Repo button and Cards tab's Enable Markdown shortcuts checkbox.)
- [ ] Find out if the modifier key symbols show as window keys when using the anki desktop app on windows.

## Completed

- [x] Add clickable ? help buttons after the Editor Formatting settings options that explains what they do. Also for the Care Reviews settings options.
- [x] Update Help Indication button styles (circle background, larger font)
- [x] Move the inline code shortcut setting to indented below the enable button. Add a reset button after it that resets the shortcut to the original option.
- [x] When the Restore Defaults button is disabled, add a tooltip message that says "All settings are using defaults."
- [x] Find out why some Note Types in the settings are checked and some are not when they are disabled from already existing.
- [x] When a key conflicts with another key, don't allow it to be used (meaning don't insert it in the shortcut field), instead have the warning message say "<shortcut> conflicts with...", replace <shortcut> with the shortcut they tried using, in the warning message. Also show the shortcut in the reserved warning message too, so it says: <shortcut> is reserved for <purpose>. Choose another shortcut.
- [x] If a parent option is deselected, all child option text should be dimmed (currently only the checkbox gets dimmed)
- [x] Check there was any added code to have alt row background colors for the Note Types settings options (it doesn't work if the code is there).
- [x] Make the default window width for the settings panel wider so that it fits the text "Sync your collection with AnkiWeb to apply changes on your other devices" on one line.
- [x] Since anki use the Ctrl and Meta keyword and we are using Primary/Control, lets update to using the same naming that anki uses so there is not confusion, as long as its doesn't conflict with reserved words.
- [x] The Anki editor has default shortcuts for formatting, such as underline, strikethrough, ordered list, unordered list, etc. Add these to the shortcut validations in the editor shortcut options. Also, use the same shortcut for matching formatting in the card fields, updating the default shortcuts we currently have there, including for the lists.
- [x] For card review code block syntax highlighting, use the language provided after the opening fence when available, and fall back to the card topic when no language is specified.
