# Anki Global Kit add-on

This add-on installs the generated JavaScript and CSS into the active Anki profile's `collection.media` folder. Anki can then sync those resources to AnkiWeb and the mobile clients.

Choose **Tools > Anki Global Kit Settings...**, open **Note Types**, and select the topics and card formats you want. Choose **Update Selected Note Types** to create new note types from the bundled card template parts, named like `CSS (Advance)` and `CSS (Cloze)`. Existing note types are left unchanged unless you select the enabled **Overwrite** checkbox beside that format. Overwriting updates the kit templates and styling while preserving existing notes and fields; custom card templates may be replaced.

Use **+** to add a custom topic row. To remove a custom topic row from settings, check its **Delete** box and choose **Update Selected Note Types**. This does not delete an existing Anki note type or its cards.

## Build and install for development

From the repository root, run `npm run build:addon`. Copy the `addon` folder into Anki's add-ons folder and restart Anki. On profile open, the add-on installs or refreshes the card JavaScript and CSS in that profile. In **Tools > Anki Global Kit Settings... > Note Types**, select topics and card formats, then choose **Update Selected Note Types**. Sync your collection to make the resources and note types available on your other devices.

The **Cards** settings tab controls question-input Markdown shortcuts and indentation, answer Markdown rendering and syntax highlighting, and the question formatting toolbar and its buttons. Fenced code uses an explicit language label when supplied after the opening backticks (for example, a `python` label); otherwise, syntax highlighting is inferred from the card topic. The toolbar appears above question inputs; each button tooltip lists its shortcut. The **Editor** tab controls features in Anki Desktop's note editor, including inline-code formatting, Tab indentation, copy behavior, and paste cleanup. Card settings sync with your collection; Desktop editor settings apply in Anki Desktop.

Include the root `__init__.py`, the `desktop/` Python package, the `web/` card assets, and the `templates/` folder in published add-on packages.
